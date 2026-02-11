import { Presentation, Slide, ContentBlock, Theme } from '../types';
import { getTheme } from '../themes';
import { renderBarChart, renderPieChart, renderLineChart, renderMindMap } from '../graphics';

export function generateHTML(presentation: Presentation): string {
  const theme = getTheme(presentation.meta);
  const { slides, meta } = presentation;

  const slidesHTML = slides.map((slide, i) => renderSlide(slide, i, theme)).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(meta.title || 'Presentation')}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
<style>
${generateCSS(theme, slides.length)}
</style>
</head>
<body>
<div class="presentation" id="presentation">
${slidesHTML}
</div>
<div class="slide-counter" id="counter">1 / ${slides.length}</div>
<div class="progress-bar" id="progress"><div class="progress-fill"></div></div>
<script>
${generateJS(slides.length)}
</script>
</body>
</html>`;
}

function renderSlide(slide: Slide, index: number, theme: Theme): string {
  const layoutClass = `slide-${slide.layout}`;
  const bgStyle = slide.background
    ? (slide.background.startsWith('#') || slide.background.startsWith('rgb')
      ? `background-color: ${slide.background};`
      : `background-image: url('${slide.background}'); background-size: cover; background-position: center;`)
    : '';

  const content = renderSlideContent(slide, theme);

  return `  <div class="slide ${layoutClass}" data-index="${index}" style="${bgStyle}">
    <div class="slide-inner">
${content}
    </div>
  </div>`;
}

function renderSlideContent(slide: Slide, theme: Theme): string {
  switch (slide.layout) {
    case 'title':
      return renderTitleSlide(slide, theme);
    case 'section':
      return renderSectionSlide(slide, theme);
    case 'image-full':
      return renderImageSlide(slide);
    default:
      return renderContentSlide(slide, theme);
  }
}

function renderTitleSlide(slide: Slide, theme: Theme): string {
  let html = '';
  if (slide.title) {
    html += `      <h1 class="title-main">${formatInlineMarkdown(escapeHtml(slide.title))}</h1>\n`;
  }
  if (slide.subtitle) {
    html += `      <p class="title-subtitle">${formatInlineMarkdown(escapeHtml(slide.subtitle))}</p>\n`;
  }
  for (const block of slide.blocks) {
    html += renderBlock(block, theme);
  }
  return html;
}

function renderSectionSlide(slide: Slide, _theme: Theme): string {
  let html = '';
  if (slide.title) {
    html += `      <h1 class="section-title">${formatInlineMarkdown(escapeHtml(slide.title))}</h1>\n`;
  }
  if (slide.subtitle) {
    html += `      <p class="section-subtitle">${formatInlineMarkdown(escapeHtml(slide.subtitle))}</p>\n`;
  }
  return html;
}

function renderImageSlide(slide: Slide): string {
  const imgBlock = slide.blocks.find(b => b.type === 'image');
  if (!imgBlock) return '';
  return `      <img class="full-image" src="${escapeHtml(imgBlock.src || '')}" alt="${escapeHtml(imgBlock.alt || '')}">\n`;
}

function renderContentSlide(slide: Slide, theme: Theme): string {
  let html = '';
  if (slide.title) {
    html += `      <h2 class="slide-title">${formatInlineMarkdown(escapeHtml(slide.title))}</h2>\n`;
  }
  if (slide.subtitle) {
    html += `      <h3 class="slide-subtitle">${formatInlineMarkdown(escapeHtml(slide.subtitle))}</h3>\n`;
  }
  html += `      <div class="slide-body">\n`;
  for (const block of slide.blocks) {
    html += renderBlock(block, theme);
  }
  html += `      </div>\n`;
  return html;
}

function renderBlock(block: ContentBlock, theme?: Theme): string {
  switch (block.type) {
    case 'heading':
      return `        <h2 class="block-heading">${formatInlineMarkdown(escapeHtml(block.content))}</h2>\n`;
    case 'subheading':
      return `        <h3 class="block-subheading">${formatInlineMarkdown(escapeHtml(block.content))}</h3>\n`;
    case 'text':
      return `        <p class="block-text">${formatInlineMarkdown(escapeHtml(block.content))}</p>\n`;
    case 'bullets':
      return renderBulletList(block);
    case 'numbered':
      return renderNumberedList(block);
    case 'code':
      return `        <pre class="block-code"><code${block.language ? ` class="language-${block.language}"` : ''}>${escapeHtml(block.content)}</code></pre>\n`;
    case 'quote':
      return `        <blockquote class="block-quote"><p>${formatInlineMarkdown(escapeHtml(block.content))}</p></blockquote>\n`;
    case 'image':
      return `        <div class="block-image-wrap"><img class="block-image" src="${escapeHtml(block.resolvedSrc || block.src || '')}" alt="${escapeHtml(block.alt || '')}"></div>\n`;
    case 'chart':
      return renderChartBlock(block, theme);
    case 'mindmap':
      return renderMindMapBlock(block, theme);
    case 'stock-image':
    case 'ai-image':
      return renderGeneratedImage(block);
    default:
      return '';
  }
}

function renderChartBlock(block: ContentBlock, theme?: Theme): string {
  if (!block.chartData || !theme) {
    return `        <p class="block-text">[Chart: ${escapeHtml(block.content)}]</p>\n`;
  }
  const colors = theme.colors;
  let svg: string;
  switch (block.chartData.type) {
    case 'pie':
      svg = renderPieChart(block.chartData, colors);
      break;
    case 'line':
      svg = renderLineChart(block.chartData, colors);
      break;
    case 'bar':
    default:
      svg = renderBarChart(block.chartData, colors);
      break;
  }
  return `        <div class="block-chart">${svg}</div>\n`;
}

function renderMindMapBlock(block: ContentBlock, theme?: Theme): string {
  if (!block.mindmapData || !theme) {
    return `        <p class="block-text">[Mind Map: ${escapeHtml(block.content)}]</p>\n`;
  }
  const svg = renderMindMap(block.mindmapData, theme.colors);
  return `        <div class="block-chart">${svg}</div>\n`;
}

function renderGeneratedImage(block: ContentBlock): string {
  const src = block.resolvedSrc;
  if (src) {
    return `        <div class="block-image-wrap"><img class="block-image" src="${escapeHtml(src)}" alt="${escapeHtml(block.alt || block.content)}"></div>\n`;
  }
  // Placeholder when image hasn't been resolved
  const label = block.type === 'stock-image'
    ? `Stock photo: ${block.imageQuery || block.content}`
    : `AI ${block.imageStyle || 'image'}: ${block.content}`;
  return `        <div class="block-image-placeholder">[${escapeHtml(label)}]</div>\n`;
}

function renderBulletList(block: ContentBlock): string {
  if (!block.items) return '';
  let html = '        <ul class="block-list">\n';
  for (const item of block.items) {
    const isSubItem = item.startsWith('  ');
    const text = item.replace(/^\s+/, '');
    html += isSubItem
      ? `          <li class="sub-item">${formatInlineMarkdown(escapeHtml(text))}</li>\n`
      : `          <li>${formatInlineMarkdown(escapeHtml(text))}</li>\n`;
  }
  html += '        </ul>\n';
  return html;
}

function renderNumberedList(block: ContentBlock): string {
  if (!block.items) return '';
  let html = '        <ol class="block-list">\n';
  for (const item of block.items) {
    html += `          <li>${formatInlineMarkdown(escapeHtml(item))}</li>\n`;
  }
  html += '        </ol>\n';
  return html;
}

// ── Inline markdown formatting ──

export function formatInlineMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code class="inline-code">$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── CSS Generation ──

function generateCSS(theme: Theme, _slideCount: number): string {
  const c = theme.colors;
  const f = theme.fonts;

  return `
*, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

html, body {
  width: 100%; height: 100%;
  overflow: hidden;
  background: #000;
  font-family: ${f.body};
  -webkit-font-smoothing: antialiased;
}

.presentation {
  width: 100vw; height: 100vh;
  position: relative;
}

/* ── Slide base ── */
.slide {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  background: ${c.background};
  color: ${c.text};
  display: none;
  overflow: hidden;
}
.slide.active { display: flex; align-items: center; justify-content: center; }

.slide-inner {
  width: 85%;
  max-width: 1200px;
  max-height: 85vh;
  overflow: hidden;
}

/* ── Title slide ── */
.slide-title-layout .slide-inner,
.slide.slide-title .slide-inner {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.title-main {
  font-family: ${f.heading};
  font-size: clamp(2.5rem, 5vw, 4.5rem);
  font-weight: 800;
  color: ${c.headingText};
  line-height: 1.1;
  margin-bottom: 0.4em;
  letter-spacing: -0.02em;
}

.title-subtitle {
  font-size: clamp(1.1rem, 2vw, 1.8rem);
  font-weight: 300;
  color: ${c.textLight};
  line-height: 1.4;
  max-width: 700px;
}

/* Decorative accent bar on title slide */
.slide.slide-title .slide-inner::after {
  content: '';
  display: block;
  width: 80px;
  height: 4px;
  background: linear-gradient(135deg, ${c.primary}, ${c.secondary});
  border-radius: 2px;
  margin-top: 2rem;
}

/* ── Section divider ── */
.slide.slide-section {
  background: linear-gradient(135deg, ${c.primary}, ${c.secondary});
}
.slide.slide-section .slide-inner {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.section-title {
  font-family: ${f.heading};
  font-size: clamp(2rem, 4.5vw, 4rem);
  font-weight: 700;
  color: #FFFFFF;
  letter-spacing: -0.02em;
}
.section-subtitle {
  font-size: clamp(1rem, 1.8vw, 1.4rem);
  color: rgba(255,255,255,0.8);
  margin-top: 0.5em;
  font-weight: 300;
}

/* ── Content slide ── */
.slide.slide-content .slide-inner {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  padding-top: 5vh;
}

.slide-title {
  font-family: ${f.heading};
  font-size: clamp(1.6rem, 3vw, 2.6rem);
  font-weight: 700;
  color: ${c.headingText};
  margin-bottom: 0.15em;
  letter-spacing: -0.01em;
  border-bottom: 3px solid ${c.primary};
  padding-bottom: 0.3em;
  display: inline-block;
}

.slide-subtitle {
  font-family: ${f.heading};
  font-size: clamp(1rem, 1.5vw, 1.3rem);
  font-weight: 400;
  color: ${c.textLight};
  margin-bottom: 1.2em;
}

.slide-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.8em;
  margin-top: 0.8em;
}

/* ── Block styles ── */
.block-heading {
  font-family: ${f.heading};
  font-size: clamp(1.3rem, 2vw, 1.8rem);
  font-weight: 600;
  color: ${c.headingText};
  margin-top: 0.3em;
}

.block-subheading {
  font-family: ${f.heading};
  font-size: clamp(1.1rem, 1.5vw, 1.4rem);
  font-weight: 500;
  color: ${c.primary};
}

.block-text {
  font-size: clamp(1rem, 1.4vw, 1.25rem);
  line-height: 1.6;
  color: ${c.text};
}

.block-list {
  font-size: clamp(1rem, 1.4vw, 1.25rem);
  line-height: 1.7;
  padding-left: 1.5em;
  color: ${c.text};
}
.block-list li {
  margin-bottom: 0.3em;
  padding-left: 0.3em;
}
.block-list li::marker {
  color: ${c.primary};
  font-weight: 600;
}
.block-list li.sub-item {
  margin-left: 1.5em;
  font-size: 0.92em;
  color: ${c.textLight};
}

ol.block-list li::marker {
  font-weight: 700;
  color: ${c.primary};
}

.block-code {
  background: ${c.codeBackground};
  color: ${c.codeForeground};
  border-radius: 10px;
  padding: 1em 1.3em;
  font-family: ${f.code};
  font-size: clamp(0.75rem, 1.1vw, 0.95rem);
  line-height: 1.55;
  overflow-x: auto;
  box-shadow: 0 4px 20px rgba(0,0,0,0.15);
}

.inline-code {
  background: ${c.surface};
  color: ${c.primary};
  padding: 0.15em 0.4em;
  border-radius: 4px;
  font-family: ${f.code};
  font-size: 0.88em;
}

.block-quote {
  border-left: 4px solid ${c.primary};
  padding: 0.6em 1.2em;
  background: ${c.surface};
  border-radius: 0 8px 8px 0;
  font-size: clamp(1rem, 1.4vw, 1.2rem);
  font-style: italic;
  color: ${c.textLight};
}

.block-image-wrap {
  display: flex;
  justify-content: center;
  margin: 0.5em 0;
}
.block-image {
  max-width: 100%;
  max-height: 55vh;
  border-radius: 10px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.1);
}

/* ── Charts and graphics ── */
.block-chart {
  display: flex;
  justify-content: center;
  margin: 0.5em 0;
}
.block-chart svg {
  max-width: 100%;
  max-height: 55vh;
  border-radius: 10px;
}

.block-image-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2em;
  background: ${c.surface};
  border: 2px dashed ${c.textLight};
  border-radius: 10px;
  color: ${c.textLight};
  font-style: italic;
  font-size: clamp(0.9rem, 1.2vw, 1.1rem);
}

/* ── Image full slide ── */
.slide.slide-image-full { padding: 0; }
.slide.slide-image-full .slide-inner {
  width: 100%; max-width: 100%; max-height: 100%;
}
.full-image {
  width: 100%; height: 100vh;
  object-fit: cover;
}

/* ── Counter & progress ── */
.slide-counter {
  position: fixed;
  bottom: 16px; right: 24px;
  color: rgba(255,255,255,0.5);
  font-family: ${f.body};
  font-size: 0.8rem;
  z-index: 100;
  pointer-events: none;
  text-shadow: 0 1px 4px rgba(0,0,0,0.5);
}

.progress-bar {
  position: fixed;
  bottom: 0; left: 0;
  width: 100%; height: 3px;
  background: rgba(255,255,255,0.1);
  z-index: 100;
}
.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, ${c.primary}, ${c.secondary});
  transition: width 0.3s ease;
  width: 0%;
}

/* ── Transitions ── */
.slide { animation: fadeIn 0.35s ease-out; }
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ── Print styles (for PDF export via Ctrl+P) ── */
@media print {
  body { background: white; }
  .slide-counter, .progress-bar { display: none; }
  .slide {
    position: relative !important;
    display: flex !important;
    page-break-after: always;
    width: 100vw; height: 100vh;
    break-after: page;
  }
  .slide.slide-section {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}

/* ── Link styles ── */
a { color: ${c.primary}; text-decoration: none; border-bottom: 1px solid transparent; }
a:hover { border-bottom-color: ${c.primary}; }

/* Strong / Em */
strong { font-weight: 700; color: ${c.headingText}; }
`;
}

// ── JavaScript for navigation ──

function generateJS(slideCount: number): string {
  return `
(function() {
  const total = ${slideCount};
  let current = 0;
  const slides = document.querySelectorAll('.slide');
  const counter = document.getElementById('counter');
  const progressFill = document.querySelector('.progress-fill');

  function show(n) {
    slides.forEach(s => s.classList.remove('active'));
    current = Math.max(0, Math.min(n, total - 1));
    slides[current].classList.add('active');
    counter.textContent = (current + 1) + ' / ' + total;
    progressFill.style.width = ((current + 1) / total * 100) + '%';
  }

  function next() { show(current + 1); }
  function prev() { show(current - 1); }

  document.addEventListener('keydown', function(e) {
    switch(e.key) {
      case 'ArrowRight': case 'ArrowDown': case ' ': case 'PageDown':
        e.preventDefault(); next(); break;
      case 'ArrowLeft': case 'ArrowUp': case 'PageUp':
        e.preventDefault(); prev(); break;
      case 'Home': e.preventDefault(); show(0); break;
      case 'End': e.preventDefault(); show(total - 1); break;
      case 'f': case 'F':
        if (!e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          if (document.fullscreenElement) document.exitFullscreen();
          else document.documentElement.requestFullscreen();
        }
        break;
    }
  });

  // Touch/swipe support
  let touchStartX = 0;
  document.addEventListener('touchstart', function(e) { touchStartX = e.touches[0].clientX; });
  document.addEventListener('touchend', function(e) {
    const diff = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(diff) > 50) { diff < 0 ? next() : prev(); }
  });

  // Click navigation (left third = back, right two-thirds = forward)
  document.addEventListener('click', function(e) {
    if (e.target.tagName === 'A') return;
    const x = e.clientX / window.innerWidth;
    x < 0.33 ? prev() : next();
  });

  show(0);
})();
`;
}
