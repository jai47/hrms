import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { uiKeyToDbKey } from "@/lib/settings-keys"
import { upsertSettings, getSettingsMap } from "@/lib/settings"

export async function GET() {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (!["ADMIN", "HR_MANAGER"].includes(session.user?.role || "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const map = await getSettingsMap()
    return NextResponse.json(map)
  } catch (error) {
    console.error("Error fetching settings:", error)
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth()
    if (!session || !["ADMIN", "HR_MANAGER"].includes(session.user?.role || "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const entries: Record<string, string> = {}

    for (const [uiKey, value] of Object.entries(body)) {
      if (typeof value === "boolean") {
        entries[uiKeyToDbKey(uiKey)] = value ? "true" : "false"
      } else if (value != null) {
        entries[uiKeyToDbKey(uiKey)] = String(value)
      }
    }

    await upsertSettings(entries)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error saving settings:", error)
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 })
  }
}
