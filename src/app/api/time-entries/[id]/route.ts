import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    const existing = await prisma.timeEntry.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "Time entry not found" }, { status: 404 })
    }

    const canEdit =
      existing.employeeId === session.user.id ||
      ["ADMIN", "HR_MANAGER", "MANAGER"].includes(session.user.role || "")

    if (!canEdit) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const entry = await prisma.timeEntry.update({
      where: { id },
      data: {
        hours: body.hours != null ? parseFloat(body.hours) : undefined,
        date: body.date ? new Date(body.date) : undefined,
        description: body.description,
      },
    })

    return NextResponse.json(entry)
  } catch (error) {
    console.error("Error updating time entry:", error)
    return NextResponse.json({ error: "Failed to update time entry" }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const existing = await prisma.timeEntry.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: "Time entry not found" }, { status: 404 })
    }

    const canDelete =
      existing.employeeId === session.user.id ||
      ["ADMIN", "HR_MANAGER", "MANAGER"].includes(session.user.role || "")

    if (!canDelete) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    await prisma.timeEntry.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting time entry:", error)
    return NextResponse.json({ error: "Failed to delete time entry" }, { status: 500 })
  }
}
