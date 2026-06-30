import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { canManageSettings } from "@/lib/rbac"

export async function POST(
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

    const { id: shiftId } = await params
    const body = await request.json()
    const { employeeId, startDate, endDate } = body

    if (!employeeId || !startDate) {
      return NextResponse.json({ error: "Employee and start date are required" }, { status: 400 })
    }

    const assignment = await prisma.shiftAssignment.create({
      data: {
        employeeId,
        shiftId,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
      },
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true, employeeId: true },
        },
        shift: true,
      },
    })

    await prisma.notification.create({
      data: {
        employeeId,
        title: "Shift Assigned",
        message: `You have been assigned to the "${assignment.shift.name}" shift.`,
        type: "INFO",
        link: "/attendance/my-calendar",
      },
    })

    return NextResponse.json(assignment, { status: 201 })
  } catch (error) {
    console.error("Error assigning shift:", error)
    return NextResponse.json({ error: "Failed to assign shift" }, { status: 500 })
  }
}
