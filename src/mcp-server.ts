#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { parse } from './parser';
import { generateHTML } from './generators/html';
import { generatePPTX } from './generators/pptx';
import { listThemes } from './themes';
import { searchPhotos, downloadPhoto } from './images/pixabay';
import { generateImage } from './images/ai-generator';
import { ContentBlock, Presentation } from './types';

const server = new McpServer({
  name: 'presentor',
  version: '1.0.0',
});

// ── Format Guide ──

const FORMAT_GUIDE = `# Presentor Input Format Guide

## Overview
Write presentations in a Markdown-like format. Slides are separated by \`---\` (three dashes on a line).

## Frontmatter (Optional)
Place YAML-like metadata between \`---\` delimiters at the top:
\`\`\`
---
title: "My Presentation"
author: "Author Name"
theme: default
aspect-ratio: 16:9
accent-color: #2563EB
style: dark
---
\`\`\`

Available themes: default, dark, minimal, corporate
Available aspect ratios: 16:9, 4:3

## Slide Content

### Headings
- \`# Title\` — Slide title (first H1 becomes the slide title)
- \`## Subtitle\` — Slide subtitle
- \`### Subheading\` — Content subheading

### Text & Lists
- Plain text becomes paragraphs
- \`- item\` or \`* item\` — Bullet lists (indent with 2 spaces for sub-items)
- \`1. item\` — Numbered lists

### Rich Content
- \`> quote text\` — Blockquotes
- \`\\\`\\\`\\\`lang ... \\\`\\\`\\\`\` — Code blocks with optional language
- \`**bold**\`, \`*italic*\`, \`\\\`code\\\`\` — Inline formatting

### Images
- \`![alt text](path/or/url)\` — Regular images
- \`![stock: search query](horizontal)\` — Stock photo from Pixabay (orientation: horizontal/vertical or empty)
- \`![ai-photo: description]()\` — AI-generated photo-realistic image
- \`![ai-illustration: description]()\` — AI-generated illustration/flat design
- \`![ai-diagram: description]()\` — AI-generated technical diagram

### Charts
\`\`\`
\\\`\\\`\\\`chart
type: bar
title: Chart Title
Label 1: 100
Label 2: 200
Label 3: 150
\\\`\\\`\\\`
\`\`\`
Chart types: bar, pie, line

### Mind Maps
\`\`\`
\\\`\\\`\\\`mindmap
center: Central Topic
- Branch 1
  - Child 1
  - Child 2
- Branch 2
  - Child 3
\\\`\\\`\\\`
\`\`\`

### Speaker Notes
\`<!-- notes: Your speaker notes here -->\`

### Background
\`<!-- bg: #FF5733 -->\`

## Slide Layouts (Auto-detected)
- **Title slide**: First slide with only heading + subtitle
- **Section divider**: Slides with only a heading (gradient background)
- **Content slide**: Slides with heading + body content
- **Full image**: Slides with only an image

## Example
\`\`\`markdown
---
title: "Quarterly Review"
theme: dark
---

# Quarterly Review
## Q4 2024 Results

---

# Revenue Growth

\\\`\\\`\\\`chart
type: bar
title: Revenue ($M)
Q1: 12
Q2: 18
Q3: 24
Q4: 31
\\\`\\\`\\\`

---

# Key Takeaways

- Revenue up **158%** year-over-year
- User base nearly tripled
- Launched in 3 new markets

> "Best quarter in company history"

---

# Thank You
\`\`\`
`;

// ── Tool: get_format_guide ──

server.tool(
  'get_format_guide',
  'Get the complete input format guide for creating presentations with Presentor. Call this first to understand the markdown-like syntax for slides, charts, mind maps, and images.',
  async () => ({
    content: [{ type: 'text' as const, text: FORMAT_GUIDE }],
  })
);

// ── Tool: list_themes ──

server.tool(
  'list_themes',
  'List all available presentation themes with their descriptions.',
  async () => {
    const themes = listThemes();
    const descriptions: Record<string, string> = {
      default: 'Clean modern design with blue accent. Good for most presentations.',
      dark: 'Sleek dark mode with blue/purple accents. Great for tech talks.',
      minimal: 'Understated elegance with serif headings. Good for academic/editorial content.',
      corporate: 'Professional blue palette. Board-room ready.',
    };

    const text = themes
      .map(t => `- **${t}**: ${descriptions[t] || 'Custom theme'}`)
      .join('\n');

    return {
      content: [{ type: 'text' as const, text: `Available themes:\n${text}` }],
    };
  }
);

// ── Tool: create_presentation ──

server.tool(
  'create_presentation',
  `Create a presentation from markdown-like text input. Outputs HTML (interactive, opens in browser) or PPTX (PowerPoint).

The input should follow the Presentor markdown format:
- Frontmatter between --- for metadata (title, theme, author)
- Slides separated by ---
- # for titles, ## for subtitles
- Bullet lists, numbered lists, code blocks, blockquotes
- \`\`\`chart blocks for bar/pie/line charts
- \`\`\`mindmap blocks for mind maps
- ![stock: query]() for stock photos (requires PIXABAY_API_KEY)
- ![ai-photo: prompt]() for AI images (requires GEMINI_API_KEY)

Call get_format_guide first for the complete syntax reference.`,
  {
    content: z.string().describe('The presentation content in Presentor markdown format'),
    format: z.enum(['html', 'pptx']).default('html').describe('Output format: html or pptx'),
    theme: z.string().default('default').describe('Theme name: default, dark, minimal, corporate'),
    outputDir: z.string().optional().describe('Directory to save the output file. Defaults to system temp directory.'),
    fileName: z.string().optional().describe('Output file name (without extension). Defaults to "presentation".'),
  },
  async ({ content, format, theme, outputDir, fileName }) => {
    try {
      // Parse the content
      const presentation = parse(content);

      // Apply theme override
      if (theme && theme !== 'default') {
        presentation.meta.theme = theme;
      }

      // Resolve output path
      const dir = outputDir || os.tmpdir();
      const baseName = fileName || presentation.meta.title?.replace(/[^a-zA-Z0-9-_ ]/g, '').replace(/\s+/g, '-') || 'presentation';
      const ext = format === 'pptx' ? '.pptx' : '.html';
      const outputPath = path.resolve(dir, baseName + ext);

      // Ensure output directory exists
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });

      // Resolve images (stock photos and AI-generated)
      const imageDir = path.resolve(dir, baseName + '-images');
      await resolveImages(presentation, imageDir);

      // Generate output
      if (format === 'html') {
        const html = generateHTML(presentation);
        fs.writeFileSync(outputPath, html, 'utf-8');
      } else {
        await generatePPTX(presentation, outputPath);
      }

      return {
        content: [{
          type: 'text' as const,
          text: `Presentation generated successfully!\n\nFile: ${outputPath}\nFormat: ${format.toUpperCase()}\nSlides: ${presentation.slides.length}\nTheme: ${presentation.meta.theme || 'default'}\n\n${format === 'html' ? 'Open the HTML file in a browser to present. Use arrow keys to navigate, F for fullscreen.' : 'Open the .pptx file in PowerPoint, Keynote, or Google Slides.'}`,
        }],
      };
    } catch (err: any) {
      return {
        content: [{ type: 'text' as const, text: `Error creating presentation: ${err.message}` }],
        isError: true,
      };
    }
  }
);

// ── Tool: search_stock_photos ──

server.tool(
  'search_stock_photos',
  'Search for royalty-free stock photos on Pixabay. Returns image URLs that can be used in presentations. Requires PIXABAY_API_KEY environment variable.',
  {
    query: z.string().describe('Search query for stock photos'),
    orientation: z.enum(['horizontal', 'vertical']).optional().describe('Image orientation filter'),
    count: z.number().default(5).describe('Number of results to return (max 20)'),
  },
  async ({ query, orientation, count }) => {
    try {
      const results = await searchPhotos(query, {
        orientation,
        perPage: Math.min(count, 20),
      });

      if (results.length === 0) {
        return {
          content: [{ type: 'text' as const, text: `No photos found for "${query}". Try a different search term.` }],
        };
      }

      const text = results.map((r, i) =>
        `${i + 1}. **${r.tags}**\n   Preview: ${r.previewURL}\n   Full: ${r.largeImageURL}\n   Size: ${r.width}x${r.height} | By: ${r.user}`
      ).join('\n\n');

      return {
        content: [{ type: 'text' as const, text: `Found ${results.length} photos for "${query}":\n\n${text}` }],
      };
    } catch (err: any) {
      return {
        content: [{ type: 'text' as const, text: `Error searching photos: ${err.message}` }],
        isError: true,
      };
    }
  }
);

// ── Tool: generate_ai_image ──

server.tool(
  'generate_ai_image',
  'Generate an AI image using Google Gemini. Supports photo-realistic images, illustrations, and technical diagrams. Requires GEMINI_API_KEY environment variable.',
  {
    prompt: z.string().describe('Description of the image to generate'),
    style: z.enum(['photo', 'illustration', 'diagram']).describe('Image style: photo (realistic), illustration (flat/vector), diagram (technical)'),
    outputPath: z.string().describe('Full path where the generated image should be saved (e.g., /tmp/my-image.png)'),
  },
  async ({ prompt, style, outputPath }) => {
    try {
      const result = await generateImage({ prompt, style, outputPath });
      return {
        content: [{ type: 'text' as const, text: `Image generated successfully!\n\nSaved to: ${result.path}\nStyle: ${style}\nPrompt: ${prompt}` }],
      };
    } catch (err: any) {
      return {
        content: [{ type: 'text' as const, text: `Error generating image: ${err.message}` }],
        isError: true,
      };
    }
  }
);

// ── Image Resolution Pipeline ──

async function resolveImages(presentation: Presentation, imageDir: string): Promise<void> {
  let imageIndex = 0;

  for (const slide of presentation.slides) {
    for (const block of slide.blocks) {
      if (block.type === 'stock-image' && block.imageQuery) {
        await resolveStockImage(block, imageDir, imageIndex++);
      } else if (block.type === 'ai-image') {
        await resolveAIImage(block, imageDir, imageIndex++);
      }
    }
  }
}

async function resolveStockImage(block: ContentBlock, imageDir: string, index: number): Promise<void> {
  if (!process.env.PIXABAY_API_KEY) {
    return; // Skip silently if no API key — placeholder will show
  }

  try {
    const orientation = (block.src === 'horizontal' || block.src === 'vertical')
      ? block.src as 'horizontal' | 'vertical'
      : undefined;

    const results = await searchPhotos(block.imageQuery!, { orientation, perPage: 1 });
    if (results.length > 0) {
      const outputPath = path.join(imageDir, `stock-${index}.jpg`);
      await downloadPhoto(results[0].largeImageURL, outputPath);
      block.resolvedSrc = outputPath;
    }
  } catch {
    // Failed to fetch stock photo — will show placeholder
  }
}

async function resolveAIImage(block: ContentBlock, imageDir: string, index: number): Promise<void> {
  if (!process.env.GEMINI_API_KEY) {
    return; // Skip silently if no API key
  }

  try {
    const outputPath = path.join(imageDir, `ai-${index}.png`);
    const result = await generateImage({
      prompt: block.content,
      style: block.imageStyle || 'illustration',
      outputPath,
    });
    block.resolvedSrc = result.path;
  } catch {
    // Failed to generate image — will show placeholder
  }
}

// ── Server startup ──

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error('Fatal error starting Presentor MCP server:', err);
  process.exit(1);
});
