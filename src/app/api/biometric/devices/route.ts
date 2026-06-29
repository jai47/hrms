import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const devices = await prisma.biometricDevice.findMany({
      include: {
        _count: {
          select: { logs: true },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(devices)
  } catch (error) {
    console.error("Error fetching devices:", error)
    return NextResponse.json(
      { error: "Failed to fetch devices" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { deviceId, name, location, ipAddress, port, isActive } = body

    if (!deviceId || !name) {
      return NextResponse.json(
        { error: "Device ID and name are required" },
        { status: 400 }
      )
    }

    const existingDevice = await prisma.biometricDevice.findUnique({
      where: { deviceId },
    })

    if (existingDevice) {
      return NextResponse.json(
        { error: "Device with this ID already exists" },
        { status: 400 }
      )
    }

    const device = await prisma.biometricDevice.create({
      data: {
        deviceId,
        name,
        location,
        ipAddress,
        port: port || 4370,
        isActive: isActive !== false,
      },
    })

    return NextResponse.json(device, { status: 201 })
  } catch (error) {
    console.error("Error creating device:", error)
    return NextResponse.json(
      { error: "Failed to create device" },
      { status: 500 }
    )
  }
}