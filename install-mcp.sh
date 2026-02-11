#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────────────────
# Presentor MCP Server Installer
# Extensible target registry — add new MCP clients by
# appending ~15 lines; zero changes to existing code.
# ─────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
INSTALL_DIR="${PRESENTOR_HOME:-$HOME/.presentor}"
GITHUB_REPO="iroth/presentor"

# Detect if we're inside a presentor repo or piped via curl
if [ -f "$SCRIPT_DIR/package.json" ] && grep -q '"presentor"' "$SCRIPT_DIR/package.json" 2>/dev/null; then
  REPO_DIR="$SCRIPT_DIR"
else
  # Running outside the repo (e.g. curl | bash) — use INSTALL_DIR
  REPO_DIR="$INSTALL_DIR"
fi

SERVER_PATH="$REPO_DIR/dist/mcp-server.js"

# ─── Colors & Helpers ────────────────────────────────────

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

info()   { echo -e "${BLUE}▸${NC} $1"; }
ok()     { echo -e "${GREEN}✓${NC} $1"; }
warn()   { echo -e "${YELLOW}!${NC} $1"; }
err()    { echo -e "${RED}✗${NC} $1"; }
header() { echo -e "\n${BOLD}$1${NC}"; }

# Read from terminal even when stdin is a pipe (curl | bash)
prompt() { read -r "$@" </dev/tty; }

# ─── JSON Manipulation (via node) ────────────────────────

# json_set FILE JSON_PATH VALUE
#   Reads FILE (or {}), sets the nested key, writes back.
#   JSON_PATH is dot-separated, e.g. "mcpServers.presentor"
#   VALUE is a raw JSON string.
json_set() {
  local file="$1" key_path="$2" value="$3"
  node -e "
    const fs = require('fs');
    const file = process.argv[1];
    const keyPath = process.argv[2].split('.');
    const value = JSON.parse(process.argv[3]);
    let data = {};
    try { data = JSON.parse(fs.readFileSync(file, 'utf-8')); } catch {}
    let obj = data;
    for (let i = 0; i < keyPath.length - 1; i++) {
      if (typeof obj[keyPath[i]] !== 'object' || obj[keyPath[i]] === null) obj[keyPath[i]] = {};
      obj = obj[keyPath[i]];
    }
    obj[keyPath[keyPath.length - 1]] = value;
    fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
  " "$file" "$key_path" "$value"
}

# json_merge_server CONFIG_FILE SERVER_JSON
#   Merges a presentor MCP server block into a config file.
#   Creates the file if it doesn't exist.
json_merge_server() {
  local config_file="$1" server_json="$2"

  # Ensure parent directory exists
  mkdir -p "$(dirname "$config_file")"

  json_set "$config_file" "mcpServers.presentor" "$server_json"
}

# ─── Build ───────────────────────────────────────────────

build_if_needed() {
  # If the repo doesn't exist at REPO_DIR, clone it
  if [ ! -f "$REPO_DIR/package.json" ]; then
    info "Cloning presentor to $REPO_DIR..."
    if ! command -v git &>/dev/null; then
      err "git is required but not found. Install git and try again."
      exit 1
    fi
    git clone --depth 1 "https://github.com/$GITHUB_REPO.git" "$REPO_DIR" 2>&1
    ok "Cloned to $REPO_DIR"
  fi

  if [ -f "$SERVER_PATH" ]; then
    ok "Server binary found at $SERVER_PATH"
    return
  fi

  info "Built output not found. Building..."

  if [ ! -d "$REPO_DIR/node_modules" ]; then
    info "Installing dependencies..."
    npm install --prefix "$REPO_DIR" --silent 2>&1
  fi

  npx tsc --project "$REPO_DIR/tsconfig.json" 2>&1
  ok "Build complete"
}

# ─── API Keys ────────────────────────────────────────────

PIXABAY_KEY=""
GEMINI_KEY=""

collect_api_keys() {
  header "API Keys (optional -- press Enter to skip)"
  echo ""

  PIXABAY_KEY="${PIXABAY_API_KEY:-}"
  GEMINI_KEY="${GEMINI_API_KEY:-}"

  if [ -n "$PIXABAY_KEY" ]; then
    info "PIXABAY_API_KEY detected from environment"
  else
    echo -n "  Pixabay API key (free at pixabay.com/api/docs): "
    prompt PIXABAY_KEY
  fi

  if [ -n "$GEMINI_KEY" ]; then
    info "GEMINI_API_KEY detected from environment"
  else
    echo -n "  Gemini API key (from aistudio.google.com/apikey): "
    prompt GEMINI_KEY
  fi

  echo ""
}

# build_env_json  ->  prints the "env" JSON object (or "{}")
build_env_json() {
  node -e "
    const env = {};
    if (process.argv[1]) env.PIXABAY_API_KEY = process.argv[1];
    if (process.argv[2]) env.GEMINI_API_KEY  = process.argv[2];
    console.log(JSON.stringify(env));
  " "$PIXABAY_KEY" "$GEMINI_KEY"
}

# build_server_json  ->  prints the full server config block
build_server_json() {
  local env_json
  env_json="$(build_env_json)"

  node -e "
    const env = JSON.parse(process.argv[1]);
    const config = {
      command: 'node',
      args: [process.argv[2]]
    };
    if (Object.keys(env).length > 0) config.env = env;
    console.log(JSON.stringify(config));
  " "$env_json" "$SERVER_PATH"
}

# ─── Target Registry ────────────────────────────────────
# Each target defines:
#   TARGET_<ID>_NAME          Human-readable name
#   target_<id>_detect()      Return 0 if the client is installed
#   target_<id>_config_path() Print the config file path for $SCOPE
#   target_<id>_install()     Perform the installation

# --- Target: Claude Code ---

TARGET_CLAUDE_CODE_NAME="Claude Code"

target_claude_code_detect() {
  command -v claude &>/dev/null
}

target_claude_code_config_path() {
  if [ "$SCOPE" = "user" ]; then
    echo "$HOME/.claude.json"
  else
    echo "$REPO_DIR/.mcp.json"
  fi
}

target_claude_code_install() {
  local server_json
  server_json="$(build_server_json)"

  # Try the CLI first when available
  if command -v claude &>/dev/null; then
    local claude_scope="local"
    [ "$SCOPE" = "user" ] && claude_scope="user"

    # Remove existing entry (ignore errors)
    claude mcp remove presentor --scope "$claude_scope" 2>/dev/null || true

    local cmd="claude mcp add --transport stdio --scope $claude_scope"
    [ -n "$PIXABAY_KEY" ] && cmd="$cmd --env PIXABAY_API_KEY=$PIXABAY_KEY"
    [ -n "$GEMINI_KEY" ]  && cmd="$cmd --env GEMINI_API_KEY=$GEMINI_KEY"
    cmd="$cmd presentor -- node $SERVER_PATH"

    if eval "$cmd" 2>&1; then
      ok "Installed for Claude Code via CLI (scope: $claude_scope)"
      return
    else
      warn "CLI registration failed, falling back to config file"
    fi
  fi

  # Fallback: write config file directly
  local config_file
  config_file="$(target_claude_code_config_path)"
  json_merge_server "$config_file" "$server_json" \
    && ok "Installed for Claude Code -> $config_file" \
    || err "Failed to update $config_file"
}

# --- Target: Gemini CLI ---

TARGET_GEMINI_CLI_NAME="Gemini CLI"

target_gemini_cli_detect() {
  command -v gemini &>/dev/null
}

target_gemini_cli_config_path() {
  if [ "$SCOPE" = "user" ]; then
    echo "$HOME/.gemini/settings.json"
  else
    echo "$REPO_DIR/.gemini/settings.json"
  fi
}

target_gemini_cli_install() {
  local server_json config_file
  server_json="$(build_server_json)"
  config_file="$(target_gemini_cli_config_path)"

  json_merge_server "$config_file" "$server_json" \
    && ok "Installed for Gemini CLI -> $config_file" \
    || err "Failed to update $config_file"
}

# --- Target: Cursor ---

TARGET_CURSOR_NAME="Cursor"

target_cursor_detect() {
  # Cursor is a GUI app; no reliable CLI detection.
  # Return false so it shows as "(not detected)" but is still selectable.
  return 1
}

target_cursor_config_path() {
  if [ "$SCOPE" = "user" ]; then
    echo "$HOME/.cursor/mcp.json"
  else
    echo "$REPO_DIR/.cursor/mcp.json"
  fi
}

target_cursor_install() {
  local server_json config_file
  server_json="$(build_server_json)"
  config_file="$(target_cursor_config_path)"

  json_merge_server "$config_file" "$server_json" \
    && ok "Installed for Cursor -> $config_file" \
    || err "Failed to update $config_file"
}

# --- Registry list (order matters for the menu) ---

ALL_TARGETS=(claude_code gemini_cli cursor)

# ─── Target Menu ─────────────────────────────────────────

# Stores which targets are selected (indexed by position in ALL_TARGETS)
declare -a SELECTED_TARGETS=()

present_target_menu() {
  header "Where to install?"
  echo ""

  # Build the menu with auto-detection hints
  local i=0
  for target in "${ALL_TARGETS[@]}"; do
    local name_var="TARGET_${target^^}_NAME"
    local name="${!name_var}"
    local hint=""
    if "target_${target}_detect" 2>/dev/null; then
      hint=" ${GREEN}(detected)${NC}"
    else
      hint=" ${YELLOW}(not detected)${NC}"
    fi
    i=$((i + 1))
    echo -e "  ${BOLD}${i})${NC} ${name}${hint}"
  done

  echo ""
  echo "  Enter numbers separated by commas, or 'all'"
  echo -n "  Selection (default: all): "
  prompt MENU_CHOICE
  MENU_CHOICE="${MENU_CHOICE:-all}"

  parse_target_selection "$MENU_CHOICE"
}

parse_target_selection() {
  local input="$1"
  SELECTED_TARGETS=()

  if [ "$input" = "all" ]; then
    SELECTED_TARGETS=("${ALL_TARGETS[@]}")
    return
  fi

  # Split on commas and/or spaces
  IFS=', ' read -ra parts <<< "$input"
  for part in "${parts[@]}"; do
    part="$(echo "$part" | tr -d '[:space:]')"
    # Accept either a number (1-based) or a target id
    if [[ "$part" =~ ^[0-9]+$ ]]; then
      local idx=$((part - 1))
      if [ "$idx" -ge 0 ] && [ "$idx" -lt "${#ALL_TARGETS[@]}" ]; then
        SELECTED_TARGETS+=("${ALL_TARGETS[$idx]}")
      else
        err "Invalid target number: $part"
        exit 1
      fi
    else
      # Check if it's a valid target id
      local found=false
      for t in "${ALL_TARGETS[@]}"; do
        if [ "$t" = "$part" ]; then
          SELECTED_TARGETS+=("$part")
          found=true
          break
        fi
      done
      if ! $found; then
        err "Unknown target: $part"
        exit 1
      fi
    fi
  done

  if [ "${#SELECTED_TARGETS[@]}" -eq 0 ]; then
    err "No targets selected"
    exit 1
  fi
}

# ─── Scope Selection ─────────────────────────────────────

SCOPE="project"

select_scope() {
  header "Installation scope?"
  echo ""
  echo "  1) Project-only (this project directory)"
  echo "  2) User-wide (available in all projects)"
  echo ""
  echo -n "  Choose [1/2] (default: 1): "
  prompt SCOPE_CHOICE
  SCOPE_CHOICE="${SCOPE_CHOICE:-1}"

  case "$SCOPE_CHOICE" in
    1) SCOPE="project" ;;
    2) SCOPE="user" ;;
    *) err "Invalid choice"; exit 1 ;;
  esac

  echo ""
}

# ─── Install Selected Targets ────────────────────────────

install_targets() {
  for target in "${SELECTED_TARGETS[@]}"; do
    local name_var="TARGET_${target^^}_NAME"
    local name="${!name_var}"
    header "Installing for ${name}..."
    "target_${target}_install"
  done
}

# ─── Summary ─────────────────────────────────────────────

print_summary() {
  echo ""
  header "Installation Complete!"
  echo ""
  echo "  Server:  $SERVER_PATH"
  echo "  Scope:   $SCOPE"
  echo ""

  if [ -n "$PIXABAY_KEY" ]; then
    ok "Pixabay stock photos: configured"
  else
    warn "Pixabay stock photos: not configured (set PIXABAY_API_KEY later)"
  fi

  if [ -n "$GEMINI_KEY" ]; then
    ok "Gemini AI images: configured"
  else
    warn "Gemini AI images: not configured (set GEMINI_API_KEY later)"
  fi

  echo ""
  echo "  Installed targets:"
  for target in "${SELECTED_TARGETS[@]}"; do
    local name_var="TARGET_${target^^}_NAME"
    local config
    config="$("target_${target}_config_path")"
    ok "${!name_var}  ->  $config"
  done

  echo ""
  echo "  Available MCP tools:"
  echo "    - create_presentation  Create slides from markdown text"
  echo "    - get_format_guide     Get the input format reference"
  echo "    - list_themes          Show available themes"
  echo "    - search_stock_photos  Search Pixabay for images"
  echo "    - generate_ai_image    Generate images with Gemini"
  echo ""
  echo "  Try it out:"
  echo "    \"Create a 5-slide presentation about microservices\""
  echo ""
  echo "  To update API keys later, re-run this script."
  echo ""
}

# ─── Argument Parsing ────────────────────────────────────

FLAG_TARGETS=""
FLAG_SCOPE=""

parse_args() {
  while [ $# -gt 0 ]; do
    case "$1" in
      --targets)
        shift
        FLAG_TARGETS="$1"
        ;;
      --targets=*)
        FLAG_TARGETS="${1#*=}"
        ;;
      --scope)
        shift
        FLAG_SCOPE="$1"
        ;;
      --scope=*)
        FLAG_SCOPE="${1#*=}"
        ;;
      -h|--help)
        echo "Usage: install-mcp.sh [options]"
        echo ""
        echo "Options:"
        echo "  --targets <list>   Comma-separated targets: claude_code,gemini_cli,cursor"
        echo "  --scope <scope>    project (default) or user"
        echo "  -h, --help         Show this help"
        echo ""
        echo "Examples:"
        echo "  ./install-mcp.sh                              # Interactive"
        echo "  ./install-mcp.sh --targets claude_code        # Non-interactive, single target"
        echo "  ./install-mcp.sh --targets all --scope user   # All targets, user-wide"
        exit 0
        ;;
      *)
        err "Unknown option: $1"
        exit 1
        ;;
    esac
    shift
  done
}

# ─── Main ────────────────────────────────────────────────

main() {
  header "Presentor MCP Server Installer"
  echo "───────────────────────────────"
  echo ""

  build_if_needed
  collect_api_keys

  # Target selection: flag or interactive
  if [ -n "$FLAG_TARGETS" ]; then
    parse_target_selection "$FLAG_TARGETS"
  else
    present_target_menu
  fi

  # Scope selection: flag or interactive
  if [ -n "$FLAG_SCOPE" ]; then
    case "$FLAG_SCOPE" in
      project) SCOPE="project" ;;
      user)    SCOPE="user" ;;
      *)       err "Invalid scope: $FLAG_SCOPE (use 'project' or 'user')"; exit 1 ;;
    esac
  else
    select_scope
  fi

  install_targets
  print_summary
}

parse_args "$@"
main
