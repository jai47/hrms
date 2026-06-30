import path from "path"

const MIME_BY_EXT: Record<string, string> = {
  ".pdf": "application/pdf",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}

export function getDocumentMimeType(fileUrl: string): string {
  const ext = path.extname(fileUrl).toLowerCase()
  return MIME_BY_EXT[ext] || "application/octet-stream"
}

export function getDocumentFilePath(fileUrl: string): string {
  const relative = fileUrl.startsWith("/") ? fileUrl.slice(1) : fileUrl
  return path.join(process.cwd(), "public", relative)
}

export function isPreviewableDocument(fileUrl: string): boolean {
  const ext = path.extname(fileUrl).toLowerCase()
  return [".pdf", ".jpg", ".jpeg", ".png", ".webp"].includes(ext)
}

export function documentViewUrl(documentId: string): string {
  return `/documents/${documentId}`
}

export function documentFileUrl(documentId: string): string {
  return `/api/documents/${documentId}/file`
}
