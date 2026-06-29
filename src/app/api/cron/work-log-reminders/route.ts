import { NextRequest, NextResponse } from "next/server"
import { isValidBiometricApiKey, isValidCronSecret, getApiKey } from "@/lib/biometric/api-auth"
import { sendWorkLogReminders } from "@/lib/work-log"

export async function GET(request: NextRequest) {
  const apiKey = getApiKey(request)
  if (!isValidBiometricApiKey(apiKey) && !isValidCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const result = await sendWorkLogReminders()
    return NextResponse.json({
      success: true,
      ...result,
      checkedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Cron work log reminders failed:", error)
    return NextResponse.json({ error: "Failed to send work log reminders" }, { status: 500 })
  }
}
