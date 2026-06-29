import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { generatePaySlipsForPeriod } from "@/lib/payroll"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1), 10)
    const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()), 10)

    const paySlips = await prisma.paySlip.findMany({
      where: { periodMonth: month, periodYear: year },
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
