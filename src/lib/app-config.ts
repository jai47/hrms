import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs"
import path from "path"

export type S3Config = {
  bucket: string
  region: string
  accessKeyId: string
  secretAccessKey: string
  endpoint?: string
  prefix?: string
}

export type AppConfig = {
  setupComplete: boolean
  mongodbUri?: string
  documentStorageEnabled: boolean
  s3?: S3Config
}

const CONFIG_DIR = path.join(process.cwd(), "data")
const CONFIG_PATH = path.join(CONFIG_DIR, "app-config.json")

const DEFAULT_CONFIG: AppConfig = {
  setupComplete: false,
  documentStorageEnabled: false,
}

function ensureConfigDir() {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true })
  }
}

export function readAppConfig(): AppConfig {
  try {
    if (!existsSync(CONFIG_PATH)) return { ...DEFAULT_CONFIG }
    const raw = readFileSync(CONFIG_PATH, "utf-8")
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULT_CONFIG }
  }
}

export function writeAppConfig(config: AppConfig) {
  ensureConfigDir()
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + "\n", "utf-8")
}

export function needsSetup(): boolean {
  const config = readAppConfig()
  if (config.setupComplete) return false
  if (process.env.DATABASE_URL) return false
  return true
}

export function getEffectiveMongoUri(): string | undefined {
  const config = readAppConfig()
  return config.mongodbUri || process.env.DATABASE_URL
}

export function isDocumentStorageEnabled(): boolean {
  return readAppConfig().documentStorageEnabled === true
}

export function isS3Configured(): boolean {
  const { s3 } = readAppConfig()
  return Boolean(
    s3?.bucket &&
      s3?.region &&
      s3?.accessKeyId &&
      s3?.secretAccessKey
  )
}

export function canUploadDocuments(): boolean {
  return isDocumentStorageEnabled() && isS3Configured()
}

export function isS3FileRef(fileUrl: string): boolean {
  return fileUrl.startsWith("s3:")
}

export function maskSecret(value?: string): string {
  if (!value) return ""
  if (value.length <= 4) return "••••••••"
  return "••••••••" + value.slice(-4)
}

export type PublicIntegrationConfig = {
  setupComplete: boolean
  mongodbConfigured: boolean
  mongodbUriPreview: string
  documentStorageEnabled: boolean
  s3Configured: boolean
  canUploadDocuments: boolean
  s3: {
    bucket: string
    region: string
    accessKeyId: string
    secretAccessKey: string
    endpoint: string
    prefix: string
  }
}

export function getPublicIntegrationConfig(): PublicIntegrationConfig {
  const config = readAppConfig()
  const uri = getEffectiveMongoUri() || ""

  return {
    setupComplete: config.setupComplete || Boolean(process.env.DATABASE_URL),
    mongodbConfigured: Boolean(uri),
    mongodbUriPreview: uri ? maskUri(uri) : "",
    documentStorageEnabled: config.documentStorageEnabled,
    s3Configured: isS3Configured(),
    canUploadDocuments: canUploadDocuments(),
    s3: {
      bucket: config.s3?.bucket || "",
      region: config.s3?.region || "",
      accessKeyId: config.s3?.accessKeyId || "",
      secretAccessKey: config.s3?.secretAccessKey ? maskSecret(config.s3.secretAccessKey) : "",
      endpoint: config.s3?.endpoint || "",
      prefix: config.s3?.prefix || "documents",
    },
  }
}

function maskUri(uri: string): string {
  try {
    const url = new URL(uri)
    if (url.password) url.password = "****"
    if (url.username) url.username = url.username.slice(0, 2) + "****"
    return url.toString()
  } catch {
    return maskSecret(uri)
  }
}
