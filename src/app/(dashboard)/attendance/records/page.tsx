import { prisma } from "@/lib/prisma"
import { requireRoles } from "@/lib/auth-guard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Plus } from "lucide-react"
import { formatDate, formatDateTime, getAttendanceStatusColor, formatHours } from "@/lib/utils"
import { getAttendanceHours } from "@/lib/attendance"

async function getAttendanceRecords(searchParams: {
  page?: string
  search?: string
  status?: string
  dateFrom?: string
  dateTo?: string
}) {
  const page = parseInt(searchParams.page || "1", 10) || 1
  const limit = 15
  const skip = (page - 1) * limit

  const where: Record<string, unknown> = {}

  if (searchParams.search) {
    where.OR = [
      { employee: { firstName: { contains: searchParams.search } } },
      { employee: { lastName: { contains: searchParams.search } } },
      { employee: { employeeId: { contains: searchParams.search } } },
    ]
  }

  if (searchParams.status && searchParams.status !== "all") {
    where.status = searchParams.status
  }

  if (searchParams.dateFrom || searchParams.dateTo) {
    where.date = {}
    if (searchParams.dateFrom) {
      (where.date as Record<string, Date>).gte = new Date(searchParams.dateFrom)
    }
    if (searchParams.dateTo) {
      (where.date as Record<string, Date>).lte = new Date(searchParams.dateTo)
    }
  }

  const [records, total] = await Promise.all([
    prisma.attendance.findMany({
      where,
      include: { employee: true },
      skip,
      take: limit,
      orderBy: { date: "desc" },
    }),
    prisma.attendance.count({ where }),
  ])

  return {
    records,
    total,
    totalPages: Math.ceil(total / limit),
    currentPage: page,
  }
}

export default async function AttendanceRecordsPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string
    search?: string
    status?: string
    dateFrom?: string
    dateTo?: string
  }>
}) {
  await requireRoles(["ADMIN", "HR_MANAGER", "MANAGER"])
  const resolvedSearchParams = await searchParams
  const { records, total, totalPages, currentPage } = await getAttendanceRecords(resolvedSearchParams)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Attendance Records</h1>
          <p className="text-gray-500">View and manage attendance records</p>
        </div>
        <Link href="/attendance/checkin">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Check In/Out
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle>All Records</CardTitle>
            <form method="GET" className="flex flex-wrap items-center gap-3">
              <input
                type="search"
                name="search"
                placeholder="Search employee..."
                defaultValue={resolvedSearchParams.search || ""}
                className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground w-64"
              />
              <select
                name="status"
                defaultValue={resolvedSearchParams.status || "all"}
                className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
              >
                <option value="all">All Status</option>
                <option value="PRESENT">Present</option>
                <option value="ABSENT">Absent</option>
                <option value="LATE">Late</option>
                <option value="EARLY_LEAVE">Early Leave</option>
                <option value="HALF_DAY">Half Day</option>
                <option value="ON_LEAVE">On Leave</option>
                <option value="HOLIDAY">Holiday</option>
                <option value="REMOTE">Remote</option>
              </select>
              <input
                type="date"
                name="dateFrom"
                defaultValue={resolvedSearchParams.dateFrom || ""}
                className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
              />
              <input
                type="date"
                name="dateTo"
                defaultValue={resolvedSearchParams.dateTo || ""}
                className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
              />
              <Button type="submit" variant="secondary" size="sm">
                Filter
              </Button>
            </form>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Date</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Employee</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Check In</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Check Out</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Hours</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {records.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-gray-500">
                      No attendance records found
                    </td>
                  </tr>
                ) : (
                  records.map((record) => {
                    const hours = getAttendanceHours(record)
                    return (
                      <tr key={record.id} className="hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm">{formatDate(record.date)}</td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-gray-900">
                            {record.employee.firstName} {record.employee.lastName}
                          </div>
                          <div className="text-sm text-gray-500">{record.employee.employeeId}</div>
                        </td>
                        <td className="py-3 px-4 text-sm">
                          {record.checkIn ? formatDateTime(record.checkIn) : "—"}
                        </td>
                        <td className="py-3 px-4 text-sm">
                          {record.checkOut ? formatDateTime(record.checkOut) : "—"}
                        </td>
                        <td className="py-3 px-4 text-sm">
                          {hours != null && hours > 0 ? formatHours(hours) : "—"}
                        </td>
                        <td className="py-3 px-4">
                          <Badge className={getAttendanceStatusColor(record.status)}>
                            {record.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-500">{record.source}</td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-gray-500">
                Showing {(currentPage - 1) * 15 + 1} to {Math.min(currentPage * 15, total)} of {total} records
              </p>
              <div className="flex gap-2">
                {currentPage > 1 && (
                  <Link
                    href={`?${new URLSearchParams({ ...resolvedSearchParams, page: String(currentPage - 1) })}`}
                    className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                  >
                    Previous
                  </Link>
                )}
                {currentPage < totalPages && (
                  <Link
                    href={`?${new URLSearchParams({ ...resolvedSearchParams, page: String(currentPage + 1) })}`}
                    className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                  >
                    Next
                  </Link>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
