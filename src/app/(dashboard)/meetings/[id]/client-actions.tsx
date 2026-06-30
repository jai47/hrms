"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

export function MeetingActions({
  meetingId,
  isOrganizer,
  status,
}: {
  meetingId: string
  isOrganizer: boolean
  status: string
}) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  if (!isOrganizer || status === "CANCELLED") return null

  const cancelMeeting = async () => {
    if (!confirm("Cancel this meeting? Attendees will be notified.")) return
    setIsLoading(true)
    try {
      const response = await fetch(`/api/meetings/${meetingId}`, { method: "DELETE" })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to cancel meeting")
      }
      router.refresh()
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to cancel meeting")
    } finally {
      setIsLoading(false)
    }
  }

  const completeMeeting = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/meetings/${meetingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "COMPLETED" }),
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to update meeting")
      }
      router.refresh()
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to update meeting")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex gap-2">
      {status === "SCHEDULED" && (
        <>
          <Button variant="outline" size="sm" onClick={completeMeeting} disabled={isLoading}>
            {isLoading && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
            Mark Complete
          </Button>
          <Button variant="destructive" size="sm" onClick={cancelMeeting} disabled={isLoading}>
            Cancel Meeting
          </Button>
        </>
      )}
    </div>
  )
}
