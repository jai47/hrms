"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, ArrowLeft, AlertTriangle } from "lucide-react"
import Link from "next/link"

const workLogSchema = z.object({
  summary: z.string().min(10, "Please provide at least 10 characters describing your work"),
  tasksDone: z.string().optional(),
  blockers: z.string().optional(),
  nextSteps: z.string().optional(),
  hoursWorked: z.string().optional(),
})

type WorkLogForm = z.infer<typeof workLogSchema>

export default function SubmitWorkLogPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [isLoading, setIsLoading] = useState(false)
  const [submitError, setSubmitError] = useState("")
  const [alreadySubmitted, setAlreadySubmitted] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<WorkLogForm>({
    resolver: zodResolver(workLogSchema),
  })

  useEffect(() => {
    fetch("/api/work-logs/status")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.hasSubmitted) setAlreadySubmitted(true)
      })
      .catch(() => {})
  }, [])

  const onSubmit = async (data: WorkLogForm) => {
    setIsLoading(true)
    setSubmitError("")
    try {
      const response = await fetch("/api/work-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: session?.user?.id,
          summary: data.summary,
          tasksDone: data.tasksDone,
          blockers: data.blockers,
          nextSteps: data.nextSteps,
          hoursWorked: data.hoursWorked ? parseFloat(data.hoursWorked) : undefined,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to submit work log")
      }

      router.push("/work-logs")
      router.refresh()
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Failed to submit work log")
    } finally {
      setIsLoading(false)
    }
  }

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/work-logs" className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Submit Daily Work Log</h1>
          <p className="text-gray-500">Record what you accomplished today — {today}</p>
        </div>
      </div>

      {alreadySubmitted && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You have already submitted your work log for today.{" "}
            <Link href="/work-logs" className="underline font-medium">
              View your logs
            </Link>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>End-of-Shift Work Summary</CardTitle>
        </CardHeader>
        <CardContent>
          {submitError && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          )}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="summary">Work Summary *</Label>
              <Textarea
                id="summary"
                placeholder="Describe the main work you completed today..."
                {...register("summary")}
                rows={4}
                disabled={alreadySubmitted}
              />
              {errors.summary && (
                <p className="text-sm text-red-500">{errors.summary.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="tasksDone">Tasks Completed</Label>
              <Textarea
                id="tasksDone"
                placeholder="List specific tasks or deliverables completed..."
                {...register("tasksDone")}
                rows={3}
                disabled={alreadySubmitted}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="blockers">Blockers / Challenges</Label>
                <Textarea
                  id="blockers"
                  placeholder="Any issues that slowed you down..."
                  {...register("blockers")}
                  rows={3}
                  disabled={alreadySubmitted}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="nextSteps">Next Steps</Label>
                <Textarea
                  id="nextSteps"
                  placeholder="What you plan to work on next..."
                  {...register("nextSteps")}
                  rows={3}
                  disabled={alreadySubmitted}
                />
              </div>
            </div>

            <div className="space-y-2 max-w-xs">
              <Label htmlFor="hoursWorked">Hours Worked (optional)</Label>
              <Input
                id="hoursWorked"
                type="number"
                step="0.5"
                min="0"
                max="24"
                placeholder="e.g. 8"
                {...register("hoursWorked")}
                disabled={alreadySubmitted}
              />
            </div>

            <div className="flex justify-end gap-4 pt-4 border-t">
              <Link href="/work-logs">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={isLoading || alreadySubmitted}>
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting...
                  </span>
                ) : (
                  "Submit Work Log"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
