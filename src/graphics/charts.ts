import { ChartData, ThemeColors } from '../types';

// ── Helpers ──

/** Generate a palette of colors from the theme for multiple data items */
function palette(colors: ThemeColors, count: number): string[] {
  const base = [colors.primary, colors.accent, colors.secondary];
  if (count <= 3) return base.slice(0, count);

  // Interpolate extra colours by adjusting lightness of the base set
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    out.push(base[i % base.length]);
  }
  // Apply opacity variation so repeated colours still look different
  return out.map((c, i) => {
    const cycle = Math.floor(i / base.length);
    if (cycle === 0) return c;
    // lighten by mixing with white via opacity trick – we encode as-is
    // and use opacity on the rect/path
    return c;
  });
}

function opacityForIndex(i: number, baseLen: number): number {
  const cycle = Math.floor(i / baseLen);
  return Math.max(0.45, 1 - cycle * 0.2);
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function truncateLabel(label: string, maxLen: number = 12): string {
  return label.length > maxLen ? label.slice(0, maxLen - 1) + '\u2026' : label;
}

function niceGridMax(maxVal: number): number {
  if (maxVal <= 0) return 10;
  const magnitude = Math.pow(10, Math.floor(Math.log10(maxVal)));
  const normalized = maxVal / magnitude;
  if (normalized <= 1) return magnitude;
  if (normalized <= 2) return 2 * magnitude;
  if (normalized <= 5) return 5 * magnitude;
  return 10 * magnitude;
}

function gridSteps(maxVal: number, steps: number = 5): number[] {
  const gridMax = niceGridMax(maxVal);
  const step = gridMax / steps;
  const result: number[] = [];
  for (let i = 0; i <= steps; i++) {
    result.push(Math.round(step * i * 100) / 100);
  }
  return result;
}

function formatValue(v: number): string {
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (v >= 1_000) return (v / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(v);
}

// ── Bar Chart ──

export function renderBarChart(data: ChartData, colors: ThemeColors): string {
  const W = 800, H = 500;
  const padTop = 60, padRight = 40, padBottom = 70, padLeft = 70;
  const chartW = W - padLeft - padRight;
  const chartH = H - padTop - padBottom;

  const items = data.items;
  if (items.length === 0) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}"><text x="${W / 2}" y="${H / 2}" text-anchor="middle" fill="${colors.text}" font-family="system-ui, sans-serif" font-size="16">No data</text></svg>`;
  }

  const maxVal = Math.max(...items.map(d => d.value));
  const gridMax = niceGridMax(maxVal);
  const steps = gridSteps(maxVal);
  const pal = palette(colors, items.length);

  const barGap = Math.min(16, chartW / items.length * 0.25);
  const barW = Math.max(8, (chartW - barGap * (items.length + 1)) / items.length);
  const radius = Math.min(6, barW / 3);

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">\n`;
  svg += `  <rect width="${W}" height="${H}" fill="${colors.background}" rx="12"/>\n`;

  // Title
  if (data.title) {
    svg += `  <text x="${W / 2}" y="36" text-anchor="middle" fill="${colors.text}" font-family="system-ui, sans-serif" font-size="20" font-weight="600">${escapeXml(data.title)}</text>\n`;
  }

  // Grid lines and Y-axis labels
  for (const step of steps) {
    const y = padTop + chartH - (step / gridMax) * chartH;
    svg += `  <line x1="${padLeft}" y1="${y}" x2="${padLeft + chartW}" y2="${y}" stroke="${colors.textLight}" stroke-opacity="0.2" stroke-width="1"/>\n`;
    svg += `  <text x="${padLeft - 10}" y="${y + 4}" text-anchor="end" fill="${colors.textLight}" font-family="system-ui, sans-serif" font-size="12">${formatValue(step)}</text>\n`;
  }

  // Bars
  items.forEach((item, i) => {
    const x = padLeft + barGap + i * (barW + barGap);
    const barH = gridMax > 0 ? (item.value / gridMax) * chartH : 0;
    const y = padTop + chartH - barH;
    const op = opacityForIndex(i, 3);

    // Bar with rounded top corners via clipPath approach – use a rect + overlay
    svg += `  <rect x="${x}" y="${y}" width="${barW}" height="${barH}" rx="${radius}" ry="${radius}" fill="${pal[i]}" opacity="${op}">\n`;
    svg += `    <animate attributeName="height" from="0" to="${barH}" dur="0.5s" fill="freeze"/>\n`;
    svg += `    <animate attributeName="y" from="${padTop + chartH}" to="${y}" dur="0.5s" fill="freeze"/>\n`;
    svg += `  </rect>\n`;

    // Value label above bar
    svg += `  <text x="${x + barW / 2}" y="${y - 8}" text-anchor="middle" fill="${colors.text}" font-family="system-ui, sans-serif" font-size="12" font-weight="500">${formatValue(item.value)}</text>\n`;

    // X-axis label
    svg += `  <text x="${x + barW / 2}" y="${padTop + chartH + 20}" text-anchor="middle" fill="${colors.textLight}" font-family="system-ui, sans-serif" font-size="12">${escapeXml(truncateLabel(item.label))}</text>\n`;
  });

  // Baseline
  svg += `  <line x1="${padLeft}" y1="${padTop + chartH}" x2="${padLeft + chartW}" y2="${padTop + chartH}" stroke="${colors.textLight}" stroke-opacity="0.4" stroke-width="1.5"/>\n`;

  svg += '</svg>';
  return svg;
}

// ── Pie Chart ──

export function renderPieChart(data: ChartData, colors: ThemeColors): string {
  const W = 800, H = 500;
  const items = data.items;

  if (items.length === 0) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}"><text x="${W / 2}" y="${H / 2}" text-anchor="middle" fill="${colors.text}" font-family="system-ui, sans-serif" font-size="16">No data</text></svg>`;
  }

  const total = items.reduce((s, d) => s + d.value, 0);
  const pal = palette(colors, items.length);

  const cx = 300, cy = 270;
  const outerR = 170, innerR = 0;
  const legendX = 540;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">\n`;
  svg += `  <rect width="${W}" height="${H}" fill="${colors.background}" rx="12"/>\n`;

  // Title
  if (data.title) {
    svg += `  <text x="${W / 2}" y="36" text-anchor="middle" fill="${colors.text}" font-family="system-ui, sans-serif" font-size="20" font-weight="600">${escapeXml(data.title)}</text>\n`;
  }

  // Drop shadow for pie
  svg += `  <defs><filter id="pie-shadow" x="-10%" y="-10%" width="120%" height="120%"><feDropShadow dx="0" dy="2" stdDeviation="4" flood-opacity="0.1"/></filter></defs>\n`;

  let startAngle = -Math.PI / 2;

  items.forEach((item, i) => {
    const sliceAngle = total > 0 ? (item.value / total) * 2 * Math.PI : 0;
    const endAngle = startAngle + sliceAngle;
    const largeArc = sliceAngle > Math.PI ? 1 : 0;

    const x1 = cx + outerR * Math.cos(startAngle);
    const y1 = cy + outerR * Math.sin(startAngle);
    const x2 = cx + outerR * Math.cos(endAngle);
    const y2 = cy + outerR * Math.sin(endAngle);

    const op = opacityForIndex(i, 3);

    // Slight explode effect for first slice or hover
    const midAngle = startAngle + sliceAngle / 2;
    const explode = 3;
    const dx = explode * Math.cos(midAngle);
    const dy = explode * Math.sin(midAngle);

    if (items.length === 1) {
      // Full circle
      svg += `  <circle cx="${cx}" cy="${cy}" r="${outerR}" fill="${pal[i]}" opacity="${op}" filter="url(#pie-shadow)"/>\n`;
    } else {
      svg += `  <path d="M ${cx + dx} ${cy + dy} L ${x1 + dx} ${y1 + dy} A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2 + dx} ${y2 + dy} Z" fill="${pal[i]}" opacity="${op}" filter="url(#pie-shadow)"/>\n`;
    }

    // Percentage label on slice
    const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
    if (pct >= 5) {
      const labelR = outerR * 0.65;
      const lx = cx + dx + labelR * Math.cos(midAngle);
      const ly = cy + dy + labelR * Math.sin(midAngle);
      svg += `  <text x="${lx}" y="${ly}" text-anchor="middle" dominant-baseline="central" fill="white" font-family="system-ui, sans-serif" font-size="14" font-weight="600">${pct}%</text>\n`;
    }

    startAngle = endAngle;
  });

  // Legend
  const legendTop = 80;
  const legendRowH = 30;
  items.forEach((item, i) => {
    const ly = legendTop + i * legendRowH;
    const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
    const op = opacityForIndex(i, 3);
    svg += `  <rect x="${legendX}" y="${ly}" width="16" height="16" rx="4" fill="${pal[i]}" opacity="${op}"/>\n`;
    svg += `  <text x="${legendX + 24}" y="${ly + 13}" fill="${colors.text}" font-family="system-ui, sans-serif" font-size="13">${escapeXml(truncateLabel(item.label, 18))} (${pct}%)</text>\n`;
  });

  svg += '</svg>';
  return svg;
}

// ── Line Chart ──

export function renderLineChart(data: ChartData, colors: ThemeColors): string {
  const W = 800, H = 500;
  const padTop = 60, padRight = 40, padBottom = 70, padLeft = 70;
  const chartW = W - padLeft - padRight;
  const chartH = H - padTop - padBottom;

  const items = data.items;

  if (items.length === 0) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}"><text x="${W / 2}" y="${H / 2}" text-anchor="middle" fill="${colors.text}" font-family="system-ui, sans-serif" font-size="16">No data</text></svg>`;
  }

  const maxVal = Math.max(...items.map(d => d.value));
  const gridMax = niceGridMax(maxVal);
  const steps = gridSteps(maxVal);

  // Point positions
  const points = items.map((item, i) => {
    const x = padLeft + (items.length === 1 ? chartW / 2 : (i / (items.length - 1)) * chartW);
    const y = padTop + chartH - (gridMax > 0 ? (item.value / gridMax) * chartH : 0);
    return { x, y, item };
  });

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">\n`;
  svg += `  <rect width="${W}" height="${H}" fill="${colors.background}" rx="12"/>\n`;

  // Defs: gradient fill under the line
  svg += `  <defs>\n`;
  svg += `    <linearGradient id="line-fill" x1="0" y1="0" x2="0" y2="1">\n`;
  svg += `      <stop offset="0%" stop-color="${colors.primary}" stop-opacity="0.25"/>\n`;
  svg += `      <stop offset="100%" stop-color="${colors.primary}" stop-opacity="0.02"/>\n`;
  svg += `    </linearGradient>\n`;
  svg += `  </defs>\n`;

  // Title
  if (data.title) {
    svg += `  <text x="${W / 2}" y="36" text-anchor="middle" fill="${colors.text}" font-family="system-ui, sans-serif" font-size="20" font-weight="600">${escapeXml(data.title)}</text>\n`;
  }

  // Grid lines and Y-axis labels
  for (const step of steps) {
    const y = padTop + chartH - (step / gridMax) * chartH;
    svg += `  <line x1="${padLeft}" y1="${y}" x2="${padLeft + chartW}" y2="${y}" stroke="${colors.textLight}" stroke-opacity="0.18" stroke-width="1"/>\n`;
    svg += `  <text x="${padLeft - 10}" y="${y + 4}" text-anchor="end" fill="${colors.textLight}" font-family="system-ui, sans-serif" font-size="12">${formatValue(step)}</text>\n`;
  }

  // Area fill under line
  if (points.length > 1) {
    let areaPath = `M ${points[0].x} ${points[0].y}`;

    // Smooth curve using cubic bezier (catmull-rom inspired)
    for (let i = 1; i < points.length; i++) {
      const p0 = points[Math.max(0, i - 2)];
      const p1 = points[i - 1];
      const p2 = points[i];
      const p3 = points[Math.min(points.length - 1, i + 1)];

      const tension = 0.3;
      const cp1x = p1.x + (p2.x - p0.x) * tension;
      const cp1y = p1.y + (p2.y - p0.y) * tension;
      const cp2x = p2.x - (p3.x - p1.x) * tension;
      const cp2y = p2.y - (p3.y - p1.y) * tension;

      areaPath += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }

    const linePath = areaPath;
    areaPath += ` L ${points[points.length - 1].x} ${padTop + chartH} L ${points[0].x} ${padTop + chartH} Z`;

    svg += `  <path d="${areaPath}" fill="url(#line-fill)"/>\n`;

    // Line itself
    svg += `  <path d="${linePath}" fill="none" stroke="${colors.primary}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>\n`;
  }

  // Data points and labels
  points.forEach((p, i) => {
    // Outer glow
    svg += `  <circle cx="${p.x}" cy="${p.y}" r="7" fill="${colors.primary}" opacity="0.15"/>\n`;
    // Point
    svg += `  <circle cx="${p.x}" cy="${p.y}" r="4.5" fill="${colors.background}" stroke="${colors.primary}" stroke-width="2.5"/>\n`;

    // Value label
    svg += `  <text x="${p.x}" y="${p.y - 14}" text-anchor="middle" fill="${colors.text}" font-family="system-ui, sans-serif" font-size="11" font-weight="500">${formatValue(p.item.value)}</text>\n`;

    // X-axis label
    svg += `  <text x="${p.x}" y="${padTop + chartH + 20}" text-anchor="middle" fill="${colors.textLight}" font-family="system-ui, sans-serif" font-size="12">${escapeXml(truncateLabel(p.item.label))}</text>\n`;
  });

  // Baseline
  svg += `  <line x1="${padLeft}" y1="${padTop + chartH}" x2="${padLeft + chartW}" y2="${padTop + chartH}" stroke="${colors.textLight}" stroke-opacity="0.4" stroke-width="1.5"/>\n`;
  // Y axis
  svg += `  <line x1="${padLeft}" y1="${padTop}" x2="${padLeft}" y2="${padTop + chartH}" stroke="${colors.textLight}" stroke-opacity="0.25" stroke-width="1"/>\n`;

  svg += '</svg>';
  return svg;
}
