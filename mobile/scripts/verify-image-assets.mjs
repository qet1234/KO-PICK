import { readFile } from 'node:fs/promises';

const expectedAssets = [
  'assets/icon.png',
  'assets/adaptive-icon.png',
  'assets/splash.png',
  'assets/monochrome-icon.png',
];

const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

for (const asset of expectedAssets) {
  const image = await readFile(new URL(`../${asset}`, import.meta.url));

  if (image.length < 24 || !image.subarray(0, 8).equals(pngSignature)) {
    throw new Error(`${asset} is not a valid PNG file.`);
  }

  const width = image.readUInt32BE(16);
  const height = image.readUInt32BE(20);
  if (width !== 1024 || height !== 1024) {
    throw new Error(`${asset} must be 1024x1024, received ${width}x${height}.`);
  }

  console.log(`Verified ${asset}: ${width}x${height} PNG`);
}
