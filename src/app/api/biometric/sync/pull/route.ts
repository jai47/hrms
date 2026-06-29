import { NextRequest, NextResponse } from "next/server"
import { authorizeBiometricRequest } from "@/lib/biometric/api-auth"
import { pullAndProcessDeviceLogs } from "@/lib/biometric/zk-device"

export async function POST(request: NextRequest) {
  try {
    const authResult = await authorizeBiometricRequest(request, {
      allowSession: true,
      roles: ["ADMIN", "HR_MANAGER"],
    })

    if (!authResult.authorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { deviceId } = body

    if (!deviceId) {
      return NextResponse.json(
        { error: "deviceId is required" },
        { status: 400 }
      )
    }

    const result = await pullAndProcessDeviceLogs(deviceId)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.error === "Device not found" ? 404 : 502 }
      )
    }

    return NextResponse.json({
      success: true,
      logsFetched: result.logsFetched,
      processed: result.processed,
      skipped: result.skipped,
      errors: result.errors?.length ? result.errors : undefined,
    })
  } catch (error) {
    console.error("Error pulling device logs:", error)
    return NextResponse.json(
      { error: "Failed to pull logs from device" },
      { status: 500 }
    )
  }
}
