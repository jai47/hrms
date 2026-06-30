"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, ArrowLeft } from "lucide-react"
import Link from "next/link"

const meetingSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  type: z.enum(["TEAM", "CLIENT", "INTERNAL"]),
  location: z.string().optional(),
  meetingLink: z.string().optional(),
  clientName: z.string().optional(),
  projectId: z.string().optional(),
})

type MeetingForm = z.infer<typeof meetingSchema>

type ProjectOption = {
  id: string
  key: string
  name: string
}

type EmployeeOption = {
  id: string
  firstName: string
  lastName: string
  employeeId: string
}

export default function NewMeetingPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [submitError, setSubmitError] = useState("")
  const [projects, setProjects] = useState<ProjectOption[]>([])
  const [employees, setEmployees] = useState<EmployeeOption[]>([])
  const [selectedAttendees, setSelectedAttendees] = useState<string[]>([])

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<MeetingForm>({
    resolver: zodResolver(meetingSchema),
    defaultValues: {
      type: "TEAM",
      startTime: "",
      endTime: "",
    },
  })

  const meetingType = watch("type")

  useEffect(() => {
    Promise.all([
      fetch("/api/projects").then((r) => r.json()),
      fetch("/api/employees?limit=200").then((r) => r.json()),
    ])
      .then(([projectsData, employeesData]) => {
        const projectList = Array.isArray(projectsData)
          ? projectsData
          : projectsData.projects || []
        setProjects(projectList)
        setEmployees(employeesData.employees || [])
      })
      .catch(() => {
        setProjects([])
        setEmployees([])
      })
  }, [])

  const toggleAttendee = (id: string) => {
    setSelectedAttendees((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    )
  }

  const onSubmit = async (data: MeetingForm) => {
    setIsLoading(true)
    setSubmitError("")
    try {
      const response = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          projectId: data.projectId || null,
          attendeeIds: selectedAttendees,
        }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Failed to create meeting")
      router.push(`/meetings/${result.id}`)
      router.refresh()
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Failed to create meeting")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Link href="/meetings" className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Schedule Meeting</h1>
          <p className="text-gray-500">Create a new meeting and invite attendees</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Meeting Details</CardTitle>
        </CardHeader>
        <CardContent>
          {submitError && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          )}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input id="title" {...register("title")} placeholder="Weekly standup" />
              {errors.title && <p className="text-sm text-red-500">{errors.title.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" {...register("description")} rows={3} />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="startTime">Start *</Label>
                <Input id="startTime" type="datetime-local" {...register("startTime")} />
                {errors.startTime && <p className="text-sm text-red-500">{errors.startTime.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime">End *</Label>
                <Input id="endTime" type="datetime-local" {...register("endTime")} />
                {errors.endTime && <p className="text-sm text-red-500">{errors.endTime.message}</p>}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Type</Label>
                <Controller
                  name="type"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TEAM">Team</SelectItem>
                        <SelectItem value="CLIENT">Client</SelectItem>
                        <SelectItem value="INTERNAL">Internal</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label>Project</Label>
                <Controller
                  name="projectId"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value || ""} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Optional project" />
                      </SelectTrigger>
                      <SelectContent>
                        {projects.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.key} — {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            {meetingType === "CLIENT" && (
              <div className="space-y-2">
                <Label htmlFor="clientName">Client Name</Label>
                <Input id="clientName" {...register("clientName")} />
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input id="location" {...register("location")} placeholder="Conference Room A" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="meetingLink">Meeting Link</Label>
                <Input id="meetingLink" {...register("meetingLink")} placeholder="https://..." />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Attendees</Label>
              <div className="max-h-48 overflow-y-auto border rounded-md p-3 space-y-2">
                {employees.length === 0 ? (
                  <p className="text-sm text-gray-500">Loading employees...</p>
                ) : (
                  employees.map((emp) => (
                    <label key={emp.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selectedAttendees.includes(emp.id)}
                        onChange={() => toggleAttendee(emp.id)}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      {emp.firstName} {emp.lastName} ({emp.employeeId})
                    </label>
                  ))
                )}
              </div>
            </div>

            <div className="flex justify-end gap-4 pt-4 border-t">
              <Link href="/meetings">
                <Button type="button" variant="outline">Cancel</Button>
              </Link>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Scheduling...
                  </span>
                ) : (
                  "Schedule Meeting"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
