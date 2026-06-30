import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { canViewAllMeetings } from "@/lib/rbac"
import { notifyMeetingAttendees } from "@/lib/meetings"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const filter = searchParams.get("filter") || "upcoming"
    const type = searchParams.get("type") || ""
    const now = new Date()

    const where: Record<string, unknown> = {}

    if (!canViewAllMeetings(session.user.role)) {
      where.OR = [
        { organizerId: session.user.id },
        { attendees: { some: { employeeId: session.user.id } } },
      ]
    }

    if (filter === "upcoming") {
      where.status = "SCHEDULED"
      where.startTime = { gte: now }
    } else if (filter === "past") {
      where.OR = [
        { status: { in: ["COMPLETED", "CANCELLED"] } },
        { status: "SCHEDULED", endTime: { lt: now } },
      ]
    }

    if (type) {
      where.type = type
    }

    const meetings = await prisma.meeting.findMany({
      where,
      include: {
        organizer: {
          select: { id: true, firstName: true, lastName: true, employeeId: true },
        },
        project: { select: { id: true, key: true, name: true } },
        attendees: {
          include: {
            employee: {
              select: { id: true, firstName: true, lastName: true, employeeId: true },
            },
          },
        },
      },
      orderBy: filter === "past" ? { startTime: "desc" } : { startTime: "asc" },
      take: 50,
    })

    return NextResponse.json({ meetings })
  } catch (error) {
    console.error("Error fetching meetings:", error)
    return NextResponse.json({ error: "Failed to fetch meetings" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const {
      title,
      description,
      startTime,
      endTime,
      type,
      location,
      meetingLink,
      clientName,
      projectId,
      attendeeIds,
    } = body

    if (!title?.trim() || !startTime || !endTime) {
      return NextResponse.json(
        { error: "Title, start time, and end time are required" },
        { status: 400 }
      )
    }

    const start = new Date(startTime)
    const end = new Date(endTime)

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return NextResponse.json({ error: "Invalid date/time" }, { status: 400 })
    }

    if (end <= start) {
      return NextResponse.json({ error: "End time must be after start time" }, { status: 400 })
    }

    const ids: string[] = Array.isArray(attendeeIds) ? attendeeIds : []
    const uniqueAttendeeIds = [...new Set(ids.filter((id) => id !== session.user.id))]

    const meeting = await prisma.meeting.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        startTime: start,
        endTime: end,
        type: type || "TEAM",
        location: location?.trim() || null,
        meetingLink: meetingLink?.trim() || null,
        clientName: clientName?.trim() || null,
        projectId: projectId || null,
        organizerId: session.user.id,
        attendees: {
          create: uniqueAttendeeIds.map((employeeId) => ({ employeeId })),
        },
      },
      include: {
        organizer: {
          select: { firstName: true, lastName: true },
        },
        attendees: {
          include: {
            employee: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    })

    if (uniqueAttendeeIds.length > 0) {
      const startLabel = start.toLocaleString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
      await notifyMeetingAttendees(
        meeting.id,
        uniqueAttendeeIds,
        "Meeting Scheduled",
        `${meeting.organizer.firstName} ${meeting.organizer.lastName} invited you to "${meeting.title}" on ${startLabel}`
      )
    }

    return NextResponse.json(meeting, { status: 201 })
  } catch (error) {
    console.error("Error creating meeting:", error)
    return NextResponse.json({ error: "Failed to create meeting" }, { status: 500 })
  }
}
