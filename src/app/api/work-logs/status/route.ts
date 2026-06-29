import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getWorkLogStatusForEmployee } from "@/lib/work-log"

export async function GET() {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const status = await getWorkLogStatusForEmployee(session.user.id)
    return NextResponse.json(status)
  } catch (error) {
    console.error("Error fetching work log status:", error)
    return NextResponse.json({ error: "Failed to fetch work log status" }, { status: 500 })
  }
}
