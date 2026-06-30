import { prisma } from "@/lib/prisma"

export type MeetingWithDetails = Awaited<ReturnType<typeof getMeetingById>>

export async function getMeetingById(id: string) {
  return prisma.meeting.findUnique({
    where: { id },
    include: {
      organizer: {
        select: { id: true, firstName: true, lastName: true, employeeId: true, email: true },
      },
      project: { select: { id: true, key: true, name: true } },
      attendees: {
        include: {
          employee: {
            select: { id: true, firstName: true, lastName: true, employeeId: true, email: true },
          },
        },
      },
    },
  })
}

export async function getUpcomingMeetingsForEmployee(employeeId: string, limit = 5) {
  const now = new Date()
  return prisma.meeting.findMany({
    where: {
      status: "SCHEDULED",
      startTime: { gte: now },
      OR: [
        { organizerId: employeeId },
        { attendees: { some: { employeeId } } },
      ],
    },
    include: {
      organizer: {
        select: { id: true, firstName: true, lastName: true },
      },
      attendees: {
        include: {
          employee: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      },
    },
    orderBy: { startTime: "asc" },
    take: limit,
  })
}

export async function getUpcomingMeetingsAll(limit = 8) {
  const now = new Date()
  return prisma.meeting.findMany({
    where: {
      status: "SCHEDULED",
      startTime: { gte: now },
    },
    include: {
      organizer: {
        select: { id: true, firstName: true, lastName: true },
      },
      attendees: {
        include: {
          employee: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      },
    },
    orderBy: { startTime: "asc" },
    take: limit,
  })
}

export function formatMeetingType(type: string): string {
  return type.charAt(0) + type.slice(1).toLowerCase()
}

export function getMeetingTypeColor(type: string): string {
  switch (type) {
    case "CLIENT":
      return "bg-purple-100 text-purple-800"
    case "TEAM":
      return "bg-blue-100 text-blue-800"
    case "INTERNAL":
      return "bg-green-100 text-green-800"
    default:
      return "bg-gray-100 text-gray-800"
  }
}

export async function notifyMeetingAttendees(
  meetingId: string,
  attendeeIds: string[],
  title: string,
  message: string
) {
  const uniqueIds = [...new Set(attendeeIds)]
  await Promise.all(
    uniqueIds.map((employeeId) =>
      prisma.notification.create({
        data: {
          employeeId,
          title,
          message,
          type: "MEETING",
          link: `/meetings/${meetingId}`,
        },
      })
    )
  )
}
