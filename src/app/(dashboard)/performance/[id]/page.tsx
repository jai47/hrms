import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDate, getPerformanceRatingColor } from "@/lib/utils"

export default async function PerformanceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const review = await prisma.performance.findUnique({
    where: { id },
    include: {
      employee: true,
      reviewer: true,
      kpis: true,
    },
  })

  if (!review) notFound()

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Link href="/performance" className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Performance Review</h1>
          <p className="text-gray-500">
            {review.employee.firstName} {review.employee.lastName} · {review.reviewPeriod}
          </p>
        </div>
      </div>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>{review.reviewPeriod}</CardTitle>
            <Badge className={getPerformanceRatingColor(review.overallRating)}>
              {review.overallRating.replace(/_/g, " ")}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p><span className="font-medium">Review date:</span> {formatDate(review.reviewDate)}</p>
          <p><span className="font-medium">Reviewer:</span> {review.reviewer.firstName} {review.reviewer.lastName}</p>
          <p><span className="font-medium">Status:</span> {review.status}</p>
          {review.comments && <p><span className="font-medium">Comments:</span> {review.comments}</p>}
          {review.kpis.length > 0 && (
            <div className="pt-2">
              <p className="font-medium mb-2">KPIs</p>
              <ul className="space-y-1">
                {review.kpis.map((kpi) => (
                  <li key={kpi.id} className="text-gray-600">
                    {kpi.name}: {kpi.actual}/{kpi.target}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
