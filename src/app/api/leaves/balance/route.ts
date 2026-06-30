import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getLeaveBalances } from "@/lib/leave-balance"
import { canViewAllLeaves } from "@/lib/rbac"

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get("employeeId") || session.user.id
    const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()), 10)

    if (!canViewAllLeaves(session.user.role) && employeeId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const balances = await getLeaveBalances(employeeId, year)
    return NextResponse.json(balances)
  } catch (error) {
    console.error("Error fetching leave balance:", error)
    return NextResponse.json({ error: "Failed to fetch leave balance" }, { status: 500 })
  }
}
