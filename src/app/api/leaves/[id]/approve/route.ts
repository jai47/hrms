import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!["ADMIN", "HR_MANAGER", "MANAGER"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id } = await params

    const leaveRequest = await prisma.leaveRequest.findUnique({
      where: { id },
      include: { employee: true },
    })

    if (!leaveRequest) {
      return NextResponse.json({ error: "Leave request not found" }, { status: 404 })
    }

    if (leaveRequest.status !== "PENDING") {
      return NextResponse.json(
        { error: "Leave request is not pending" },
        { status: 400 }
      )
    }

    const updated = await prisma.leaveRequest.update({
      where: { id },
      data: {
        status: "APPROVED",
        approvedBy: session.user.id,
        approvedAt: new Date(),
      },
      include: { employee: true },
    })

    // Create attendance records for the leave period
    const startDate = new Date(leaveRequest.startDate)
    const endDate = new Date(leaveRequest.endDate)
    const currentDate = new Date(startDate)

    while (currentDate <= endDate) {
      await prisma.attendance.upsert({
        where: {
          employeeId_date: {
            employeeId: leaveRequest.employeeId,
            date: new Date(currentDate),
          },
        },
        update: {
          status: "ON_LEAVE",
          source: "MANUAL",
          notes: `Leave: ${leaveRequest.leaveType}`,
        },
        create: {
          employeeId: leaveRequest.employeeId,
          date: new Date(currentDate),
          status: "ON_LEAVE",
          source: "MANUAL",
          notes: `Leave: ${leaveRequest.leaveType}`,
        },
      })
      currentDate.setDate(currentDate.getDate() + 1)
    }

    // Notify employee
    await prisma.notification.create({
      data: {
        employeeId: leaveRequest.employeeId,
        title: "Leave Request Approved",
        message: `Your ${leaveRequest.leaveType.toLowerCase().replace("_", " ")} request from ${leaveRequest.startDate.toLocaleDateString()} to ${leaveRequest.endDate.toLocaleDateString()} has been approved.`,
        type: "LEAVE_APPROVED",
        link: "/leaves",
      },
    })

    return NextResponse.json({ success: true, leaveRequest: updated })
  } catch (error) {
    console.error("Error approving leave:", error)
    return NextResponse.json(
      { error: "Failed to approve leave request" },
      { status: 500 }
    )
  }
}