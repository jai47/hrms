import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "50", 10) || 50
    const deviceId = searchParams.get("deviceId")
    const employeeId = searchParams.get("employeeId")
    const processed = searchParams.get("processed")
    const skip = (page - 1) * limit

    const where: any = {}

    if (deviceId) {
      const device = await prisma.biometricDevice.findFirst({
        where: {
          OR: [{ id: deviceId }, { deviceId }],
        },
      })
      if (device) {
        where.deviceId = device.id
      }
    }

    if (employeeId) {
      where.employeeId = employeeId
    }

    if (processed !== null && processed !== undefined) {
      where.processed = processed === "true"
    }

    const [logs, total] = await Promise.all([
      prisma.biometricLog.findMany({
        where,
        include: {
          device: true,
          employee: {
            select: { id: true, firstName: true, lastName: true, employeeId: true },
          },
        },
        skip,
        take: limit,
        orderBy: { timestamp: "desc" },
      }),
      prisma.biometricLog.count({ where }),
    ])

    return NextResponse.json({
      logs,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    })
  } catch (error) {
    console.error("Error fetching biometric logs:", error)
    return NextResponse.json(
      { error: "Failed to fetch biometric logs" },
      { status: 500 }
    )
  }
}