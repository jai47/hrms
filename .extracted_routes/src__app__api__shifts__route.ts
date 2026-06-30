import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { canManageSettings } from "@/lib/rbac"
import { parseWorkingDays } from "@/lib/shifts"

export async function GET() {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const shifts = await prisma.shift.findMany({
      include: {
        department: { select: { id: true, name: true } },
        assignments: {
          include: {
            employee: {
              select: { id: true, firstName: true, lastName: true, employeeId: true },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    })

    return NextResponse.json({
      shifts: shifts.map((s) => ({
        ...s,
        workingDays: parseWorkingDays(s.workingDays),
      })),
    })
  } catch (error) {
    console.error("Error fetching shifts:", error)
    return NextResponse.json({ error: "Failed to fetch shifts" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!canManageSettings(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const workingDays = Array.isArray(body.workingDays)
      ? body.workingDays
      : ["MON", "TUE", "WED", "THU", "FRI"]

    const shift = await prisma.shift.create({
      data: {
        name: body.name,
        startTime: body.startTime,
        endTime: body.endTime,
        breakMinutes: parseInt(body.breakMinutes, 10) || 60,
        workingDays: JSON.stringify(workingDays),
        departmentId: body.departmentId || null,
        isActive: body.isActive !== false,
      },
    })

    return NextResponse.json(shift, { status: 201 })
  } catch (error) {
    console.error("Error creating shift:", error)
    return NextResponse.json({ error: "Failed to create shift" }, { status: 500 })
  }
}
