// Shared test inputs for Presentor unit tests

/** Simplest valid input: a heading and a paragraph */
export const MINIMAL_INPUT = `# Hello

World`;

/** Input with full frontmatter (title, author, theme, aspect-ratio, accent-color) */
export const FRONTMATTER_INPUT = `---
title: My Presentation
author: Jane Doe
theme: dark
aspect-ratio: 4:3
accent-color: #E11D48
---

# Welcome

Opening slide content`;

/** 3 slides separated by --- */
export const MULTI_SLIDE_INPUT = `# Title Slide

---

# Content Slide

- Bullet one
- Bullet two
- Bullet three

---

# Section Divider`;

/** Slide with a chart code block */
export const CHART_INPUT = `# Revenue Report

\`\`\`chart
type: bar
title: Revenue
Q1: 100
Q2: 150
Q3: 200
\`\`\``;

/** Slide with a mindmap code block */
export const MINDMAP_INPUT = `# Planning Overview

\`\`\`mindmap
center: Planning
- Research
  - Market
  - Users
- Design
  - Wireframes
  - Prototypes
\`\`\``;

/** Slide with a Python code block */
export const CODE_BLOCK_INPUT = `# Code Example

\`\`\`python
def hello():
    print("Hello, world!")
\`\`\``;

/** Slide with an image */
export const IMAGE_INPUT = `# Gallery

![Alt text](image.png)`;

/** Slide with a blockquote */
export const QUOTE_INPUT = `# Inspiration

> This is a quote`;

/** Slide with a numbered list */
export const NUMBERED_LIST_INPUT = `# Steps

1. First
2. Second
3. Third`;

/** Slide with speaker notes */
export const SPEAKER_NOTES_INPUT = `# Slide Title

Some content

<!-- notes: These are speaker notes -->`;

/** Slide with a background directive */
export const BACKGROUND_INPUT = `# Dark Slide

<!-- bg: #1a1a2e -->

Some text here`;

/** Slide with a stock image directive */
export const STOCK_IMAGE_INPUT = `# Meeting

![stock: business meeting](horizontal)`;

/** Slide with an AI image directive */
export const AI_IMAGE_INPUT = `# Future

![ai-photo: futuristic city]()`;

/** Slide with inline formatting */
export const INLINE_FORMAT_INPUT = `# Formatting

This has **bold**, *italic*, \`code\`, and [link](http://example.com)`;
