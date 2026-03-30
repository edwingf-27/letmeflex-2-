import sharp from "sharp";

export async function addWatermark(imageBuffer: Buffer): Promise<Buffer> {
  const image = sharp(imageBuffer);
  const metadata = await image.metadata();
  const width = metadata.width || 1344;
  const height = metadata.height || 768;

  const fontSize = Math.max(16, Math.floor(width * 0.018));
  const padding = Math.floor(fontSize * 1.2);

  const svgWatermark = `
    <svg width="${width}" height="${height}">
      <text
        x="${width - padding}"
        y="${height - padding}"
        text-anchor="end"
        font-family="Montserrat, Arial, sans-serif"
        font-size="${fontSize}"
        font-weight="500"
        fill="white"
        opacity="0.4"
        letter-spacing="0.05em"
      >letmeflex.ai</text>
    </svg>
  `;

  return image
    .composite([
      {
        input: Buffer.from(svgWatermark),
        top: 0,
        left: 0,
      },
    ])
    .webp({ quality: 90 })
    .toBuffer();
}

export async function processImage(
  imageUrl: string,
  applyWatermark: boolean
): Promise<Buffer> {
  const response = await fetch(imageUrl);
  if (!response.ok) throw new Error("Failed to fetch generated image");

  const arrayBuffer = await response.arrayBuffer();
  let buffer = Buffer.from(arrayBuffer);

  if (applyWatermark) {
    buffer = await addWatermark(buffer);
  } else {
    buffer = await sharp(buffer).webp({ quality: 92 }).toBuffer();
  }

  return buffer;
}
