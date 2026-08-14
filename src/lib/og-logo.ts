import { readFile } from "node:fs/promises";
import path from "node:path";

// next/og's ImageResponse (Satori) can't resolve a relative /logo.png URL at
// render time — it needs actual image bytes. These routes run on the
// Node.js runtime (no `export const runtime = "edge"`), so reading the file
// straight off disk and inlining it as a data URL is the standard pattern.
let cachedDataUrl: string | null = null;

export async function getLogoDataUrl(): Promise<string> {
  if (cachedDataUrl) {
    return cachedDataUrl;
  }
  const filePath = path.join(process.cwd(), "public", "logo.png");
  const buffer = await readFile(filePath);
  cachedDataUrl = `data:image/png;base64,${buffer.toString("base64")}`;
  return cachedDataUrl;
}
