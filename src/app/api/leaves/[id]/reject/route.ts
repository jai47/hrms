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
    const body = await request.json()
    const { rejectedReason } = body

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
        status: "REJECTED",
        approvedBy: session.user.id,
        approvedAt: new Date(),
        rejectedReason: rejectedReason || "No reason provided",
      },
      include: { employee: true },
    })

    // Notify employee
    await prisma.notification.create({
      data: {
        employeeId: leaveRequest.employeeId,
        title: "Leave Request Rejected",
        message: `Your ${leaveRequest.leaveType.toLowerCase().replace("_", " ")} request from ${leaveRequest.startDate.toLocaleDateString()} to ${leaveRequest.endDate.toLocaleDateString()} has been rejected. Reason: ${rejectedReason || "No reason provided"}`,
        type: "LEAVE_REJECTED",
        link: "/leaves",
      },
    })

    return NextResponse.json({ success: true, leaveRequest: updated })
  } catch (error) {
    console.error("Error rejecting leave:", error)
    return NextResponse.json(
      { error: "Failed to reject leave request" },
      { status: 500 }
    )
  }
}