"use client"

import { useCallback, useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import { getAttendanceStatusColor } from "@/lib/utils"

type AttendanceRecord = {
  id: string
  date: string
  status: string
  checkIn: string | null
  checkOut: string | null
  totalHours: number | null
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

export function AttendanceCalendar({ employeeId }: { employeeId?: string }) {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<AttendanceRecord | null>(null)

  const fetchCalendar = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ month: String(month), year: String(year) })
      if (employeeId) params.set("employeeId", employeeId)
      const response = await fetch(`/api/attendance/calendar?${params}`)
      const data = await response.json()
      if (response.ok) {
        setRecords(data.records || [])
      }
    } finally {
      setLoading(false)
    }
  }, [month, year, employeeId])

  useEffect(() => {
    fetchCalendar()
  }, [fetchCalendar])

  const prevMonth = () => {
    if (month === 1) {
      setMonth(12)
      setYear((y) => y - 1)
    } else {
      setMonth((m) => m - 1)
    }
    setSelected(null)
  }

  const nextMonth = () => {
    if (month === 12) {
      setMonth(1)
      setYear((y) => y + 1)
    } else {
      setMonth((m) => m + 1)
    }
    setSelected(null)
  }

  const daysInMonth = new Date(year, month, 0).getDate()
  const firstDay = new Date(year, month - 1, 1).getDay()

  const recordByDay = new Map<number, AttendanceRecord>()
  for (const record of records) {
    const d = new Date(record.date)
    recordByDay.set(d.getDate(), record)
  }

  const cells: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{MONTHS[month - 1]} {year}</CardTitle>
          <div className="flex gap-1">
            <Button variant="outline" size="icon" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-7 gap-1 mb-1">
              {WEEKDAYS.map((day) => (
                <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {cells.map((day, idx) => {
                if (day === null) {
                  return <div key={`empty-${idx}`} className="aspect-square" />
                }
                const record = recordByDay.get(day)
                const isToday =
                  day === now.getDate() &&
                  month === now.getMonth() + 1 &&
                  year === now.getFullYear()

                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setSelected(record ?? null)}
                    className={`aspect-square rounded-lg border text-sm flex flex-col items-center justify-center p-1 transition-colors ${
                      isToday ? "border-primary ring-1 ring-primary" : "border-gray-100"
                    } ${record ? "hover:bg-gray-50" : "text-gray-400 hover:bg-gray-50"}`}
                  >
                    <span className="font-medium">{day}</span>
                    {record && (
                      <span
                        className={`w-2 h-2 rounded-full mt-0.5 ${
                          record.status === "PRESENT" || record.status === "REMOTE"
                            ? "bg-green-500"
                            : record.status === "LATE"
                              ? "bg-yellow-500"
                              : record.status === "ON_LEAVE"
                                ? "bg-blue-500"
                                : "bg-red-400"
                        }`}
                      />
                    )}
                  </button>
                )
              })}
            </div>

            {selected && (
              <div className="mt-4 p-4 rounded-lg bg-gray-50 border border-gray-100">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-medium text-sm">
                    {MONTHS[month - 1]} {selected.date ? new Date(selected.date).getDate() : ""}, {year}
                  </span>
                  <Badge className={getAttendanceStatusColor(selected.status)}>
                    {selected.status.replace(/_/g, " ")}
                  </Badge>
                </div>
                {selected.checkIn && (
                  <p className="text-sm text-gray-600">
                    Check in: {new Date(selected.checkIn).toLocaleTimeString()}
                  </p>
                )}
                {selected.checkOut && (
                  <p className="text-sm text-gray-600">
                    Check out: {new Date(selected.checkOut).toLocaleTimeString()}
                  </p>
                )}
                {selected.totalHours != null && (
                  <p className="text-sm text-gray-600">Hours: {selected.totalHours.toFixed(1)}</p>
                )}
              </div>
            )}

            <div className="flex flex-wrap gap-3 mt-4 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500" /> Present
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-yellow-500" /> Late
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-500" /> On Leave
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-400" /> Absent
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
