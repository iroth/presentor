# Presentor

An MCP server that converts markdown outlines into beautiful presentations. Write text, get slides.

## Features

- **Two output formats** -- Interactive HTML (opens in any browser) and PPTX (PowerPoint/Keynote/Google Slides)
- **4 built-in themes** -- Default, Dark, Minimal, Corporate
- **Charts** -- Bar, pie, and line charts rendered as SVG (HTML) or native charts (PPTX)
- **Mind maps** -- Radial mind map diagrams from simple text outlines
- **Stock photos** -- Search and embed Pixabay images directly from your slides
- **AI image generation** -- Generate photo-realistic images, illustrations, and diagrams via Google Gemini
- **Works with any MCP client** -- Claude Code, Gemini CLI, Cursor, and any MCP-compatible tool
- **Keyboard navigation** -- Arrow keys, spacebar, fullscreen, touch/swipe
- **Print to PDF** -- Use Ctrl+P in the browser for PDF export

## Quick Start

One command to install and configure everything:

```bash
curl -fsSL https://raw.githubusercontent.com/iroth/presentor/main/install-mcp.sh | bash
```

This will clone Presentor to `~/.presentor`, build it, and walk you through configuring your MCP client.

Supports: **Claude Code** | **Gemini CLI** | **Cursor**

### Other Installation Methods

**From a local clone:**

```bash
git clone https://github.com/iroth/presentor.git
cd presentor
npm install
./install-mcp.sh
```

**Global npm install from GitHub:**

```bash
npm install -g github:iroth/presentor
```

**Non-interactive (for scripts/dotfiles):**

```bash
curl -fsSL https://raw.githubusercontent.com/iroth/presentor/main/install-mcp.sh | bash -s -- --targets claude_code --scope user
```

## Manual Setup

### Claude Code

**Via CLI (simplest):**

```bash
claude mcp add --transport stdio \
  --env PIXABAY_API_KEY=your-key \
  --env GEMINI_API_KEY=your-key \
  presentor -- node /absolute/path/to/presentor/dist/mcp-server.js
```

**Via config file** -- add to `.mcp.json` (project) or `~/.claude.json` (user-wide):

```json
{
  "mcpServers": {
    "presentor": {
      "type": "stdio",
      "command": "node",
      "args": ["/absolute/path/to/presentor/dist/mcp-server.js"],
      "env": {
        "PIXABAY_API_KEY": "your-pixabay-key",
        "GEMINI_API_KEY": "your-gemini-key"
      }
    }
  }
}
```

### Gemini CLI

Add to `.gemini/settings.json` (project) or `~/.gemini/settings.json` (user-wide):

```json
{
  "mcpServers": {
    "presentor": {
      "command": "node",
      "args": ["/absolute/path/to/presentor/dist/mcp-server.js"],
      "env": {
        "PIXABAY_API_KEY": "your-pixabay-key",
        "GEMINI_API_KEY": "your-gemini-key"
      }
    }
  }
}
```

### Cursor

Add to `.cursor/mcp.json` (project) or `~/.cursor/mcp.json` (user-wide):

```json
{
  "mcpServers": {
    "presentor": {
      "command": "node",
      "args": ["/absolute/path/to/presentor/dist/mcp-server.js"],
      "env": {
        "PIXABAY_API_KEY": "your-pixabay-key",
        "GEMINI_API_KEY": "your-gemini-key"
      }
    }
  }
}
```

### Other MCP Clients

Presentor communicates over stdio using the MCP JSON-RPC protocol. Point any MCP-compatible client to:

```
command: node
args:    ["/absolute/path/to/presentor/dist/mcp-server.js"]
```

Set `PIXABAY_API_KEY` and `GEMINI_API_KEY` environment variables for image features.

## Input Format

Presentations are written in a Markdown-like syntax with `---` as slide separators.

### Frontmatter (optional)

```markdown
---
title: "My Presentation"
author: "Your Name"
theme: dark
aspect-ratio: 16:9
accent-color: #E11D48
---
```

| Field | Values | Default |
|-------|--------|---------|
| `title` | Any text | Derived from first slide |
| `author` | Any text | -- |
| `theme` | `default`, `dark`, `minimal`, `corporate` | `default` |
| `aspect-ratio` | `16:9`, `4:3` | `16:9` |
| `accent-color` | Any hex color | Theme default |
| `style` | Theme name alias | -- |
| `font-family` | Any font name | Theme default |

### Slides

Separate slides with `---` (three or more dashes on a line by themselves):

```markdown
# First Slide Title
## Optional Subtitle

---

# Second Slide

- Bullet point one
- Bullet point two
  - Sub-bullet (indent with 2 spaces)

---

# Third Slide

1. Numbered item
2. Another item
```

### Content Types

```markdown
# Headings
## Subtitles
### Subheadings

- Bullet lists
- With **bold**, *italic*, and `code`

1. Numbered lists
2. With formatting

> Blockquotes for callouts

Plain text becomes paragraphs.
```

### Code Blocks

````markdown
```python
def hello():
    print("Hello, world!")
```
````

### Charts

````markdown
```chart
type: bar
title: Revenue by Quarter
Q1: 100
Q2: 150
Q3: 200
Q4: 180
```
````

Chart types: `bar`, `pie`, `line`

### Mind Maps

````markdown
```mindmap
center: Project Planning
- Research
  - Market Analysis
  - User Interviews
- Design
  - Wireframes
  - Prototypes
- Development
  - Frontend
  - Backend
```
````

### Images

```markdown
<!-- Regular image -->
![Alt text](path/to/image.png)

<!-- Stock photo from Pixabay (requires PIXABAY_API_KEY) -->
![stock: business meeting](horizontal)

<!-- AI-generated photo (requires GEMINI_API_KEY) -->
![ai-photo: futuristic city skyline at sunset]()

<!-- AI-generated illustration -->
![ai-illustration: workflow diagram showing CI/CD pipeline]()

<!-- AI-generated technical diagram -->
![ai-diagram: microservice architecture with 3 services]()
```

### Speaker Notes

```markdown
<!-- notes: These are speaker notes visible in presenter mode -->
```

### Slide Background

```markdown
<!-- bg: #1a1a2e -->
```

## MCP Tools

| Tool | Description |
|------|-------------|
| `get_format_guide` | Returns the complete input format documentation. Call this first. |
| `list_themes` | Lists available themes with descriptions. |
| `create_presentation` | Creates a presentation from markdown text. Outputs HTML or PPTX. |
| `search_stock_photos` | Searches Pixabay for royalty-free stock images. |
| `generate_ai_image` | Generates images via Google Gemini (photo, illustration, or diagram). |

### `create_presentation` Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `content` | string | *required* | Presentation content in Presentor markdown format |
| `format` | `"html"` \| `"pptx"` | `"html"` | Output format |
| `theme` | string | `"default"` | Theme name: default, dark, minimal, corporate |
| `outputDir` | string | system temp | Directory to save the output file |
| `fileName` | string | `"presentation"` | Output file name (without extension) |

## Image Generation Setup

### Pixabay (Stock Photos)

1. Sign up at [pixabay.com](https://pixabay.com/api/docs/)
2. Get your free API key from the API docs page
3. Set the environment variable:
   ```bash
   export PIXABAY_API_KEY="your-key-here"
   ```

### Google Gemini (AI Images)

1. Get an API key from [Google AI Studio](https://aistudio.google.com/apikey)
2. Set the environment variable:
   ```bash
   export GEMINI_API_KEY="your-key-here"
   ```

Both are optional. If keys are not set, image placeholders will appear instead.

## Themes

| Theme | Description |
|-------|-------------|
| **default** | Clean modern design with blue accent, Inter font. Good for most presentations. |
| **dark** | Dark background with blue/purple accents. Great for tech talks and demos. |
| **minimal** | Serif headings, understated palette. Good for academic or editorial content. |
| **corporate** | Professional blue palette with Calibri font. Board-room ready. |

You can override the accent color and font from frontmatter:

```markdown
---
theme: default
accent-color: #E11D48
font-family: Helvetica
---
```

## Examples

Four example presentations are included in the `examples/` directory:

- `sample.md` -- Feature showcase (9 slides)
- `minimal.md` -- Bare-bones quick deck (5 slides)
- `tech-talk.md` -- Technical presentation with code blocks (9 slides, dark theme)
- `charts-demo.md` -- Charts, mind maps, and image features (9 slides)

Use the `create_presentation` tool with any MCP client:

```
Use the create_presentation tool with this content:
---
title: "Quarterly Review"
theme: dark
---

# Quarterly Review
## Q4 2024

---

# Key Metrics
- Revenue up **158%**
- Users tripled
- Launched in 3 new markets

---

# Thank You
```

Or generate from the example files directly:

```
Read examples/sample.md and pass its content to create_presentation with format "html"
```

## Project Structure

```
presentor/
  src/
    mcp-server.ts         MCP server entry point
    parser.ts             Markdown-like text parser
    types.ts              TypeScript type definitions
    __tests__/            Test fixtures and suites
    generators/
      html.ts             Standalone HTML output with embedded CSS/JS
      pptx.ts             PowerPoint output via pptxgenjs
    graphics/
      charts.ts           SVG bar, pie, line chart generators
      mindmap.ts          SVG radial mind map generator
      index.ts            Graphics module exports
    images/
      pixabay.ts          Pixabay API client
      ai-generator.ts     Google Gemini image generation
      index.ts            Image module exports
    themes/
      index.ts            Theme definitions (default, dark, minimal, corporate)
  examples/               Sample presentations
  dist/                   Compiled JavaScript output
  install-mcp.sh          Interactive MCP client installer
```

## Development

```bash
npm run build          # Build TypeScript to dist/
npm test               # Run tests
npm run test:watch     # Watch mode
npm run dev            # TypeScript watch (recompile on save)
```

## License

MIT
