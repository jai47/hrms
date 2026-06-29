import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get("employeeId")
    const issueId = searchParams.get("issueId")
    const dateFrom = searchParams.get("dateFrom")
    const dateTo = searchParams.get("dateTo")

    const where: Record<string, unknown> = {}

    if (issueId) where.issueId = issueId
    if (employeeId) {
      where.employeeId = employeeId
    } else if (session.user?.role === "EMPLOYEE" && session.user.id) {
      where.employeeId = session.user.id
    }
    if (dateFrom || dateTo) {
      where.date = {}
      if (dateFrom) (where.date as Record<string, Date>).gte = new Date(dateFrom)
      if (dateTo) (where.date as Record<string, Date>).lte = new Date(dateTo)
    }

    const entries = await prisma.timeEntry.findMany({
      where,
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, employeeId: true } },
        issue: {
          select: {
            id: true,
            issueNumber: true,
            title: true,
            project: { select: { key: true, name: true } },
          },
        },
      },
      orderBy: { date: "desc" },
    })

    const totalHours = entries.reduce((sum, e) => sum + e.hours, 0)

    return NextResponse.json({ entries, totalHours })
  } catch (error) {
    console.error("Error fetching time entries:", error)
    return NextResponse.json({ error: "Failed to fetch time entries" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { issueId, employeeId, date, hours, description } = body

    if (!date || hours == null) {
      return NextResponse.json({ error: "Date and hours are required" }, { status: 400 })
    }

    const parsedHours = parseFloat(hours)
    if (Number.isNaN(parsedHours) || parsedHours <= 0) {
      return NextResponse.json({ error: "Hours must be a positive number" }, { status: 400 })
    }

    const resolvedEmployeeId = employeeId || session.user.id

    if (
      resolvedEmployeeId !== session.user.id &&
      !["ADMIN", "HR_MANAGER", "MANAGER"].includes(session.user.role || "")
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    if (issueId) {
      const issue = await prisma.issue.findUnique({ where: { id: issueId } })
      if (!issue) {
        return NextResponse.json({ error: "Issue not found" }, { status: 404 })
      }
    }

    const entry = await prisma.timeEntry.create({
      data: {
        issueId: issueId || null,
        employeeId: resolvedEmployeeId,
        date: new Date(date),
        hours: parsedHours,
        description,
      },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true } },
        issue: {
          select: {
            issueNumber: true,
            title: true,
            project: { select: { key: true } },
          },
        },
      },
    })

    return NextResponse.json(entry, { status: 201 })
  } catch (error) {
    console.error("Error creating time entry:", error)
    return NextResponse.json({ error: "Failed to create time entry" }, { status: 500 })
  }
}
