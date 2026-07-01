import { readFile } from "fs/promises"
import path from "path"
import { randomUUID } from "crypto"
import { canUploadDocuments, getS3Config, isS3FileRef } from "@/lib/s3-settings"
import { getDocumentFilePath, getDocumentMimeType } from "@/lib/documents"
import { uploadToS3, downloadFromS3, s3KeyFromFileRef } from "@/lib/integrations"

const MAX_BYTES = 10 * 1024 * 1024
const ALLOWED_EXT = new Set([".pdf", ".jpg", ".jpeg", ".png", ".webp", ".doc", ".docx"])
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
])

function isAllowedFile(file: File): boolean {
  if (ALLOWED_TYPES.has(file.type)) return true
  const ext = path.extname(file.name).toLowerCase()
  if (!ALLOWED_EXT.has(ext)) return false
  return !file.type || file.type === "application/octet-stream"
}

export async function saveDocumentFile(file: File): Promise<string> {
  if (!(await canUploadDocuments())) {
    throw new Error("Document storage is not configured. Enable S3 in Settings → Integrations.")
  }

  if (file.size > MAX_BYTES) {
    throw new Error("File must be 10 MB or smaller")
  }

  if (!isAllowedFile(file)) {
    throw new Error("File type not allowed. Use PDF, Word, or image files.")
  }

  const s3 = await getS3Config()
  const ext = path.extname(file.name) || ""
  const prefix = s3.prefix || "documents"
  const key = `${prefix}/${randomUUID()}${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())
  const contentType = file.type || getDocumentMimeType(key)

  return uploadToS3(s3, key, buffer, contentType)
}

export async function readDocumentFile(fileUrl: string): Promise<Buffer> {
  if (isS3FileRef(fileUrl)) {
    const s3 = await getS3Config()
    const key = s3KeyFromFileRef(fileUrl, s3.prefix || "documents")
    return downloadFromS3(s3, key)
  }

  return readFile(getDocumentFilePath(fileUrl))
}
