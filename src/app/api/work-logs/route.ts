import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { canViewAllWorkLogs } from "@/lib/rbac"
import { getTodayDate } from "@/lib/work-log"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1", 10) || 1
    const limit = parseInt(searchParams.get("limit") || "10", 10) || 10
    const search = searchParams.get("search") || ""
    const date = searchParams.get("date") || ""
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}

    if (!canViewAllWorkLogs(session.user.role)) {
      where.employeeId = session.user.id
    }

    if (search) {
      where.OR = [
        { employee: { firstName: { contains: search } } },
        { employee: { lastName: { contains: search } } },
        { employee: { employeeId: { contains: search } } },
        { summary: { contains: search } },
      ]
    }

    if (date) {
      where.date = new Date(date)
    }

    const [logs, total] = await Promise.all([
      prisma.dailyWorkLog.findMany({
        where,
        include: { employee: true },
        skip,
        take: limit,
        orderBy: { date: "desc" },
      }),
      prisma.dailyWorkLog.count({ where }),
    ])

    return NextResponse.json({
      logs,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    })
  } catch (error) {
    console.error("Error fetching work logs:", error)
    return NextResponse.json({ error: "Failed to fetch work logs" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { employeeId, date, summary, tasksDone, blockers, nextSteps, hoursWorked } = body

    if (!summary?.trim()) {
      return NextResponse.json({ error: "Work summary is required" }, { status: 400 })
    }

    const targetEmployeeId = employeeId || session.user.id

    if (!canViewAllWorkLogs(session.user.role) && targetEmployeeId !== session.user.id) {
      return NextResponse.json(
        { error: "You can only submit work logs for yourself" },
        { status: 403 }
      )
    }

    const logDate = date ? new Date(date) : getTodayDate()

    const existing = await prisma.dailyWorkLog.findUnique({
      where: {
        employeeId_date: { employeeId: targetEmployeeId, date: logDate },
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: "A work log for this date already exists" },
        { status: 400 }
      )
    }

    const workLog = await prisma.dailyWorkLog.create({
      data: {
        employeeId: targetEmployeeId,
        date: logDate,
        summary: summary.trim(),
        tasksDone: tasksDone?.trim() || null,
        blockers: blockers?.trim() || null,
        nextSteps: nextSteps?.trim() || null,
        hoursWorked: hoursWorked != null ? parseFloat(String(hoursWorked)) : null,
      },
      include: { employee: true },
    })

    return NextResponse.json(workLog, { status: 201 })
  } catch (error) {
    console.error("Error creating work log:", error)
    return NextResponse.json({ error: "Failed to create work log" }, { status: 500 })
  }
}
