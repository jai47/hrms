import { NextRequest, NextResponse } from "next/server"
import { authorizeBiometricRequest } from "@/lib/biometric/api-auth"
import {
  processBiometricLogs,
  type BiometricLogEntry,
} from "@/lib/biometric/process-logs"

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
    const { deviceId, logs } = body

    if (!deviceId || !logs || !Array.isArray(logs)) {
      return NextResponse.json(
        { error: "Invalid payload. Expected { deviceId, logs: [] }" },
        { status: 400 }
      )
    }

    const result = await processBiometricLogs(
      deviceId,
      logs as BiometricLogEntry[]
    )

    return NextResponse.json({
      success: true,
      ...result,
      errors: result.errors.length > 0 ? result.errors : undefined,
    })
  } catch (error) {
    console.error("Error syncing biometric logs:", error)
    const message =
      error instanceof Error ? error.message : "Failed to sync biometric logs"
    const status = message === "Device not found" ? 404 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
