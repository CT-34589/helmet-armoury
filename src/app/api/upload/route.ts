import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { processAndSaveHelmetImage } from "@/lib/image-upload"

// Allow up to 20 MB bodies (Next.js default is 4 MB)
export const maxRequestBodySize = "20mb"

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.isArtTeam) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 })
  }

  const file = formData.get("file") as File | null
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 })

  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "File must be an image" }, { status: 400 })
  }

  const MAX_MB = 20
  if (file.size > MAX_MB * 1024 * 1024) {
    return NextResponse.json({ error: `File must be under ${MAX_MB} MB` }, { status: 400 })
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    const result = await processAndSaveHelmetImage(buffer, file.name)

    const savedMB = (result.processedSize / 1024 / 1024).toFixed(2)
    const origMB = (result.originalSize / 1024 / 1024).toFixed(2)
    const saving = Math.round((1 - result.processedSize / result.originalSize) * 100)

    return NextResponse.json({
      publicUrl: result.publicUrl,
      filename: result.filename,
      width: result.width,
      height: result.height,
      originalSize: result.originalSize,
      processedSize: result.processedSize,
      // Human-readable summary for the UI
      summary: `${origMB} MB → ${savedMB} MB (${saving > 0 ? `−${saving}%` : "no change"})`,
    })
  } catch (err) {
    console.error("Image processing error:", err)
    return NextResponse.json({ error: "Image processing failed" }, { status: 500 })
  }
}
