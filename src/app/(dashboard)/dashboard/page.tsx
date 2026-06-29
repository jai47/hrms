import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Clock, Calendar, TrendingUp } from "lucide-react"
import { formatDate } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { EmployeeDashboard } from "./employee-dashboard"

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

const ON_TIME_STATUSES = ["PRESENT", "REMOTE"]
const LATE_STATUSES = ["LATE"]
const ABSENT_LEAVE_STATUSES = ["ABSENT", "ON_LEAVE", "HALF_DAY", "EARLY_LEAVE"]

async function getAdminStats() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const [
    totalEmployees,
    presentToday,
    onLeaveToday,
    pendingLeaves,
    recentAttendances,
    upcomingBirthdays,
  ] = await Promise.all([
    prisma.employee.count({ where: { employmentStatus: "ACTIVE" } }),
    prisma.attendance.count({
      where: {
        date: { gte: today, lt: tomorrow },
        status: { in: ["PRESENT", "LATE"] },
      },
    }),
    prisma.attendance.count({
      where: {
        date: { gte: today, lt: tomorrow },
        status: "ON_LEAVE",
      },
    }),
    prisma.leaveRequest.count({ where: { status: "PENDING" } }),
    prisma.attendance.findMany({
      where: { date: { gte: today, lt: tomorrow } },
      include: { employee: true },
      orderBy: { checkIn: "desc" },
      take: 5,
    }),
    prisma.employee.findMany({
      where: {
        dateOfBirth: {
          gte: today,
          lt: new Date(today.getFullYear(), today.getMonth() + 7, today.getDate()),
        },
        employmentStatus: "ACTIVE",
      },
      take: 5,
      orderBy: { dateOfBirth: "asc" },
    }),
  ])

  return {
    totalEmployees,
    presentToday,
    onLeaveToday,
    pendingLeaves,
    recentAttendances,
    upcomingBirthdays,
  }
}

async function getEmployeeDashboardData(employeeId: string) {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const [employee, attendances, todayAttendance, pendingLeaves, recentPaySlips] =
    await Promise.all([
      prisma.employee.findUnique({
        where: { id: employeeId },
        select: { firstName: true, lastName: true },
      }),
      prisma.attendance.findMany({
        where: {
          employeeId,
          date: { gte: monthStart, lte: monthEnd },
        },
        orderBy: { date: "desc" },
      }),
      prisma.attendance.findFirst({
        where: {
          employeeId,
          date: { gte: today, lt: tomorrow },
        },
      }),
      prisma.leaveRequest.count({
        where: { employeeId, status: "PENDING" },
      }),
      prisma.paySlip.findMany({
        where: {
          employeeId,
          status: { in: ["FINALIZED", "PAID"] },
        },
        orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }],
        take: 3,
        select: { id: true, periodMonth: true, periodYear: true, netPay: true },
      }),
    ])

  const onTime = attendances.filter((a) => ON_TIME_STATUSES.includes(a.status)).length
  const late = attendances.filter((a) => LATE_STATUSES.includes(a.status)).length
  const absentLeaves = attendances.filter((a) =>
    ABSENT_LEAVE_STATUSES.includes(a.status)
  ).length

  return {
    employeeName: employee ? `${employee.firstName} ${employee.lastName}` : "Employee",
    monthLabel: `${MONTHS[now.getMonth()]} ${now.getFullYear()}`,
    stats: {
      onTime,
      late,
      absentLeaves,
      todayStatus: todayAttendance?.status ?? null,
    },
    attendances: attendances.map((a) => ({
      id: a.id,
      date: a.date.toISOString(),
      checkIn: a.checkIn?.toISOString() ?? null,
      checkOut: a.checkOut?.toISOString() ?? null,
      status: a.status,
      totalHours: a.totalHours,
    })),
    pendingLeaves,
    recentPaySlips,
  }
}

export default async function DashboardPage() {
  const session = await auth()
  const role = session?.user?.role ?? "EMPLOYEE"

  if (role === "EMPLOYEE" && session?.user?.id) {
    const data = await getEmployeeDashboardData(session.user.id)
    return (
      <EmployeeDashboard
        employeeName={data.employeeName}
        monthLabel={data.monthLabel}
        stats={data.stats}
        attendances={data.attendances}
        pendingLeaves={data.pendingLeaves}
        recentPaySlips={data.recentPaySlips}
      />
    )
  }

  const stats = await getAdminStats()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Overview of your HR metrics</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEmployees}</div>
            <p className="text-xs text-muted-foreground">Active employees</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Present Today</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.presentToday}</div>
            <p className="text-xs text-muted-foreground">Checked in today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">On Leave Today</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.onLeaveToday}</div>
            <p className="text-xs text-muted-foreground">Employees on leave</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Leaves</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingLeaves}</div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Check-ins</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.recentAttendances.length === 0 ? (
              <p className="text-sm text-muted-foreground">No check-ins today</p>
            ) : (
              <div className="space-y-3">
                {stats.recentAttendances.map((attendance) => (
                  <div key={attendance.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-medium">
                        {attendance.employee.firstName[0]}{attendance.employee.lastName[0]}
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {attendance.employee.firstName} {attendance.employee.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {attendance.employee.employeeId}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={attendance.status === "PRESENT" ? "success" : "warning"}>
                        {attendance.status}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {attendance.checkIn ? formatDate(attendance.checkIn) : "--"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming Birthdays</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.upcomingBirthdays.length === 0 ? (
              <p className="text-sm text-muted-foreground">No upcoming birthdays</p>
            ) : (
              <div className="space-y-3">
                {stats.upcomingBirthdays.map((emp) => (
                  <div key={emp.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-pink-100 flex items-center justify-center text-pink-600 text-sm font-medium">
                        {emp.firstName[0]}{emp.lastName[0]}
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {emp.firstName} {emp.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">{emp.employeeId}</p>
                      </div>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {emp.dateOfBirth ? formatDate(emp.dateOfBirth) : "--"}
                    </span>
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
