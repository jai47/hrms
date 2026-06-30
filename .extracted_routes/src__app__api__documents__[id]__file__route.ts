import { readFile } from "fs/promises"
import { NextRequest, NextResponse } from "next/server"
import path from "path"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { canManageEmployees } from "@/lib/rbac"
import { getDocumentFilePath, getDocumentMimeType } from "@/lib/documents"

async function canAccessDocument(
  documentEmployeeId: string,
  userId: string,
  role: string
): Promise<boolean> {
  if (canManageEmployees(role) || role === "MANAGER") return true
  return documentEmployeeId === userId
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const document = await prisma.document.findUnique({ where: { id } })
    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    const allowed = await canAccessDocument(
      document.employeeId,
      session.user.id,
      session.user.role
    )
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const filePath = getDocumentFilePath(document.fileUrl)
    const buffer = await readFile(filePath)
    const mimeType = getDocumentMimeType(document.fileUrl)
    const ext = path.extname(document.fileUrl)
    const download = request.nextUrl.searchParams.get("download") === "1"
    const safeTitle = document.title.replace(/[^\w\s.-]/g, "").trim() || "document"

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": mimeType,
        "Content-Length": String(buffer.length),
        "Content-Disposition": download
          ? `attachment; filename="${safeTitle}${ext}"`
          : `inline; filename="${safeTitle}${ext}"`,
        "Cache-Control": "private, max-age=3600",
      },
    })
  } catch (error) {
    console.error("Error serving document file:", error)
    return NextResponse.json({ error: "File not found or unavailable" }, { status: 404 })
  }
}
