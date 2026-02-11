import { describe, it, expect } from 'vitest';
import { generateHTML, escapeHtml, formatInlineMarkdown } from '../../generators/html';
import { parse } from '../../parser';
import {
  MINIMAL_INPUT,
  MULTI_SLIDE_INPUT,
  CODE_BLOCK_INPUT,
  QUOTE_INPUT,
  FRONTMATTER_INPUT,
} from '../fixtures';

// ── HTML structure ──

describe('HTML structure', () => {
  it('generates valid HTML document', () => {
    const presentation = parse(MINIMAL_INPUT);
    const html = generateHTML(presentation);
    expect(html).toContain('<html');
    expect(html).toContain('</html>');
    expect(html).toContain('<head>');
    expect(html).toContain('<body>');
  });

  it('includes DOCTYPE', () => {
    const presentation = parse(MINIMAL_INPUT);
    const html = generateHTML(presentation);
    expect(html).toMatch(/^<!DOCTYPE html>/);
  });

  it('includes presentation title in <title> tag', () => {
    const presentation = parse(FRONTMATTER_INPUT);
    const html = generateHTML(presentation);
    expect(html).toContain('<title>My Presentation</title>');
  });

  it('includes slide counter', () => {
    const presentation = parse(MINIMAL_INPUT);
    const html = generateHTML(presentation);
    expect(html).toContain('class="slide-counter"');
  });

  it('includes progress bar', () => {
    const presentation = parse(MINIMAL_INPUT);
    const html = generateHTML(presentation);
    expect(html).toContain('class="progress-bar"');
    expect(html).toContain('class="progress-fill"');
  });

  it('generates correct number of slide divs', () => {
    const presentation = parse(MULTI_SLIDE_INPUT);
    const html = generateHTML(presentation);
    const slideCount = (html.match(/class="slide\s/g) || []).length;
    expect(slideCount).toBe(3);
  });
});

// ── Rendering ──

describe('Rendering', () => {
  it('renders title slide with h1', () => {
    // MINIMAL_INPUT has content so it becomes a 'content' layout with h2.
    // Use an input with only a heading (no body) for a title layout with h1.
    const titleOnlyInput = `# Welcome`;
    const presentation = parse(titleOnlyInput);
    const html = generateHTML(presentation);
    expect(html).toContain('<h1');
    expect(html).toContain('Welcome');
  });

  it('renders bullet list as ul', () => {
    const input = `# Bullets\n\n- Alpha\n- Beta`;
    const presentation = parse(input);
    const html = generateHTML(presentation);
    expect(html).toContain('<ul');
    expect(html).toContain('<li>');
    expect(html).toContain('Alpha');
  });

  it('renders code block with language class', () => {
    const presentation = parse(CODE_BLOCK_INPUT);
    const html = generateHTML(presentation);
    expect(html).toContain('class="language-python"');
    expect(html).toContain('def hello');
  });

  it('renders blockquote', () => {
    const presentation = parse(QUOTE_INPUT);
    const html = generateHTML(presentation);
    expect(html).toContain('<blockquote');
    expect(html).toContain('This is a quote');
  });
});

// ── Inline markdown ──

describe('Inline markdown', () => {
  it('formatInlineMarkdown converts **bold** to <strong>', () => {
    const result = formatInlineMarkdown('This is **bold** text');
    expect(result).toContain('<strong>bold</strong>');
  });

  it('formatInlineMarkdown converts *italic* to <em>', () => {
    const result = formatInlineMarkdown('This is *italic* text');
    expect(result).toContain('<em>italic</em>');
  });

  it('formatInlineMarkdown converts `code` to <code>', () => {
    const result = formatInlineMarkdown('Use `console.log` here');
    expect(result).toContain('<code');
    expect(result).toContain('console.log');
  });

  it('escapeHtml escapes &, <, >, "', () => {
    expect(escapeHtml('&')).toBe('&amp;');
    expect(escapeHtml('<')).toBe('&lt;');
    expect(escapeHtml('>')).toBe('&gt;');
    expect(escapeHtml('"')).toBe('&quot;');
    expect(escapeHtml('a & b < c > d "e"')).toBe('a &amp; b &lt; c &gt; d &quot;e&quot;');
  });
});
