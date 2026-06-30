import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { canApproveLeaves } from "@/lib/rbac"

export async function GET() {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!canApproveLeaves(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const [pendingLeaves, pendingReviews] = await Promise.all([
      prisma.leaveRequest.findMany({
        where: { status: "PENDING" },
        include: {
          employee: {
            select: { id: true, firstName: true, lastName: true, employeeId: true, department: { select: { name: true } } },
          },
        },
        orderBy: { createdAt: "asc" },
        take: 50,
      }),
      prisma.performance.findMany({
        where: { status: { in: ["SUBMITTED", "REVIEWED"] } },
        include: {
          employee: {
            select: { id: true, firstName: true, lastName: true, employeeId: true },
          },
          reviewer: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
        orderBy: { createdAt: "asc" },
        take: 20,
      }),
    ])

    return NextResponse.json({
      pendingLeaves,
      pendingReviews,
      counts: {
        leaves: pendingLeaves.length,
        reviews: pendingReviews.length,
        total: pendingLeaves.length + pendingReviews.length,
      },
    })
  } catch (error) {
    console.error("Error fetching approvals:", error)
    return NextResponse.json({ error: "Failed to fetch approvals" }, { status: 500 })
  }
}
