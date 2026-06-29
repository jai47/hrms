import { NextRequest, NextResponse } from "next/server"
import { processGoogleFormWebhook } from "@/lib/biometric/google-form"

export async function POST(request: NextRequest) {
  try {
    const webhookSecret =
      request.headers.get("x-webhook-secret") ||
      request.headers.get("x-api-key")

    if (!webhookSecret) {
      return NextResponse.json({ error: "Webhook secret required" }, { status: 401 })
    }

    const body = await request.json()
    const { deviceId, employeeId, timestamp } = body

    if (!deviceId || !employeeId) {
      return NextResponse.json(
        { error: "deviceId and employeeId are required" },
        { status: 400 }
      )
    }

    const result = await processGoogleFormWebhook({
      deviceId: String(deviceId).trim(),
      employeeId: String(employeeId).trim(),
      timestamp: timestamp ? String(timestamp) : undefined,
      webhookSecret,
    })

    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook processing failed"
    const status =
      message.includes("not found") || message.includes("Invalid")
        ? message.includes("Invalid webhook")
          ? 401
          : 404
        : message.includes("inactive")
          ? 403
          : 400

    console.error("Google Form webhook error:", error)
    return NextResponse.json({ error: message, success: false }, { status })
  }
}
