import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { canManageSettings } from "@/lib/rbac"
import { parseWorkingDays } from "@/lib/shifts"

export async function PUT(
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

    const data: Record<string, unknown> = {}
    if (body.name) data.name = body.name
    if (body.startTime) data.startTime = body.startTime
    if (body.endTime) data.endTime = body.endTime
    if (body.breakMinutes != null) data.breakMinutes = parseInt(body.breakMinutes, 10)
    if (body.workingDays) data.workingDays = JSON.stringify(body.workingDays)
    if (body.departmentId !== undefined) data.departmentId = body.departmentId || null
    if (body.isActive !== undefined) data.isActive = body.isActive

    const shift = await prisma.shift.update({ where: { id }, data })
    return NextResponse.json({ ...shift, workingDays: parseWorkingDays(shift.workingDays) })
  } catch (error) {
    console.error("Error updating shift:", error)
    return NextResponse.json({ error: "Failed to update shift" }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
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
    await prisma.shift.update({ where: { id }, data: { isActive: false } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deactivating shift:", error)
    return NextResponse.json({ error: "Failed to deactivate shift" }, { status: 500 })
  }
}
