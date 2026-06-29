import { prisma } from "@/lib/prisma"
import { requireRoles } from "@/lib/auth-guard"
import { PayrollPanel } from "./client-components"

async function getPaySlips(month: number, year: number) {
  return prisma.paySlip.findMany({
    where: { periodMonth: month, periodYear: year },
    include: {
      employee: {
        select: {
          employeeId: true,
          firstName: true,
          lastName: true,
          department: { select: { name: true } },
        },
      },
    },
    orderBy: { employee: { lastName: "asc" } },
  })
}

export default async function PayrollPage() {
  await requireRoles(["ADMIN", "HR_MANAGER"])
  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()
  const paySlips = await getPaySlips(month, year)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Payroll</h1>
        <p className="text-gray-500">
          Generate and review monthly payslips based on attendance and leave records
        </p>
      </div>
      <PayrollPanel
        initialPaySlips={paySlips}
        initialMonth={month}
        initialYear={year}
      />
    </div>
  )
}
