"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Loader2, Send } from "lucide-react"

export function PushPayslipButton({
  paySlipId,
  status,
  variant = "default",
  size = "sm",
}: {
  paySlipId: string
  status: string
  variant?: "default" | "outline"
  size?: "sm" | "default"
}) {
  const router = useRouter()
  const [isPushing, setIsPushing] = useState(false)
  const [error, setError] = useState("")

  if (status === "FINALIZED" || status === "PAID") {
    return null
  }

  const handlePush = async () => {
    setIsPushing(true)
    setError("")
    try {
      const response = await fetch(`/api/payroll/${paySlipId}/publish`, {
        method: "POST",
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Failed to push payslip")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to push payslip")
    } finally {
      setIsPushing(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant={variant} size={size} onClick={handlePush} disabled={isPushing}>
        {isPushing ? (
          <span className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Pushing...
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            Push to Employee
          </span>
        )}
      </Button>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
