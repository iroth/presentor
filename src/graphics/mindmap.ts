import { MindMapData, ThemeColors } from '../types';

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Create a multi-line text split by word wrap (SVG has no native wrapping) */
function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if (cur && (cur + ' ' + w).length > maxChars) {
      lines.push(cur);
      cur = w;
    } else {
      cur = cur ? cur + ' ' + w : w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

/** Derive a branch palette from theme colors */
function branchPalette(colors: ThemeColors, count: number): string[] {
  const base = [colors.primary, colors.accent, colors.secondary];
  const pal: string[] = [];
  for (let i = 0; i < count; i++) {
    pal.push(base[i % base.length]);
  }
  return pal;
}

export function renderMindMap(data: MindMapData, colors: ThemeColors): string {
  const W = 900, H = 600;
  const cx = W / 2, cy = H / 2;

  const branches = data.branches;
  const branchCount = branches.length;

  if (branchCount === 0) {
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">`;
    svg += `<rect width="${W}" height="${H}" fill="${colors.background}" rx="12"/>`;
    svg += `<rect x="${cx - 90}" y="${cy - 28}" width="180" height="56" rx="28" fill="${colors.primary}"/>`;
    svg += `<text x="${cx}" y="${cy + 6}" text-anchor="middle" dominant-baseline="central" fill="white" font-family="system-ui, sans-serif" font-size="16" font-weight="600">${escapeXml(data.center)}</text>`;
    svg += '</svg>';
    return svg;
  }

  const pal = branchPalette(colors, branchCount);

  // Layout: radial from center
  const branchRadius = 180; // distance from center to branch nodes
  const childRadius = 120;  // distance from branch to child nodes
  const childSpreadAngle = 0.35; // radians between children

  // Compute angle for each branch, spread evenly
  const angleStep = (2 * Math.PI) / branchCount;
  const startAngle = -Math.PI / 2; // start at top

  interface NodePos { x: number; y: number; label: string; color: string }
  const branchNodes: NodePos[] = [];
  const childNodes: { parent: NodePos; node: NodePos }[] = [];

  branches.forEach((branch, i) => {
    const angle = startAngle + i * angleStep;
    const bx = cx + branchRadius * Math.cos(angle);
    const by = cy + branchRadius * Math.sin(angle);
    const bNode: NodePos = { x: bx, y: by, label: branch.label, color: pal[i] };
    branchNodes.push(bNode);

    if (branch.children && branch.children.length > 0) {
      const kids = branch.children;
      const totalSpread = (kids.length - 1) * childSpreadAngle;
      const childStartAngle = angle - totalSpread / 2;

      kids.forEach((child, j) => {
        const cAngle = kids.length === 1 ? angle : childStartAngle + j * childSpreadAngle;
        const childX = bx + childRadius * Math.cos(cAngle);
        const childY = by + childRadius * Math.sin(cAngle);
        childNodes.push({
          parent: bNode,
          node: { x: childX, y: childY, label: child, color: pal[i] },
        });
      });
    }
  });

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">\n`;
  svg += `  <rect width="${W}" height="${H}" fill="${colors.background}" rx="12"/>\n`;

  // Defs for drop shadows
  svg += `  <defs>\n`;
  svg += `    <filter id="mm-shadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.1"/></filter>\n`;
  svg += `    <filter id="mm-center-shadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="3" stdDeviation="6" flood-opacity="0.15"/></filter>\n`;
  svg += `  </defs>\n`;

  // Draw connections: center -> branch (curved)
  branchNodes.forEach((b) => {
    // Cubic bezier: control points pull towards center on the perpendicular
    const mx = (cx + b.x) / 2;
    const my = (cy + b.y) / 2;
    // Offset control points slightly for a gentle curve
    const dx = b.x - cx;
    const dy = b.y - cy;
    const perpX = -dy * 0.15;
    const perpY = dx * 0.15;
    const c1x = cx + dx * 0.3 + perpX;
    const c1y = cy + dy * 0.3 + perpY;
    const c2x = cx + dx * 0.7 - perpX;
    const c2y = cy + dy * 0.7 - perpY;

    svg += `  <path d="M ${cx} ${cy} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${b.x} ${b.y}" fill="none" stroke="${b.color}" stroke-width="2.5" stroke-opacity="0.5" stroke-linecap="round"/>\n`;
  });

  // Draw connections: branch -> children (curved)
  childNodes.forEach(({ parent, node }) => {
    const dx = node.x - parent.x;
    const dy = node.y - parent.y;
    const perpX = -dy * 0.2;
    const perpY = dx * 0.2;
    const c1x = parent.x + dx * 0.35 + perpX;
    const c1y = parent.y + dy * 0.35 + perpY;
    const c2x = parent.x + dx * 0.65 - perpX;
    const c2y = parent.y + dy * 0.65 - perpY;

    svg += `  <path d="M ${parent.x} ${parent.y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${node.x} ${node.y}" fill="none" stroke="${node.color}" stroke-width="1.8" stroke-opacity="0.35" stroke-linecap="round"/>\n`;
  });

  // Draw child nodes
  childNodes.forEach(({ node }) => {
    const lines = wrapText(node.label, 14);
    const boxW = Math.max(80, Math.max(...lines.map(l => l.length)) * 7.5 + 20);
    const boxH = Math.max(32, lines.length * 18 + 14);

    svg += `  <rect x="${node.x - boxW / 2}" y="${node.y - boxH / 2}" width="${boxW}" height="${boxH}" rx="8" fill="${colors.surface}" stroke="${node.color}" stroke-width="1.5" stroke-opacity="0.4" filter="url(#mm-shadow)"/>\n`;

    lines.forEach((line, li) => {
      const ty = node.y - ((lines.length - 1) * 9) + li * 18;
      svg += `  <text x="${node.x}" y="${ty}" text-anchor="middle" dominant-baseline="central" fill="${colors.text}" font-family="system-ui, sans-serif" font-size="12">${escapeXml(line)}</text>\n`;
    });
  });

  // Draw branch nodes
  branchNodes.forEach((b) => {
    const lines = wrapText(b.label, 16);
    const boxW = Math.max(100, Math.max(...lines.map(l => l.length)) * 8 + 28);
    const boxH = Math.max(40, lines.length * 20 + 18);

    svg += `  <rect x="${b.x - boxW / 2}" y="${b.y - boxH / 2}" width="${boxW}" height="${boxH}" rx="12" fill="${b.color}" filter="url(#mm-shadow)"/>\n`;

    lines.forEach((line, li) => {
      const ty = b.y - ((lines.length - 1) * 10) + li * 20;
      svg += `  <text x="${b.x}" y="${ty}" text-anchor="middle" dominant-baseline="central" fill="white" font-family="system-ui, sans-serif" font-size="14" font-weight="600">${escapeXml(line)}</text>\n`;
    });
  });

  // Draw center node (on top)
  const centerLines = wrapText(data.center, 18);
  const centerW = Math.max(140, Math.max(...centerLines.map(l => l.length)) * 10 + 40);
  const centerH = Math.max(56, centerLines.length * 22 + 24);

  svg += `  <rect x="${cx - centerW / 2}" y="${cy - centerH / 2}" width="${centerW}" height="${centerH}" rx="${centerH / 2}" fill="${colors.primary}" filter="url(#mm-center-shadow)"/>\n`;

  centerLines.forEach((line, li) => {
    const ty = cy - ((centerLines.length - 1) * 11) + li * 22;
    svg += `  <text x="${cx}" y="${ty}" text-anchor="middle" dominant-baseline="central" fill="white" font-family="system-ui, sans-serif" font-size="17" font-weight="700">${escapeXml(line)}</text>\n`;
  });

  svg += '</svg>';
  return svg;
}
