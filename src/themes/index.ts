import { Theme, PresentationMeta } from '../types';

const defaultTheme: Theme = {
  name: 'default',
  colors: {
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
  },
  fonts: {
    heading: "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif",
    body: "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif",
    code: "'Fira Code', 'JetBrains Mono', 'Consolas', monospace",
  },
  slideWidth: 13.333,
  slideHeight: 7.5,
};

const darkTheme: Theme = {
  name: 'dark',
  colors: {
    primary: '#60A5FA',
    secondary: '#A78BFA',
    accent: '#FBBF24',
    background: '#0F172A',
    surface: '#1E293B',
    text: '#E2E8F0',
    textLight: '#94A3B8',
    headingText: '#F8FAFC',
    codeBackground: '#020617',
    codeForeground: '#E2E8F0',
  },
  fonts: {
    heading: "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif",
    body: "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif",
    code: "'Fira Code', 'JetBrains Mono', 'Consolas', monospace",
  },
  slideWidth: 13.333,
  slideHeight: 7.5,
};

const minimalTheme: Theme = {
  name: 'minimal',
  colors: {
    primary: '#18181B',
    secondary: '#3F3F46',
    accent: '#18181B',
    background: '#FAFAFA',
    surface: '#F4F4F5',
    text: '#3F3F46',
    textLight: '#71717A',
    headingText: '#18181B',
    codeBackground: '#27272A',
    codeForeground: '#E4E4E7',
  },
  fonts: {
    heading: "'Georgia', 'Times New Roman', serif",
    body: "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif",
    code: "'Fira Code', 'JetBrains Mono', 'Consolas', monospace",
  },
  slideWidth: 13.333,
  slideHeight: 7.5,
};

const corporateTheme: Theme = {
  name: 'corporate',
  colors: {
    primary: '#1D4ED8',
    secondary: '#1E40AF',
    accent: '#DC2626',
    background: '#FFFFFF',
    surface: '#EFF6FF',
    text: '#1E3A5F',
    textLight: '#6B7280',
    headingText: '#1E3A5F',
    codeBackground: '#1E3A5F',
    codeForeground: '#E0F2FE',
  },
  fonts: {
    heading: "'Calibri', 'Segoe UI', system-ui, sans-serif",
    body: "'Calibri', 'Segoe UI', system-ui, sans-serif",
    code: "'Consolas', 'Courier New', monospace",
  },
  slideWidth: 13.333,
  slideHeight: 7.5,
};

const themes: Record<string, Theme> = {
  default: defaultTheme,
  dark: darkTheme,
  minimal: minimalTheme,
  corporate: corporateTheme,
};

export function getTheme(meta: PresentationMeta): Theme {
  const themeName = meta.theme || meta.style || 'default';
  const base = themes[themeName] || defaultTheme;

  // Apply overrides from meta
  const result = JSON.parse(JSON.stringify(base)) as Theme;

  if (meta.accentColor) {
    result.colors.primary = meta.accentColor;
  }

  if (meta.fontFamily) {
    result.fonts.heading = `'${meta.fontFamily}', ${result.fonts.heading}`;
    result.fonts.body = `'${meta.fontFamily}', ${result.fonts.body}`;
  }

  if (meta.aspectRatio === '4:3') {
    result.slideWidth = 10;
    result.slideHeight = 7.5;
  }

  return result;
}

export function listThemes(): string[] {
  return Object.keys(themes);
}
