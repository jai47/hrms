import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { canViewAllMeetings } from "@/lib/rbac"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Plus } from "lucide-react"
import { formatDate, formatTime } from "@/lib/utils"
import { formatMeetingType, getMeetingTypeColor } from "@/lib/meetings"

async function getMeetings(filter: string, employeeId?: string) {
  const now = new Date()
  const conditions: Record<string, unknown>[] = []

  if (employeeId) {
    conditions.push({
      OR: [
        { organizerId: employeeId },
        { attendees: { some: { employeeId } } },
      ],
    })
  }

  if (filter === "upcoming") {
    conditions.push({ status: "SCHEDULED", startTime: { gte: now } })
  } else if (filter === "past") {
    conditions.push({
      OR: [
        { status: { in: ["COMPLETED", "CANCELLED"] } },
        { status: "SCHEDULED", endTime: { lt: now } },
      ],
    })
  }

  const where = conditions.length > 0 ? { AND: conditions } : {}

  return prisma.meeting.findMany({
    where,
    include: {
      organizer: {
        select: { id: true, firstName: true, lastName: true, employeeId: true },
      },
      project: { select: { id: true, key: true, name: true } },
      attendees: {
        include: {
          employee: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      },
    },
    orderBy: filter === "past" ? { startTime: "desc" } : { startTime: "asc" },
    take: 50,
  })
}

export default async function MeetingsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>
}) {
  const session = await auth()
  const resolvedSearchParams = await searchParams
  const role = session?.user?.role ?? "EMPLOYEE"
  const viewAll = canViewAllMeetings(role)
  const filter = resolvedSearchParams.filter || "upcoming"
  const employeeFilter = viewAll ? undefined : session?.user?.id

  const meetings = await getMeetings(filter, employeeFilter)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Meetings</h1>
          <p className="text-gray-500">
            {viewAll ? "All scheduled meetings" : "Your meetings and invitations"}
          </p>
        </div>
        <Link href="/meetings/new" className="shrink-0">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Schedule Meeting
          </Button>
        </Link>
      </div>

      <div className="flex gap-2 border-b border-gray-200">
        {[
          { value: "upcoming", label: "Upcoming" },
          { value: "past", label: "Past" },
        ].map((item) => (
          <Link
            key={item.value}
            href={`/meetings?filter=${item.value}`}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              filter === item.value
                ? "border-primary text-primary"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{filter === "past" ? "Past Meetings" : "Upcoming Meetings"}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Title</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">When</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Type</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Project</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Organizer</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Attendees</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {meetings.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-gray-500">
                      No meetings found
                    </td>
                  </tr>
                ) : (
                  meetings.map((meeting) => (
                    <tr key={meeting.id} className="hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium text-gray-900">{meeting.title}</td>
                      <td className="py-3 px-4 text-sm">
                        <div>{formatDate(meeting.startTime)}</div>
                        <div className="text-gray-500">
                          {formatTime(meeting.startTime)} – {formatTime(meeting.endTime)}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge className={getMeetingTypeColor(meeting.type)}>
                          {formatMeetingType(meeting.type)}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {meeting.project ? (
                          <Link
                            href={`/projects/${meeting.project.id}`}
                            className="text-primary hover:underline"
                          >
                            {meeting.project.key}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {meeting.organizer.firstName} {meeting.organizer.lastName}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-500">
                        {meeting.attendees.length} attendee{meeting.attendees.length !== 1 ? "s" : ""}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          href={`/meetings/${meeting.id}`}
                          className="text-primary hover:underline text-sm"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
