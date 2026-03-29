"use client"
import { useRef, useState } from "react"
import { Upload, X, ExternalLink, CheckCircle2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

interface EvidenceUploadProps {
  requestId?: string
  onComplete: (result: { messageUrl?: string; note: string }) => void
  className?: string
}

export function EvidenceUpload({ requestId, onComplete, className }: EvidenceUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [note, setNote] = useState("")
  const [preview, setPreview] = useState<string | null>(null)
  const [status, setStatus] = useState<"idle" | "uploading" | "done" | "error">("idle")
  const [messageUrl, setMessageUrl] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState("")
  const [dragging, setDragging] = useState(false)

  const handleFile = (f: File) => {
    if (!f.type.startsWith("image/")) { setErrorMsg("Please select an image file."); return }
    if (f.size > 25 * 1024 * 1024) { setErrorMsg("File must be under 25 MB."); return }
    setFile(f)
    setErrorMsg("")
    const reader = new FileReader()
    reader.onload = (e) => setPreview(e.target?.result as string)
    reader.readAsDataURL(f)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  const submit = async () => {
    if (!file && !note.trim()) { setErrorMsg("Add an image or note."); return }
    setStatus("uploading"); setErrorMsg("")

    const fd = new FormData()
    fd.append("note", note)
    if (requestId) fd.append("requestId", requestId)
    if (file) fd.append("file", file)

    try {
      const res = await fetch("/api/evidence", { method: "POST", body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to submit")
      setMessageUrl(data.messageUrl ?? null)
      setStatus("done")
      onComplete({ messageUrl: data.messageUrl, note })
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : "Submission failed")
      setStatus("error")
    }
  }

  if (status === "done") {
    return (
      <div className={cn("rounded-md border bg-muted/30 p-4 space-y-2", className)}>
        <div className="flex items-center gap-2 text-sm text-emerald-500">
          <CheckCircle2 className="h-4 w-4" />
          Evidence submitted to Art Team
        </div>
        {messageUrl && (
          <a href={messageUrl} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:underline">
            <ExternalLink className="h-3 w-3" />View in Discord
          </a>
        )}
      </div>
    )
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Drop zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={cn(
          "border-2 border-dashed rounded-md cursor-pointer transition-colors",
          "flex flex-col items-center justify-center gap-2 min-h-[100px] p-4 text-center",
          dragging ? "border-primary bg-primary/5" : "border-border hover:border-border/80 hover:bg-muted/30",
          file && "border-solid"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
        />
        {preview ? (
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="preview" className="max-h-32 rounded object-contain" />
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setFile(null); setPreview(null) }}
              className="absolute -top-2 -right-2 rounded-full bg-background border p-0.5 hover:bg-muted"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <>
            <Upload className="h-6 w-6 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Drop image here or click to browse</p>
              <p className="text-xs text-muted-foreground">Screenshots, score tables, etc. Max 25 MB</p>
            </div>
          </>
        )}
      </div>

      {/* Note */}
      <div className="space-y-1.5">
        <Label className="text-xs">Additional note <span className="text-muted-foreground">(optional)</span></Label>
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add any context, links, or explanation for the Art Team…"
          rows={2}
          className="text-sm resize-none"
        />
      </div>

      {errorMsg && <p className="text-xs text-destructive">{errorMsg}</p>}

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={status === "uploading" || (!file && !note.trim())}
        onClick={submit}
        className="w-full"
      >
        {status === "uploading" ? (
          <><Loader2 className="h-4 w-4 animate-spin" />Sending to Art Team…</>
        ) : (
          <><Upload className="h-4 w-4" />Send Evidence to Discord</>
        )}
      </Button>
    </div>
  )
}
