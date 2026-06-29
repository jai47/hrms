import { NextRequest, NextResponse } from "next/server"
import { authorizeBiometricRequest, isValidCronSecret } from "@/lib/biometric/api-auth"
import { syncAllDevices } from "@/lib/biometric/zk-device"

export async function POST(request: NextRequest) {
  try {
    const authResult = await authorizeBiometricRequest(request, {
      allowSession: true,
      roles: ["ADMIN", "HR_MANAGER"],
    })

    const cronAuthorized = isValidCronSecret(request)

    if (!authResult.authorized && !cronAuthorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const result = await syncAllDevices()

    return NextResponse.json({
      success: result.success,
      devicesSynced: result.results.length,
      results: result.results,
    })
  } catch (error) {
    console.error("Error syncing all devices:", error)
    return NextResponse.json(
      { error: "Failed to sync all devices" },
      { status: 500 }
    )
  }
}
