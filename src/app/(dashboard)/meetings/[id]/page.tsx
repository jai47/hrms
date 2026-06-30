import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, ExternalLink, MapPin } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDate, formatTime } from "@/lib/utils"
import { formatMeetingType, getMeetingTypeColor } from "@/lib/meetings"
import { MeetingActions } from "./client-actions"

export default async function MeetingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  const { id } = await params

  const meeting = await prisma.meeting.findUnique({
    where: { id },
    include: {
      organizer: {
        select: { id: true, firstName: true, lastName: true, employeeId: true, email: true },
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
  })

  if (!meeting) notFound()

  const userId = session?.user?.id ?? ""
  const role = session?.user?.role ?? "EMPLOYEE"
  const canView =
    role === "ADMIN" ||
    role === "HR_MANAGER" ||
    role === "MANAGER" ||
    meeting.organizerId === userId ||
    meeting.attendees.some((a) => a.employeeId === userId)

  if (!canView) notFound()

  const isOrganizer = meeting.organizerId === userId || role === "ADMIN"

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/meetings" className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{meeting.title}</h1>
            <p className="text-gray-500">
              Organized by {meeting.organizer.firstName} {meeting.organizer.lastName}
            </p>
          </div>
        </div>
        <MeetingActions
          meetingId={meeting.id}
          isOrganizer={isOrganizer}
          status={meeting.status}
        />
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>Details</CardTitle>
            <Badge className={getMeetingTypeColor(meeting.type)}>
              {formatMeetingType(meeting.type)}
            </Badge>
            <Badge variant={meeting.status === "SCHEDULED" ? "info" : "secondary"}>
              {meeting.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <p className="font-medium text-gray-700">When</p>
            <p>
              {formatDate(meeting.startTime)} · {formatTime(meeting.startTime)} –{" "}
              {formatTime(meeting.endTime)}
            </p>
          </div>

          {meeting.description && (
            <div>
              <p className="font-medium text-gray-700">Description</p>
              <p className="text-gray-600 whitespace-pre-wrap">{meeting.description}</p>
            </div>
          )}

          {meeting.project && (
            <div>
              <p className="font-medium text-gray-700">Project</p>
              <Link
                href={`/projects/${meeting.project.id}`}
                className="text-primary hover:underline"
              >
                {meeting.project.key} — {meeting.project.name}
              </Link>
            </div>
          )}

          {meeting.clientName && (
            <div>
              <p className="font-medium text-gray-700">Client</p>
              <p>{meeting.clientName}</p>
            </div>
          )}

          {meeting.location && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-gray-400" />
              <span>{meeting.location}</span>
            </div>
          )}

          {meeting.meetingLink && (
            <div>
              <a
                href={meeting.meetingLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                Join meeting <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          )}

          <div>
            <p className="font-medium text-gray-700 mb-2">
              Attendees ({meeting.attendees.length})
            </p>
            <ul className="space-y-1">
              <li className="text-gray-600">
                {meeting.organizer.firstName} {meeting.organizer.lastName} (organizer)
              </li>
              {meeting.attendees.map((a) => (
                <li key={a.id} className="text-gray-600">
                  {a.employee.firstName} {a.employee.lastName} ({a.employee.employeeId})
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
