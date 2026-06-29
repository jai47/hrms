import net from "net"

interface ZKDeviceConfig {
  ip: string
  port: number
  timeout?: number
}

interface ZKAttendanceLog {
  userId: number
  timestamp: Date
  status: number
  verifyMode: number
  workCode: number
  reserved: number
}

interface ZKUser {
  userId: number
  name: string
  privilege: number
  password: string
  groupId: number
  userRole: number
  card: number
}

export class ZKBiometricDevice {
  private socket: net.Socket | null = null
  private config: ZKDeviceConfig
  private sessionId: number = 0
  private replyId: number = -1
  private isConnected: boolean = false

  // Command codes
  private static readonly CMD_CONNECT = 0x3e8
  private static readonly CMD_EXIT = 0x3ea
  private static readonly CMD_GET_TIME = 0x3e9
  private static readonly CMD_SET_TIME = 0x3eb
  private static readonly CMD_GET_ATTLOG = 0x3f7
  private static readonly CMD_CLEAR_ATTLOG = 0x3ec
  private static readonly CMD_GET_USER = 0x3f3
  private static readonly CMD_SET_USER = 0x3f4
  private static readonly CMD_DELETE_USER = 0x3f5
  private static readonly CMD_GET_USER_INFO = 0x3f6
  private static readonly CMD_ENABLE_CLOCK = 0x3ee
  private static readonly CMD_DISABLE_CLOCK = 0x3ef
  private static readonly CMD_START_VERIFY = 0x3f1
  private static readonly CMD_START_IDENTIFY = 0x3f2

  constructor(config: ZKDeviceConfig) {
    this.config = {
      timeout: 5000,
      ...config,
    }
  }

  async connect(): Promise<boolean> {
    return new Promise((resolve) => {
      this.socket = new net.Socket()
      this.socket.setTimeout(this.config.timeout!)

      this.socket.on("connect", () => {
        this.isConnected = true
        this.sendCommand(ZKBiometricDevice.CMD_CONNECT, Buffer.alloc(0))
          .then((response) => {
            if (response) {
              this.sessionId = response.readUInt16LE(2)
              this.replyId = response.readUInt16LE(4)
              resolve(true)
            } else {
              resolve(false)
            }
          })
          .catch(() => resolve(false))
      })

      this.socket.on("error", () => {
        this.isConnected = false
        resolve(false)
      })

      this.socket.on("close", () => {
        this.isConnected = false
      })

      this.socket.connect(this.config.port, this.config.ip)
    })
  }

  async disconnect(): Promise<void> {
    if (this.socket && this.isConnected) {
      await this.sendCommand(ZKBiometricDevice.CMD_EXIT, Buffer.alloc(0))
      this.socket.destroy()
      this.isConnected = false
    }
  }

  private createHeader(command: number, sessionId: number, replyId: number, data: Buffer): Buffer {
    const header = Buffer.alloc(8)
    header.writeUInt16LE(0x5050, 0) // Magic number
    header.writeUInt16LE(command, 2)
    header.writeUInt16LE(sessionId, 4)
    header.writeUInt16LE(replyId, 6)
    return Buffer.concat([header, data])
  }

  private parseHeader(data: Buffer): { command: number; sessionId: number; replyId: number; length: number } | null {
    if (data.length < 8) return null
    if (data.readUInt16LE(0) !== 0x5050) return null

    return {
      command: data.readUInt16LE(2),
      sessionId: data.readUInt16LE(4),
      replyId: data.readUInt16LE(6),
      length: data.readUInt16LE(8),
    }
  }

  private async sendCommand(command: number, data: Buffer): Promise<Buffer | null> {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.isConnected) {
        reject(new Error("Not connected"))
        return
      }

      this.replyId = (this.replyId + 1) % 0xffff
      const packet = this.createHeader(command, this.sessionId, this.replyId, data)

      const timeout = setTimeout(() => {
        reject(new Error("Command timeout"))
      }, this.config.timeout)

      const onData = (response: Buffer) => {
        const header = this.parseHeader(response)
        if (header && header.replyId === this.replyId) {
          clearTimeout(timeout)
          this.socket?.off("data", onData)
          resolve(response.slice(8))
        }
      }

      this.socket.on("data", onData)
      this.socket.write(packet)
    })
  }

  async getAttendanceLogs(): Promise<ZKAttendanceLog[]> {
    const response = await this.sendCommand(ZKBiometricDevice.CMD_GET_ATTLOG, Buffer.alloc(0))
    if (!response || response.length < 4) return []

    const count = response.readUInt32LE(0)
    const logs: ZKAttendanceLog[] = []
    let offset = 4

    for (let i = 0; i < count; i++) {
      if (offset + 40 > response.length) break

      const log: ZKAttendanceLog = {
        userId: response.readUInt32LE(offset),
        timestamp: this.decodeTime(response.readUInt32LE(offset + 4)),
        status: response.readUInt16LE(offset + 8),
        verifyMode: response.readUInt16LE(offset + 10),
        workCode: response.readUInt16LE(offset + 12),
        reserved: response.readUInt32LE(offset + 14),
      }

      logs.push(log)
      offset += 40
    }

    return logs
  }

  async clearAttendanceLogs(): Promise<boolean> {
    const response = await this.sendCommand(ZKBiometricDevice.CMD_CLEAR_ATTLOG, Buffer.alloc(0))
    return !!response
  }

  async getUsers(): Promise<ZKUser[]> {
    const response = await this.sendCommand(ZKBiometricDevice.CMD_GET_USER, Buffer.alloc(0))
    if (!response || response.length < 4) return []

    const count = response.readUInt32LE(0)
    const users: ZKUser[] = []
    let offset = 4

    for (let i = 0; i < count; i++) {
      if (offset + 72 > response.length) break

      const user: ZKUser = {
        userId: response.readUInt32LE(offset),
        name: response.slice(offset + 4, offset + 28).toString("utf8").replace(/\0/g, ""),
        privilege: response.readUInt8(offset + 28),
        password: response.slice(offset + 29, offset + 53).toString("utf8").replace(/\0/g, ""),
        groupId: response.readUInt32LE(offset + 53),
        userRole: response.readUInt8(offset + 57),
        card: response.readUInt32LE(offset + 58),
      }

      users.push(user)
      offset += 72
    }

    return users
  }

  async setUser(user: ZKUser): Promise<boolean> {
    const data = Buffer.alloc(72)
    data.writeUInt32LE(user.userId, 0)
    data.write(user.name.padEnd(24, "\0"), 4, 24, "utf8")
    data.writeUInt8(user.privilege, 28)
    data.write(user.password.padEnd(24, "\0"), 29, 24, "utf8")
    data.writeUInt32LE(user.groupId, 53)
    data.writeUInt8(user.userRole, 57)
    data.writeUInt32LE(user.card, 58)

    const response = await this.sendCommand(ZKBiometricDevice.CMD_SET_USER, data)
    return !!response
  }

  async deleteUser(userId: number): Promise<boolean> {
    const data = Buffer.alloc(4)
    data.writeUInt32LE(userId, 0)

    const response = await this.sendCommand(ZKBiometricDevice.CMD_DELETE_USER, data)
    return !!response
  }

  async getTime(): Promise<Date> {
    const response = await this.sendCommand(ZKBiometricDevice.CMD_GET_TIME, Buffer.alloc(0))
    if (!response || response.length < 4) return new Date()
    return this.decodeTime(response.readUInt32LE(0))
  }

  async setTime(date: Date = new Date()): Promise<boolean> {
    const data = Buffer.alloc(4)
    data.writeUInt32LE(this.encodeTime(date), 0)

    const response = await this.sendCommand(ZKBiometricDevice.CMD_SET_TIME, data)
    return !!response
  }

  private decodeTime(encoded: number): Date {
    const second = encoded % 60
    const minute = (encoded / 60) % 60
    const hour = (encoded / 3600) % 24
    const day = (encoded / 86400) % 31 + 1
    const month = (encoded / (86400 * 31)) % 12 + 1
    const year = Math.floor(encoded / (86400 * 31 * 12)) + 2000

    return new Date(year, month - 1, day, hour, minute, second)
  }

  private encodeTime(date: Date): number {
    const second = date.getSeconds()
    const minute = date.getMinutes()
    const hour = date.getHours()
    const day = date.getDate()
    const month = date.getMonth() + 1
    const year = date.getFullYear() - 2000

    return second + minute * 60 + hour * 3600 + day * 86400 + month * 86400 * 31 + year * 86400 * 31 * 12
  }

  getConnected(): boolean {
    return this.isConnected
  }
}

function mapZkLogStatus(status: number): "CHECK_IN" | "CHECK_OUT" | "UNKNOWN" {
  if (status === 0) return "CHECK_IN"
  if (status === 1) return "CHECK_OUT"
  return "UNKNOWN"
}

export async function pullAndProcessDeviceLogs(deviceId: string): Promise<{
  success: boolean
  logsFetched: number
  processed: number
  skipped: number
  error?: string
  errors?: string[]
}> {
  const { prisma } = await import("@/lib/prisma")
  const { processBiometricLogs } = await import("@/lib/biometric/process-logs")

  const registeredDevice = await prisma.biometricDevice.findUnique({
    where: { deviceId },
  })

  if (!registeredDevice) {
    return {
      success: false,
      logsFetched: 0,
      processed: 0,
      skipped: 0,
      error: "Device not found",
    }
  }

  if (!registeredDevice.ipAddress) {
    return {
      success: false,
      logsFetched: 0,
      processed: 0,
      skipped: 0,
      error: "Device IP address is not configured",
    }
  }

  const zkDevice = new ZKBiometricDevice({
    ip: registeredDevice.ipAddress,
    port: registeredDevice.port || 4370,
  })

  try {
    const connected = await zkDevice.connect()
    if (!connected) {
      return {
        success: false,
        logsFetched: 0,
        processed: 0,
        skipped: 0,
        error: "Failed to connect to device",
      }
    }

    const logs = await zkDevice.getAttendanceLogs()
    await zkDevice.disconnect()

    if (logs.length === 0) {
      await prisma.biometricDevice.update({
        where: { id: registeredDevice.id },
        data: { lastSync: new Date() },
      })
      return { success: true, logsFetched: 0, processed: 0, skipped: 0 }
    }

    const formattedLogs = logs.map((log) => ({
      biometricId: log.userId.toString(),
      timestamp: log.timestamp.toISOString(),
      eventType: mapZkLogStatus(log.status),
      userId: log.userId,
      verifyMode: log.verifyMode,
      workCode: log.workCode,
    }))

    const result = await processBiometricLogs(deviceId, formattedLogs)

    return {
      success: true,
      logsFetched: logs.length,
      processed: result.processed,
      skipped: result.skipped,
      errors: result.errors.length > 0 ? result.errors : undefined,
    }
  } catch (error) {
    await zkDevice.disconnect()
    return {
      success: false,
      logsFetched: 0,
      processed: 0,
      skipped: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

export async function syncAllDevices(): Promise<{
  success: boolean
  results: Array<{
    deviceId: string
    success: boolean
    logsFetched: number
    processed: number
    skipped: number
    error?: string
  }>
}> {
  const { prisma } = await import("@/lib/prisma")

  const devices = await prisma.biometricDevice.findMany({
    where: { isActive: true },
  })

  const results = await Promise.all(
    devices.map(async (device) => {
      const result = await pullAndProcessDeviceLogs(device.deviceId)
      return {
        deviceId: device.deviceId,
        ...result,
      }
    })
  )

  return {
    success: results.some((r) => r.success),
    results,
  }
}