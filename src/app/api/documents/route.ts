import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { canManageEmployees } from "@/lib/rbac"
import { canUploadDocuments } from "@/lib/app-config"
import { saveDocumentFile } from "@/lib/document-storage"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get("employeeId")

    const where: Record<string, unknown> = {}
    if (!canManageEmployees(session.user.role)) {
      where.employeeId = session.user.id
    } else if (employeeId) {
      where.employeeId = employeeId
    }

    const documents = await prisma.document.findMany({
      where,
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true, employeeId: true },
        },
      },
      orderBy: { uploadedAt: "desc" },
      take: 100,
    })

    return NextResponse.json({ documents })
  } catch (error) {
    console.error("Error fetching documents:", error)
    return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!canUploadDocuments()) {
      return NextResponse.json(
        { error: "Document storage is not configured. Enable S3 in Settings → Integrations." },
        { status: 503 }
      )
    }

    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const title = String(formData.get("title") || "").trim()
    const type = String(formData.get("type") || "OTHER")
    const employeeId = String(formData.get("employeeId") || session.user.id)
    const expiryDate = formData.get("expiryDate")
      ? String(formData.get("expiryDate"))
      : null

    if (!file || !title) {
      return NextResponse.json({ error: "Title and file are required" }, { status: 400 })
    }

    if (!canManageEmployees(session.user.role) && employeeId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const fileUrl = await saveDocumentFile(file)

    const document = await prisma.document.create({
      data: {
        employeeId,
        title,
        type: type as "CONTRACT" | "ID_DOCUMENT" | "CERTIFICATE" | "MEDICAL" | "TAX_DOCUMENT" | "OTHER",
        fileUrl,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        status: "ACTIVE",
      },
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true, employeeId: true },
        },
      },
    })

    if (employeeId !== session.user.id) {
      await prisma.notification.create({
        data: {
          employeeId,
          title: "New Document",
          message: `A new document "${title}" has been shared with you.`,
          type: "DOCUMENT_EXPIRY",
          link: "/documents",
        },
      })
    }

    return NextResponse.json(document, { status: 201 })
  } catch (error) {
    console.error("Error uploading document:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to upload document" },
      { status: 500 }
    )
  }
}
