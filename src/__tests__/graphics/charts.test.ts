import { describe, it, expect } from 'vitest';
import { renderBarChart, renderPieChart, renderLineChart } from '../../graphics/charts';
import { ThemeColors, ChartData } from '../../types';

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

const sampleData: ChartData = {
  type: 'bar',
  title: 'Revenue',
  items: [
    { label: 'Q1', value: 100 },
    { label: 'Q2', value: 150 },
    { label: 'Q3', value: 200 },
  ],
};

// ── Bar chart ──

describe('renderBarChart', () => {
  it('returns valid SVG string', () => {
    const svg = renderBarChart(sampleData, testColors);
    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
  });

  it('SVG contains chart title', () => {
    const svg = renderBarChart(sampleData, testColors);
    expect(svg).toContain('Revenue');
  });

  it('SVG contains data labels', () => {
    const svg = renderBarChart(sampleData, testColors);
    expect(svg).toContain('Q1');
    expect(svg).toContain('Q2');
    expect(svg).toContain('Q3');
  });

  it('shows "No data" for empty items', () => {
    const emptyData: ChartData = { type: 'bar', title: 'Empty', items: [] };
    const svg = renderBarChart(emptyData, testColors);
    expect(svg).toContain('No data');
  });

  it('renders rect elements for bars', () => {
    const svg = renderBarChart(sampleData, testColors);
    const rectMatches = svg.match(/<rect/g);
    expect(rectMatches).not.toBeNull();
    // At least background rect + 3 bar rects
    expect(rectMatches!.length).toBeGreaterThanOrEqual(4);
  });
});

// ── Pie chart ──

describe('renderPieChart', () => {
  it('returns valid SVG string', () => {
    const data: ChartData = { ...sampleData, type: 'pie' };
    const svg = renderPieChart(data, testColors);
    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
  });

  it('contains chart title', () => {
    const data: ChartData = { ...sampleData, type: 'pie' };
    const svg = renderPieChart(data, testColors);
    expect(svg).toContain('Revenue');
  });

  it('contains legend entries', () => {
    const data: ChartData = { ...sampleData, type: 'pie' };
    const svg = renderPieChart(data, testColors);
    expect(svg).toContain('Q1');
    expect(svg).toContain('Q2');
    expect(svg).toContain('Q3');
  });

  it('shows "No data" for empty items', () => {
    const emptyData: ChartData = { type: 'pie', title: 'Empty', items: [] };
    const svg = renderPieChart(emptyData, testColors);
    expect(svg).toContain('No data');
  });

  it('renders a circle for single item', () => {
    const singleData: ChartData = {
      type: 'pie',
      title: 'Single',
      items: [{ label: 'Only', value: 100 }],
    };
    const svg = renderPieChart(singleData, testColors);
    expect(svg).toContain('<circle');
  });
});

// ── Line chart ──

describe('renderLineChart', () => {
  it('returns valid SVG string', () => {
    const data: ChartData = { ...sampleData, type: 'line' };
    const svg = renderLineChart(data, testColors);
    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
  });

  it('contains chart title', () => {
    const data: ChartData = { ...sampleData, type: 'line' };
    const svg = renderLineChart(data, testColors);
    expect(svg).toContain('Revenue');
  });

  it('contains data point circles', () => {
    const data: ChartData = { ...sampleData, type: 'line' };
    const svg = renderLineChart(data, testColors);
    const circleMatches = svg.match(/<circle/g);
    expect(circleMatches).not.toBeNull();
    // Each data point has 2 circles (outer glow + point) = 3 items * 2 = 6
    expect(circleMatches!.length).toBeGreaterThanOrEqual(3);
  });

  it('shows "No data" for empty items', () => {
    const emptyData: ChartData = { type: 'line', title: 'Empty', items: [] };
    const svg = renderLineChart(emptyData, testColors);
    expect(svg).toContain('No data');
  });

  it('renders path element for the line', () => {
    const data: ChartData = { ...sampleData, type: 'line' };
    const svg = renderLineChart(data, testColors);
    expect(svg).toContain('<path');
  });
});
