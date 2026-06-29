import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { generatePaySlipsForPeriod } from "@/lib/payroll"
import { canManagePayroll } from "@/lib/rbac"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1), 10)
    const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()), 10)

    const isAdmin = canManagePayroll(session.user.role)

    const paySlips = await prisma.paySlip.findMany({
      where: {
        periodMonth: month,
        periodYear: year,
        ...(isAdmin
          ? {}
          : {
              employeeId: session.user.id,
              status: { in: ["FINALIZED", "PAID"] },
            }),
      },
      include: {
        employee: {
          select: {
            id: true,
            employeeId: true,
            firstName: true,
            lastName: true,
            email: true,
            department: { select: { name: true } },
          },
        },
      },
      orderBy: { employee: { lastName: "asc" } },
    })

    return NextResponse.json({ paySlips, month, year })
  } catch (error) {
    console.error("Error fetching payroll:", error)
    return NextResponse.json({ error: "Failed to fetch payroll" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!canManagePayroll(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const month = parseInt(body.month, 10)
    const year = parseInt(body.year, 10)

    if (!month || month < 1 || month > 12 || !year) {
      return NextResponse.json({ error: "Valid month and year are required" }, { status: 400 })
    }

    const result = await generatePaySlipsForPeriod(year, month, body.employeeIds)

    return NextResponse.json({
      message: `Generated ${result.total} payslip(s) for ${month}/${year}`,
      ...result,
    })
  } catch (error) {
    console.error("Error generating payroll:", error)
    return NextResponse.json({ error: "Failed to generate payroll" }, { status: 500 })
  }
}
