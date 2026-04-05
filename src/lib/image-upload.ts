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

  const meta = await sharp(buffer).metadata()
  const inputFormat = meta.format ?? "jpeg"

  let processed: Buffer
  let ext: string
  let width: number
  let height: number

  if (inputFormat === "png") {
    const result = await sharp(buffer)
      .png({ compressionLevel: 9, adaptiveFiltering: true, palette: false })
      .toBuffer({ resolveWithObject: true })
    processed = result.data
    ext = "png"
    width = result.info.width
    height = result.info.height
  } else if (inputFormat === "webp") {
    const result = await sharp(buffer)
      .webp({ lossless: true, effort: 6 })
      .toBuffer({ resolveWithObject: true })
    processed = result.data
    ext = "webp"
    width = result.info.width
    height = result.info.height
  } else {
    const result = await sharp(buffer)
      .jpeg({ quality: 95, mozjpeg: true, progressive: true })
      .toBuffer({ resolveWithObject: true })
    processed = result.data
    ext = "jpg"
    width = result.info.width
    height = result.info.height
  }

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