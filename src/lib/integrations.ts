import { MongoClient } from "mongodb"
import {
  S3Client,
  HeadBucketCommand,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3"
import type { S3Config } from "@/lib/s3-settings"

export async function testMongoConnection(uri: string): Promise<{ ok: boolean; error?: string }> {
  if (!uri?.trim()) {
    return { ok: false, error: "Connection string is required" }
  }

  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 8000 })
  try {
    await client.connect()
    await client.db().command({ ping: 1 })
    return { ok: true }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Connection failed",
    }
  } finally {
    await client.close().catch(() => {})
  }
}

export function createS3Client(config: S3Config): S3Client {
  return new S3Client({
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    ...(config.endpoint
      ? {
          endpoint: config.endpoint,
          forcePathStyle: true,
        }
      : {}),
  })
}

export async function testS3Connection(config: S3Config): Promise<{ ok: boolean; error?: string }> {
  if (!config.bucket || !config.region || !config.accessKeyId || !config.secretAccessKey) {
    return { ok: false, error: "All S3 fields are required" }
  }

  const client = createS3Client(config)
  try {
    await client.send(new HeadBucketCommand({ Bucket: config.bucket }))
    return { ok: true }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "S3 connection failed",
    }
  } finally {
    client.destroy()
  }
}

export async function uploadToS3(
  config: S3Config,
  key: string,
  body: Buffer,
  contentType: string
): Promise<string> {
  const client = createS3Client(config)
  try {
    await client.send(
      new PutObjectCommand({
        Bucket: config.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      })
    )
    return `s3:${key}`
  } finally {
    client.destroy()
  }
}

export async function downloadFromS3(config: S3Config, key: string): Promise<Buffer> {
  const client = createS3Client(config)
  try {
    const response = await client.send(
      new GetObjectCommand({
        Bucket: config.bucket,
        Key: key,
      })
    )
    const bytes = await response.Body?.transformToByteArray()
    if (!bytes) throw new Error("Empty S3 object")
    return Buffer.from(bytes)
  } finally {
    client.destroy()
  }
}

export function s3KeyFromFileRef(fileRef: string, defaultPrefix = "documents"): string {
  if (fileRef.startsWith("s3:")) return fileRef.slice(3)
  return `${defaultPrefix}/${fileRef}`
}
