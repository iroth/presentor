import { describe, it, expect } from 'vitest';
import { renderMindMap } from '../../graphics/mindmap';
import { ThemeColors, MindMapData } from '../../types';

const testColors: ThemeColors = {
  primary: '#2563EB',
  secondary: '#7C3AED',
  accent: '#F59E0B',
  background: '#FFFFFF',
  surface: '#F8FAFC',
  text: '#1E293B',
  textLight: '#64748B',
  headingText: '#0F172A',
  codeBackground: '#1E293B',
  codeForeground: '#E2E8F0',
};

const sampleMindMap: MindMapData = {
  center: 'Planning',
  branches: [
    { label: 'Research', children: ['Market', 'Users'] },
    { label: 'Design', children: ['Wireframes', 'Prototypes'] },
  ],
};

describe('renderMindMap', () => {
  it('returns valid SVG string', () => {
    const svg = renderMindMap(sampleMindMap, testColors);
    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
  });

  it('contains center node text', () => {
    const svg = renderMindMap(sampleMindMap, testColors);
    expect(svg).toContain('Planning');
  });

  it('contains branch labels', () => {
    const svg = renderMindMap(sampleMindMap, testColors);
    expect(svg).toContain('Research');
    expect(svg).toContain('Design');
  });

  it('contains child labels', () => {
    const svg = renderMindMap(sampleMindMap, testColors);
    expect(svg).toContain('Market');
    expect(svg).toContain('Users');
    expect(svg).toContain('Wireframes');
    expect(svg).toContain('Prototypes');
  });

  it('renders paths for connections', () => {
    const svg = renderMindMap(sampleMindMap, testColors);
    const pathMatches = svg.match(/<path/g);
    expect(pathMatches).not.toBeNull();
    // 2 center->branch paths + 4 branch->child paths = 6
    expect(pathMatches!.length).toBeGreaterThanOrEqual(6);
  });

  it('handles zero branches (center only)', () => {
    const centerOnly: MindMapData = { center: 'Solo', branches: [] };
    const svg = renderMindMap(centerOnly, testColors);
    expect(svg).toContain('<svg');
    expect(svg).toContain('Solo');
    // Should NOT contain path elements when there are no branches
    expect(svg).not.toContain('<path');
  });
});
