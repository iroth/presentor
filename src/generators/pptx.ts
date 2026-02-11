import PptxGenJS from 'pptxgenjs';
import { Presentation, Slide, ContentBlock, Theme } from '../types';
import { getTheme } from '../themes';

export async function generatePPTX(presentation: Presentation, outputPath: string): Promise<void> {
  const theme = getTheme(presentation.meta);
  const pptx = new PptxGenJS();

  // Set presentation metadata
  pptx.title = presentation.meta.title || 'Presentation';
  pptx.author = presentation.meta.author || '';
  pptx.subject = '';

  // Set layout
  if (presentation.meta.aspectRatio === '4:3') {
    pptx.layout = 'LAYOUT_4x3';
  } else {
    pptx.layout = 'LAYOUT_WIDE';
  }

  // Define master slides
  defineMasters(pptx, theme);

  // Generate slides
  for (const slide of presentation.slides) {
    addSlide(pptx, slide, theme);
  }

  // Write file
  await pptx.writeFile({ fileName: outputPath });
}

function defineMasters(pptx: PptxGenJS, theme: Theme): void {
  pptx.defineSlideMaster({
    title: 'CONTENT_MASTER',
    background: { color: theme.colors.background.replace('#', '') },
  });

  pptx.defineSlideMaster({
    title: 'SECTION_MASTER',
    background: { color: theme.colors.primary.replace('#', '') },
  });
}

function addSlide(pptx: PptxGenJS, slide: Slide, theme: Theme): void {
  switch (slide.layout) {
    case 'title':
      addTitleSlide(pptx, slide, theme);
      break;
    case 'section':
      addSectionSlide(pptx, slide, theme);
      break;
    default:
      addContentSlide(pptx, slide, theme);
      break;
  }
}

function addTitleSlide(pptx: PptxGenJS, slide: Slide, theme: Theme): void {
  const s = pptx.addSlide({ masterName: 'CONTENT_MASTER' });

  if (slide.background) {
    applyBackground(s, slide.background);
  }

  // Accent bar at top
  s.addShape('rect' as any, {
    x: 0, y: 0,
    w: '100%', h: 0.06,
    fill: { color: theme.colors.primary.replace('#', '') },
  });

  // Title
  if (slide.title) {
    s.addText(stripMarkdown(slide.title), {
      x: 0.8, y: 1.8,
      w: theme.slideWidth - 1.6,
      h: 2.0,
      fontSize: 40,
      fontFace: cleanFontName(theme.fonts.heading),
      bold: true,
      color: theme.colors.headingText.replace('#', ''),
      align: 'center',
      valign: 'bottom',
    });
  }

  // Subtitle
  if (slide.subtitle) {
    s.addText(stripMarkdown(slide.subtitle), {
      x: 1.5, y: 4.0,
      w: theme.slideWidth - 3.0,
      h: 1.0,
      fontSize: 20,
      fontFace: cleanFontName(theme.fonts.body),
      color: theme.colors.textLight.replace('#', ''),
      align: 'center',
      valign: 'top',
    });
  }

  // Decorative accent bar
  const barW = 1.0;
  s.addShape('rect' as any, {
    x: (theme.slideWidth - barW) / 2,
    y: 5.2,
    w: barW, h: 0.05,
    fill: { color: theme.colors.primary.replace('#', '') },
  });

  // Additional blocks (e.g. author text)
  let yPos = 5.5;
  for (const block of slide.blocks) {
    if (block.type === 'text') {
      s.addText(stripMarkdown(block.content), {
        x: 1.5, y: yPos,
        w: theme.slideWidth - 3.0,
        h: 0.5,
        fontSize: 14,
        fontFace: cleanFontName(theme.fonts.body),
        color: theme.colors.textLight.replace('#', ''),
        align: 'center',
      });
      yPos += 0.5;
    }
  }

  if (slide.notes) {
    s.addNotes(slide.notes);
  }
}

function addSectionSlide(pptx: PptxGenJS, slide: Slide, theme: Theme): void {
  const s = pptx.addSlide({ masterName: 'SECTION_MASTER' });

  if (slide.title) {
    s.addText(stripMarkdown(slide.title), {
      x: 0.8, y: 2.2,
      w: theme.slideWidth - 1.6,
      h: 2.0,
      fontSize: 36,
      fontFace: cleanFontName(theme.fonts.heading),
      bold: true,
      color: 'FFFFFF',
      align: 'center',
      valign: 'middle',
    });
  }

  if (slide.subtitle) {
    s.addText(stripMarkdown(slide.subtitle), {
      x: 1.5, y: 4.4,
      w: theme.slideWidth - 3.0,
      h: 1.0,
      fontSize: 18,
      fontFace: cleanFontName(theme.fonts.body),
      color: 'D4D4D4',
      align: 'center',
    });
  }

  if (slide.notes) {
    s.addNotes(slide.notes);
  }
}

function addContentSlide(pptx: PptxGenJS, slide: Slide, theme: Theme): void {
  const s = pptx.addSlide({ masterName: 'CONTENT_MASTER' });

  if (slide.background) {
    applyBackground(s, slide.background);
  }

  let yPos = 0.5;

  // Slide title with accent underline
  if (slide.title) {
    s.addText(stripMarkdown(slide.title), {
      x: 0.7, y: yPos,
      w: theme.slideWidth - 1.4,
      h: 0.8,
      fontSize: 28,
      fontFace: cleanFontName(theme.fonts.heading),
      bold: true,
      color: theme.colors.headingText.replace('#', ''),
      valign: 'bottom',
    });

    // Accent underline
    s.addShape('rect' as any, {
      x: 0.7, y: yPos + 0.85,
      w: 1.5, h: 0.04,
      fill: { color: theme.colors.primary.replace('#', '') },
    });

    yPos += 1.1;
  }

  if (slide.subtitle) {
    s.addText(stripMarkdown(slide.subtitle), {
      x: 0.7, y: yPos,
      w: theme.slideWidth - 1.4,
      h: 0.5,
      fontSize: 16,
      fontFace: cleanFontName(theme.fonts.body),
      color: theme.colors.textLight.replace('#', ''),
    });
    yPos += 0.6;
  }

  // Render content blocks
  for (const block of slide.blocks) {
    yPos = renderBlockPptx(pptx, s, block, yPos, theme);
  }

  if (slide.notes) {
    s.addNotes(slide.notes);
  }
}

function renderBlockPptx(
  pptx: PptxGenJS,
  s: PptxGenJS.Slide,
  block: ContentBlock,
  yPos: number,
  theme: Theme
): number {
  const contentWidth = theme.slideWidth - 1.4;
  const leftMargin = 0.7;

  switch (block.type) {
    case 'heading': {
      s.addText(stripMarkdown(block.content), {
        x: leftMargin, y: yPos,
        w: contentWidth, h: 0.65,
        fontSize: 22,
        fontFace: cleanFontName(theme.fonts.heading),
        bold: true,
        color: theme.colors.headingText.replace('#', ''),
        valign: 'bottom',
      });
      return yPos + 0.75;
    }

    case 'subheading': {
      s.addText(stripMarkdown(block.content), {
        x: leftMargin, y: yPos,
        w: contentWidth, h: 0.55,
        fontSize: 18,
        fontFace: cleanFontName(theme.fonts.heading),
        bold: true,
        color: theme.colors.primary.replace('#', ''),
        valign: 'bottom',
      });
      return yPos + 0.65;
    }

    case 'text': {
      const lines = Math.ceil(block.content.length / 90);
      const height = Math.max(0.5, lines * 0.35);
      s.addText(stripMarkdown(block.content), {
        x: leftMargin, y: yPos,
        w: contentWidth, h: height,
        fontSize: 16,
        fontFace: cleanFontName(theme.fonts.body),
        color: theme.colors.text.replace('#', ''),
        lineSpacingMultiple: 1.3,
        valign: 'top',
      });
      return yPos + height + 0.15;
    }

    case 'bullets': {
      if (!block.items) return yPos;
      const textRows = block.items.map(item => {
        const isSubItem = item.startsWith('  ');
        const text = item.replace(/^\s+/, '');
        return {
          text: stripMarkdown(text),
          options: {
            fontSize: isSubItem ? 14 : 16,
            color: isSubItem
              ? theme.colors.textLight.replace('#', '')
              : theme.colors.text.replace('#', ''),
            bullet: {
              code: isSubItem ? '2013' : '2022',  // – for sub, • for main
              indent: isSubItem ? 0.6 : 0.3,
              color: theme.colors.primary.replace('#', ''),
            },
            indentLevel: isSubItem ? 1 : 0,
            paraSpaceAfter: 4,
          },
        };
      });

      const height = Math.max(0.5, block.items.length * 0.38);

      s.addText(textRows as any, {
        x: leftMargin, y: yPos,
        w: contentWidth, h: height,
        fontFace: cleanFontName(theme.fonts.body),
        valign: 'top',
        lineSpacingMultiple: 1.2,
      });
      return yPos + height + 0.15;
    }

    case 'numbered': {
      if (!block.items) return yPos;
      const textRows = block.items.map((item, idx) => ({
        text: `${idx + 1}. ${stripMarkdown(item)}`,
        options: {
          fontSize: 16,
          color: theme.colors.text.replace('#', ''),
          paraSpaceAfter: 4,
        },
      }));

      const height = Math.max(0.5, block.items.length * 0.38);

      s.addText(textRows as any, {
        x: leftMargin, y: yPos,
        w: contentWidth, h: height,
        fontFace: cleanFontName(theme.fonts.body),
        valign: 'top',
        lineSpacingMultiple: 1.2,
      });
      return yPos + height + 0.15;
    }

    case 'code': {
      const codeLines = block.content.split('\n').length;
      const height = Math.max(0.6, codeLines * 0.25 + 0.3);

      // Code background
      s.addShape('roundRect' as any, {
        x: leftMargin, y: yPos,
        w: contentWidth, h: height,
        fill: { color: theme.colors.codeBackground.replace('#', '') },
        rectRadius: 0.1,
      });

      s.addText(block.content, {
        x: leftMargin + 0.15, y: yPos + 0.1,
        w: contentWidth - 0.3, h: height - 0.2,
        fontSize: 11,
        fontFace: cleanFontName(theme.fonts.code),
        color: theme.colors.codeForeground.replace('#', ''),
        valign: 'top',
        lineSpacingMultiple: 1.15,
        wrap: true,
      });
      return yPos + height + 0.2;
    }

    case 'quote': {
      const lines = Math.ceil(block.content.length / 85);
      const height = Math.max(0.6, lines * 0.35 + 0.2);

      // Quote background
      s.addShape('rect' as any, {
        x: leftMargin, y: yPos,
        w: contentWidth, h: height,
        fill: { color: theme.colors.surface.replace('#', '') },
      });

      // Left accent bar
      s.addShape('rect' as any, {
        x: leftMargin, y: yPos,
        w: 0.05, h: height,
        fill: { color: theme.colors.primary.replace('#', '') },
      });

      s.addText(stripMarkdown(block.content), {
        x: leftMargin + 0.25, y: yPos + 0.1,
        w: contentWidth - 0.5, h: height - 0.2,
        fontSize: 15,
        fontFace: cleanFontName(theme.fonts.body),
        italic: true,
        color: theme.colors.textLight.replace('#', ''),
        valign: 'middle',
      });
      return yPos + height + 0.2;
    }

    case 'image':
    case 'stock-image':
    case 'ai-image': {
      // For stock/ai images, only use resolvedSrc (src may contain orientation/metadata, not a path)
      const imgSrc = block.type === 'image'
        ? (block.resolvedSrc || block.src)
        : block.resolvedSrc;
      if (imgSrc) {
        try {
          s.addImage({
            path: imgSrc,
            x: leftMargin + 1, y: yPos,
            w: contentWidth - 2, h: 3.5,
            sizing: { type: 'contain', w: contentWidth - 2, h: 3.5 },
          });
        } catch {
          s.addText(`[Image: ${block.alt || block.content}]`, {
            x: leftMargin, y: yPos,
            w: contentWidth, h: 0.5,
            fontSize: 14,
            fontFace: cleanFontName(theme.fonts.body),
            color: theme.colors.textLight.replace('#', ''),
            italic: true,
          });
        }
      } else {
        const label = block.type === 'stock-image'
          ? `Stock: ${block.imageQuery || block.content}`
          : block.type === 'ai-image'
          ? `AI ${block.imageStyle}: ${block.content}`
          : block.alt || '';
        s.addText(`[${label}]`, {
          x: leftMargin, y: yPos,
          w: contentWidth, h: 0.5,
          fontSize: 14,
          fontFace: cleanFontName(theme.fonts.body),
          color: theme.colors.textLight.replace('#', ''),
          italic: true,
          align: 'center',
        });
      }
      return yPos + 3.7;
    }

    case 'chart': {
      if (!block.chartData) return yPos;
      const chartItems = block.chartData.items;
      if (chartItems.length === 0) return yPos;

      const chartLabels = chartItems.map(d => d.label);
      const chartValues = chartItems.map(d => d.value);

      let chartType: string;
      switch (block.chartData.type) {
        case 'pie': chartType = 'pie'; break;
        case 'line': chartType = 'line'; break;
        case 'bar': default: chartType = 'bar'; break;
      }

      const chartHeight = 3.8;
      s.addChart(chartType as any, [
        { name: block.chartData.title || 'Data', labels: chartLabels, values: chartValues },
      ], {
        x: leftMargin, y: yPos,
        w: contentWidth, h: chartHeight,
        showTitle: !!block.chartData.title,
        title: block.chartData.title || '',
        titleColor: theme.colors.headingText.replace('#', ''),
        titleFontSize: 14,
        showValue: block.chartData.type !== 'pie',
        showPercent: block.chartData.type === 'pie',
        showLegend: block.chartData.type === 'pie',
        legendPos: 'r',
        chartColors: [
          theme.colors.primary.replace('#', ''),
          theme.colors.accent.replace('#', ''),
          theme.colors.secondary.replace('#', ''),
          '10B981', 'F43F5E', '8B5CF6',
        ],
      } as any);

      return yPos + chartHeight + 0.2;
    }

    case 'mindmap': {
      if (!block.mindmapData) return yPos;
      // For PPTX, render mind map as a text hierarchy since native SVG isn't supported
      const lines: string[] = [];
      lines.push(block.mindmapData.center);
      for (const branch of block.mindmapData.branches) {
        lines.push(`  ● ${branch.label}`);
        if (branch.children) {
          for (const child of branch.children) {
            lines.push(`     – ${child}`);
          }
        }
      }

      const height = Math.max(1.5, lines.length * 0.3);

      // Background box
      s.addShape('roundRect' as any, {
        x: leftMargin, y: yPos,
        w: contentWidth, h: height,
        fill: { color: theme.colors.surface.replace('#', '') },
        rectRadius: 0.1,
      });

      const textRows = lines.map((line, idx) => ({
        text: stripMarkdown(line),
        options: {
          fontSize: idx === 0 ? 16 : 13,
          bold: idx === 0,
          color: idx === 0
            ? theme.colors.primary.replace('#', '')
            : theme.colors.text.replace('#', ''),
          paraSpaceAfter: 2,
        },
      }));

      s.addText(textRows as any, {
        x: leftMargin + 0.2, y: yPos + 0.1,
        w: contentWidth - 0.4, h: height - 0.2,
        fontFace: cleanFontName(theme.fonts.body),
        valign: 'top',
      });
      return yPos + height + 0.2;
    }

    default:
      return yPos;
  }
}

// ── Helpers ──

function applyBackground(s: PptxGenJS.Slide, bg: string): void {
  if (bg.startsWith('#') || /^[0-9a-fA-F]{6}$/.test(bg)) {
    s.background = { color: bg.replace('#', '') };
  }
  // For URL backgrounds, pptxgenjs can handle image paths
  // but we keep it simple for now
}

function cleanFontName(fontString: string): string {
  // Extract first font name from CSS font-family string
  const first = fontString.split(',')[0].trim();
  return first.replace(/^['"]|['"]$/g, '');
}

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
}
