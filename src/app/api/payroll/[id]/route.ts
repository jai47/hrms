import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { canManagePayroll } from "@/lib/rbac"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const paySlip = await prisma.paySlip.findUnique({
      where: { id },
      include: {
        employee: {
          select: {
            id: true,
            employeeId: true,
            firstName: true,
            lastName: true,
            email: true,
            position: true,
            bankAccount: true,
            department: { select: { name: true } },
          },
        },
      },
    })

    if (!paySlip) {
      return NextResponse.json({ error: "Payslip not found" }, { status: 404 })
    }

    const isAdmin = canManagePayroll(session.user.role)
    const isOwner = paySlip.employeeId === session.user.id
    const isPublished = paySlip.status === "FINALIZED" || paySlip.status === "PAID"

    if (!isAdmin && (!isOwner || !isPublished)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    return NextResponse.json({
      ...paySlip,
      breakdown: JSON.parse(paySlip.breakdown),
    })
  } catch (error) {
    console.error("Error fetching payslip:", error)
    return NextResponse.json({ error: "Failed to fetch payslip" }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
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
    const body = await request.json()

    const paySlip = await prisma.paySlip.update({
      where: { id },
      data: {
        status: body.status,
      },
    })

    return NextResponse.json(paySlip)
  } catch (error) {
    console.error("Error updating payslip:", error)
    return NextResponse.json({ error: "Failed to update payslip" }, { status: 500 })
  }
}
