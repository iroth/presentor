import { describe, it, expect } from 'vitest';
import { parse } from '../parser';
import {
  MINIMAL_INPUT,
  FRONTMATTER_INPUT,
  MULTI_SLIDE_INPUT,
  CHART_INPUT,
  MINDMAP_INPUT,
  CODE_BLOCK_INPUT,
  IMAGE_INPUT,
  QUOTE_INPUT,
  NUMBERED_LIST_INPUT,
  SPEAKER_NOTES_INPUT,
  BACKGROUND_INPUT,
  STOCK_IMAGE_INPUT,
  AI_IMAGE_INPUT,
  INLINE_FORMAT_INPUT,
} from './fixtures';

// ── Frontmatter parsing ──

describe('Frontmatter parsing', () => {
  it('parses title from frontmatter', () => {
    const result = parse(FRONTMATTER_INPUT);
    expect(result.meta.title).toBe('My Presentation');
  });

  it('parses author, date, theme', () => {
    const input = `---
title: Test
author: John
date: 2025-01-01
theme: dark
---

# Slide`;
    const result = parse(input);
    expect(result.meta.author).toBe('John');
    expect(result.meta.date).toBe('2025-01-01');
    expect(result.meta.theme).toBe('dark');
  });

  it('parses aspect-ratio as 4:3', () => {
    const result = parse(FRONTMATTER_INPUT);
    expect(result.meta.aspectRatio).toBe('4:3');
  });

  it('parses accent-color', () => {
    const result = parse(FRONTMATTER_INPUT);
    expect(result.meta.accentColor).toBe('#E11D48');
  });

  it('parses font-family', () => {
    const input = `---
title: Test
font-family: Roboto
---

# Slide`;
    const result = parse(input);
    expect(result.meta.fontFamily).toBe('Roboto');
  });

  it('defaults aspectRatio to 16:9 when no frontmatter', () => {
    const result = parse(MINIMAL_INPUT);
    expect(result.meta.aspectRatio).toBe('16:9');
  });

  it('handles missing frontmatter gracefully', () => {
    const result = parse('# Just a heading\n\nSome text');
    expect(result.meta.aspectRatio).toBe('16:9');
    expect(result.meta.theme).toBeUndefined();
    expect(result.slides.length).toBeGreaterThan(0);
  });
});

// ── Slide splitting ──

describe('Slide splitting', () => {
  it('splits slides on --- separator', () => {
    const result = parse(MULTI_SLIDE_INPUT);
    expect(result.slides.length).toBe(3);
  });

  it('handles multiple slides', () => {
    const input = `# One\n\n---\n\n# Two\n\n---\n\n# Three\n\n---\n\n# Four`;
    const result = parse(input);
    expect(result.slides.length).toBe(4);
  });

  it('does not split on --- inside code blocks', () => {
    const input = `# Slide

\`\`\`python
a = 1
---
b = 2
\`\`\``;
    const result = parse(input);
    expect(result.slides.length).toBe(1);
    const codeBlock = result.slides[0].blocks.find(b => b.type === 'code');
    expect(codeBlock).toBeDefined();
    expect(codeBlock!.content).toContain('---');
  });

  it('filters out empty slide chunks', () => {
    const input = `# Slide One\n\n---\n\n\n\n---\n\n# Slide Two`;
    const result = parse(input);
    // The empty chunk between the two separators should be filtered out
    expect(result.slides.length).toBe(2);
  });

  it('handles single slide (no separators)', () => {
    const result = parse(MINIMAL_INPUT);
    expect(result.slides.length).toBe(1);
  });
});

// ── Content block parsing ──

describe('Content block parsing', () => {
  it('parses heading (# Title)', () => {
    const result = parse(MINIMAL_INPUT);
    expect(result.slides[0].title).toBe('Hello');
  });

  it('parses subtitle (## Subtitle)', () => {
    const input = `# Main Title\n\n## A Subtitle`;
    const result = parse(input);
    expect(result.slides[0].subtitle).toBe('A Subtitle');
  });

  it('parses subheading (### Subheading)', () => {
    const input = `# Title\n\n### My Subheading\n\nSome text`;
    const result = parse(input);
    const sub = result.slides[0].blocks.find(b => b.type === 'subheading');
    expect(sub).toBeDefined();
    expect(sub!.content).toBe('My Subheading');
    expect(sub!.level).toBe(3);
  });

  it('parses bullet list with items', () => {
    const input = `# List\n\n- Item A\n- Item B\n- Item C`;
    const result = parse(input);
    const bullets = result.slides[0].blocks.find(b => b.type === 'bullets');
    expect(bullets).toBeDefined();
    expect(bullets!.items).toEqual(['Item A', 'Item B', 'Item C']);
  });

  it('parses bullet list with sub-items (indented)', () => {
    const input = `# List\n\n- Parent\n  - Child`;
    const result = parse(input);
    const bullets = result.slides[0].blocks.find(b => b.type === 'bullets');
    expect(bullets).toBeDefined();
    expect(bullets!.items!.length).toBe(2);
    // The parser treats indented sub-items the same as regular bullet items
    // because the trimmed form matches the bullet pattern first
    expect(bullets!.items![0]).toBe('Parent');
    expect(bullets!.items![1]).toBe('Child');
  });

  it('parses numbered list', () => {
    const result = parse(NUMBERED_LIST_INPUT);
    const numbered = result.slides[0].blocks.find(b => b.type === 'numbered');
    expect(numbered).toBeDefined();
    expect(numbered!.items).toEqual(['First', 'Second', 'Third']);
  });

  it('parses code block with language', () => {
    const result = parse(CODE_BLOCK_INPUT);
    const code = result.slides[0].blocks.find(b => b.type === 'code');
    expect(code).toBeDefined();
    expect(code!.language).toBe('python');
    expect(code!.content).toContain('def hello');
  });

  it('parses blockquote', () => {
    const result = parse(QUOTE_INPUT);
    const quote = result.slides[0].blocks.find(b => b.type === 'quote');
    expect(quote).toBeDefined();
    expect(quote!.content).toBe('This is a quote');
  });

  it('parses regular image ![alt](src)', () => {
    const result = parse(IMAGE_INPUT);
    const img = result.slides[0].blocks.find(b => b.type === 'image');
    expect(img).toBeDefined();
    expect(img!.alt).toBe('Alt text');
    expect(img!.src).toBe('image.png');
  });

  it('parses stock image directive', () => {
    const result = parse(STOCK_IMAGE_INPUT);
    const stock = result.slides[0].blocks.find(b => b.type === 'stock-image');
    expect(stock).toBeDefined();
    expect(stock!.imageQuery).toBe('business meeting');
    expect(stock!.src).toBe('horizontal');
  });

  it('parses AI image directive', () => {
    const result = parse(AI_IMAGE_INPUT);
    const ai = result.slides[0].blocks.find(b => b.type === 'ai-image');
    expect(ai).toBeDefined();
    expect(ai!.content).toBe('futuristic city');
    expect(ai!.imageStyle).toBe('photo');
  });

  it('parses speaker notes', () => {
    const result = parse(SPEAKER_NOTES_INPUT);
    expect(result.slides[0].notes).toBe('These are speaker notes');
  });

  it('parses background directive', () => {
    const result = parse(BACKGROUND_INPUT);
    expect(result.slides[0].background).toBe('#1a1a2e');
  });

  it('parses plain text paragraph', () => {
    const result = parse(MINIMAL_INPUT);
    const text = result.slides[0].blocks.find(b => b.type === 'text');
    expect(text).toBeDefined();
    expect(text!.content).toBe('World');
  });
});

// ── Chart parsing ──

describe('Chart parsing', () => {
  it('parses chart block with type, title, and data items', () => {
    const result = parse(CHART_INPUT);
    const chart = result.slides[0].blocks.find(b => b.type === 'chart');
    expect(chart).toBeDefined();
    expect(chart!.chartData).toBeDefined();
    expect(chart!.chartData!.type).toBe('bar');
    expect(chart!.chartData!.title).toBe('Revenue');
    expect(chart!.chartData!.items).toEqual([
      { label: 'Q1', value: 100 },
      { label: 'Q2', value: 150 },
      { label: 'Q3', value: 200 },
    ]);
  });

  it('defaults chart type to bar', () => {
    const input = `# Chart\n\n\`\`\`chart\ntitle: Sales\nA: 10\nB: 20\n\`\`\``;
    const result = parse(input);
    const chart = result.slides[0].blocks.find(b => b.type === 'chart');
    expect(chart!.chartData!.type).toBe('bar');
  });
});

// ── Mind map parsing ──

describe('Mind map parsing', () => {
  it('parses mindmap center and branches', () => {
    const result = parse(MINDMAP_INPUT);
    const mm = result.slides[0].blocks.find(b => b.type === 'mindmap');
    expect(mm).toBeDefined();
    expect(mm!.mindmapData).toBeDefined();
    expect(mm!.mindmapData!.center).toBe('Planning');
    expect(mm!.mindmapData!.branches.length).toBe(2);
    expect(mm!.mindmapData!.branches[0].label).toBe('Research');
    expect(mm!.mindmapData!.branches[1].label).toBe('Design');
  });

  it('parses mindmap children under branches', () => {
    const result = parse(MINDMAP_INPUT);
    const mm = result.slides[0].blocks.find(b => b.type === 'mindmap');
    expect(mm!.mindmapData!.branches[0].children).toEqual(['Market', 'Users']);
    expect(mm!.mindmapData!.branches[1].children).toEqual(['Wireframes', 'Prototypes']);
  });
});

// ── Layout inference ──

describe('Layout inference', () => {
  it('infers title layout for first slide with only heading', () => {
    const input = `# Welcome`;
    const result = parse(input);
    expect(result.slides[0].layout).toBe('title');
  });

  it('infers section layout for non-first slide with only heading', () => {
    const result = parse(MULTI_SLIDE_INPUT);
    // Third slide is "# Section Divider" with no content blocks, non-first slide
    expect(result.slides[2].layout).toBe('section');
  });

  it('infers content layout for slide with heading and content blocks', () => {
    const result = parse(MULTI_SLIDE_INPUT);
    // Second slide has "# Content Slide" + bullet list
    expect(result.slides[1].layout).toBe('content');
  });

  it('infers image-full layout for slide with only an image block', () => {
    const input = `# Title\n\n---\n\n![Full bleed](hero.jpg)`;
    const result = parse(input);
    // Second slide has only an image, no title
    expect(result.slides[1].layout).toBe('image-full');
  });
});
