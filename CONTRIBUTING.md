# Contributing to Presentor

## Development Setup

```bash
# Clone the repo
git clone https://github.com/iroth/presentor.git
cd presentor

# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Watch mode for development
npm run dev          # TypeScript watch
npm run test:watch   # Vitest watch
```

## Adding a Theme

1. Open `src/themes/index.ts`
2. Define a new `Theme` object following the existing pattern (colors, fonts, slide dimensions)
3. Add it to the `themes` record
4. Add a description in `src/mcp-server.ts` under the `list_themes` tool

## Adding an Installer Target

The installer (`install-mcp.sh`) uses a target registry pattern. To add a new MCP client:

1. Open `install-mcp.sh`
2. Add a new target block with these functions:
   - `target_<name>_detect` — detect if the client is installed
   - `target_<name>_config_path` — return the config file path
   - `target_<name>_install` — perform the installation
3. Register the target in the `ALL_TARGETS` array

Each target is self-contained (~15 lines). See existing targets for examples.

## Running Tests

```bash
npm test              # Run all tests once
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

## Project Structure

```
src/
  mcp-server.ts         MCP server entry point
  parser.ts             Markdown-like text parser
  types.ts              TypeScript type definitions
  generators/
    html.ts             HTML output with embedded CSS/JS
    pptx.ts             PowerPoint output via pptxgenjs
  graphics/
    charts.ts           SVG chart generators
    mindmap.ts          SVG mind map generator
  images/
    pixabay.ts          Pixabay API client
    ai-generator.ts     Gemini image generation
  themes/
    index.ts            Theme definitions
  __tests__/            Unit tests
```
