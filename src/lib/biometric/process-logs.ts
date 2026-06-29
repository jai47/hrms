import { prisma } from "@/lib/prisma"
import type { Attendance, BiometricDevice } from "@prisma/client"
import { buildCheckoutUpdate } from "@/lib/attendance"
import { getSetting } from "@/lib/settings"
import { SETTING_KEYS } from "@/lib/settings-keys"

export interface BiometricLogEntry {
  biometricId: string
  timestamp: string
  eventType: "CHECK_IN" | "CHECK_OUT" | "BREAK_START" | "BREAK_END" | "UNKNOWN"
  userId?: number
  verifyMode?: number
  workCode?: number
}

export interface ProcessLogsResult {
  processed: number
  skipped: number
  errors: string[]
}

function startOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

async function getLateThresholdMinutes(): Promise<number> {
  const setting = await getSetting(SETTING_KEYS.lateThreshold)
  const value = setting ? parseInt(setting, 10) : 15
  return Number.isNaN(value) ? 15 : value
}

async function getWorkStartTime(): Promise<{ hour: number; minute: number }> {
  const setting = await getSetting(SETTING_KEYS.workStartTime)
  if (setting) {
    const [hour, minute] = setting.split(":").map(Number)
    if (!Number.isNaN(hour)) {
      return { hour, minute: Number.isNaN(minute) ? 0 : minute }
    }
  }
  return { hour: 9, minute: 0 }
}

function resolveEventType(
  eventType: BiometricLogEntry["eventType"],
  existing: Attendance | null
): "CHECK_IN" | "CHECK_OUT" | null {
  if (eventType === "CHECK_IN" || eventType === "CHECK_OUT") {
    return eventType
  }
  if (eventType === "BREAK_START" || eventType === "BREAK_END") {
    return null
  }
  if (!existing?.checkIn) return "CHECK_IN"
  if (!existing?.checkOut) return "CHECK_OUT"
  return null
}

async function determineCheckInStatus(checkInTime: Date): Promise<"PRESENT" | "LATE"> {
  const { hour, minute } = await getWorkStartTime()
  const threshold = await getLateThresholdMinutes()
  const deadline = new Date(checkInTime)
  deadline.setHours(hour, minute + threshold, 0, 0)
  return checkInTime > deadline ? "LATE" : "PRESENT"
}

async function notifyEmployee(
  employeeId: string,
  title: string,
  message: string
): Promise<void> {
  await prisma.notification.create({
    data: {
      employeeId,
      title,
      message,
      type: "INFO",
      link: "/attendance/records",
    },
  })
}

export async function processBiometricLogs(
  deviceId: string,
  logs: BiometricLogEntry[]
): Promise<ProcessLogsResult> {
  const device = await prisma.biometricDevice.findUnique({
    where: { deviceId },
  })

  if (!device) {
    throw new Error("Device not found")
  }

  const sortedLogs = [...logs].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  )

  let processed = 0
  let skipped = 0
  const errors: string[] = []

  for (const log of sortedLogs) {
    try {
      const result = await processSingleLog(device, log)
      if (result === "processed") processed++
      else skipped++
    } catch (error) {
      errors.push(
        `Failed to process log for ${log.biometricId}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      )
    }
  }

  await prisma.biometricDevice.update({
    where: { id: device.id },
    data: { lastSync: new Date() },
  })

  return { processed, skipped, errors }
}

async function processSingleLog(
  device: BiometricDevice,
  log: BiometricLogEntry
): Promise<"processed" | "skipped"> {
  const { biometricId, timestamp } = log
  const logTime = new Date(timestamp)

  const existingLog = await prisma.biometricLog.findFirst({
    where: {
      deviceId: device.id,
      biometricId,
      timestamp: logTime,
    },
  })

  if (existingLog?.processed) {
    return "skipped"
  }

  const employee = await prisma.employee.findUnique({
    where: { biometricId },
  })

  if (existingLog) {
    if (employee) {
      await applyAttendanceFromLog(device, employee.id, log, logTime)
      await prisma.biometricLog.update({
        where: { id: existingLog.id },
        data: { employeeId: employee.id, processed: true },
      })
    }
    return employee ? "processed" : "skipped"
  }

  await prisma.biometricLog.create({
    data: {
      deviceId: device.id,
      employeeId: employee?.id,
      biometricId,
      timestamp: logTime,
      eventType: log.eventType,
      rawData: JSON.stringify(log),
      processed: false,
    },
  })

  if (!employee) {
    return "skipped"
  }

  await applyAttendanceFromLog(device, employee.id, log, logTime)

  await prisma.biometricLog.updateMany({
    where: {
      deviceId: device.id,
      biometricId,
      timestamp: logTime,
    },
    data: { processed: true, employeeId: employee.id },
  })

  return "processed"
}

async function applyAttendanceFromLog(
  device: BiometricDevice,
  employeeId: string,
  log: BiometricLogEntry,
  logTime: Date
): Promise<void> {
  const logDate = startOfDay(logTime)

  const existingAttendance = await prisma.attendance.findUnique({
    where: {
      employeeId_date: {
        employeeId,
        date: logDate,
      },
    },
  })

  const resolvedType = resolveEventType(log.eventType, existingAttendance)
  if (!resolvedType) return

  if (resolvedType === "CHECK_IN") {
    if (existingAttendance?.checkIn) return

    const status = await determineCheckInStatus(logTime)

    await prisma.attendance.upsert({
      where: {
        employeeId_date: {
          employeeId,
          date: logDate,
        },
      },
      update: {
        checkIn: logTime,
        status,
        source: "BIOMETRIC",
        deviceId: device.deviceId,
        location: device.location ?? undefined,
      },
      create: {
        employeeId,
        date: logDate,
        checkIn: logTime,
        status,
        source: "BIOMETRIC",
        deviceId: device.deviceId,
        location: device.location ?? undefined,
      },
    })

    await notifyEmployee(
      employeeId,
      "Check-in Recorded",
      `Biometric check-in recorded at ${logTime.toLocaleTimeString()}`
    )
    return
  }

  if (existingAttendance?.checkOut) return

  if (existingAttendance?.checkIn) {
    const checkoutData = await buildCheckoutUpdate(
      existingAttendance.checkIn,
      logTime,
      existingAttendance.breakMinutes
    )
    await prisma.attendance.update({
      where: { id: existingAttendance.id },
      data: {
        ...checkoutData,
        source: "BIOMETRIC",
        deviceId: device.deviceId,
        location: device.location ?? undefined,
      },
    })
  } else {
    await prisma.attendance.create({
      data: {
        employeeId,
        date: logDate,
        checkOut: logTime,
        status: "PRESENT",
        source: "BIOMETRIC",
        deviceId: device.deviceId,
        location: device.location ?? undefined,
      },
    })
  }

  await notifyEmployee(
    employeeId,
    "Check-out Recorded",
    `Biometric check-out recorded at ${logTime.toLocaleTimeString()}`
  )
}

export async function processBiometricPunch(input: {
  biometricId: string
  type: "CHECK_IN" | "CHECK_OUT"
  deviceId?: string
  location?: string
  timestamp?: Date
}): Promise<{ record: unknown; message: string }> {
  const { biometricId, type, deviceId, location, timestamp = new Date() } = input

  const employee = await prisma.employee.findUnique({
    where: { biometricId },
  })

  if (!employee) {
    throw new Error("Employee not found for this biometric ID")
  }

  let device: BiometricDevice | null = null
  if (deviceId) {
    device = await prisma.biometricDevice.findUnique({
      where: { deviceId },
    })
  }

  const logEntry: BiometricLogEntry = {
    biometricId,
    timestamp: timestamp.toISOString(),
    eventType: type,
  }

  if (device) {
    await processSingleLog(device, logEntry)
  } else {
    const logDate = startOfDay(timestamp)
    const existingAttendance = await prisma.attendance.findUnique({
      where: {
        employeeId_date: {
          employeeId: employee.id,
          date: logDate,
        },
      },
    })

    if (type === "CHECK_IN") {
      if (existingAttendance?.checkIn) {
        throw new Error("Already checked in today")
      }
      const status = await determineCheckInStatus(timestamp)
      await prisma.attendance.upsert({
        where: {
          employeeId_date: {
            employeeId: employee.id,
            date: logDate,
          },
        },
        update: {
          checkIn: timestamp,
          status,
          source: "BIOMETRIC",
          deviceId,
          location,
        },
        create: {
          employeeId: employee.id,
          date: logDate,
          checkIn: timestamp,
          status,
          source: "BIOMETRIC",
          deviceId,
          location,
        },
      })
    } else {
      if (existingAttendance?.checkOut) {
        throw new Error("Already checked out today")
      }
      if (existingAttendance?.checkIn) {
        const checkoutData = await buildCheckoutUpdate(
          existingAttendance.checkIn,
          timestamp,
          existingAttendance.breakMinutes
        )
        await prisma.attendance.update({
          where: { id: existingAttendance.id },
          data: {
            ...checkoutData,
            source: "BIOMETRIC",
            deviceId,
            location,
          },
        })
      } else if (existingAttendance) {
        await prisma.attendance.update({
          where: { id: existingAttendance.id },
          data: {
            checkOut: timestamp,
            source: "BIOMETRIC",
            deviceId,
            location,
          },
        })
      } else {
        await prisma.attendance.create({
          data: {
            employeeId: employee.id,
            date: logDate,
            checkOut: timestamp,
            status: "PRESENT",
            source: "BIOMETRIC",
            deviceId,
            location,
          },
        })
      }
    }

    await notifyEmployee(
      employee.id,
      type === "CHECK_IN" ? "Check-in Successful" : "Check-out Successful",
      `You have successfully ${type === "CHECK_IN" ? "checked in" : "checked out"} at ${timestamp.toLocaleTimeString()}`
    )
  }

  const logDate = startOfDay(timestamp)
  const record = await prisma.attendance.findUnique({
    where: {
      employeeId_date: {
        employeeId: employee.id,
        date: logDate,
      },
    },
    include: { employee: true },
  })

  return {
    record,
    message: `${type} successful`,
  }
}
