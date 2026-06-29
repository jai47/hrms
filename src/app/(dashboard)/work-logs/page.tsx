import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { canViewAllWorkLogs } from "@/lib/rbac"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Plus } from "lucide-react"
import { formatDate } from "@/lib/utils"

async function getWorkLogs(
  searchParams: { page?: string; search?: string; date?: string },
  employeeId?: string
) {
  const page = parseInt(searchParams.page || "1", 10) || 1
  const limit = 10
  const skip = (page - 1) * limit

  const where: Record<string, unknown> = {}

  if (employeeId) {
    where.employeeId = employeeId
  }

  if (searchParams.search) {
    where.OR = [
      { employee: { firstName: { contains: searchParams.search } } },
      { employee: { lastName: { contains: searchParams.search } } },
      { employee: { employeeId: { contains: searchParams.search } } },
      { summary: { contains: searchParams.search } },
    ]
  }

  if (searchParams.date) {
    where.date = new Date(searchParams.date)
  }

  const [logs, total] = await Promise.all([
    prisma.dailyWorkLog.findMany({
      where,
      include: { employee: true },
      skip,
      take: limit,
      orderBy: { date: "desc" },
    }),
    prisma.dailyWorkLog.count({ where }),
  ])

  return {
    logs,
    total,
    totalPages: Math.ceil(total / limit),
    currentPage: page,
  }
}

export default async function WorkLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string; date?: string }>
}) {
  const session = await auth()
  const resolvedSearchParams = await searchParams
  const role = session?.user?.role ?? "EMPLOYEE"
  const viewAll = canViewAllWorkLogs(role)
  const employeeFilter = viewAll ? undefined : session?.user?.id

  const { logs, total, totalPages, currentPage } = await getWorkLogs(
    resolvedSearchParams,
    employeeFilter
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Daily Work Logs</h1>
          <p className="text-gray-500">
            {viewAll ? "View employee daily work summaries" : "Your daily work summaries"}
          </p>
        </div>
        <Link href="/work-logs/submit">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Submit Today&apos;s Log
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle>{viewAll ? "All Work Logs" : "My Work Logs"}</CardTitle>
            <form method="GET" className="flex flex-wrap items-center gap-3">
              <input
                type="search"
                name="search"
                placeholder="Search..."
                defaultValue={resolvedSearchParams.search || ""}
                className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground w-64"
              />
              <input
                type="date"
                name="date"
                defaultValue={resolvedSearchParams.date || ""}
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
                  {viewAll && (
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Employee</th>
                  )}
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Date</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Summary</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Hours</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.length === 0 ? (
                  <tr>
                    <td
                      colSpan={viewAll ? 5 : 4}
                      className="text-center py-8 text-gray-500"
                    >
                      No work logs found
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      {viewAll && (
                        <td className="py-3 px-4">
                          <div className="font-medium text-gray-900">
                            {log.employee.firstName} {log.employee.lastName}
                          </div>
                          <div className="text-sm text-gray-500">{log.employee.employeeId}</div>
                        </td>
                      )}
                      <td className="py-3 px-4 text-sm">{formatDate(log.date)}</td>
                      <td className="py-3 px-4 text-sm text-gray-700 max-w-md truncate">
                        {log.summary}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {log.hoursWorked != null ? log.hoursWorked : "—"}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-500">
                        {formatDate(log.submittedAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-gray-500">
                Showing {(currentPage - 1) * 10 + 1} to {Math.min(currentPage * 10, total)} of{" "}
                {total} logs
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
