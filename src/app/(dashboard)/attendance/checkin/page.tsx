"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Loader2, Fingerprint, User, Clock, CheckCircle, AlertCircle } from "lucide-react"
import { formatDateTime, getAttendanceStatusColor } from "@/lib/utils"
import { useRouter } from "next/navigation"

interface AttendanceRecord {
  id: string
  employeeId: string
  date: string
  checkIn: string | null
  checkOut: string | null
  status: string
  source: string
}

export default function CheckInPage() {
  const router = useRouter()
  const [biometricId, setBiometricId] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<{
    success: boolean
    message: string
    record?: AttendanceRecord
  } | null>(null)
  const [recentRecords, setRecentRecords] = useState<AttendanceRecord[]>([])

  const handleCheckIn = async (type: "CHECK_IN" | "CHECK_OUT") => {
    if (!biometricId.trim()) {
      setResult({ success: false, message: "Please enter Biometric ID" })
      return
    }

    setIsLoading(true)
    setResult(null)

    try {
      const response = await fetch("/api/attendance/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ biometricId, type }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || data.message || "Check-in failed")
      }

      setResult({ success: true, message: `${type === "CHECK_IN" ? "Check-in" : "Check-out"} successful`, record: data.record })
      setBiometricId("")
      fetchRecentRecords()
    } catch (error) {
      setResult({ success: false, message: error instanceof Error ? error.message : "Check-in failed" })
    } finally {
      setIsLoading(false)
    }
  }

  const fetchRecentRecords = async () => {
    try {
      const response = await fetch("/api/attendance/recent")
      if (response.ok) {
        const data = await response.json()
        setRecentRecords(data.records || [])
      }
    } catch (error) {
      console.error("Failed to fetch recent records:", error)
    }
  }

  useEffect(() => {
    fetchRecentRecords()
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Biometric Check-in/out</h1>
        <p className="text-gray-500">Scan fingerprint or enter Biometric ID</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Check-in Form */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Fingerprint className="h-5 w-5" />
              Attendance Terminal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="biometricId" className="block text-sm font-medium">
                Biometric ID
              </label>
              <Input
                id="biometricId"
                placeholder="Enter Biometric ID or scan fingerprint"
                value={biometricId}
                onChange={(e) => setBiometricId(e.target.value)}
                disabled={isLoading}
                className="text-xl text-center font-mono tracking-wider"
                autoFocus
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Button
                onClick={() => handleCheckIn("CHECK_IN")}
                disabled={isLoading || !biometricId.trim()}
                className="h-16 text-lg bg-green-600 hover:bg-green-700"
                size="lg"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Processing...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    Check In
                  </span>
                )}
              </Button>

              <Button
                onClick={() => handleCheckIn("CHECK_OUT")}
                disabled={isLoading || !biometricId.trim()}
                className="h-16 text-lg bg-red-600 hover:bg-red-700"
                size="lg"
                variant="default"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Processing...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Clock className="h-5 w-5" />
                    Check Out
                  </span>
                )}
              </Button>
            </div>

            {result && (
              <div
                className={`p-4 rounded-lg flex items-center gap-3 ${
                  result.success
                    ? "bg-green-50 border border-green-200 text-green-800"
                    : "bg-red-50 border border-red-200 text-red-800"
                }`}
              >
                {result.success ? (
                  <CheckCircle className="h-5 w-5 flex-shrink-0" />
                ) : (
                  <AlertCircle className="h-5 w-5 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <p className="font-medium">{result.message}</p>
                  {result.record && (
                    <p className="text-sm mt-1">
                      {result.record.employeeId} -{" "}
                      <Badge variant="default" className={getAttendanceStatusColor(result.record.status)}>
                        {result.record.status}
                      </Badge>
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Simulated Fingerprint Scanner */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <Fingerprint className="h-12 w-12 mx-auto text-gray-400 mb-3" />
              <p className="text-gray-500">Place finger on scanner</p>
              <p className="text-xs text-gray-400 mt-1">Or enter Biometric ID manually above</p>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Today's Records
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {recentRecords.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No records today</p>
              ) : (
                recentRecords.map((record) => (
                  <div key={record.id} className="border-b border-gray-100 pb-3 last:border-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="text-sm font-medium">{record.employeeId}</span>
                      </div>
                      <Badge variant="default" className={getAttendanceStatusColor(record.status)}>
                        {record.status}
                      </Badge>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>In: {record.checkIn ? formatDateTime(record.checkIn) : "--"}</span>
                      <span>Out: {record.checkOut ? formatDateTime(record.checkOut) : "--"}</span>
                    </div>
                    <span className="text-xs text-gray-400">{record.source}</span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}