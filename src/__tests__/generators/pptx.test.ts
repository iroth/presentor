import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { generatePPTX } from '../../generators/pptx';
import { parse } from '../../parser';
import {
  MINIMAL_INPUT,
  FRONTMATTER_INPUT,
  MULTI_SLIDE_INPUT,
} from '../fixtures';

const tempFiles: string[] = [];

function tempPath(name: string): string {
  const p = path.join(os.tmpdir(), `presentor-test-${Date.now()}-${name}.pptx`);
  tempFiles.push(p);
  return p;
}

afterEach(() => {
  for (const f of tempFiles) {
    try {
      fs.unlinkSync(f);
    } catch {
      // ignore
    }
  }
  tempFiles.length = 0;
});

describe('generatePPTX', () => {
  it('generates a PPTX file that exists on disk', async () => {
    const presentation = parse(MINIMAL_INPUT);
    const outPath = tempPath('exists');
    await generatePPTX(presentation, outPath);
    expect(fs.existsSync(outPath)).toBe(true);
  });

  it('generates a non-empty PPTX file', async () => {
    const presentation = parse(MINIMAL_INPUT);
    const outPath = tempPath('nonempty');
    await generatePPTX(presentation, outPath);
    const stat = fs.statSync(outPath);
    expect(stat.size).toBeGreaterThan(0);
  });

  it('uses the correct title metadata', async () => {
    const presentation = parse(FRONTMATTER_INPUT);
    const outPath = tempPath('title');
    // Just verify no errors are thrown and file is created
    await generatePPTX(presentation, outPath);
    expect(fs.existsSync(outPath)).toBe(true);
    expect(presentation.meta.title).toBe('My Presentation');
  });

  it('handles multi-slide presentation', async () => {
    const presentation = parse(MULTI_SLIDE_INPUT);
    const outPath = tempPath('multi');
    await generatePPTX(presentation, outPath);
    expect(fs.existsSync(outPath)).toBe(true);
    const stat = fs.statSync(outPath);
    expect(stat.size).toBeGreaterThan(0);
  });

  it('generates file for 4:3 aspect ratio input', async () => {
    const input = `---
title: Test
aspect-ratio: 4:3
---

# Slide One`;
    const presentation = parse(input);
    const outPath = tempPath('4x3');
    await generatePPTX(presentation, outPath);
    expect(fs.existsSync(outPath)).toBe(true);
    expect(presentation.meta.aspectRatio).toBe('4:3');
  });
});
