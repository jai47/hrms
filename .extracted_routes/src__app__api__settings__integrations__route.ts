import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import {
  readAppConfig,
  writeAppConfig,
  getPublicIntegrationConfig,
  type AppConfig,
  type S3Config,
} from "@/lib/app-config"
import { updateEnvFile } from "@/lib/env-file"
import { testMongoConnection, testS3Connection } from "@/lib/integrations"
import { prisma } from "@/lib/prisma"

async function bootstrapFromEnv() {
  const config = readAppConfig()
  if (config.setupComplete || !process.env.DATABASE_URL) return

  try {
    await prisma.employee.count()
    writeAppConfig({
      ...config,
      setupComplete: true,
      mongodbUri: process.env.DATABASE_URL,
    })
  } catch {
    // database not ready yet
  }
}

export async function GET() {
  try {
    const session = await auth()
    if (!session || !["ADMIN", "HR_MANAGER"].includes(session.user?.role || "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    await bootstrapFromEnv()
    return NextResponse.json(getPublicIntegrationConfig())
  } catch (error) {
    console.error("Error fetching integrations:", error)
    return NextResponse.json({ error: "Failed to load integrations" }, { status: 500 })
  }
}

type IntegrationBody = {
  mongodbUri?: string
  documentStorageEnabled?: boolean
  s3?: Partial<S3Config>
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth()
    if (!session || session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = (await request.json()) as IntegrationBody
    const current = readAppConfig()
    const next: AppConfig = { ...current }

    if (typeof body.documentStorageEnabled === "boolean") {
      next.documentStorageEnabled = body.documentStorageEnabled
    }

    if (body.mongodbUri?.trim()) {
      const test = await testMongoConnection(body.mongodbUri.trim())
      if (!test.ok) {
        return NextResponse.json({ error: test.error || "MongoDB connection failed" }, { status: 400 })
      }
      next.mongodbUri = body.mongodbUri.trim()
      next.setupComplete = true
      await updateEnvFile({ DATABASE_URL: body.mongodbUri.trim() })
      process.env.DATABASE_URL = body.mongodbUri.trim()
    }

    if (body.s3) {
      const merged: S3Config = {
        bucket: body.s3.bucket?.trim() || current.s3?.bucket || "",
        region: body.s3.region?.trim() || current.s3?.region || "",
        accessKeyId: body.s3.accessKeyId?.trim() || current.s3?.accessKeyId || "",
        secretAccessKey:
          body.s3.secretAccessKey?.trim() && !body.s3.secretAccessKey.includes("••••")
            ? body.s3.secretAccessKey.trim()
            : current.s3?.secretAccessKey || "",
        endpoint: body.s3.endpoint?.trim() || current.s3?.endpoint || "",
        prefix: body.s3.prefix?.trim() || current.s3?.prefix || "documents",
      }

      if (next.documentStorageEnabled) {
        const test = await testS3Connection(merged)
        if (!test.ok) {
          return NextResponse.json({ error: test.error || "S3 connection failed" }, { status: 400 })
        }
      }

      next.s3 = merged
    }

    if (!next.documentStorageEnabled) {
      // keep s3 config saved but uploads stay disabled
    }

    writeAppConfig(next)
    return NextResponse.json({
      success: true,
      restartRequired: Boolean(body.mongodbUri?.trim()),
      config: getPublicIntegrationConfig(),
    })
  } catch (error) {
    console.error("Error saving integrations:", error)
    return NextResponse.json({ error: "Failed to save integrations" }, { status: 500 })
  }
}
