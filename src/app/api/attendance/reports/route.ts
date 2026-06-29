import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { getAttendanceHours } from "@/lib/attendance"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get("employeeId")
    const dateFrom = searchParams.get("dateFrom")
    const dateTo = searchParams.get("dateTo")
    const groupBy = searchParams.get("groupBy") || "employee"

    const from = dateFrom
      ? new Date(dateFrom)
      : new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    const to = dateTo ? new Date(dateTo) : new Date()

    const where: Record<string, unknown> = {
      date: { gte: from, lte: to },
    }

    if (employeeId) {
      where.employeeId = employeeId
    } else if (session.user?.role === "EMPLOYEE" && session.user.id) {
      where.employeeId = session.user.id
    }

    const [attendanceRecords, timeEntries] = await Promise.all([
      prisma.attendance.findMany({
        where,
        include: {
          employee: {
            select: { id: true, firstName: true, lastName: true, employeeId: true, departmentId: true },
          },
        },
        orderBy: { date: "desc" },
      }),
      prisma.timeEntry.findMany({
        where: {
          date: { gte: from, lte: to },
          ...(where.employeeId ? { employeeId: where.employeeId as string } : {}),
        },
        include: {
          employee: { select: { id: true, firstName: true, lastName: true, employeeId: true } },
          issue: {
            select: {
              issueNumber: true,
              title: true,
              project: { select: { key: true } },
            },
          },
        },
      }),
    ])

    const enrichedRecords = attendanceRecords.map((record) => ({
      ...record,
      computedHours: getAttendanceHours(record),
    }))

    const totalAttendanceHours = enrichedRecords.reduce(
      (sum, r) => sum + (r.computedHours ?? 0),
      0
    )
    const totalTaskHours = timeEntries.reduce((sum, e) => sum + e.hours, 0)
    const daysPresent = enrichedRecords.filter((r) => r.computedHours && r.computedHours > 0).length

    if (groupBy === "employee") {
      const byEmployee = new Map<
        string,
        {
          employee: { id: string; firstName: string; lastName: string; employeeId: string }
          attendanceHours: number
          taskHours: number
          daysPresent: number
          records: typeof enrichedRecords
        }
      >()

      for (const record of enrichedRecords) {
        const key = record.employeeId
        if (!byEmployee.has(key)) {
          byEmployee.set(key, {
            employee: record.employee,
            attendanceHours: 0,
            taskHours: 0,
            daysPresent: 0,
            records: [],
          })
        }
        const entry = byEmployee.get(key)!
        entry.records.push(record)
        if (record.computedHours && record.computedHours > 0) {
          entry.attendanceHours += record.computedHours
          entry.daysPresent += 1
        }
      }

      for (const te of timeEntries) {
        const key = te.employeeId
        if (!byEmployee.has(key)) {
          byEmployee.set(key, {
            employee: {
              id: te.employee.id,
              firstName: te.employee.firstName,
              lastName: te.employee.lastName,
              employeeId: te.employee.employeeId,
            },
            attendanceHours: 0,
            taskHours: 0,
            daysPresent: 0,
            records: [],
          })
        }
        byEmployee.get(key)!.taskHours += te.hours
      }

      return NextResponse.json({
        dateFrom: from.toISOString(),
        dateTo: to.toISOString(),
        summary: {
          totalAttendanceHours: Math.round(totalAttendanceHours * 100) / 100,
          totalTaskHours: Math.round(totalTaskHours * 100) / 100,
          daysPresent,
          employeeCount: byEmployee.size,
        },
        byEmployee: Array.from(byEmployee.values()).map((e) => ({
          ...e,
          attendanceHours: Math.round(e.attendanceHours * 100) / 100,
          taskHours: Math.round(e.taskHours * 100) / 100,
        })),
        records: enrichedRecords,
        timeEntries,
      })
    }

    return NextResponse.json({
      dateFrom: from.toISOString(),
      dateTo: to.toISOString(),
      summary: {
        totalAttendanceHours: Math.round(totalAttendanceHours * 100) / 100,
        totalTaskHours: Math.round(totalTaskHours * 100) / 100,
        daysPresent,
      },
      records: enrichedRecords,
      timeEntries,
    })
  } catch (error) {
    console.error("Error generating attendance report:", error)
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 })
  }
}
