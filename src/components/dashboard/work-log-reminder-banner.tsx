"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { AlertTriangle, X } from "lucide-react"
import { Button } from "@/components/ui/button"

type WorkLogStatus = {
  hasSubmitted: boolean
  hasCheckedIn: boolean
  reminderActive: boolean
  workEndTime: string
  reminderStartsAt: string
}

export function WorkLogReminderBanner() {
  const [status, setStatus] = useState<WorkLogStatus | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const fetchStatus = () => {
      fetch("/api/work-logs/status")
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data) setStatus(data)
        })
        .catch(() => {})
    }

    fetchStatus()
    const interval = setInterval(fetchStatus, 60_000)
    return () => clearInterval(interval)
  }, [])

  if (!status?.reminderActive || dismissed) {
    return null
  }

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-3">
      <div className="flex items-center justify-between gap-4 max-w-full">
        <div className="flex items-center gap-3 min-w-0">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-900">
            Your shift ends at <strong>{status.workEndTime}</strong>. Please submit your daily work
            log before you leave.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link href="/work-logs/submit">
            <Button size="sm" variant="default">
              Submit Work Log
            </Button>
          </Link>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="p-1 rounded hover:bg-amber-100 text-amber-700"
            aria-label="Dismiss reminder"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
