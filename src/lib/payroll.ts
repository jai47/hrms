import { prisma } from "@/lib/prisma"
import { AttendanceStatus, LeaveType } from "@prisma/client"

const PAID_LEAVE_TYPES: LeaveType[] = [
  "ANNUAL",
  "SICK",
  "CASUAL",
  "MATERNITY",
  "PATERNITY",
  "EMERGENCY",
  "COMPENSATORY",
]

export type PaySlipBreakdown = {
  attendance: Array<{
    date: string
    status: AttendanceStatus
    credit: number
  }>
  leaves: Array<{
    type: LeaveType
    startDate: string
    endDate: string
    days: number
    paid: boolean
  }>
  notes: string[]
}

export type PaySlipCalculation = {
  baseSalary: number
  workingDays: number
  paidDays: number
  presentDays: number
  halfDays: number
  absentDays: number
  paidLeaveDays: number
  unpaidLeaveDays: number
  lateDays: number
  grossPay: number
  deductions: number
  netPay: number
  breakdown: PaySlipBreakdown
}

function getMonthRange(year: number, month: number) {
  const start = new Date(year, month - 1, 1)
  const end = new Date(year, month, 0, 23, 59, 59, 999)
  return { start, end }
}

function countWeekdaysInMonth(year: number, month: number): number {
  const { start, end } = getMonthRange(year, month)
  let count = 0
  const cursor = new Date(start)
  while (cursor <= end) {
    const day = cursor.getDay()
    if (day !== 0 && day !== 6) count++
    cursor.setDate(cursor.getDate() + 1)
  }
  return count
}

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function attendanceCredit(status: AttendanceStatus): number {
  switch (status) {
    case "PRESENT":
    case "REMOTE":
    case "HOLIDAY":
      return 1
    case "LATE":
      return 1
    case "HALF_DAY":
    case "EARLY_LEAVE":
      return 0.5
    case "ON_LEAVE":
      return 0
    case "ABSENT":
    default:
      return 0
  }
}

function eachDayInRange(start: Date, end: Date): Date[] {
  const days: Date[] = []
  const cursor = new Date(start)
  cursor.setHours(0, 0, 0, 0)
  const endDate = new Date(end)
  endDate.setHours(0, 0, 0, 0)
  while (cursor <= endDate) {
    days.push(new Date(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  return days
}

export async function calculatePaySlip(
  employeeId: string,
  year: number,
  month: number
): Promise<PaySlipCalculation | null> {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { salary: true, employmentStatus: true },
  })

  if (!employee?.salary || employee.employmentStatus !== "ACTIVE") {
    return null
  }

  const { start, end } = getMonthRange(year, month)
  const workingDays = countWeekdaysInMonth(year, month)
  const dailyRate = employee.salary / workingDays

  const [attendances, leaves] = await Promise.all([
    prisma.attendance.findMany({
      where: {
        employeeId,
        date: { gte: start, lte: end },
      },
      orderBy: { date: "asc" },
    }),
    prisma.leaveRequest.findMany({
      where: {
        employeeId,
        status: "APPROVED",
        startDate: { lte: end },
        endDate: { gte: start },
      },
    }),
  ])

  const attendanceByDate = new Map(
    attendances.map((a) => [dateKey(a.date), a])
  )

  const leaveDaysMap = new Map<string, { type: LeaveType; paid: boolean }>()
  const leaveBreakdown: PaySlipBreakdown["leaves"] = []

  for (const leave of leaves) {
    const paid = PAID_LEAVE_TYPES.includes(leave.leaveType)
    leaveBreakdown.push({
      type: leave.leaveType,
      startDate: leave.startDate.toISOString(),
      endDate: leave.endDate.toISOString(),
      days: leave.totalDays,
      paid,
    })
    for (const day of eachDayInRange(leave.startDate, leave.endDate)) {
      if (day < start || day > end) continue
      const dow = day.getDay()
      if (dow === 0 || dow === 6) continue
      leaveDaysMap.set(dateKey(day), { type: leave.leaveType, paid })
    }
  }

  let presentDays = 0
  let halfDays = 0
  let absentDays = 0
  let paidLeaveDays = 0
  let unpaidLeaveDays = 0
  let lateDays = 0
  const attendanceBreakdown: PaySlipBreakdown["attendance"] = []
  const notes: string[] = []

  const cursor = new Date(start)
  while (cursor <= end) {
    const dow = cursor.getDay()
    if (dow === 0 || dow === 6) {
      cursor.setDate(cursor.getDate() + 1)
      continue
    }

    const key = dateKey(cursor)
    const attendance = attendanceByDate.get(key)
    const leaveInfo = leaveDaysMap.get(key)

    if (leaveInfo) {
      if (leaveInfo.paid) {
        paidLeaveDays += 1
        attendanceBreakdown.push({
          date: key,
          status: "ON_LEAVE",
          credit: 1,
        })
      } else {
        unpaidLeaveDays += 1
        attendanceBreakdown.push({
          date: key,
          status: "ON_LEAVE",
          credit: 0,
        })
      }
    } else if (attendance) {
      const credit = attendanceCredit(attendance.status)
      attendanceBreakdown.push({
        date: key,
        status: attendance.status,
        credit,
      })

      if (attendance.status === "LATE") lateDays++
      if (credit === 1) presentDays++
      else if (credit === 0.5) halfDays++
      else absentDays++
    } else {
      absentDays++
      attendanceBreakdown.push({
        date: key,
        status: "ABSENT",
        credit: 0,
      })
    }

    cursor.setDate(cursor.getDate() + 1)
  }

  const paidDays = presentDays + halfDays + paidLeaveDays
  const grossPay = Math.round(dailyRate * paidDays * 100) / 100
  const absentDeduction = Math.round(dailyRate * absentDays * 100) / 100
  const unpaidLeaveDeduction = Math.round(dailyRate * unpaidLeaveDays * 100) / 100
  const lateDeduction = Math.round(dailyRate * 0.1 * lateDays * 100) / 100
  const deductions =
    Math.round((absentDeduction + unpaidLeaveDeduction + lateDeduction) * 100) / 100
  const netPay = Math.max(0, Math.round((grossPay - deductions) * 100) / 100)

  if (lateDays > 0) {
    notes.push(`${lateDays} late day(s): 10% daily rate deduction each`)
  }
  if (unpaidLeaveDays > 0) {
    notes.push(`${unpaidLeaveDays} unpaid leave day(s) deducted`)
  }
  if (absentDays > 0) {
    notes.push(`${absentDays} absent day(s) without approved leave`)
  }

  return {
    baseSalary: employee.salary,
    workingDays,
    paidDays,
    presentDays,
    halfDays,
    absentDays,
    paidLeaveDays,
    unpaidLeaveDays,
    lateDays,
    grossPay,
    deductions,
    netPay,
    breakdown: {
      attendance: attendanceBreakdown,
      leaves: leaveBreakdown,
      notes,
    },
  }
}

export async function generatePaySlipsForPeriod(
  year: number,
  month: number,
  employeeIds?: string[]
) {
  const employees = await prisma.employee.findMany({
    where: {
      employmentStatus: "ACTIVE",
      salary: { not: null },
      ...(employeeIds?.length ? { id: { in: employeeIds } } : {}),
    },
    select: { id: true },
  })

  const results: Array<{ employeeId: string; paySlipId: string; netPay: number }> = []
  const skipped: string[] = []

  for (const employee of employees) {
    const calc = await calculatePaySlip(employee.id, year, month)
    if (!calc) {
      skipped.push(employee.id)
      continue
    }

    const paySlip = await prisma.paySlip.upsert({
      where: {
        employeeId_periodMonth_periodYear: {
          employeeId: employee.id,
          periodMonth: month,
          periodYear: year,
        },
      },
      update: {
        baseSalary: calc.baseSalary,
        workingDays: calc.workingDays,
        paidDays: calc.paidDays,
        presentDays: calc.presentDays,
        halfDays: calc.halfDays,
        absentDays: calc.absentDays,
        paidLeaveDays: calc.paidLeaveDays,
        unpaidLeaveDays: calc.unpaidLeaveDays,
        lateDays: calc.lateDays,
        grossPay: calc.grossPay,
        deductions: calc.deductions,
        netPay: calc.netPay,
        breakdown: JSON.stringify(calc.breakdown),
        generatedAt: new Date(),
      },
      create: {
        employeeId: employee.id,
        periodMonth: month,
        periodYear: year,
        baseSalary: calc.baseSalary,
        workingDays: calc.workingDays,
        paidDays: calc.paidDays,
        presentDays: calc.presentDays,
        halfDays: calc.halfDays,
        absentDays: calc.absentDays,
        paidLeaveDays: calc.paidLeaveDays,
        unpaidLeaveDays: calc.unpaidLeaveDays,
        lateDays: calc.lateDays,
        grossPay: calc.grossPay,
        deductions: calc.deductions,
        netPay: calc.netPay,
        breakdown: JSON.stringify(calc.breakdown),
      },
    })

    results.push({
      employeeId: employee.id,
      paySlipId: paySlip.id,
      netPay: paySlip.netPay,
    })
  }

  return { results, skipped, total: results.length }
}
