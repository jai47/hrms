import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { canViewAllLeaves, canApproveLeaves } from "@/lib/rbac"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Plus } from "lucide-react"
import { formatDate, getLeaveStatusColor } from "@/lib/utils"
import { LeaveActions } from "./client-components"

async function getLeaveRequests(
  searchParams: {
    page?: string
    search?: string
    status?: string
    type?: string
  },
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
    ]
  }

  if (searchParams.status && searchParams.status !== "all") {
    where.status = searchParams.status
  }

  if (searchParams.type && searchParams.type !== "all") {
    where.leaveType = searchParams.type
  }

  const [requests, total] = await Promise.all([
    prisma.leaveRequest.findMany({
      where,
      include: { employee: true },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.leaveRequest.count({ where }),
  ])

  return {
    requests,
    total,
    totalPages: Math.ceil(total / limit),
    currentPage: page,
  }
}

export default async function LeavesPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string
    search?: string
    status?: string
    type?: string
  }>
}) {
  const session = await auth()
  const resolvedSearchParams = await searchParams
  const role = session?.user?.role ?? "EMPLOYEE"
  const viewAll = canViewAllLeaves(role)
  const showApprove = canApproveLeaves(role)
  const employeeFilter = viewAll ? undefined : session?.user?.id

  const { requests, total, totalPages, currentPage } = await getLeaveRequests(
    resolvedSearchParams,
    employeeFilter
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Leave Requests</h1>
          <p className="text-gray-500">
            {viewAll ? "Manage employee leave requests" : "Your leave requests"}
          </p>
        </div>
        <Link href="/leaves/request" className="shrink-0">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Request
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle>{viewAll ? "All Leave Requests" : "My Leave Requests"}</CardTitle>
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
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
              <select
                name="type"
                defaultValue={resolvedSearchParams.type || "all"}
                className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
              >
                <option value="all">All Types</option>
                <option value="ANNUAL">Annual</option>
                <option value="SICK">Sick</option>
                <option value="CASUAL">Casual</option>
                <option value="MATERNITY">Maternity</option>
                <option value="PATERNITY">Paternity</option>
                <option value="EMERGENCY">Emergency</option>
                <option value="UNPAID">Unpaid</option>
                <option value="COMPENSATORY">Compensatory</option>
              </select>
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
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Employee</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Type</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Period</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Days</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Reason</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Submitted</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {requests.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-gray-500">
                      No leave requests found
                    </td>
                  </tr>
                ) : (
                  requests.map((request) => (
                    <tr key={request.id} className="hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="font-medium text-gray-900">
                          {request.employee.firstName} {request.employee.lastName}
                        </div>
                        <div className="text-sm text-gray-500">{request.employee.employeeId}</div>
                      </td>
                      <td className="py-3 px-4 text-sm capitalize">
                        {request.leaveType.toLowerCase().replace("_", " ")}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {formatDate(request.startDate)} - {formatDate(request.endDate)}
                      </td>
                      <td className="py-3 px-4 text-sm">{request.totalDays}</td>
                      <td className="py-3 px-4 text-sm text-gray-500 max-w-xs truncate">
                        {request.reason}
                      </td>
                      <td className="py-3 px-4">
                        <Badge className={getLeaveStatusColor(request.status)}>
                          {request.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-500">
                        {formatDate(request.createdAt)}
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        {request.status === "PENDING" && showApprove && (
                          <LeaveActions requestId={request.id} />
                        )}
                        <Link
                          href={`/leaves/${request.id}`}
                          className="text-primary hover:underline text-sm"
                        >
                          View
                        </Link>
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
                Showing {(currentPage - 1) * 10 + 1} to {Math.min(currentPage * 10, total)} of {total} requests
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
