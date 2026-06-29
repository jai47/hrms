import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/auth-guard"
import { notFound } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/utils"
import type { PaySlipBreakdown } from "@/lib/payroll"
import { PrintButton } from "@/app/(dashboard)/payroll/print-button"

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

async function getPaySlip(id: string, employeeId: string) {
  return prisma.paySlip.findFirst({
    where: {
      id,
      employeeId,
      status: { in: ["FINALIZED", "PAID"] },
    },
    include: {
      employee: {
        select: {
          employeeId: true,
          firstName: true,
          lastName: true,
          email: true,
          position: true,
          bankAccount: true,
          department: { select: { name: true } },
        },
      },
    },
  })
}

export default async function DocumentPaySlipPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await requireAuth()
  const { id } = await params
  const paySlip = await getPaySlip(id, session.user.id)

  if (!paySlip) notFound()

  const breakdown = JSON.parse(paySlip.breakdown) as PaySlipBreakdown

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <Link href="/documents?tab=payslips" className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Payslip</h1>
            <p className="text-gray-500">
              {MONTHS[paySlip.periodMonth - 1]} {paySlip.periodYear}
            </p>
          </div>
        </div>
        <PrintButton />
      </div>

      <Card className="print:shadow-none print:border-0">
        <CardHeader className="border-b">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-xl">HRMS Payslip</CardTitle>
              <p className="text-sm text-gray-500 mt-1">
                Pay period: {MONTHS[paySlip.periodMonth - 1]} {paySlip.periodYear}
              </p>
            </div>
            <Badge variant={paySlip.status === "PAID" ? "success" : "info"}>
              {paySlip.status === "FINALIZED" ? "AVAILABLE" : paySlip.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Employee</p>
              <p className="font-medium text-gray-900">
                {paySlip.employee.firstName} {paySlip.employee.lastName}
              </p>
              <p className="text-gray-600">{paySlip.employee.employeeId}</p>
              <p className="text-gray-600">{paySlip.employee.position}</p>
            </div>
            <div>
              <p className="text-gray-500">Department</p>
              <p className="font-medium text-gray-900">
                {paySlip.employee.department?.name || "—"}
              </p>
              {paySlip.employee.bankAccount && (
                <>
                  <p className="text-gray-500 mt-2">Bank Account</p>
                  <p className="font-mono text-gray-900">{paySlip.employee.bankAccount}</p>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Working Days</p>
              <p className="text-lg font-semibold">{paySlip.workingDays}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Present</p>
              <p className="text-lg font-semibold">{paySlip.presentDays}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Absent</p>
              <p className="text-lg font-semibold text-red-600">{paySlip.absentDays}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Late Days</p>
              <p className="text-lg font-semibold">{paySlip.lateDays}</p>
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b">
                  <td className="py-3 px-4 text-gray-600">Base Salary (monthly)</td>
                  <td className="py-3 px-4 text-right font-medium">{formatCurrency(paySlip.baseSalary)}</td>
                </tr>
                <tr className="border-b">
                  <td className="py-3 px-4 text-gray-600">Earned Pay ({paySlip.paidDays} paid days)</td>
                  <td className="py-3 px-4 text-right font-medium">{formatCurrency(paySlip.grossPay)}</td>
                </tr>
                <tr className="border-b">
                  <td className="py-3 px-4 text-gray-600">Deductions</td>
                  <td className="py-3 px-4 text-right font-medium text-red-600">
                    -{formatCurrency(paySlip.deductions)}
                  </td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="py-3 px-4 font-semibold text-gray-900">Net Pay</td>
                  <td className="py-3 px-4 text-right font-bold text-lg text-gray-900">
                    {formatCurrency(paySlip.netPay)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {breakdown.notes.length > 0 && (
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Notes</h3>
              <ul className="text-sm text-gray-600 list-disc pl-5 space-y-1">
                {breakdown.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-xs text-gray-400 text-center pt-4">
            Generated on {formatDate(paySlip.generatedAt)}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
