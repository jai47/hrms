import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { canManageSettings } from "@/lib/rbac"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!canManageSettings(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()

    const announcement = await prisma.announcement.update({
      where: { id },
      data: {
        isActive: body.isActive,
        title: body.title?.trim(),
        content: body.content?.trim(),
      },
    })

    return NextResponse.json(announcement)
  } catch (error) {
    console.error("Error updating announcement:", error)
    return NextResponse.json({ error: "Failed to update announcement" }, { status: 500 })
  }
}
