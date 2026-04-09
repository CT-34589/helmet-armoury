import sharp from "sharp"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { randomUUID } from "crypto"

// UPLOAD_DIR should be the final directory where images are saved
// e.g. "./public/uploads/helmets" or "/var/data/uploads/helmets"
// UPLOAD_PUBLIC_PREFIX is the public URL prefix for those images
// e.g. "/uploads/helmets"
const getUploadDir = () => process.env.UPLOAD_DIR ?? join(process.cwd(), "public", "uploads", "helmets")
const PUBLIC_PREFIX = process.env.UPLOAD_PUBLIC_PREFIX ?? "/uploads/helmets"

export interface ProcessedImage {
  publicUrl: string
  filename: string
  originalSize: number
  processedSize: number
  width: number
  height: number
}

export async function processAndSaveHelmetImage(
  buffer: Buffer,
  originalName: string,
): Promise<ProcessedImage> {
  const UPLOAD_DIR = getUploadDir()
  await mkdir(UPLOAD_DIR, { recursive: true })

  const originalSize = buffer.byteLength
  const id = randomUUID()

  // Convert everything to lossy WebP — preserves alpha, ~50-80% smaller than PNG,
  // ~25-35% smaller than JPEG, supported by all modern browsers.
  // Cap the longest dimension at 2048px — helmet renders don't benefit from larger at web sizes.
  const MAX_DIMENSION = 2048

  const result = await sharp(buffer)
    .resize(MAX_DIMENSION, MAX_DIMENSION, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 90, effort: 6 })
    .toBuffer({ resolveWithObject: true })

  const processed = result.data
  const ext = "webp"
  const width = result.info.width
  const height = result.info.height

  const filename = `${id}.${ext}`
  await writeFile(join(UPLOAD_DIR, filename), processed)

  return {
    publicUrl: `${PUBLIC_PREFIX}/${filename}`,
    filename,
    originalSize,
    processedSize: processed.byteLength,
    width,
    height,
  }
}