import fs from "fs/promises";
import { PDFParse } from "pdf-parse";

export async function extractText(filePath: string): Promise<string> {
  const buffer = await fs.readFile(filePath);
  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();
  return result.text;
}

export function chunkText(text: string, chunkSize = 400, overlap = 50): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const chunks: string[] = [];
  let start = 0;

  while (start < words.length) {
    const end = start + chunkSize;
    chunks.push(words.slice(start, end).join(" "));
    start = end - overlap; // step back by the overlap amount before the next chunk
  }

  return chunks;
}
