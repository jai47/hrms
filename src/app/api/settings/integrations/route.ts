import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { testS3Connection } from "@/lib/integrations"
import {
  getDocumentStorageSettings,
  saveDocumentStorageSettings,
  getPublicS3IntegrationConfig,
  type S3Config,
} from "@/lib/s3-settings"

export async function GET() {
  try {
    const session = await auth()
    if (!session || !["ADMIN", "HR_MANAGER"].includes(session.user?.role || "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    return NextResponse.json(await getPublicS3IntegrationConfig())
  } catch (error) {
    console.error("Error fetching integrations:", error)
    return NextResponse.json({ error: "Failed to load integrations" }, { status: 500 })
  }
}

type IntegrationBody = {
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
    const current = await getDocumentStorageSettings()

    const documentStorageEnabled =
      typeof body.documentStorageEnabled === "boolean"
        ? body.documentStorageEnabled
        : current.documentStorageEnabled

    const merged: S3Config = {
      bucket: body.s3?.bucket?.trim() || current.s3?.bucket || "",
      region: body.s3?.region?.trim() || current.s3?.region || "",
      accessKeyId: body.s3?.accessKeyId?.trim() || current.s3?.accessKeyId || "",
      secretAccessKey:
        body.s3?.secretAccessKey?.trim() && !body.s3.secretAccessKey.includes("••••")
          ? body.s3.secretAccessKey.trim()
          : current.s3?.secretAccessKey || "",
      endpoint: body.s3?.endpoint?.trim() || current.s3?.endpoint || "",
      prefix: body.s3?.prefix?.trim() || current.s3?.prefix || "documents",
    }

    if (documentStorageEnabled) {
      if (!merged.bucket || !merged.region || !merged.accessKeyId || !merged.secretAccessKey) {
        return NextResponse.json(
          { error: "S3 bucket, region, access key, and secret are required when storage is enabled" },
          { status: 400 }
        )
      }
      const test = await testS3Connection(merged)
      if (!test.ok) {
        return NextResponse.json({ error: test.error || "S3 connection failed" }, { status: 400 })
      }
    }

    await saveDocumentStorageSettings(documentStorageEnabled, merged, current)

    return NextResponse.json({
      success: true,
      config: await getPublicS3IntegrationConfig(),
    })
  } catch (error) {
    console.error("Error saving integrations:", error)
    return NextResponse.json({ error: "Failed to save integrations" }, { status: 500 })
  }
}
