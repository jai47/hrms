import { getSetting, upsertSettings } from "@/lib/settings"

export type S3Config = {
  bucket: string
  region: string
  accessKeyId: string
  secretAccessKey: string
  endpoint?: string
  prefix?: string
}

const KEYS = {
  documentStorageEnabled: "document_storage_enabled",
  bucket: "s3_bucket",
  region: "s3_region",
  accessKeyId: "s3_access_key_id",
  secretAccessKey: "s3_secret_access_key",
  endpoint: "s3_endpoint",
  prefix: "s3_prefix",
} as const

export function maskSecret(value?: string): string {
  if (!value) return ""
  if (value.length <= 4) return "••••••••"
  return "••••••••" + value.slice(-4)
}

export type DocumentStorageSettings = {
  documentStorageEnabled: boolean
  s3?: S3Config
}

export async function getDocumentStorageSettings(): Promise<DocumentStorageSettings> {
  const [enabled, bucket, region, accessKeyId, secretAccessKey, endpoint, prefix] =
    await Promise.all([
      getSetting(KEYS.documentStorageEnabled),
      getSetting(KEYS.bucket),
      getSetting(KEYS.region),
      getSetting(KEYS.accessKeyId),
      getSetting(KEYS.secretAccessKey),
      getSetting(KEYS.endpoint),
      getSetting(KEYS.prefix),
    ])

  const documentStorageEnabled = enabled === "true"
  const hasS3 =
    Boolean(bucket?.trim()) &&
    Boolean(region?.trim()) &&
    Boolean(accessKeyId?.trim()) &&
    Boolean(secretAccessKey?.trim())

  const s3: S3Config | undefined = hasS3
    ? {
        bucket: bucket!.trim(),
        region: region!.trim(),
        accessKeyId: accessKeyId!.trim(),
        secretAccessKey: secretAccessKey!.trim(),
        endpoint: endpoint?.trim() || undefined,
        prefix: prefix?.trim() || "documents",
      }
    : undefined

  return { documentStorageEnabled, s3 }
}

export async function saveDocumentStorageSettings(
  documentStorageEnabled: boolean,
  s3: Partial<S3Config>,
  existing?: DocumentStorageSettings
): Promise<DocumentStorageSettings> {
  const current = existing ?? (await getDocumentStorageSettings())

  const merged: S3Config = {
    bucket: s3.bucket?.trim() || current.s3?.bucket || "",
    region: s3.region?.trim() || current.s3?.region || "",
    accessKeyId: s3.accessKeyId?.trim() || current.s3?.accessKeyId || "",
    secretAccessKey:
      s3.secretAccessKey?.trim() && !s3.secretAccessKey.includes("••••")
        ? s3.secretAccessKey.trim()
        : current.s3?.secretAccessKey || "",
    endpoint: s3.endpoint?.trim() || current.s3?.endpoint || "",
    prefix: s3.prefix?.trim() || current.s3?.prefix || "documents",
  }

  await upsertSettings({
    [KEYS.documentStorageEnabled]: documentStorageEnabled ? "true" : "false",
    [KEYS.bucket]: merged.bucket,
    [KEYS.region]: merged.region,
    [KEYS.accessKeyId]: merged.accessKeyId,
    [KEYS.secretAccessKey]: merged.secretAccessKey,
    [KEYS.endpoint]: merged.endpoint || "",
    [KEYS.prefix]: merged.prefix || "documents",
  })

  return {
    documentStorageEnabled,
    s3: merged.bucket && merged.region && merged.accessKeyId && merged.secretAccessKey
      ? merged
      : undefined,
  }
}

export function isS3Configured(settings: DocumentStorageSettings): boolean {
  const { s3 } = settings
  return Boolean(s3?.bucket && s3?.region && s3?.accessKeyId && s3?.secretAccessKey)
}

export async function isDocumentStorageEnabled(): Promise<boolean> {
  const { documentStorageEnabled } = await getDocumentStorageSettings()
  return documentStorageEnabled
}

export async function canUploadDocuments(): Promise<boolean> {
  const settings = await getDocumentStorageSettings()
  return settings.documentStorageEnabled && isS3Configured(settings)
}

export async function getS3Config(): Promise<S3Config> {
  const { s3 } = await getDocumentStorageSettings()
  if (!s3) throw new Error("S3 is not configured")
  return s3
}

export type PublicS3IntegrationConfig = {
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

export async function getPublicS3IntegrationConfig(): Promise<PublicS3IntegrationConfig> {
  const settings = await getDocumentStorageSettings()
  const s3Configured = isS3Configured(settings)

  return {
    documentStorageEnabled: settings.documentStorageEnabled,
    s3Configured,
    canUploadDocuments: settings.documentStorageEnabled && s3Configured,
    s3: {
      bucket: settings.s3?.bucket || "",
      region: settings.s3?.region || "",
      accessKeyId: settings.s3?.accessKeyId || "",
      secretAccessKey: settings.s3?.secretAccessKey
        ? maskSecret(settings.s3.secretAccessKey)
        : "",
      endpoint: settings.s3?.endpoint || "",
      prefix: settings.s3?.prefix || "documents",
    },
  }
}

export function isS3FileRef(fileUrl: string): boolean {
  return fileUrl.startsWith("s3:")
}
