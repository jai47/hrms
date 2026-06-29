import { prisma } from "@/lib/prisma"
import { requireRoles } from "@/lib/auth-guard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Plus } from "lucide-react"
import { formatDate, getPerformanceRatingColor } from "@/lib/utils"

async function getPerformanceReviews(searchParams: {
  page?: string
  search?: string
  status?: string
  period?: string
}) {
  const page = parseInt(searchParams.page || "1", 10) || 1
  const limit = 10
  const skip = (page - 1) * limit

  const where: Record<string, unknown> = {}

  if (searchParams.search) {
    where.OR = [
      { employee: { firstName: { contains: searchParams.search } } },
      { employee: { lastName: { contains: searchParams.search } } },
      { employee: { employeeId: { contains: searchParams.search } } },
      { reviewPeriod: { contains: searchParams.search } },
    ]
  }

  if (searchParams.status && searchParams.status !== "all") {
    where.status = searchParams.status
  }

  if (searchParams.period) {
    where.reviewPeriod = searchParams.period
  }

  const [reviews, total] = await Promise.all([
    prisma.performance.findMany({
      where,
      include: { employee: true, reviewer: true },
      skip,
      take: limit,
      orderBy: { reviewDate: "desc" },
    }),
    prisma.performance.count({ where }),
  ])

  return {
    reviews,
    total,
    totalPages: Math.ceil(total / limit),
    currentPage: page,
  }
}

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-800",
  SUBMITTED: "bg-blue-100 text-blue-800",
  REVIEWED: "bg-purple-100 text-purple-800",
  APPROVED: "bg-green-100 text-green-800",
  FINALIZED: "bg-indigo-100 text-indigo-800",
}

export default async function PerformancePage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string
    search?: string
    status?: string
    period?: string
  }>
}) {
  await requireRoles(["ADMIN", "HR_MANAGER", "MANAGER"])
  const resolvedSearchParams = await searchParams
  const { reviews, total, totalPages, currentPage } = await getPerformanceReviews(resolvedSearchParams)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Performance Reviews</h1>
          <p className="text-gray-500">Manage employee performance evaluations</p>
        </div>
        <Link href="/performance/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Review
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle>All Reviews</CardTitle>
            <form method="GET" className="flex flex-wrap items-center gap-3">
              <input
                type="search"
                name="search"
                placeholder="Search reviews..."
                defaultValue={resolvedSearchParams.search || ""}
                className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground w-64"
              />
              <select
                name="status"
                defaultValue={resolvedSearchParams.status || "all"}
                className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
              >
                <option value="all">All Status</option>
                <option value="DRAFT">Draft</option>
                <option value="SUBMITTED">Submitted</option>
                <option value="REVIEWED">Reviewed</option>
                <option value="APPROVED">Approved</option>
                <option value="FINALIZED">Finalized</option>
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
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Period</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Employee</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Reviewer</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Review Date</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Rating</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Status</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {reviews.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-gray-500">
                      No performance reviews found
                    </td>
                  </tr>
                ) : (
                  reviews.map((review) => (
                    <tr key={review.id} className="hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm font-medium">{review.reviewPeriod}</td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-gray-900">
                          {review.employee.firstName} {review.employee.lastName}
                        </div>
                        <div className="text-sm text-gray-500">{review.employee.employeeId}</div>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-500">
                        {review.reviewer?.firstName} {review.reviewer?.lastName}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-500">
                        {formatDate(review.reviewDate)}
                      </td>
                      <td className="py-3 px-4">
                        <Badge className={getPerformanceRatingColor(review.overallRating)}>
                          {review.overallRating.replace("_", " ")}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge className={statusColors[review.status]}>{review.status}</Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          href={`/performance/${review.id}`}
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
                Showing {(currentPage - 1) * 10 + 1} to {Math.min(currentPage * 10, total)} of {total} reviews
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
