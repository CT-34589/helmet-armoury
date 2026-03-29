"use client"
import { useRef, useState } from "react"
import { Upload, X, Loader2, CheckCircle2, ImageIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface HelmetImageUploadProps {
  onUpload: (publicUrl: string) => void
  className?: string
  existing?: string | null
}

interface UploadResult {
  publicUrl: string
  summary: string
  width: number
  height: number
}

export function HelmetImageUpload({ onUpload, className, existing }: HelmetImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(existing ?? null)
  const [status, setStatus] = useState<"idle" | "processing" | "done" | "error">("idle")
  const [result, setResult] = useState<UploadResult | null>(null)
  const [error, setError] = useState("")
  const [dragging, setDragging] = useState(false)
  const [progress, setProgress] = useState(0)

  const handleFile = async (f: File) => {
    if (!f.type.startsWith("image/")) { setError("Images only (PNG, JPG, WebP)."); return }
    if (f.size > 20 * 1024 * 1024) { setError("Max 20 MB."); return }

    setError("")
    setStatus("processing")
    setProgress(10)

    // Show local preview immediately
    const reader = new FileReader()
    reader.onload = (e) => setPreview(e.target?.result as string)
    reader.readAsDataURL(f)

    setProgress(30)

    try {
      const fd = new FormData()
      fd.append("file", f)

      setProgress(50)

      const res = await fetch("/api/upload", { method: "POST", body: fd })

      setProgress(80)

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? "Upload failed")
      }

      const data: UploadResult = await res.json()
      setProgress(100)
      setResult(data)
      setStatus("done")
      onUpload(data.publicUrl)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Upload failed")
      setStatus("error")
      setProgress(0)
    }
  }

  const reset = (e: React.MouseEvent) => {
    e.stopPropagation()
    setPreview(existing ?? null)
    setStatus("idle")
    setResult(null)
    setError("")
    setProgress(0)
    if (inputRef.current) inputRef.current.value = ""
  }

  const isDone = status === "done"
  const isProcessing = status === "processing"

  return (
    <div className={cn("space-y-2", className)}>
      <div
        onClick={() => !isProcessing && !isDone && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); if (!isProcessing && !isDone) setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault(); setDragging(false)
          const f = e.dataTransfer.files[0]
          if (f && !isProcessing && !isDone) handleFile(f)
        }}
        className={cn(
          "relative rounded-md border-2 border-dashed transition-colors",
          "flex flex-col items-center justify-center gap-2 min-h-[140px] overflow-hidden",
          !isProcessing && !isDone && "cursor-pointer",
          dragging ? "border-primary bg-primary/5" : "border-border hover:border-border/80",
          preview && "border-solid",
          isDone && "border-emerald-500/50 bg-emerald-500/5",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
        />

        {/* Progress bar overlay */}
        {isProcessing && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted">
            <div
              className="h-full bg-primary transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {preview ? (
          <div className="relative w-full h-full flex items-center justify-center p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="Helmet preview"
              className="max-h-36 max-w-full rounded object-contain"
            />
            {isDone && (
              <div className="absolute top-2 right-2 rounded-full bg-emerald-500/20 p-1">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              </div>
            )}
            {!isDone && !isProcessing && (
              <button
                type="button"
                onClick={reset}
                className="absolute top-2 right-2 rounded-full bg-background border p-0.5 hover:bg-muted transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        ) : (
          <div className="text-center px-4">
            {isProcessing ? (
              <>
                <Loader2 className="h-6 w-6 text-muted-foreground animate-spin mx-auto mb-2" />
                <p className="text-sm font-medium">Processing image…</p>
                <p className="text-xs text-muted-foreground">Stripping metadata, compressing</p>
              </>
            ) : (
              <>
                <ImageIcon className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm font-medium">Drop image or click to browse</p>
                <p className="text-xs text-muted-foreground">PNG · JPG · WebP · Max 20 MB</p>
              </>
            )}
          </div>
        )}
      </div>

      {/* Result stats */}
      {isDone && result && (
        <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
          <span className="text-emerald-500 font-medium">✓ Uploaded &amp; optimised</span>
          <span>{result.summary} · {result.width}×{result.height}px</span>
        </div>
      )}

      {/* Processing indicator when preview is already set */}
      {isProcessing && preview && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>Stripping metadata and compressing…</span>
        </div>
      )}

      {error && <p className="text-xs text-destructive px-1">{error}</p>}

      {/* Re-upload option after done */}
      {isDone && (
        <button
          type="button"
          onClick={reset}
          className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
        >
          Replace image
        </button>
      )}
    </div>
  )
}
