import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { generateWebhookSecret } from "@/lib/biometric/google-form"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const device = await prisma.biometricDevice.findUnique({ where: { id } })
    if (!device) {
      return NextResponse.json({ error: "Device not found" }, { status: 404 })
    }

    if (device.deviceType !== "GOOGLE_FORM") {
      return NextResponse.json(
        { error: "Only Google Form integrations have webhook secrets" },
        { status: 400 }
      )
    }

    const webhookSecret = generateWebhookSecret()
    await prisma.biometricDevice.update({
      where: { id },
      data: { webhookSecret },
    })

    return NextResponse.json({ webhookSecret })
  } catch (error) {
    console.error("Error regenerating webhook secret:", error)
    return NextResponse.json(
      { error: "Failed to regenerate secret" },
      { status: 500 }
    )
  }
}
