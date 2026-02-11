// ── Core presentation types ──

export interface PresentationMeta {
  title?: string;
  author?: string;
  date?: string;
  theme?: string;
  aspectRatio?: '16:9' | '4:3';
  // Style hints from the input
  accentColor?: string;
  fontFamily?: string;
  style?: string; // e.g. "dark", "minimal", "corporate", "playful"
}

export type ContentBlockType =
  | 'heading'
  | 'subheading'
  | 'text'
  | 'bullets'
  | 'numbered'
  | 'image'
  | 'code'
  | 'quote'
  | 'chart'
  | 'mindmap'
  | 'stock-image'
  | 'ai-image';

export interface ContentBlock {
  type: ContentBlockType;
  content: string;        // raw text content
  items?: string[];       // for bullets/numbered lists
  level?: number;         // heading level (1-3), bullet indent level
  language?: string;      // for code blocks
  alt?: string;           // for images
  src?: string;           // for images
  resolvedSrc?: string;   // resolved local path for generated/downloaded images
  chartData?: ChartData;        // for chart blocks
  mindmapData?: MindMapData;    // for mindmap blocks
  imageQuery?: string;          // for stock-image: the search query
  imageStyle?: 'photo' | 'illustration' | 'diagram';  // for ai-image
}

export type SlideLayout =
  | 'title'           // Title slide (big centered title + subtitle)
  | 'section'         // Section divider (big heading, maybe subtitle)
  | 'content'         // Standard content slide (title + body)
  | 'two-column'      // Two column layout
  | 'image-full'      // Full-bleed image
  | 'blank';          // Empty/custom

export interface Slide {
  layout: SlideLayout;
  title?: string;
  subtitle?: string;
  blocks: ContentBlock[];
  notes?: string;         // speaker notes
  background?: string;    // background color or image URL
}

export interface Presentation {
  meta: PresentationMeta;
  slides: Slide[];
}

// ── Theme types ──

export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textLight: string;
  headingText: string;
  codeBackground: string;
  codeForeground: string;
}

export interface ThemeFonts {
  heading: string;
  body: string;
  code: string;
}

export interface Theme {
  name: string;
  colors: ThemeColors;
  fonts: ThemeFonts;
  slideWidth: number;   // inches for PPTX, px derived for HTML
  slideHeight: number;
}

// ── Graphics data types ──

export interface ChartData {
  type: 'bar' | 'pie' | 'line';
  title?: string;
  items: { label: string; value: number }[];
}

export interface MindMapData {
  center: string;
  branches: { label: string; children?: string[] }[];
}
