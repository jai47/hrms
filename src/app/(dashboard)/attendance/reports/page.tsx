import { prisma } from "@/lib/prisma"
import { requireRoles } from "@/lib/auth-guard"
import { auth } from "@/lib/auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Clock, Users, CalendarDays } from "lucide-react"
import { getAttendanceHours } from "@/lib/attendance"
import { formatDate, formatHours, getAttendanceStatusColor } from "@/lib/utils"

function getMonthRange() {
  const now = new Date()
  const from = new Date(now.getFullYear(), now.getMonth(), 1)
  return {
    from: from.toISOString().split("T")[0],
    to: now.toISOString().split("T")[0],
  }
}

async function getReportData(dateFrom: string, dateTo: string, employeeId?: string) {
  const from = new Date(dateFrom)
  const to = new Date(dateTo)

  const attendanceWhere: Record<string, unknown> = {
    date: { gte: from, lte: to },
  }
  if (employeeId) attendanceWhere.employeeId = employeeId

  const [records, timeEntries] = await Promise.all([
    prisma.attendance.findMany({
      where: attendanceWhere,
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true, employeeId: true },
        },
      },
      orderBy: { date: "desc" },
    }),
    prisma.timeEntry.findMany({
      where: {
        date: { gte: from, lte: to },
        ...(employeeId ? { employeeId } : {}),
      },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, employeeId: true } },
        issue: {
          select: { issueNumber: true, project: { select: { key: true } } },
        },
      },
    }),
  ])

  const byEmployee = new Map<
    string,
    {
      employee: { id: string; firstName: string; lastName: string; employeeId: string }
      attendanceHours: number
      taskHours: number
      daysPresent: number
    }
  >()

  for (const record of records) {
    const hours = getAttendanceHours(record) ?? 0
    if (!byEmployee.has(record.employeeId)) {
      byEmployee.set(record.employeeId, {
        employee: record.employee,
        attendanceHours: 0,
        taskHours: 0,
        daysPresent: 0,
      })
    }
    const entry = byEmployee.get(record.employeeId)!
    if (hours > 0) {
      entry.attendanceHours += hours
      entry.daysPresent += 1
    }
  }

  for (const te of timeEntries) {
    if (!byEmployee.has(te.employeeId)) {
      byEmployee.set(te.employeeId, {
        employee: {
          id: te.employee.id,
          firstName: te.employee.firstName,
          lastName: te.employee.lastName,
          employeeId: te.employee.employeeId,
        },
        attendanceHours: 0,
        taskHours: 0,
        daysPresent: 0,
      })
    }
    byEmployee.get(te.employeeId)!.taskHours += te.hours
  }

  const totalAttendance = [...byEmployee.values()].reduce((s, e) => s + e.attendanceHours, 0)
  const totalTask = timeEntries.reduce((s, e) => s + e.hours, 0)

  return {
    records: records.map((r) => ({ ...r, computedHours: getAttendanceHours(r) })),
    byEmployee: Array.from(byEmployee.values()),
    totalAttendance,
    totalTask,
    daysWithRecords: records.filter((r) => getAttendanceHours(r)).length,
  }
}

export default async function TimeReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ dateFrom?: string; dateTo?: string; employeeId?: string }>
}) {
  await requireRoles(["ADMIN", "HR_MANAGER", "MANAGER"])
  const session = await auth()
  const resolved = await searchParams
  const defaults = getMonthRange()
  const dateFrom = resolved.dateFrom || defaults.from
  const dateTo = resolved.dateTo || defaults.to

  const isEmployee = session?.user?.role === "EMPLOYEE"
  const employeeId = isEmployee ? session?.user?.id : resolved.employeeId

  const report = await getReportData(dateFrom, dateTo, employeeId)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Working Time Reports</h1>
        <p className="text-gray-500">Attendance hours and task time by employee</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1">
              <label className="text-sm font-medium">From</label>
              <Input type="date" name="dateFrom" defaultValue={dateFrom} className="w-[160px]" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">To</label>
              <Input type="date" name="dateTo" defaultValue={dateTo} className="w-[160px]" />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90"
            >
              Apply
            </button>
            <Link
              href="/attendance/records"
              className="text-sm text-primary hover:underline py-2"
            >
              View all attendance records
            </Link>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{formatHours(report.totalAttendance)}</p>
                <p className="text-sm text-gray-500">Total attendance hours</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CalendarDays className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{formatHours(report.totalTask)}</p>
                <p className="text-sm text-gray-500">Task time logged</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-2xl font-bold">{report.byEmployee.length}</p>
                <p className="text-sm text-gray-500">Employees in report</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {!isEmployee && report.byEmployee.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Summary by Employee</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 text-sm font-medium text-gray-500">Employee</th>
                    <th className="text-left py-2 px-3 text-sm font-medium text-gray-500">Days Present</th>
                    <th className="text-left py-2 px-3 text-sm font-medium text-gray-500">Attendance Hours</th>
                    <th className="text-left py-2 px-3 text-sm font-medium text-gray-500">Task Hours</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {report.byEmployee.map((row) => (
                    <tr key={row.employee.id} className="hover:bg-gray-50">
                      <td className="py-2 px-3">
                        <div className="font-medium">{row.employee.firstName} {row.employee.lastName}</div>
                        <div className="text-xs text-gray-500">{row.employee.employeeId}</div>
                      </td>
                      <td className="py-2 px-3 text-sm">{row.daysPresent}</td>
                      <td className="py-2 px-3 text-sm">{formatHours(row.attendanceHours)}</td>
                      <td className="py-2 px-3 text-sm">{formatHours(row.taskHours)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Daily Attendance Detail</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-500">Date</th>
                  {!isEmployee && (
                    <th className="text-left py-2 px-3 text-sm font-medium text-gray-500">Employee</th>
                  )}
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-500">Check In</th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-500">Check Out</th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-500">Hours</th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {report.records.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-gray-500">
                      No records for this period
                    </td>
                  </tr>
                ) : (
                  report.records.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className="py-2 px-3 text-sm">{formatDate(record.date)}</td>
                      {!isEmployee && (
                        <td className="py-2 px-3 text-sm">
                          {record.employee.firstName} {record.employee.lastName}
                        </td>
                      )}
                      <td className="py-2 px-3 text-sm">
                        {record.checkIn ? new Date(record.checkIn).toLocaleTimeString() : "—"}
                      </td>
                      <td className="py-2 px-3 text-sm">
                        {record.checkOut ? new Date(record.checkOut).toLocaleTimeString() : "—"}
                      </td>
                      <td className="py-2 px-3 text-sm font-medium">
                        {record.computedHours != null ? formatHours(record.computedHours) : "—"}
                      </td>
                      <td className="py-2 px-3">
                        <Badge className={getAttendanceStatusColor(record.status)}>
                          {record.status}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
