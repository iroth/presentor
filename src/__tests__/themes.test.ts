import { describe, it, expect } from 'vitest';
import { getTheme, listThemes } from '../themes';
import { PresentationMeta } from '../types';

describe('getTheme', () => {
  it('returns default theme when no theme specified', () => {
    const meta: PresentationMeta = { aspectRatio: '16:9' };
    const theme = getTheme(meta);
    expect(theme.name).toBe('default');
  });

  it('returns dark theme when meta.theme is dark', () => {
    const meta: PresentationMeta = { theme: 'dark' };
    const theme = getTheme(meta);
    expect(theme.name).toBe('dark');
  });

  it('returns minimal theme', () => {
    const meta: PresentationMeta = { theme: 'minimal' };
    const theme = getTheme(meta);
    expect(theme.name).toBe('minimal');
  });

  it('returns corporate theme', () => {
    const meta: PresentationMeta = { theme: 'corporate' };
    const theme = getTheme(meta);
    expect(theme.name).toBe('corporate');
  });

  it('falls back to default for unknown theme name', () => {
    const meta: PresentationMeta = { theme: 'nonexistent' };
    const theme = getTheme(meta);
    expect(theme.name).toBe('default');
  });

  it('overrides primary color with meta.accentColor', () => {
    const meta: PresentationMeta = { accentColor: '#FF0000' };
    const theme = getTheme(meta);
    expect(theme.colors.primary).toBe('#FF0000');
  });

  it('prepends meta.fontFamily to heading and body fonts', () => {
    const meta: PresentationMeta = { fontFamily: 'Roboto' };
    const theme = getTheme(meta);
    expect(theme.fonts.heading.startsWith("'Roboto'")).toBe(true);
    expect(theme.fonts.body.startsWith("'Roboto'")).toBe(true);
  });

  it('adjusts slideWidth to 10 for 4:3 aspect ratio', () => {
    const meta: PresentationMeta = { aspectRatio: '4:3' };
    const theme = getTheme(meta);
    expect(theme.slideWidth).toBe(10);
    expect(theme.slideHeight).toBe(7.5);
  });

  it('uses style field as theme name fallback', () => {
    const meta: PresentationMeta = { style: 'dark' };
    const theme = getTheme(meta);
    expect(theme.name).toBe('dark');
  });
});

describe('listThemes', () => {
  it('returns all 4 theme names', () => {
    const names = listThemes();
    expect(names).toHaveLength(4);
    expect(names).toContain('default');
    expect(names).toContain('dark');
    expect(names).toContain('minimal');
    expect(names).toContain('corporate');
  });
});
