"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatDate, formatTime, formatCurrency, getAttendanceStatusColor } from "@/lib/utils"
import { Clock, CheckCircle2, AlertCircle, CalendarOff } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export type AttendanceRecord = {
  id: string
  date: string
  checkIn: string | null
  checkOut: string | null
  status: string
  totalHours: number | null
}

const ON_TIME_STATUSES = ["PRESENT", "REMOTE"]
const LATE_STATUSES = ["LATE"]
const ABSENT_LEAVE_STATUSES = ["ABSENT", "ON_LEAVE", "HALF_DAY", "EARLY_LEAVE"]

function formatStatusLabel(status: string): string {
  return status.replace(/_/g, " ")
}

function AttendanceTable({ records }: { records: AttendanceRecord[] }) {
  if (records.length === 0) {
    return <p className="text-sm text-muted-foreground py-6 text-center">No records in this category</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-gray-500">
            <th className="py-3 px-2">Date</th>
            <th className="py-3 px-2">Check In</th>
            <th className="py-3 px-2">Check Out</th>
            <th className="py-3 px-2">Hours</th>
            <th className="py-3 px-2">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {records.map((record) => (
            <tr key={record.id} className="hover:bg-gray-50">
              <td className="py-3 px-2 font-medium">{formatDate(record.date)}</td>
              <td className="py-3 px-2">{record.checkIn ? formatTime(record.checkIn) : "—"}</td>
              <td className="py-3 px-2">{record.checkOut ? formatTime(record.checkOut) : "—"}</td>
              <td className="py-3 px-2">{record.totalHours != null ? record.totalHours.toFixed(1) : "—"}</td>
              <td className="py-3 px-2">
                <Badge className={getAttendanceStatusColor(record.status)}>
                  {formatStatusLabel(record.status)}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function EmployeeDashboard({
  employeeName,
  monthLabel,
  stats,
  attendances,
  pendingLeaves,
  recentPaySlips,
}: {
  employeeName: string
  monthLabel: string
  stats: {
    onTime: number
    late: number
    absentLeaves: number
    todayStatus: string | null
  }
  attendances: AttendanceRecord[]
  pendingLeaves: number
  recentPaySlips: { id: string; periodMonth: number; periodYear: number; netPay: number }[]
}) {
  const MONTHS = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ]

  const onTimeRecords = attendances.filter((a) => ON_TIME_STATUSES.includes(a.status))
  const lateRecords = attendances.filter((a) => LATE_STATUSES.includes(a.status))
  const absentLeaveRecords = attendances.filter((a) => ABSENT_LEAVE_STATUSES.includes(a.status))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Welcome, {employeeName}</h1>
        <p className="text-gray-500 mt-1">Your personal dashboard — {monthLabel}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">
              {stats.todayStatus ? formatStatusLabel(stats.todayStatus) : "No record"}
            </div>
            <p className="text-xs text-muted-foreground">Attendance status</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">On Time</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.onTime}</div>
            <p className="text-xs text-muted-foreground">Days this month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Late</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.late}</div>
            <p className="text-xs text-muted-foreground">Days this month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Absent / Leave</CardTitle>
            <CalendarOff className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.absentLeaves}</div>
            <p className="text-xs text-muted-foreground">Days this month</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>My Attendance</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="on-time">
            <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 sm:max-w-lg h-auto gap-1 p-1">
              <TabsTrigger value="on-time" className="text-xs sm:text-sm py-2">
                On Time ({onTimeRecords.length})
              </TabsTrigger>
              <TabsTrigger value="late" className="text-xs sm:text-sm py-2">
                Late ({lateRecords.length})
              </TabsTrigger>
              <TabsTrigger value="absent" className="text-xs sm:text-sm py-2">
                Absent / Leave ({absentLeaveRecords.length})
              </TabsTrigger>
            </TabsList>
            <TabsContent value="on-time">
              <AttendanceTable records={onTimeRecords} />
            </TabsContent>
            <TabsContent value="late">
              <AttendanceTable records={lateRecords} />
            </TabsContent>
            <TabsContent value="absent">
              <AttendanceTable records={absentLeaveRecords} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Pending Leaves</CardTitle>
            <Link href="/leaves/request">
              <Button size="sm" variant="outline">Request</Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{pendingLeaves}</div>
            <p className="text-sm text-muted-foreground mt-1">Awaiting approval</p>
            <Link href="/leaves" className="text-sm text-primary hover:underline mt-3 inline-block">
              View all leaves
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Payslips</CardTitle>
            <Link href="/documents?tab=payslips">
              <Button size="sm" variant="outline">View All</Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentPaySlips.length === 0 ? (
              <p className="text-sm text-muted-foreground">No payslips shared yet</p>
            ) : (
              <div className="space-y-3">
                {recentPaySlips.map((slip) => (
                  <Link
                    key={slip.id}
                    href={`/documents/payslips/${slip.id}`}
                    className="flex items-center justify-between hover:bg-gray-50 rounded-lg p-2 -mx-2"
                  >
                    <span className="text-sm font-medium">
                      {MONTHS[slip.periodMonth - 1]} {slip.periodYear}
                    </span>
                    <span className="text-sm text-gray-600">
                      {formatCurrency(slip.netPay)}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
