import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';

export interface PixabayResult {
  id: number;
  tags: string;
  previewURL: string;
  webformatURL: string;
  largeImageURL: string;
  width: number;
  height: number;
  user: string;
}

export interface SearchOptions {
  orientation?: 'horizontal' | 'vertical';
  category?: string;
  perPage?: number;
  imageType?: 'photo' | 'illustration' | 'vector';
}

export function searchPhotos(
  query: string,
  options: SearchOptions = {},
): Promise<PixabayResult[]> {
  const apiKey = process.env.PIXABAY_API_KEY;
  if (!apiKey) {
    throw new Error(
      'PIXABAY_API_KEY environment variable is required. Get a free key at https://pixabay.com/api/docs/',
    );
  }

  const imageType = options.imageType ?? 'photo';
  const perPage = options.perPage ?? 5;

  let url =
    `https://pixabay.com/api/?key=${apiKey}` +
    `&q=${encodeURIComponent(query)}` +
    `&image_type=${imageType}` +
    `&per_page=${perPage}` +
    `&safesearch=true`;

  if (options.orientation) {
    url += `&orientation=${options.orientation}`;
  }
  if (options.category) {
    url += `&category=${encodeURIComponent(options.category)}`;
  }

  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode && res.statusCode >= 400) {
          reject(new Error(`Pixabay API request failed with status ${res.statusCode}`));
          res.resume();
          return;
        }

        let data = '';
        res.on('data', (chunk: Buffer) => {
          data += chunk.toString();
        });
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            const results: PixabayResult[] = (json.hits ?? []).map(
              (hit: Record<string, unknown>) => ({
                id: hit.id as number,
                tags: hit.tags as string,
                previewURL: hit.previewURL as string,
                webformatURL: hit.webformatURL as string,
                largeImageURL: hit.largeImageURL as string,
                width: hit.imageWidth as number,
                height: hit.imageHeight as number,
                user: hit.user as string,
              }),
            );
            resolve(results);
          } catch (err) {
            reject(new Error(`Failed to parse Pixabay response: ${err}`));
          }
        });
      })
      .on('error', (err) => {
        reject(new Error(`Pixabay API request failed: ${err.message}`));
      });
  });
}

export function downloadPhoto(
  imageUrl: string,
  outputPath: string,
): Promise<string> {
  const dir = path.dirname(outputPath);
  fs.mkdirSync(dir, { recursive: true });

  return new Promise((resolve, reject) => {
    const fetch = (url: string) => {
      https
        .get(url, (res) => {
          // Follow redirects
          if (
            (res.statusCode === 301 || res.statusCode === 302) &&
            res.headers.location
          ) {
            res.resume();
            fetch(res.headers.location);
            return;
          }

          if (res.statusCode && res.statusCode >= 400) {
            reject(new Error(`Download failed with status ${res.statusCode}`));
            res.resume();
            return;
          }

          const file = fs.createWriteStream(outputPath);
          res.pipe(file);
          file.on('finish', () => {
            file.close(() => resolve(outputPath));
          });
          file.on('error', (err) => {
            fs.unlink(outputPath, () => {});
            reject(new Error(`Failed to write image file: ${err.message}`));
          });
        })
        .on('error', (err) => {
          reject(new Error(`Download request failed: ${err.message}`));
        });
    };

    fetch(imageUrl);
  });
}
