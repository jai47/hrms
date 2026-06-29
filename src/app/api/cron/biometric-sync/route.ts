import { NextRequest, NextResponse } from "next/server"
import { isValidBiometricApiKey, isValidCronSecret, getApiKey } from "@/lib/biometric/api-auth"
import { syncAllDevices } from "@/lib/biometric/zk-device"

export async function GET(request: NextRequest) {
  const apiKey = getApiKey(request)
  if (!isValidBiometricApiKey(apiKey) && !isValidCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const result = await syncAllDevices()
    return NextResponse.json({
      success: result.success,
      devicesSynced: result.results.length,
      results: result.results,
      syncedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Cron biometric sync failed:", error)
    return NextResponse.json(
      { error: "Failed to sync biometric devices" },
      { status: 500 }
    )
  }
}
