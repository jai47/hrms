"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Loader2, DollarSign, FileText, Download } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { PushPayslipButton } from "./push-button"

type PaySlipRow = {
  id: string
  periodMonth: number
  periodYear: number
  baseSalary: number
  paidDays: number
  grossPay: number
  deductions: number
  netPay: number
  status: string
  employee: {
    employeeId: string
    firstName: string
    lastName: string
    department: { name: string } | null
  }
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

export function PayrollPanel({
  initialPaySlips,
  initialMonth,
  initialYear,
}: {
  initialPaySlips: PaySlipRow[]
  initialMonth: number
  initialYear: number
}) {
  const router = useRouter()
  const [month, setMonth] = useState(initialMonth)
  const [year, setYear] = useState(initialYear)
  const [paySlips, setPaySlips] = useState(initialPaySlips)
  const [isGenerating, setIsGenerating] = useState(false)
  const [message, setMessage] = useState("")

  const loadPaySlips = async (m: number, y: number) => {
    const response = await fetch(`/api/payroll?month=${m}&year=${y}`)
    const data = await response.json()
    setPaySlips(data.paySlips || [])
  }

  const handlePeriodChange = async (m: number, y: number) => {
    setMonth(m)
    setYear(y)
    await loadPaySlips(m, y)
  }

  const generatePayroll = async () => {
    setIsGenerating(true)
    setMessage("")
    try {
      const response = await fetch("/api/payroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, year }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Generation failed")
      setMessage(data.message)
      await loadPaySlips(month, year)
      router.refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Generation failed")
    } finally {
      setIsGenerating(false)
    }
  }

  const totalNet = paySlips.reduce((sum, p) => sum + p.netPay, 0)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Generate Monthly Payroll
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            Calculates payslips from attendance (present, half-day, late, absent) and approved leaves.
            Employees need a monthly salary set.
          </p>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label>Month</Label>
              <select
                className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                value={month}
                onChange={(e) => handlePeriodChange(parseInt(e.target.value, 10), year)}
              >
                {MONTHS.map((name, i) => (
                  <option key={name} value={i + 1}>{name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Year</Label>
              <Input
                type="number"
                className="w-28"
                value={year}
                onChange={(e) => handlePeriodChange(month, parseInt(e.target.value, 10))}
              />
            </div>
            <Button onClick={generatePayroll} disabled={isGenerating}>
              {isGenerating ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </span>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Generate Payslips
                </>
              )}
            </Button>
          </div>
          {message && (
            <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">
              {message}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>
            Payslips — {MONTHS[month - 1]} {year}
          </CardTitle>
          {paySlips.length > 0 && (
            <p className="text-sm font-medium text-gray-700">
              Total payout: {formatCurrency(totalNet)}
            </p>
          )}
        </CardHeader>
        <CardContent>
          {paySlips.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FileText className="h-10 w-10 mx-auto mb-3 text-gray-400" />
              <p>No payslips for this period. Click Generate to create them.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-sm text-gray-500">
                    <th className="py-3 px-2">Employee</th>
                    <th className="py-3 px-2">Department</th>
                      <th className="py-3 px-2">Paid Days</th>
                      <th className="py-3 px-2">Earned</th>
                      <th className="py-3 px-2">Deductions</th>
                    <th className="py-3 px-2">Net Pay</th>
                    <th className="py-3 px-2">Status</th>
                    <th className="py-3 px-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {paySlips.map((slip) => (
                    <tr key={slip.id} className="text-sm hover:bg-gray-50">
                      <td className="py-3 px-2">
                        <p className="font-medium text-gray-900">
                          {slip.employee.firstName} {slip.employee.lastName}
                        </p>
                        <p className="text-xs text-gray-500">{slip.employee.employeeId}</p>
                      </td>
                      <td className="py-3 px-2 text-gray-600">
                        {slip.employee.department?.name || "—"}
                      </td>
                      <td className="py-3 px-2">{slip.paidDays}</td>
                      <td className="py-3 px-2">{formatCurrency(slip.grossPay)}</td>
                      <td className="py-3 px-2 text-red-600">{formatCurrency(slip.deductions)}</td>
                      <td className="py-3 px-2 font-semibold text-gray-900">
                        {formatCurrency(slip.netPay)}
                      </td>
                      <td className="py-3 px-2">
                        <Badge
                          variant={
                            slip.status === "PAID"
                              ? "success"
                              : slip.status === "FINALIZED"
                                ? "info"
                                : "secondary"
                          }
                        >
                          {slip.status === "FINALIZED" ? "PUSHED" : slip.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-3">
                          <Link href={`/payroll/${slip.id}`} className="text-primary hover:underline text-sm">
                            View
                          </Link>
                          <PushPayslipButton paySlipId={slip.id} status={slip.status} />
                        </div>
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
