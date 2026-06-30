import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDate, getLeaveStatusColor } from "@/lib/utils"
import { CancelLeaveButton } from "../client-components"
import { LeaveBalanceCard } from "@/components/leaves/leave-balance-card"
import { getLeaveBalances } from "@/lib/leave-balance"
import { canViewAllLeaves } from "@/lib/rbac"

export default async function LeaveDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  const { id } = await params
  const request = await prisma.leaveRequest.findUnique({
    where: { id },
    include: { employee: true },
  })

  if (!request) notFound()

  const role = session?.user?.role ?? "EMPLOYEE"
  const canView =
    canViewAllLeaves(role) || request.employeeId === session?.user?.id
  if (!canView) notFound()

  const balance = await getLeaveBalances(request.employeeId)

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Link href="/leaves" className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Leave Request</h1>
          <p className="text-gray-500">
            {request.employee.firstName} {request.employee.lastName}
          </p>
        </div>
      </div>

      <LeaveBalanceCard balance={balance} />

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>{request.leaveType.replace("_", " ")}</CardTitle>
            <Badge className={getLeaveStatusColor(request.status)}>{request.status}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p><span className="font-medium">Dates:</span> {formatDate(request.startDate)} – {formatDate(request.endDate)}</p>
          <p><span className="font-medium">Days:</span> {request.totalDays}</p>
          <p><span className="font-medium">Reason:</span> {request.reason}</p>
          {request.rejectedReason && (
            <p className="text-red-600"><span className="font-medium">Rejection reason:</span> {request.rejectedReason}</p>
          )}
          <div className="pt-2">
            <CancelLeaveButton requestId={request.id} status={request.status} />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
