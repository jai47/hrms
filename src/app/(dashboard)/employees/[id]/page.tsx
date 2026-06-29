import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { formatDate, formatDateTime, getAttendanceStatusColor, getLeaveStatusColor } from "@/lib/utils"
import { Edit, Calendar, Clock, FileText, AlertCircle, CheckCircle, XCircle } from "lucide-react"

async function getEmployee(id: string) {
  return prisma.employee.findUnique({
    where: { id },
    include: {
      department: true,
      attendances: {
        orderBy: { date: "desc" },
        take: 10,
      },
      leaveRequests: {
        orderBy: { createdAt: "desc" },
        take: 5,
      },
      performances: {
        orderBy: { reviewDate: "desc" },
        take: 5,
        include: { reviewer: true },
      },
      documents: {
        orderBy: { uploadedAt: "desc" },
        take: 5,
      },
    },
  })
}

const statusColors: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-800",
  INACTIVE: "bg-gray-100 text-gray-800",
  ON_LEAVE: "bg-blue-100 text-blue-800",
  TERMINATED: "bg-red-100 text-red-800",
  PROBATION: "bg-yellow-100 text-yellow-800",
}

export default async function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const employee = await getEmployee(id)

  if (!employee) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {employee.firstName} {employee.lastName}
          </h1>
          <p className="text-gray-500">{employee.employeeId} • {employee.email}</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/employees/${employee.id}`}>
            <Button variant="outline">
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile Card */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 rounded-full bg-primary flex items-center justify-center text-2xl font-bold text-primary-foreground">
                {employee.firstName[0]}{employee.lastName[0]}
              </div>
              <div>
                <h3 className="text-lg font-semibold">
                  {employee.firstName} {employee.lastName}
                </h3>
                <p className="text-sm text-gray-500">{employee.employeeId}</p>
              </div>
            </div>

            <div className="space-y-3 border-t pt-4">
              <div>
                <p className="text-xs text-gray-500">Email</p>
                <p>{employee.email}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Phone</p>
                <p>{employee.phone || "Not provided"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Department</p>
                <p>{employee.department?.name || "Not assigned"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Position</p>
                <p>{employee.position}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Hire Date</p>
                <p>{formatDate(employee.hireDate)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Status</p>
                <Badge className={statusColors[employee.employmentStatus]}>
                  {employee.employmentStatus}
                </Badge>
              </div>
              {employee.biometricId && (
                <div>
                  <p className="text-xs text-gray-500">Biometric ID</p>
                  <p className="font-mono text-sm">{employee.biometricId}</p>
                </div>
              )}
              {employee.emergencyContact && (
                <div>
                  <p className="text-xs text-gray-500">Emergency Contact</p>
                  <p>{employee.emergencyContact} - {employee.emergencyPhone}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Attendance & Leaves */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Recent Attendance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-4 text-sm font-medium text-gray-500">Date</th>
                    <th className="text-left py-2 px-4 text-sm font-medium text-gray-500">Check In</th>
                    <th className="text-left py-2 px-4 text-sm font-medium text-gray-500">Check Out</th>
                    <th className="text-left py-2 px-4 text-sm font-medium text-gray-500">Status</th>
                    <th className="text-left py-2 px-4 text-sm font-medium text-gray-500">Source</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {employee.attendances.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-gray-500">
                        No attendance records
                      </td>
                    </tr>
                  ) : (
                    employee.attendances.map((attendance) => (
                      <tr key={attendance.id} className="hover:bg-gray-50">
                        <td className="py-2 px-4 text-sm">{formatDate(attendance.date)}</td>
                        <td className="py-2 px-4 text-sm">
                          {attendance.checkIn ? formatDateTime(attendance.checkIn) : "—"}
                        </td>
                        <td className="py-2 px-4 text-sm">
                          {attendance.checkOut ? formatDateTime(attendance.checkOut) : "—"}
                        </td>
                        <td className="py-2 px-4">
                          <Badge className={getAttendanceStatusColor(attendance.status)}>
                            {attendance.status}
                          </Badge>
                        </td>
                        <td className="py-2 px-4 text-sm text-gray-500">{attendance.source}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Leave Requests */}
        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Leave Requests
            </CardTitle>
            <Link href={`/leaves/request?employee=${employee.id}`}>
              <Button size="sm">
                Request Leave
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-4 text-sm font-medium text-gray-500">Type</th>
                    <th className="text-left py-2 px-4 text-sm font-medium text-gray-500">Period</th>
                    <th className="text-left py-2 px-4 text-sm font-medium text-gray-500">Days</th>
                    <th className="text-left py-2 px-4 text-sm font-medium text-gray-500">Reason</th>
                    <th className="text-left py-2 px-4 text-sm font-medium text-gray-500">Status</th>
                    <th className="text-left py-2 px-4 text-sm font-medium text-gray-500">Submitted</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {employee.leaveRequests.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-gray-500">
                        No leave requests
                      </td>
                    </tr>
                  ) : (
                    employee.leaveRequests.map((leave) => (
                      <tr key={leave.id} className="hover:bg-gray-50">
                        <td className="py-2 px-4 text-sm capitalize">{leave.leaveType.toLowerCase()}</td>
                        <td className="py-2 px-4 text-sm">
                          {formatDate(leave.startDate)} - {formatDate(leave.endDate)}
                        </td>
                        <td className="py-2 px-4 text-sm">{leave.totalDays}</td>
                        <td className="py-2 px-4 text-sm text-gray-500 max-w-xs truncate">
                          {leave.reason}
                        </td>
                        <td className="py-2 px-4">
                          <Badge className={getLeaveStatusColor(leave.status)}>
                            {leave.status}
                          </Badge>
                        </td>
                        <td className="py-2 px-4 text-sm text-gray-500">
                          {formatDate(leave.createdAt)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Performance Reviews */}
        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Performance Reviews
            </CardTitle>
            <Link href={`/performance/new?employee=${employee.id}`}>
              <Button size="sm">
                Create Review
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-4 text-sm font-medium text-gray-500">Period</th>
                    <th className="text-left py-2 px-4 text-sm font-medium text-gray-500">Review Date</th>
                    <th className="text-left py-2 px-4 text-sm font-medium text-gray-500">Reviewer</th>
                    <th className="text-left py-2 px-4 text-sm font-medium text-gray-500">Rating</th>
                    <th className="text-left py-2 px-4 text-sm font-medium text-gray-500">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {employee.performances.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-gray-500">
                        No performance reviews
                      </td>
                    </tr>
                  ) : (
                    employee.performances.map((perf) => (
                      <tr key={perf.id} className="hover:bg-gray-50">
                        <td className="py-2 px-4 text-sm font-medium">{perf.reviewPeriod}</td>
                        <td className="py-2 px-4 text-sm">{formatDate(perf.reviewDate)}</td>
                        <td className="py-2 px-4 text-sm">
                          {perf.reviewer?.firstName} {perf.reviewer?.lastName}
                        </td>
                        <td className="py-2 px-4">
                          <Badge
                            className={
                              perf.overallRating === "EXCEEDS_EXPECTATIONS"
                                ? "bg-green-100 text-green-800"
                                : perf.overallRating === "MEETS_EXPECTATIONS"
                                ? "bg-blue-100 text-blue-800"
                                : perf.overallRating === "BELOW_EXPECTATIONS"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-red-100 text-red-800"
                            }
                          >
                            {perf.overallRating.replace("_", " ")}
                          </Badge>
                        </td>
                        <td className="py-2 px-4">
                          <Badge
                            className={
                              perf.status === "APPROVED"
                                ? "bg-green-100 text-green-800"
                                : perf.status === "SUBMITTED"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-gray-100 text-gray-800"
                            }
                          >
                            {perf.status}
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

        {/* Documents */}
        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Documents
            </CardTitle>
            <Button size="sm" variant="outline">
              Upload Document
            </Button>
          </CardHeader>
          <CardContent>
            {employee.documents.length === 0 ? (
              <p className="text-center py-8 text-gray-500">No documents uploaded</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {employee.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{doc.title}</p>
                        <p className="text-sm text-gray-500 capitalize">{doc.type.toLowerCase()}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          Uploaded: {formatDate(doc.uploadedAt)}
                        </p>
                        {doc.expiryDate && (
                          <p className="text-xs text-orange-600 mt-1">
                            Expires: {formatDate(doc.expiryDate)}
                          </p>
                        )}
                      </div>
                      <Badge
                        className={
                          doc.status === "ACTIVE"
                            ? "bg-green-100 text-green-800"
                            : doc.status === "EXPIRED"
                            ? "bg-red-100 text-red-800"
                            : "bg-yellow-100 text-yellow-800"
                        }
                      >
                        {doc.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}