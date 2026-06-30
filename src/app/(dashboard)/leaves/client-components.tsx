"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

export function LeaveActions({ requestId }: { requestId: string }) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState<"approve" | "reject" | null>(null)

  const handleAction = async (action: "approve" | "reject") => {
    setIsLoading(action)
    try {
      const response = await fetch(`/api/leaves/${requestId}/${action}`, {
        method: "POST",
      })
      if (!response.ok) {
        throw new Error(`Failed to ${action} leave request`)
      }
      router.refresh()
    } catch (error) {
      alert(error instanceof Error ? error.message : `Failed to ${action} leave request`)
    } finally {
      setIsLoading(null)
    }
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <button
        onClick={() => handleAction("approve")}
        disabled={isLoading !== null}
        className="text-green-600 hover:underline text-sm disabled:opacity-50 flex items-center gap-1"
      >
        {isLoading === "approve" && <Loader2 className="h-3 w-3 animate-spin" />}
        Approve
      </button>
      <button
        onClick={() => handleAction("reject")}
        disabled={isLoading !== null}
        className="text-red-600 hover:underline text-sm disabled:opacity-50 flex items-center gap-1"
      >
        {isLoading === "reject" && <Loader2 className="h-3 w-3 animate-spin" />}
        Reject
      </button>
    </div>
  )
}

export function CancelLeaveButton({
  requestId,
  status,
}: {
  requestId: string
  status: string
}) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  if (status !== "PENDING") return null

  const handleCancel = async () => {
    if (!confirm("Cancel this leave request?")) return
    setIsLoading(true)
    try {
      const response = await fetch(`/api/leaves/${requestId}/cancel`, { method: "POST" })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to cancel leave request")
      }
      router.refresh()
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to cancel leave request")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <button
      onClick={handleCancel}
      disabled={isLoading}
      className="text-orange-600 hover:underline text-sm disabled:opacity-50 flex items-center gap-1"
    >
      {isLoading && <Loader2 className="h-3 w-3 animate-spin" />}
      Cancel
    </button>
  )
}
