import {
  Presentation,
  PresentationMeta,
  Slide,
  ContentBlock,
  SlideLayout,
  ChartData,
  MindMapData,
} from './types';

/**
 * Parses a markdown-like text input into a structured Presentation.
 *
 * Input format:
 *   - YAML-like frontmatter between --- delimiters (optional)
 *   - Slides separated by --- (horizontal rule with 3+ dashes on its own line)
 *   - # for slide titles, ## for subtitles
 *   - - or * for bullet lists
 *   - 1. 2. for numbered lists
 *   - > for blockquotes
 *   - ```lang for code blocks
 *   - ![alt](src) for images
 *   - <!-- notes: ... --> for speaker notes
 *   - Plain text for paragraphs
 */
export function parse(input: string): Presentation {
  const lines = input.split('\n');
  const { meta, bodyStart } = parseFrontmatter(lines);
  const slideChunks = splitIntoSlides(lines, bodyStart);
  const slides = slideChunks.map((chunk, i) => parseSlide(chunk, i === 0 && !hasFrontmatterTitle(meta)));

  // If no title in frontmatter, derive from first slide
  if (!meta.title && slides.length > 0 && slides[0].title) {
    meta.title = slides[0].title;
  }

  return { meta, slides };
}

function hasFrontmatterTitle(meta: PresentationMeta): boolean {
  return !!meta.title;
}

// ── Frontmatter parsing ──

function parseFrontmatter(lines: string[]): { meta: PresentationMeta; bodyStart: number } {
  const meta: PresentationMeta = {
    aspectRatio: '16:9',
  };

  // Check if document starts with ---
  if (lines.length < 2 || lines[0].trim() !== '---') {
    return { meta, bodyStart: 0 };
  }

  // Find closing ---
  let endIndex = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      endIndex = i;
      break;
    }
  }

  if (endIndex === -1) {
    return { meta, bodyStart: 0 };
  }

  // Parse YAML-like key: value pairs
  for (let i = 1; i < endIndex; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith('#')) continue;

    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;

    const key = line.slice(0, colonIdx).trim().toLowerCase();
    const value = line.slice(colonIdx + 1).trim().replace(/^["']|["']$/g, '');

    switch (key) {
      case 'title': meta.title = value; break;
      case 'author': meta.author = value; break;
      case 'date': meta.date = value; break;
      case 'theme': meta.theme = value; break;
      case 'aspect-ratio':
      case 'aspectratio':
        if (value === '4:3' || value === '16:9') meta.aspectRatio = value;
        break;
      case 'accent-color':
      case 'accentcolor':
      case 'color':
        meta.accentColor = value; break;
      case 'font':
      case 'font-family':
      case 'fontfamily':
        meta.fontFamily = value; break;
      case 'style': meta.style = value; break;
    }
  }

  return { meta, bodyStart: endIndex + 1 };
}

// ── Slide splitting ──

function splitIntoSlides(lines: string[], startIndex: number): string[][] {
  const chunks: string[][] = [];
  let current: string[] = [];

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];
    // Slide separator: a line that is just --- or more dashes (at least 3)
    // But not if we're inside a code block
    if (/^-{3,}\s*$/.test(line) && !isInsideCodeBlock(current)) {
      if (current.length > 0 || chunks.length === 0) {
        chunks.push(current);
        current = [];
      }
    } else {
      current.push(line);
    }
  }

  // Don't forget the last chunk
  if (current.length > 0) {
    chunks.push(current);
  }

  // Filter out empty slide chunks
  return chunks.filter(chunk => chunk.some(line => line.trim() !== ''));
}

function isInsideCodeBlock(lines: string[]): boolean {
  let count = 0;
  for (const line of lines) {
    if (/^```/.test(line.trim())) count++;
  }
  return count % 2 === 1; // odd means we're inside a code block
}

// ── Slide parsing ──

function parseSlide(lines: string[], isFirstSlide: boolean): Slide {
  const blocks: ContentBlock[] = [];
  let title: string | undefined;
  let subtitle: string | undefined;
  let notes: string | undefined;
  let background: string | undefined;

  let i = 0;

  // Skip leading empty lines
  while (i < lines.length && lines[i].trim() === '') i++;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Empty line - skip
    if (trimmed === '') {
      i++;
      continue;
    }

    // Speaker notes: <!-- notes: ... -->
    if (trimmed.startsWith('<!-- notes:') || trimmed.startsWith('<!--notes:')) {
      const noteContent = extractNotes(lines, i);
      notes = noteContent.text;
      i = noteContent.endIndex + 1;
      continue;
    }

    // Background directive: <!-- bg: color or url -->
    if (trimmed.startsWith('<!-- bg:') || trimmed.startsWith('<!--bg:')) {
      background = trimmed.replace(/<!--\s*bg:\s*/, '').replace(/\s*-->/, '').trim();
      i++;
      continue;
    }

    // Heading level 1: # Title
    if (/^#\s+/.test(trimmed) && !title) {
      title = trimmed.replace(/^#\s+/, '');
      i++;
      continue;
    }

    // Additional H1 after title → treat as content heading
    if (/^#\s+/.test(trimmed) && title) {
      blocks.push({
        type: 'heading',
        content: trimmed.replace(/^#\s+/, ''),
        level: 1,
      });
      i++;
      continue;
    }

    // Heading level 2: ## Subtitle
    if (/^##\s+/.test(trimmed)) {
      const text = trimmed.replace(/^##\s+/, '');
      if (!title) {
        title = text;
      } else if (!subtitle) {
        subtitle = text;
      } else {
        blocks.push({
          type: 'subheading',
          content: text,
          level: 2,
        });
      }
      i++;
      continue;
    }

    // Heading level 3: ### ...
    if (/^###\s+/.test(trimmed)) {
      blocks.push({
        type: 'subheading',
        content: trimmed.replace(/^###\s+/, ''),
        level: 3,
      });
      i++;
      continue;
    }

    // Code block: ``` (also handles ```chart and ```mindmap)
    if (/^```/.test(trimmed)) {
      const lang = trimmed.replace(/^```/, '').trim().toLowerCase();

      if (lang === 'chart') {
        const chartResult = parseChartBlock(lines, i);
        blocks.push(chartResult.block);
        i = chartResult.endIndex + 1;
        continue;
      }

      if (lang === 'mindmap') {
        const mindmapResult = parseMindMapBlock(lines, i);
        blocks.push(mindmapResult.block);
        i = mindmapResult.endIndex + 1;
        continue;
      }

      const codeBlock = parseCodeBlock(lines, i);
      blocks.push(codeBlock.block);
      i = codeBlock.endIndex + 1;
      continue;
    }

    // Image directives: stock photos and AI-generated images
    // ![stock: query](orientation)
    const stockMatch = trimmed.match(/^!\[stock:\s*(.+?)\]\(([^)]*)\)/);
    if (stockMatch) {
      blocks.push({
        type: 'stock-image',
        content: stockMatch[1],
        imageQuery: stockMatch[1],
        alt: stockMatch[1],
        src: stockMatch[2] || undefined,   // orientation or empty
      });
      i++;
      continue;
    }

    // ![ai-photo: prompt]() or ![ai-illustration: prompt]() or ![ai-diagram: prompt]()
    const aiMatch = trimmed.match(/^!\[ai-(photo|illustration|diagram):\s*(.+?)\]\(([^)]*)\)/);
    if (aiMatch) {
      blocks.push({
        type: 'ai-image',
        content: aiMatch[2],
        imageStyle: aiMatch[1] as 'photo' | 'illustration' | 'diagram',
        alt: aiMatch[2],
      });
      i++;
      continue;
    }

    // Regular image: ![alt](src)
    const imgMatch = trimmed.match(/^!\[([^\]]*)\]\(([^)]*)\)/);
    if (imgMatch) {
      blocks.push({
        type: 'image',
        content: imgMatch[2] || '',
        alt: imgMatch[1],
        src: imgMatch[2] || undefined,
      });
      i++;
      continue;
    }

    // Blockquote: > text
    if (/^>\s+/.test(trimmed)) {
      const quoteResult = parseBlockquote(lines, i);
      blocks.push(quoteResult.block);
      i = quoteResult.endIndex + 1;
      continue;
    }

    // Bullet list: - item or * item
    if (/^[-*]\s+/.test(trimmed)) {
      const listResult = parseBulletList(lines, i);
      blocks.push(listResult.block);
      i = listResult.endIndex + 1;
      continue;
    }

    // Numbered list: 1. item
    if (/^\d+\.\s+/.test(trimmed)) {
      const listResult = parseNumberedList(lines, i);
      blocks.push(listResult.block);
      i = listResult.endIndex + 1;
      continue;
    }

    // Plain text paragraph
    const paraResult = parseParagraph(lines, i);
    blocks.push(paraResult.block);
    i = paraResult.endIndex + 1;
  }

  // Determine layout
  const layout = inferLayout(title, subtitle, blocks, isFirstSlide);

  return { layout, title, subtitle, blocks, notes, background };
}

// ── Content parsers ──

function extractNotes(lines: string[], startIndex: number): { text: string; endIndex: number } {
  let text = '';
  let i = startIndex;

  // Single line notes
  const singleLine = lines[i].trim();
  if (singleLine.includes('-->')) {
    text = singleLine
      .replace(/<!--\s*notes:\s*/, '')
      .replace(/\s*-->/, '')
      .trim();
    return { text, endIndex: i };
  }

  // Multi-line notes
  text = singleLine.replace(/<!--\s*notes:\s*/, '').trim();
  i++;
  while (i < lines.length) {
    const line = lines[i].trim();
    if (line.includes('-->')) {
      text += '\n' + line.replace(/\s*-->/, '').trim();
      return { text: text.trim(), endIndex: i };
    }
    text += '\n' + line;
    i++;
  }

  return { text: text.trim(), endIndex: i - 1 };
}

function parseCodeBlock(lines: string[], startIndex: number): { block: ContentBlock; endIndex: number } {
  const firstLine = lines[startIndex].trim();
  const language = firstLine.replace(/^```/, '').trim() || undefined;
  const codeLines: string[] = [];
  let i = startIndex + 1;

  while (i < lines.length) {
    if (/^```\s*$/.test(lines[i].trim())) {
      return {
        block: {
          type: 'code',
          content: codeLines.join('\n'),
          language,
        },
        endIndex: i,
      };
    }
    codeLines.push(lines[i]);
    i++;
  }

  // Unterminated code block
  return {
    block: {
      type: 'code',
      content: codeLines.join('\n'),
      language,
    },
    endIndex: i - 1,
  };
}

function parseBlockquote(lines: string[], startIndex: number): { block: ContentBlock; endIndex: number } {
  const quoteLines: string[] = [];
  let i = startIndex;

  while (i < lines.length && /^>\s*/.test(lines[i].trim())) {
    quoteLines.push(lines[i].trim().replace(/^>\s*/, ''));
    i++;
  }

  return {
    block: {
      type: 'quote',
      content: quoteLines.join('\n'),
    },
    endIndex: i - 1,
  };
}

function parseBulletList(lines: string[], startIndex: number): { block: ContentBlock; endIndex: number } {
  const items: string[] = [];
  let i = startIndex;

  while (i < lines.length) {
    const trimmed = lines[i].trim();
    if (/^[-*]\s+/.test(trimmed)) {
      items.push(trimmed.replace(/^[-*]\s+/, ''));
      i++;
    } else if (/^\s+[-*]\s+/.test(lines[i]) && items.length > 0) {
      // Sub-item — append with indent marker
      items.push('  ' + lines[i].trim().replace(/^[-*]\s+/, ''));
      i++;
    } else if (trimmed === '' && i + 1 < lines.length && /^\s*[-*]\s+/.test(lines[i + 1])) {
      // Empty line between list items
      i++;
    } else {
      break;
    }
  }

  return {
    block: {
      type: 'bullets',
      content: items.join('\n'),
      items,
    },
    endIndex: i - 1,
  };
}

function parseNumberedList(lines: string[], startIndex: number): { block: ContentBlock; endIndex: number } {
  const items: string[] = [];
  let i = startIndex;

  while (i < lines.length) {
    const trimmed = lines[i].trim();
    if (/^\d+\.\s+/.test(trimmed)) {
      items.push(trimmed.replace(/^\d+\.\s+/, ''));
      i++;
    } else if (trimmed === '' && i + 1 < lines.length && /^\d+\.\s+/.test(lines[i + 1].trim())) {
      i++;
    } else {
      break;
    }
  }

  return {
    block: {
      type: 'numbered',
      content: items.join('\n'),
      items,
    },
    endIndex: i - 1,
  };
}

function parseParagraph(lines: string[], startIndex: number): { block: ContentBlock; endIndex: number } {
  const paraLines: string[] = [];
  let i = startIndex;

  while (i < lines.length) {
    const trimmed = lines[i].trim();
    if (
      trimmed === '' ||
      /^#{1,3}\s+/.test(trimmed) ||
      /^[-*]\s+/.test(trimmed) ||
      /^\d+\.\s+/.test(trimmed) ||
      /^```/.test(trimmed) ||
      /^>\s+/.test(trimmed) ||
      /^!\[/.test(trimmed) ||
      /^<!--/.test(trimmed) ||
      /^-{3,}\s*$/.test(trimmed)
    ) {
      break;
    }
    paraLines.push(trimmed);
    i++;
  }

  return {
    block: {
      type: 'text',
      content: paraLines.join(' '),
    },
    endIndex: i - 1,
  };
}

// ── Chart and mind map parsers ──

function parseChartBlock(lines: string[], startIndex: number): { block: ContentBlock; endIndex: number } {
  const dataLines: string[] = [];
  let i = startIndex + 1; // skip the ```chart line

  while (i < lines.length) {
    if (/^```\s*$/.test(lines[i].trim())) {
      break;
    }
    dataLines.push(lines[i]);
    i++;
  }

  const chartData = parseChartData(dataLines);

  return {
    block: {
      type: 'chart',
      content: dataLines.join('\n'),
      chartData,
    },
    endIndex: i,
  };
}

function parseChartData(lines: string[]): ChartData {
  let type: 'bar' | 'pie' | 'line' = 'bar';
  let title: string | undefined;
  const items: { label: string; value: number }[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // type: bar/pie/line
    const typeMatch = trimmed.match(/^type:\s*(bar|pie|line)$/i);
    if (typeMatch) {
      type = typeMatch[1].toLowerCase() as 'bar' | 'pie' | 'line';
      continue;
    }

    // title: Some Title
    const titleMatch = trimmed.match(/^title:\s*(.+)$/i);
    if (titleMatch) {
      title = titleMatch[1].trim();
      continue;
    }

    // Label: value  (data row)
    const dataMatch = trimmed.match(/^(.+?):\s*(\d+(?:\.\d+)?)$/);
    if (dataMatch) {
      items.push({
        label: dataMatch[1].trim(),
        value: parseFloat(dataMatch[2]),
      });
    }
  }

  return { type, title, items };
}

function parseMindMapBlock(lines: string[], startIndex: number): { block: ContentBlock; endIndex: number } {
  const dataLines: string[] = [];
  let i = startIndex + 1; // skip the ```mindmap line

  while (i < lines.length) {
    if (/^```\s*$/.test(lines[i].trim())) {
      break;
    }
    dataLines.push(lines[i]);
    i++;
  }

  const mindmapData = parseMindMapData(dataLines);

  return {
    block: {
      type: 'mindmap',
      content: dataLines.join('\n'),
      mindmapData,
    },
    endIndex: i,
  };
}

function parseMindMapData(lines: string[]): MindMapData {
  let center = 'Topic';
  const branches: { label: string; children?: string[] }[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // center: Main Topic
    const centerMatch = trimmed.match(/^center:\s*(.+)$/i);
    if (centerMatch) {
      center = centerMatch[1].trim();
      continue;
    }

    // - Branch Name  (top-level branch)
    const branchMatch = line.match(/^-\s+(.+)$/);
    if (branchMatch) {
      branches.push({ label: branchMatch[1].trim(), children: [] });
      continue;
    }

    // Indented child:   - Child Name
    const childMatch = line.match(/^\s{2,}-\s+(.+)$/);
    if (childMatch && branches.length > 0) {
      const lastBranch = branches[branches.length - 1];
      if (!lastBranch.children) lastBranch.children = [];
      lastBranch.children.push(childMatch[1].trim());
    }
  }

  return { center, branches };
}

// ── Layout inference ──

function inferLayout(
  title: string | undefined,
  subtitle: string | undefined,
  blocks: ContentBlock[],
  isFirstSlide: boolean
): SlideLayout {
  const hasOnlyImageBlock = blocks.length === 1 && blocks[0].type === 'image';

  if (hasOnlyImageBlock && !title) {
    return 'image-full';
  }

  // First slide or slide with just a title (and maybe subtitle) → title layout
  if (isFirstSlide && blocks.length === 0) {
    return 'title';
  }

  // Slide with just title and no content → section divider
  if (title && blocks.length === 0) {
    return 'section';
  }

  // Default content layout
  return 'content';
}
