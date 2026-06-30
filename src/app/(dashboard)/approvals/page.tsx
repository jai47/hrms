import { prisma } from "@/lib/prisma"
import { requireRoles } from "@/lib/auth-guard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, ClipboardList } from "lucide-react"
import { formatDate } from "@/lib/utils"
import { LeaveApprovalRow, ApprovalActions } from "./client-components"

export default async function ApprovalsPage() {
  await requireRoles(["ADMIN", "HR_MANAGER", "MANAGER"])

  const [pendingLeaves, pendingReviews] = await Promise.all([
    prisma.leaveRequest.findMany({
      where: { status: "PENDING" },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeId: true,
            department: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: "asc" },
      take: 50,
    }),
    prisma.performance.findMany({
      where: { status: { in: ["SUBMITTED", "REVIEWED"] } },
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true, employeeId: true },
        },
        reviewer: {
          select: { firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: "asc" },
      take: 20,
    }),
  ])

  const total = pendingLeaves.length + pendingReviews.length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Approvals</h1>
        <p className="text-gray-500">
          {total} item{total !== 1 ? "s" : ""} awaiting your action
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Pending Leaves
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingLeaves.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              Performance Reviews
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingReviews.length}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending Leave Requests</CardTitle>
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
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Submitted</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pendingLeaves.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-gray-500">
                      No pending leave requests
                    </td>
                  </tr>
                ) : (
                  pendingLeaves.map((leave) => (
                    <LeaveApprovalRow key={leave.id} leave={leave} />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Performance Reviews</CardTitle>
        </CardHeader>
        <CardContent>
          {pendingReviews.length === 0 ? (
            <p className="text-center py-8 text-gray-500">No pending performance reviews</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Employee</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Period</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Reviewer</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pendingReviews.map((review) => (
                    <tr key={review.id} className="hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="font-medium">
                          {review.employee.firstName} {review.employee.lastName}
                        </div>
                        <div className="text-sm text-gray-500">{review.employee.employeeId}</div>
                      </td>
                      <td className="py-3 px-4 text-sm">{review.reviewPeriod}</td>
                      <td className="py-3 px-4">
                        <Badge variant="warning">{review.status}</Badge>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-500">
                        {review.reviewer
                          ? `${review.reviewer.firstName} ${review.reviewer.lastName}`
                          : "—"}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <ApprovalActions type="review" itemId={review.id} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
