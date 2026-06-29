import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { canManagePayroll } from "@/lib/rbac"

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!canManagePayroll(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id } = await params

    const paySlip = await prisma.paySlip.findUnique({
      where: { id },
      include: {
        employee: {
          select: { firstName: true, lastName: true },
        },
      },
    })

    if (!paySlip) {
      return NextResponse.json({ error: "Payslip not found" }, { status: 404 })
    }

    if (paySlip.status === "FINALIZED" || paySlip.status === "PAID") {
      return NextResponse.json(
        { error: "Payslip has already been pushed to the employee" },
        { status: 400 }
      )
    }

    const updated = await prisma.paySlip.update({
      where: { id },
      data: { status: "FINALIZED" },
    })

    const periodLabel = `${MONTHS[paySlip.periodMonth - 1]} ${paySlip.periodYear}`

    await prisma.notification.create({
      data: {
        employeeId: paySlip.employeeId,
        title: "Payslip Available",
        message: `Your payslip for ${periodLabel} is ready to view.`,
        type: "PAYSLIP",
        link: `/documents/payslips/${paySlip.id}`,
      },
    })

    return NextResponse.json({
      ...updated,
      message: `Payslip pushed to ${paySlip.employee.firstName} ${paySlip.employee.lastName}`,
    })
  } catch (error) {
    console.error("Error publishing payslip:", error)
    return NextResponse.json({ error: "Failed to push payslip" }, { status: 500 })
  }
}
