import { prisma } from "@/lib/prisma"
import { SETTING_KEYS } from "@/lib/settings-keys"
import { getSetting } from "@/lib/settings"

const REMINDER_MINUTES_BEFORE = 30

export function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number)
  return hours * 60 + (minutes || 0)
}

export function minutesToTimeString(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60) % 24
  const m = totalMinutes % 60
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

export function getTodayDate(): Date {
  const now = new Date()
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
}

export async function getWorkEndTime(): Promise<string> {
  const value = await getSetting(SETTING_KEYS.workEndTime)
  return value || "17:00"
}

export async function getWorkStartTime(): Promise<string> {
  const value = await getSetting(SETTING_KEYS.workStartTime)
  return value || "09:00"
}

export function isWithinReminderWindow(
  now: Date,
  workEndTime: string,
  minutesBefore = REMINDER_MINUTES_BEFORE
): boolean {
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const endMinutes = parseTimeToMinutes(workEndTime)
  const reminderStart = endMinutes - minutesBefore
  return currentMinutes >= reminderStart && currentMinutes < endMinutes
}

export async function getWorkLogStatusForEmployee(employeeId: string) {
  const today = getTodayDate()
  const workEndTime = await getWorkEndTime()
  const now = new Date()

  const [existingLog, attendance] = await Promise.all([
    prisma.dailyWorkLog.findUnique({
      where: { employeeId_date: { employeeId, date: today } },
    }),
    prisma.attendance.findUnique({
      where: { employeeId_date: { employeeId, date: today } },
    }),
  ])

  const hasCheckedIn = Boolean(attendance?.checkIn)
  const hasSubmitted = Boolean(existingLog)
  const reminderActive =
    hasCheckedIn && !hasSubmitted && isWithinReminderWindow(now, workEndTime)

  const endMinutes = parseTimeToMinutes(workEndTime)
  const reminderStartMinutes = endMinutes - REMINDER_MINUTES_BEFORE

  return {
    hasSubmitted,
    hasCheckedIn,
    reminderActive,
    workEndTime,
    reminderStartsAt: minutesToTimeString(reminderStartMinutes),
    todayLog: existingLog,
  }
}

export async function sendWorkLogReminders(): Promise<{
  notified: number
  skipped: number
}> {
  const today = getTodayDate()
  const workEndTime = await getWorkEndTime()
  const now = new Date()

  if (!isWithinReminderWindow(now, workEndTime)) {
    return { notified: 0, skipped: 0 }
  }

  const activeEmployees = await prisma.employee.findMany({
    where: { employmentStatus: "ACTIVE" },
    select: { id: true, firstName: true, lastName: true },
  })

  let notified = 0
  let skipped = 0

  for (const employee of activeEmployees) {
    const [existingLog, attendance, recentNotification] = await Promise.all([
      prisma.dailyWorkLog.findUnique({
        where: { employeeId_date: { employeeId: employee.id, date: today } },
      }),
      prisma.attendance.findUnique({
        where: { employeeId_date: { employeeId: employee.id, date: today } },
      }),
      prisma.notification.findFirst({
        where: {
          employeeId: employee.id,
          type: "WORK_LOG_REMINDER",
          createdAt: { gte: today },
        },
      }),
    ])

    if (existingLog || !attendance?.checkIn || recentNotification) {
      skipped++
      continue
    }

    await prisma.notification.create({
      data: {
        employeeId: employee.id,
        title: "Daily Work Log Reminder",
        message: `Your shift ends at ${workEndTime}. Please submit your daily work log before you leave.`,
        type: "WORK_LOG_REMINDER",
        link: "/work-logs/submit",
      },
    })
    notified++
  }

  return { notified, skipped }
}
