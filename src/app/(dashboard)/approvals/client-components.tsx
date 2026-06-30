"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { formatDate } from "@/lib/utils"

export function ApprovalActions({
  type,
  itemId,
}: {
  type: "leave" | "review"
  itemId: string
}) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState<"approve" | "reject" | null>(null)

  const handleLeave = async (action: "approve" | "reject") => {
    setIsLoading(action)
    try {
      const response = await fetch(`/api/leaves/${itemId}/${action}`, { method: "POST" })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || `Failed to ${action}`)
      }
      router.refresh()
    } catch (error) {
      alert(error instanceof Error ? error.message : `Failed to ${action}`)
    } finally {
      setIsLoading(null)
    }
  }

  if (type === "leave") {
    return (
      <div className="flex items-center justify-end gap-2">
        <button
          onClick={() => handleLeave("approve")}
          disabled={isLoading !== null}
          className="text-green-600 hover:underline text-sm disabled:opacity-50 flex items-center gap-1"
        >
          {isLoading === "approve" && <Loader2 className="h-3 w-3 animate-spin" />}
          Approve
        </button>
        <button
          onClick={() => handleLeave("reject")}
          disabled={isLoading !== null}
          className="text-red-600 hover:underline text-sm disabled:opacity-50 flex items-center gap-1"
        >
          {isLoading === "reject" && <Loader2 className="h-3 w-3 animate-spin" />}
          Reject
        </button>
      </div>
    )
  }

  return (
    <a href={`/performance/${itemId}`} className="text-primary hover:underline text-sm">
      Review
    </a>
  )
}

export function LeaveApprovalRow({
  leave,
}: {
  leave: {
    id: string
    leaveType: string
    startDate: string | Date
    endDate: string | Date
    totalDays: number
    reason: string
    createdAt: string | Date
    employee: {
      firstName: string
      lastName: string
      employeeId: string
      department?: { name: string } | null
    }
  }
}) {
  return (
    <tr className="hover:bg-gray-50">
      <td className="py-3 px-4">
        <div className="font-medium text-gray-900">
          {leave.employee.firstName} {leave.employee.lastName}
        </div>
        <div className="text-sm text-gray-500">{leave.employee.employeeId}</div>
      </td>
      <td className="py-3 px-4 text-sm capitalize">
        {leave.leaveType.toLowerCase().replace("_", " ")}
      </td>
      <td className="py-3 px-4 text-sm">
        {formatDate(leave.startDate)} – {formatDate(leave.endDate)}
      </td>
      <td className="py-3 px-4 text-sm">{leave.totalDays}</td>
      <td className="py-3 px-4 text-sm text-gray-500 max-w-xs truncate">{leave.reason}</td>
      <td className="py-3 px-4 text-sm text-gray-500">{formatDate(leave.createdAt)}</td>
      <td className="py-3 px-4 text-right">
        <ApprovalActions type="leave" itemId={leave.id} />
      </td>
    </tr>
  )
}
