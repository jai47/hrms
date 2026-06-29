import { NextRequest, NextResponse } from "next/server"
import { authorizeBiometricRequest } from "@/lib/biometric/api-auth"
import { processBiometricPunch } from "@/lib/biometric/process-logs"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const authResult = await authorizeBiometricRequest(request, {
      allowSession: true,
    })

    if (!authResult.authorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { biometricId, type, deviceId, location, timestamp } = body

    if (!biometricId || !type) {
      return NextResponse.json(
        { error: "Biometric ID and type are required" },
        { status: 400 }
      )
    }

    if (!["CHECK_IN", "CHECK_OUT"].includes(type)) {
      return NextResponse.json(
        { error: "Invalid type. Must be CHECK_IN or CHECK_OUT" },
        { status: 400 }
      )
    }

    try {
      const result = await processBiometricPunch({
        biometricId,
        type,
        deviceId,
        location,
        timestamp: timestamp ? new Date(timestamp) : new Date(),
      })

      return NextResponse.json(result)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to process punch"

      if (message.includes("not found")) {
        if (deviceId) {
          const device = await prisma.biometricDevice.findUnique({
            where: { deviceId },
          })
          if (device) {
            await prisma.biometricLog.create({
              data: {
                deviceId: device.id,
                biometricId,
                timestamp: timestamp ? new Date(timestamp) : new Date(),
                eventType: type,
                rawData: JSON.stringify({ deviceId, location, error: message }),
                processed: false,
              },
            })
          }
        }

        return NextResponse.json({ error: message }, { status: 404 })
      }

      if (message.includes("Already")) {
        return NextResponse.json({ error: message }, { status: 400 })
      }

      throw error
    }
  } catch (error) {
    console.error("Error processing check-in:", error)
    return NextResponse.json(
      { error: "Failed to process check-in" },
      { status: 500 }
    )
  }
}
