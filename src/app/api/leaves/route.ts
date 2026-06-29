import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { canViewAllLeaves } from "@/lib/rbac"

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
    const status = searchParams.get("status") || ""
    const type = searchParams.get("type") || ""
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}

    if (!canViewAllLeaves(session.user.role)) {
      where.employeeId = session.user.id
    }

    if (search) {
      where.OR = [
        { employee: { firstName: { contains: search } } },
        { employee: { lastName: { contains: search } } },
        { employee: { employeeId: { contains: search } } },
      ]
    }

    if (status) {
      where.status = status
    }

    if (type) {
      where.leaveType = type
    }

    const [requests, total] = await Promise.all([
      prisma.leaveRequest.findMany({
        where,
        include: {
          employee: true,
        },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.leaveRequest.count({ where }),
    ])

    return NextResponse.json({
      requests,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    })
  } catch (error) {
    console.error("Error fetching leave requests:", error)
    return NextResponse.json(
      { error: "Failed to fetch leave requests" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { employeeId, leaveType, startDate, endDate, totalDays, reason } = body

    if (!employeeId || !leaveType || !startDate || !endDate || !reason) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    if (!canViewAllLeaves(session.user.role) && employeeId !== session.user.id) {
      return NextResponse.json(
        { error: "You can only submit leave requests for yourself" },
        { status: 403 }
      )
    }

    const days =
      totalDays ??
      Math.ceil(
        (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)
      ) + 1

    if (days < 1) {
      return NextResponse.json({ error: "End date must be on or after start date" }, { status: 400 })
    }

    // Check for overlapping leave requests
    const overlapping = await prisma.leaveRequest.findFirst({
      where: {
        employeeId,
        status: { in: ["PENDING", "APPROVED"] },
        OR: [
          {
            startDate: { lte: new Date(endDate) },
            endDate: { gte: new Date(startDate) },
          },
        ],
      },
    })

    if (overlapping) {
      return NextResponse.json(
        { error: "Employee already has a leave request for this period" },
        { status: 400 }
      )
    }

    const leaveRequest = await prisma.leaveRequest.create({
      data: {
        employeeId,
        leaveType,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        totalDays: parseFloat(String(days)),
        reason,
        status: "PENDING",
      },
      include: {
        employee: true,
      },
    })

    // Create notification for employee
    await prisma.notification.create({
      data: {
        employeeId,
        title: "Leave Request Submitted",
        message: `Your ${leaveType.toLowerCase().replace("_", " ")} request has been submitted and is pending approval.`,
        type: "LEAVE_REQUEST",
        link: "/leaves",
      },
    })

    // Notify managers/HR
    const managers = await prisma.employee.findMany({
      where: {
        role: { in: ["ADMIN", "HR_MANAGER", "MANAGER"] },
        employmentStatus: "ACTIVE",
      },
    })

    await Promise.all(
      managers.map((manager) =>
        prisma.notification.create({
          data: {
            employeeId: manager.id,
            title: "New Leave Request",
            message: `${leaveRequest.employee.firstName} ${leaveRequest.employee.lastName} requested ${leaveType.toLowerCase().replace("_", " ")}.`,
            type: "LEAVE_REQUEST",
            link: "/leaves",
          },
        })
      )
    )

    return NextResponse.json(leaveRequest, { status: 201 })
  } catch (error) {
    console.error("Error creating leave request:", error)
    return NextResponse.json(
      { error: "Failed to create leave request" },
      { status: 500 }
    )
  }
}