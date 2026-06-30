import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { getMeetingById, notifyMeetingAttendees } from "@/lib/meetings"

async function canAccessMeeting(
  meeting: NonNullable<Awaited<ReturnType<typeof getMeetingById>>>,
  userId: string,
  role: string
) {
  if (role === "ADMIN" || role === "HR_MANAGER" || role === "MANAGER") return true
  if (meeting.organizerId === userId) return true
  return meeting.attendees.some((a) => a.employeeId === userId)
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const meeting = await getMeetingById(id)

    if (!meeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 })
    }

    if (!canAccessMeeting(meeting, session.user.id, session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    return NextResponse.json(meeting)
  } catch (error) {
    console.error("Error fetching meeting:", error)
    return NextResponse.json({ error: "Failed to fetch meeting" }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const existing = await getMeetingById(id)

    if (!existing) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 })
    }

    if (existing.organizerId !== session.user.id && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Only the organizer can edit this meeting" }, { status: 403 })
    }

    const body = await request.json()
    const start = body.startTime ? new Date(body.startTime) : existing.startTime
    const end = body.endTime ? new Date(body.endTime) : existing.endTime

    if (end <= start) {
      return NextResponse.json({ error: "End time must be after start time" }, { status: 400 })
    }

    const attendeeIds: string[] | undefined = body.attendeeIds
    const previousAttendeeIds = existing.attendees.map((a) => a.employeeId)

    if (attendeeIds) {
      await prisma.meetingAttendee.deleteMany({ where: { meetingId: id } })
      const uniqueIds = [...new Set(attendeeIds.filter((aid) => aid !== session.user.id))]
      if (uniqueIds.length > 0) {
        await prisma.meetingAttendee.createMany({
          data: uniqueIds.map((employeeId) => ({ meetingId: id, employeeId })),
        })
      }
    }

    const meeting = await prisma.meeting.update({
      where: { id },
      data: {
        title: body.title?.trim() ?? existing.title,
        description: body.description !== undefined ? body.description?.trim() || null : existing.description,
        startTime: start,
        endTime: end,
        type: body.type ?? existing.type,
        location: body.location !== undefined ? body.location?.trim() || null : existing.location,
        meetingLink: body.meetingLink !== undefined ? body.meetingLink?.trim() || null : existing.meetingLink,
        clientName: body.clientName !== undefined ? body.clientName?.trim() || null : existing.clientName,
        projectId: body.projectId !== undefined ? body.projectId || null : existing.projectId,
        status: body.status ?? existing.status,
      },
      include: {
        organizer: { select: { firstName: true, lastName: true } },
        attendees: { include: { employee: { select: { id: true } } } },
      },
    })

    if (attendeeIds) {
      const newIds = meeting.attendees.map((a) => a.employee.id)
      const added = newIds.filter((aid) => !previousAttendeeIds.includes(aid))
      if (added.length > 0) {
        await notifyMeetingAttendees(
          id,
          added,
          "Meeting Updated",
          `You were added to "${meeting.title}"`
        )
      }
    }

    return NextResponse.json(meeting)
  } catch (error) {
    console.error("Error updating meeting:", error)
    return NextResponse.json({ error: "Failed to update meeting" }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const existing = await getMeetingById(id)

    if (!existing) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 })
    }

    if (existing.organizerId !== session.user.id && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Only the organizer can cancel this meeting" }, { status: 403 })
    }

    const meeting = await prisma.meeting.update({
      where: { id },
      data: { status: "CANCELLED" },
    })

    const attendeeIds = existing.attendees.map((a) => a.employeeId)
    if (attendeeIds.length > 0) {
      await notifyMeetingAttendees(
        id,
        attendeeIds,
        "Meeting Cancelled",
        `"${existing.title}" has been cancelled`
      )
    }

    return NextResponse.json(meeting)
  } catch (error) {
    console.error("Error cancelling meeting:", error)
    return NextResponse.json({ error: "Failed to cancel meeting" }, { status: 500 })
  }
}
