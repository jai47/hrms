"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Plus } from "lucide-react"

const DAY_OPTIONS = [
  { value: "MON", label: "Mon" },
  { value: "TUE", label: "Tue" },
  { value: "WED", label: "Wed" },
  { value: "THU", label: "Thu" },
  { value: "FRI", label: "Fri" },
  { value: "SAT", label: "Sat" },
  { value: "SUN", label: "Sun" },
]

type EmployeeOption = {
  id: string
  firstName: string
  lastName: string
  employeeId: string
}

export function CreateShiftForm() {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState("")
  const [startTime, setStartTime] = useState("09:00")
  const [endTime, setEndTime] = useState("17:00")
  const [breakMinutes, setBreakMinutes] = useState("60")
  const [workingDays, setWorkingDays] = useState<string[]>(["MON", "TUE", "WED", "THU", "FRI"])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const toggleDay = (day: string) => {
    setWorkingDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    try {
      const response = await fetch("/api/shifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, startTime, endTime, breakMinutes, workingDays }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Failed to create shift")
      setShowForm(false)
      setName("")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create shift")
    } finally {
      setIsLoading(false)
    }
  }

  if (!showForm) {
    return (
      <Button onClick={() => setShowForm(true)}>
        <Plus className="h-4 w-4 mr-2" />
        Add Shift
      </Button>
    )
  }

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle>New Shift</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="space-y-2">
            <Label>Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Time</Label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>End Time</Label>
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Break (minutes)</Label>
            <Input type="number" value={breakMinutes} onChange={(e) => setBreakMinutes(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Working Days</Label>
            <div className="flex flex-wrap gap-2">
              {DAY_OPTIONS.map((day) => (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => toggleDay(day.value)}
                  className={`px-3 py-1 text-sm rounded-md border ${
                    workingDays.includes(day.value)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-gray-300 text-gray-600"
                  }`}
                >
                  {day.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

export function AssignShiftForm({
  shiftId,
  employees,
}: {
  shiftId: string
  employees: EmployeeOption[]
}) {
  const router = useRouter()
  const [employeeId, setEmployeeId] = useState("")
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!employeeId) return
    setIsLoading(true)
    setError("")
    try {
      const response = await fetch(`/api/shifts/${shiftId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeId, startDate }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Failed to assign shift")
      setEmployeeId("")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to assign shift")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleAssign} className="flex flex-wrap items-end gap-3 mt-3 pt-3 border-t">
      {error && <p className="text-sm text-red-500 w-full">{error}</p>}
      <div className="space-y-1">
        <Label className="text-xs">Employee</Label>
        <select
          value={employeeId}
          onChange={(e) => setEmployeeId(e.target.value)}
          className="flex h-9 rounded-md border border-input bg-background px-3 text-sm"
          required
        >
          <option value="">Select...</option>
          {employees.map((emp) => (
            <option key={emp.id} value={emp.id}>
              {emp.firstName} {emp.lastName}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Start Date</Label>
        <Input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="h-9"
        />
      </div>
      <Button type="submit" size="sm" disabled={isLoading}>
        {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Assign"}
      </Button>
    </form>
  )
}
