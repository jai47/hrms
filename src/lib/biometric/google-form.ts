import { randomBytes } from "crypto"
import { prisma } from "@/lib/prisma"
import {
  processBiometricLogs,
  type BiometricLogEntry,
} from "@/lib/biometric/process-logs"

export function generateWebhookSecret(): string {
  return randomBytes(32).toString("hex")
}

export function getGoogleFormWebhookUrl(): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000"
  return `${base.replace(/\/$/, "")}/api/biometric/google-form/webhook`
}

export function buildGoogleAppsScript(params: {
  webhookUrl: string
  deviceId: string
  webhookSecret: string
  employeeIdFieldName?: string
}): string {
  const fieldName = params.employeeIdFieldName || "Employee ID"
  return `// 1. Paste into: Form Responses → Link to Sheets → Extensions → Apps Script
// 2. Add trigger: Triggers (clock) → Add trigger
//    Function: onFormSubmit | Event: From spreadsheet → On form submit
//    (Do NOT use myFunction — that is an empty placeholder)

const WEBHOOK_URL = '${params.webhookUrl}';
const DEVICE_ID = '${params.deviceId}';
const WEBHOOK_SECRET = '${params.webhookSecret}';
const EMPLOYEE_ID_FIELD = '${fieldName}';

function onFormSubmit(e) {
  try {
    var employeeId = '';
    if (e.namedValues && e.namedValues[EMPLOYEE_ID_FIELD]) {
      employeeId = e.namedValues[EMPLOYEE_ID_FIELD][0];
    } else if (e.values && e.values.length > 0) {
      // Spreadsheet: e.values is [[timestamp, employeeId, ...]]
      var row = e.values[0];
      employeeId = row.length > 1 ? row[1] : row[0];
    }

    employeeId = String(employeeId || '').trim();
    if (!employeeId) {
      Logger.log('No employee ID in submission');
      return;
    }

    // Use trigger time (reliable). Sheet Timestamp locale often fails Date.parse.
    var timestamp = new Date();
    if (e.namedValues && e.namedValues['Timestamp']) {
      var parsed = new Date(e.namedValues['Timestamp'][0]);
      if (!isNaN(parsed.getTime())) {
        timestamp = parsed;
      }
    }

    var payload = {
      deviceId: DEVICE_ID,
      employeeId: employeeId,
      timestamp: timestamp.toISOString(),
    };

    var options = {
      method: 'post',
      contentType: 'application/json',
      headers: { 'x-webhook-secret': WEBHOOK_SECRET },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
    };

    var response = UrlFetchApp.fetch(WEBHOOK_URL, options);
    var code = response.getResponseCode();
    var body = response.getContentText();
    Logger.log(code + ': ' + body);
    if (code < 200 || code >= 300) {
      throw new Error('Webhook failed with ' + code + ': ' + body);
    }
  } catch (err) {
    Logger.log('ERROR: ' + err);
    throw err;
  }
}`
}

export async function processGoogleFormWebhook(input: {
  deviceId: string
  employeeId: string
  timestamp?: string
  webhookSecret: string
}): Promise<{
  success: boolean
  message: string
  processed: number
  skipped: number
}> {
  const device = await prisma.biometricDevice.findUnique({
    where: { deviceId: input.deviceId },
  })

  if (!device || device.deviceType !== "GOOGLE_FORM") {
    throw new Error("Google Form integration not found")
  }

  if (!device.isActive) {
    throw new Error("Integration is inactive")
  }

  if (!device.webhookSecret || device.webhookSecret !== input.webhookSecret) {
    throw new Error("Invalid webhook secret")
  }

  const employeeId = input.employeeId.trim()
  if (!employeeId) {
    throw new Error("Employee ID is required")
  }

  const employee = await prisma.employee.findFirst({
    where: { employeeId },
  })

  if (!employee) {
    throw new Error(`Employee not found: ${employeeId}`)
  }

  const logTime = input.timestamp ? new Date(input.timestamp) : new Date()
  if (Number.isNaN(logTime.getTime())) {
    throw new Error("Invalid timestamp")
  }

  const logEntry: BiometricLogEntry = {
    biometricId: employee.employeeId,
    timestamp: logTime.toISOString(),
    eventType: "UNKNOWN",
  }

  const result = await processBiometricLogs(device.deviceId, [logEntry])

  const message =
    result.processed > 0
      ? `Attendance recorded for ${employee.firstName} ${employee.lastName}`
      : result.errors.length > 0
        ? result.errors[0]
        : "Submission already processed or no action needed"

  return {
    success: result.processed > 0 || result.skipped > 0,
    message,
    processed: result.processed,
    skipped: result.skipped,
  }
}
