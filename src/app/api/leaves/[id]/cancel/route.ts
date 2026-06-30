import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { canManageEmployees } from "@/lib/rbac"

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const leave = await prisma.leaveRequest.findUnique({ where: { id } })

    if (!leave) {
      return NextResponse.json({ error: "Leave request not found" }, { status: 404 })
    }

    const isOwner = leave.employeeId === session.user.id
    const isAdmin = canManageEmployees(session.user.role)

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    if (leave.status !== "PENDING") {
      return NextResponse.json(
        { error: "Only pending leave requests can be cancelled" },
        { status: 400 }
      )
    }

    const updated = await prisma.leaveRequest.update({
      where: { id },
      data: { status: "CANCELLED" },
      include: { employee: true },
    })

    const managers = await prisma.employee.findMany({
      where: { role: { in: ["ADMIN", "HR_MANAGER", "MANAGER"] }, employmentStatus: "ACTIVE" },
      select: { id: true },
    })

    await Promise.all([
      prisma.notification.create({
        data: {
          employeeId: leave.employeeId,
          title: "Leave Cancelled",
          message: `Your ${leave.leaveType.toLowerCase().replace("_", " ")} request was cancelled.`,
          type: "LEAVE_REQUEST",
          link: "/leaves",
        },
      }),
      ...managers.map((m) =>
        prisma.notification.create({
          data: {
            employeeId: m.id,
            title: "Leave Cancelled",
            message: `${updated.employee.firstName} ${updated.employee.lastName} cancelled a leave request.`,
            type: "LEAVE_REQUEST",
            link: "/approvals",
          },
        })
      ),
    ])

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Error cancelling leave:", error)
    return NextResponse.json({ error: "Failed to cancel leave" }, { status: 500 })
  }
}
