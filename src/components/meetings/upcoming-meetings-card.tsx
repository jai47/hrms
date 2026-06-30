"use client"

import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Video, ExternalLink } from "lucide-react"
import { formatMeetingType, getMeetingTypeColor } from "@/lib/meetings"
import { formatDate } from "@/lib/utils"

export type UpcomingMeetingItem = {
  id: string
  title: string
  startTime: Date | string
  endTime: Date | string
  type: string
  location?: string | null
  meetingLink?: string | null
  organizer: { firstName: string; lastName: string }
}

export function UpcomingMeetingsCard({
  meetings,
  showViewAll = true,
}: {
  meetings: UpcomingMeetingItem[]
  showViewAll?: boolean
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Video className="h-5 w-5" />
          Upcoming Meetings
        </CardTitle>
        {showViewAll && (
          <Link href="/meetings">
            <Button size="sm" variant="outline">
              View All
            </Button>
          </Link>
        )}
      </CardHeader>
      <CardContent>
        {meetings.length === 0 ? (
          <p className="text-sm text-muted-foreground">No upcoming meetings scheduled</p>
        ) : (
          <div className="space-y-3">
            {meetings.map((meeting) => (
              <Link
                key={meeting.id}
                href={`/meetings/${meeting.id}`}
                className="block rounded-lg border border-gray-100 p-3 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 truncate">{meeting.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {formatDate(meeting.startTime)} · {meeting.organizer.firstName}{" "}
                      {meeting.organizer.lastName}
                    </p>
                    {meeting.location && (
                      <p className="text-xs text-gray-500 mt-0.5">{meeting.location}</p>
                    )}
                  </div>
                  <Badge className={getMeetingTypeColor(meeting.type)}>
                    {formatMeetingType(meeting.type)}
                  </Badge>
                </div>
                {meeting.meetingLink && (
                  <span
                    className="inline-flex items-center gap-1 text-xs text-primary mt-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <a
                      href={meeting.meetingLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 hover:underline"
                    >
                      Join link <ExternalLink className="h-3 w-3" />
                    </a>
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
