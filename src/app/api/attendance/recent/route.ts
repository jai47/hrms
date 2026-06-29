import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get("limit") || "10", 10)

    const records = await prisma.attendance.findMany({
      take: limit,
      orderBy: { updatedAt: "desc" },
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true, employeeId: true },
        },
      },
    })

    return NextResponse.json({ records })
  } catch (error) {
    console.error("Error fetching recent attendance:", error)
    return NextResponse.json({ error: "Failed to fetch recent records" }, { status: 500 })
  }
}
