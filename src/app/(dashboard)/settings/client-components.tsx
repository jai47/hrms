"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { Palette, Wifi, Loader2, Check } from "lucide-react"
import { SETTING_KEYS } from "@/lib/settings-keys"
import { ChangePasswordForm } from "@/components/account/change-password-form"
import { IntegrationsSettings } from "@/components/settings/integrations-settings"

type Props = {
  initialDbSettings: Record<string, string>
  counts: { employees: number; departments: number; devices: number }
  showIntegrations?: boolean
}

function getUiValue(dbMap: Record<string, string>, uiKey: keyof typeof SETTING_KEYS): string {
  const dbKey = SETTING_KEYS[uiKey]
  return dbMap[dbKey] ?? dbMap[uiKey] ?? ""
}

export function SettingsForm({ initialDbSettings, counts, showIntegrations }: Props) {
  const [values, setValues] = useState(() => ({
    companyName: getUiValue(initialDbSettings, "companyName") || "",
    companyEmail: getUiValue(initialDbSettings, "companyEmail") || "",
    timezone: getUiValue(initialDbSettings, "timezone") || "UTC",
    dateFormat: getUiValue(initialDbSettings, "dateFormat") || "MM/DD/YYYY",
    workStartTime: getUiValue(initialDbSettings, "workStartTime") || "09:00",
    workEndTime: getUiValue(initialDbSettings, "workEndTime") || "17:00",
    lateThreshold: getUiValue(initialDbSettings, "lateThreshold") || "15",
    earlyLeaveThreshold: getUiValue(initialDbSettings, "earlyLeaveThreshold") || "15",
    defaultBreakMinutes: getUiValue(initialDbSettings, "defaultBreakMinutes") || "60",
    annualLeaveDays: getUiValue(initialDbSettings, "annualLeaveDays") || "21",
    sickLeaveDays: getUiValue(initialDbSettings, "sickLeaveDays") || "10",
    carryForwardMax: getUiValue(initialDbSettings, "carryForwardMax") || "5",
    emailNotifications: getUiValue(initialDbSettings, "emailNotifications") !== "false",
    leaveNotifications: getUiValue(initialDbSettings, "leaveNotifications") !== "false",
    attendanceNotifications: getUiValue(initialDbSettings, "attendanceNotifications") !== "false",
    performanceNotifications: getUiValue(initialDbSettings, "performanceNotifications") !== "false",
  }))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const update = (key: string, value: string | boolean) => {
    setValues((v) => ({ ...v, [key]: value }))
    setSaved(false)
  }

  const save = async () => {
    setSaving(true)
    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      })
      if (response.ok) setSaved(true)
      else alert("Failed to save settings")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-500">Configure your HRMS preferences</p>
        </div>
        <Button onClick={save} disabled={saving} className="w-full sm:w-auto shrink-0">
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : saved ? (
            <Check className="h-4 w-4 mr-2" />
          ) : null}
          {saved ? "Saved" : "Save Settings"}
        </Button>
      </div>

      <ChangePasswordForm />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              General & Attendance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Company Name">
                <Input value={values.companyName} onChange={(e) => update("companyName", e.target.value)} />
              </Field>
              <Field label="Company Email">
                <Input type="email" value={values.companyEmail} onChange={(e) => update("companyEmail", e.target.value)} />
              </Field>
              <Field label="Work Start Time">
                <Input type="time" value={values.workStartTime} onChange={(e) => update("workStartTime", e.target.value)} />
              </Field>
              <Field label="Work End Time">
                <Input type="time" value={values.workEndTime} onChange={(e) => update("workEndTime", e.target.value)} />
              </Field>
              <Field label="Late Threshold (minutes)">
                <Input type="number" value={values.lateThreshold} onChange={(e) => update("lateThreshold", e.target.value)} />
              </Field>
              <Field label="Early Leave Threshold (minutes)">
                <Input type="number" value={values.earlyLeaveThreshold} onChange={(e) => update("earlyLeaveThreshold", e.target.value)} />
              </Field>
              <Field label="Default Break (minutes)">
                <Input type="number" value={values.defaultBreakMinutes} onChange={(e) => update("defaultBreakMinutes", e.target.value)} />
              </Field>
              <Field label="Annual Leave Days">
                <Input type="number" value={values.annualLeaveDays} onChange={(e) => update("annualLeaveDays", e.target.value)} />
              </Field>
            </div>

            <div className="border-t pt-4 space-y-3">
              <h4 className="font-medium">Notifications</h4>
              <Checkbox label="Email notifications" checked={values.emailNotifications} onChange={(v) => update("emailNotifications", v)} />
              <Checkbox label="Leave request notifications" checked={values.leaveNotifications} onChange={(v) => update("leaveNotifications", v)} />
              <Checkbox label="Attendance alerts" checked={values.attendanceNotifications} onChange={(v) => update("attendanceNotifications", v)} />
              <Checkbox label="Performance reminders" checked={values.performanceNotifications} onChange={(v) => update("performanceNotifications", v)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wifi className="h-5 w-5" />
              System Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Stat label="Employees" value={counts.employees} />
            <Stat label="Departments" value={counts.departments} />
            <Stat label="Biometric Devices" value={counts.devices} />
            <Link href="/biometric">
              <Button variant="outline" className="w-full mt-4">Manage Biometric Devices</Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {showIntegrations && <IntegrationsSettings />}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium">{label}</label>
      {children}
    </div>
  )
}

function Checkbox({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-center gap-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-gray-300"
      />
      <span className="text-sm">{label}</span>
    </label>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  )
}
