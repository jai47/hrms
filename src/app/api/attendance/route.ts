import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { buildCheckoutUpdate } from "@/lib/attendance"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "15", 10) || 15
    const search = searchParams.get("search") || ""
    const status = searchParams.get("status") || ""
    const dateFrom = searchParams.get("dateFrom")
    const dateTo = searchParams.get("dateTo")
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}

    if (search) {
      where.OR = [
        { employee: { firstName: { contains: search } } },
        { employee: { lastName: { contains: search } } },
        { employee: { employeeId: { contains: search } } },
      ]
    }

    if (status) {
      where.status = status
    }

    if (dateFrom || dateTo) {
      where.date = {}
      if (dateFrom) {
        (where.date as Record<string, Date>).gte = new Date(dateFrom)
      }
      if (dateTo) {
        (where.date as Record<string, Date>).lte = new Date(dateTo)
      }
    }

    const [records, total] = await Promise.all([
      prisma.attendance.findMany({
        where,
        include: { employee: true },
        skip,
        take: limit,
        orderBy: { date: "desc" },
      }),
      prisma.attendance.count({ where }),
    ])

    return NextResponse.json({
      records,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    })
  } catch (error) {
    console.error("Error fetching attendance:", error)
    return NextResponse.json(
      { error: "Failed to fetch attendance" },
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
    const { employeeId, date, checkIn, checkOut, status, source, deviceId, location, notes } = body

    if (!employeeId || !date) {
      return NextResponse.json(
        { error: "Employee ID and date are required" },
        { status: 400 }
      )
    }

    const recordDate = new Date(date)
    const existing = await prisma.attendance.findUnique({
      where: {
        employeeId_date: { employeeId, date: recordDate },
      },
    })

    let checkoutFields = {}
    const resolvedCheckIn = checkIn
      ? new Date(checkIn)
      : existing?.checkIn ?? null
    const resolvedCheckOut = checkOut ? new Date(checkOut) : null

    if (resolvedCheckIn && resolvedCheckOut) {
      checkoutFields = await buildCheckoutUpdate(
        resolvedCheckIn,
        resolvedCheckOut,
        existing?.breakMinutes
      )
    }

    const attendance = await prisma.attendance.upsert({
      where: {
        employeeId_date: {
          employeeId,
          date: recordDate,
        },
      },
      update: {
        checkIn: checkIn ? new Date(checkIn) : undefined,
        checkOut: checkOut ? new Date(checkOut) : undefined,
        ...checkoutFields,
        status: status || "PRESENT",
        source: source || "MANUAL",
        deviceId,
        location,
        notes,
      },
      create: {
        employeeId,
        date: recordDate,
        checkIn: checkIn ? new Date(checkIn) : null,
        checkOut: checkOut ? new Date(checkOut) : null,
        ...(resolvedCheckIn && resolvedCheckOut
          ? await buildCheckoutUpdate(resolvedCheckIn, resolvedCheckOut)
          : {}),
        status: status || "PRESENT",
        source: source || "MANUAL",
        deviceId,
        location,
        notes,
      },
      include: { employee: true },
    })

    return NextResponse.json(attendance, { status: 201 })
  } catch (error) {
    console.error("Error creating attendance:", error)
    return NextResponse.json(
      { error: "Failed to create attendance" },
      { status: 500 }
    )
  }
}
