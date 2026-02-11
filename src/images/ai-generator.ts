import { GoogleGenAI } from "@google/genai";
import * as fs from 'fs';
import * as path from 'path';

export interface GenerateImageOptions {
  prompt: string;
  style: 'photo' | 'illustration' | 'diagram';
  aspectRatio?: '1:1' | '16:9' | '4:3';
  outputPath: string;
}

export interface GenerateImageResult {
  path: string;
}

export async function generateImage(options: GenerateImageOptions): Promise<GenerateImageResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is required');
  }

  const ai = new GoogleGenAI({ apiKey });

  let enhancedPrompt: string;
  switch (options.style) {
    case 'photo':
      enhancedPrompt = "Professional high-quality photograph, 8K quality: " + options.prompt;
      break;
    case 'illustration':
      enhancedPrompt = "Clean modern digital illustration, flat design, vector style: " + options.prompt;
      break;
    case 'diagram':
      enhancedPrompt = "Technical diagram on clean white background, clearly labeled, professional: " + options.prompt;
      break;
  }

  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash-exp",
    contents: enhancedPrompt,
    config: {
      responseModalities: ["IMAGE"],
    },
  });

  if (response.candidates && response.candidates[0]?.content?.parts) {
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        const buffer = Buffer.from(part.inlineData.data!, 'base64');
        fs.mkdirSync(path.dirname(options.outputPath), { recursive: true });
        fs.writeFileSync(options.outputPath, buffer);
        return { path: options.outputPath };
      }
    }
  }

  throw new Error('No image was generated in the response');
}
