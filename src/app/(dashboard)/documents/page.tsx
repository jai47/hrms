import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { canManageEmployees } from "@/lib/rbac"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileText, DollarSign } from "lucide-react"
import { formatDate, formatCurrency } from "@/lib/utils"
import Link from "next/link"

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

async function getDocuments(
  searchParams: { search?: string; type?: string; tab?: string },
  employeeId?: string
) {
  const where: Record<string, unknown> = {}

  if (employeeId) {
    where.employeeId = employeeId
  }

  if (searchParams.search) {
    where.OR = [
      { title: { contains: searchParams.search } },
      { employee: { firstName: { contains: searchParams.search } } },
      { employee: { lastName: { contains: searchParams.search } } },
      { employee: { employeeId: { contains: searchParams.search } } },
    ]
  }

  if (searchParams.type && searchParams.type !== "all") {
    where.type = searchParams.type
  }

  return prisma.document.findMany({
    where,
    include: {
      employee: {
        select: { id: true, firstName: true, lastName: true, employeeId: true },
      },
    },
    orderBy: { uploadedAt: "desc" },
    take: 50,
  })
}

async function getPaySlips(employeeId: string) {
  return prisma.paySlip.findMany({
    where: {
      employeeId,
      status: { in: ["FINALIZED", "PAID"] },
    },
    orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }],
  })
}

const typeColors: Record<string, string> = {
  CONTRACT: "bg-blue-100 text-blue-800",
  ID_DOCUMENT: "bg-purple-100 text-purple-800",
  CERTIFICATE: "bg-green-100 text-green-800",
  MEDICAL: "bg-red-100 text-red-800",
  TAX_DOCUMENT: "bg-yellow-100 text-yellow-800",
  OTHER: "bg-gray-100 text-gray-800",
}

const statusColors: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-800",
  EXPIRED: "bg-red-100 text-red-800",
  PENDING_RENEWAL: "bg-yellow-100 text-yellow-800",
  ARCHIVED: "bg-gray-100 text-gray-800",
}

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; type?: string; tab?: string }>
}) {
  const session = await auth()
  const resolvedSearchParams = await searchParams
  const role = session?.user?.role ?? "EMPLOYEE"
  const viewAll = canManageEmployees(role) || role === "MANAGER"
  const showPayslips = role === "EMPLOYEE" || role === "MANAGER"
  const employeeFilter = viewAll ? undefined : session?.user?.id
  const tab = resolvedSearchParams.tab || "all"

  const [documents, paySlips] = await Promise.all([
    tab !== "payslips" ? getDocuments(resolvedSearchParams, employeeFilter) : Promise.resolve([]),
    showPayslips && tab !== "files" && session?.user?.id
      ? getPaySlips(session.user.id)
      : Promise.resolve([]),
  ])

  const showFiles = tab === "all" || tab === "files"
  const showPayslipSection = showPayslips && (tab === "all" || tab === "payslips")

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Documents</h1>
        <p className="text-gray-500">
          {showPayslips
            ? "Your files, contracts, and payslips"
            : "Employee contracts, certificates, and files"}
        </p>
      </div>

      {showPayslips && (
        <div className="flex gap-2 border-b border-gray-200">
          {[
            { value: "all", label: "All" },
            { value: "files", label: "Files" },
            { value: "payslips", label: "Payslips" },
          ].map((item) => (
            <Link
              key={item.value}
              href={`/documents?tab=${item.value}`}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === item.value
                  ? "border-primary text-primary"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}

      {showPayslipSection && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Payslips
            </CardTitle>
          </CardHeader>
          <CardContent>
            {paySlips.length === 0 ? (
              <div className="text-center py-10 text-gray-500">
                <DollarSign className="h-10 w-10 mx-auto mb-3 text-gray-400" />
                <p>No payslips available yet.</p>
                <p className="text-sm mt-1">You will be notified when a payslip is shared with you.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b text-left text-sm text-gray-500">
                      <th className="py-3 px-2">Period</th>
                      <th className="py-3 px-2">Paid Days</th>
                      <th className="py-3 px-2">Net Pay</th>
                      <th className="py-3 px-2">Status</th>
                      <th className="py-3 px-2">Shared</th>
                      <th className="py-3 px-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {paySlips.map((slip) => (
                      <tr key={slip.id} className="text-sm hover:bg-gray-50">
                        <td className="py-3 px-2 font-medium text-gray-900">
                          {MONTHS[slip.periodMonth - 1]} {slip.periodYear}
                        </td>
                        <td className="py-3 px-2">{slip.paidDays}</td>
                        <td className="py-3 px-2 font-semibold">{formatCurrency(slip.netPay)}</td>
                        <td className="py-3 px-2">
                          <Badge variant={slip.status === "PAID" ? "success" : "info"}>
                            {slip.status === "FINALIZED" ? "AVAILABLE" : slip.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-2 text-gray-500">{formatDate(slip.generatedAt)}</td>
                        <td className="py-3 px-2">
                          <Link
                            href={`/documents/payslips/${slip.id}`}
                            className="text-primary hover:underline"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {showFiles && (
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {viewAll ? "All Documents" : "My Documents"}
              </CardTitle>
              <form method="GET" className="flex flex-wrap items-center gap-3">
                {showPayslips && <input type="hidden" name="tab" value={tab} />}
                <input
                  type="search"
                  name="search"
                  placeholder="Search by title or employee..."
                  defaultValue={resolvedSearchParams.search || ""}
                  className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground w-72"
                />
                <select
                  name="type"
                  defaultValue={resolvedSearchParams.type || "all"}
                  className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                >
                  <option value="all">All Types</option>
                  <option value="CONTRACT">Contract</option>
                  <option value="ID_DOCUMENT">ID Document</option>
                  <option value="CERTIFICATE">Certificate</option>
                  <option value="MEDICAL">Medical</option>
                  <option value="TAX_DOCUMENT">Tax Document</option>
                  <option value="OTHER">Other</option>
                </select>
                <button
                  type="submit"
                  className="inline-flex h-9 items-center rounded-md bg-secondary px-3 text-sm font-medium text-secondary-foreground hover:bg-secondary/80"
                >
                  Filter
                </button>
              </form>
            </div>
          </CardHeader>
          <CardContent>
            {documents.length === 0 ? (
              <div className="text-center py-16">
                <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500">No documents found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-500">Title</th>
                      {viewAll && (
                        <th className="text-left py-3 px-4 font-medium text-gray-500">Employee</th>
                      )}
                      <th className="text-left py-3 px-4 font-medium text-gray-500">Type</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-500">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-500">Uploaded</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-500">Expiry</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-500">File</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {documents.map((doc) => (
                      <tr key={doc.id} className="hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium text-gray-900">{doc.title}</td>
                        {viewAll && (
                          <td className="py-3 px-4">
                            <Link
                              href={`/employees/${doc.employee.id}`}
                              className="text-sm text-primary hover:underline"
                            >
                              {doc.employee.firstName} {doc.employee.lastName}
                            </Link>
                            <p className="text-xs text-gray-500">{doc.employee.employeeId}</p>
                          </td>
                        )}
                        <td className="py-3 px-4">
                          <Badge className={typeColors[doc.type] || typeColors.OTHER}>
                            {doc.type.replace("_", " ")}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <Badge className={statusColors[doc.status] || statusColors.ACTIVE}>
                            {doc.status.replace("_", " ")}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-500">
                          {formatDate(doc.uploadedAt)}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-500">
                          {doc.expiryDate ? formatDate(doc.expiryDate) : "—"}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <a
                            href={doc.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline"
                          >
                            Open
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
