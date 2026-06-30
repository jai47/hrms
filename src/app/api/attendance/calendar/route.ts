import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1), 10)
    const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()), 10)
    const employeeId = searchParams.get("employeeId") || session.user.id

    if (employeeId !== session.user.id && !["ADMIN", "HR_MANAGER", "MANAGER"].includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const start = new Date(year, month - 1, 1)
    const end = new Date(year, month, 0, 23, 59, 59)

    const records = await prisma.attendance.findMany({
      where: {
        employeeId,
        date: { gte: start, lte: end },
      },
      orderBy: { date: "asc" },
    })

    return NextResponse.json({ records, month, year })
  } catch (error) {
    console.error("Error fetching attendance calendar:", error)
    return NextResponse.json({ error: "Failed to fetch calendar" }, { status: 500 })
  }
}
