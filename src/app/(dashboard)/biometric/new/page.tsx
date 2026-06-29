"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Loader2, ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function NewBiometricDevicePage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    deviceId: "",
    name: "",
    location: "",
    ipAddress: "",
    port: "4370",
    isActive: true,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }))
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }))
    }
  }

  const validate = () => {
    const newErrors: Record<string, string> = {}
    if (!formData.deviceId.trim()) newErrors.deviceId = "Device ID is required"
    if (!formData.name.trim()) newErrors.name = "Name is required"
    if (!formData.ipAddress.trim()) newErrors.ipAddress = "IP Address is required"
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setIsLoading(true)
    try {
      const response = await fetch("/api/biometric/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Failed to create device")
      }

      router.push("/biometric")
      router.refresh()
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to create device")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/biometric" className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Add Biometric Device</h1>
          <p className="text-gray-500">Register a new fingerprint attendance device</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Device Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
            <div className="space-y-2">
              <Label htmlFor="deviceId">Device ID *</Label>
              <Input
                id="deviceId"
                name="deviceId"
                placeholder="e.g., ZK-001, FP-002"
                value={formData.deviceId}
                onChange={handleChange}
                error={errors.deviceId}
              />
              {errors.deviceId && <p className="text-sm text-red-500">{errors.deviceId}</p>}
              <p className="text-xs text-gray-500">Unique identifier from the device (usually shown on device screen)</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Device Name *</Label>
              <Input
                id="name"
                name="name"
                placeholder="e.g., Main Entrance Fingerprint Scanner"
                value={formData.name}
                onChange={handleChange}
                error={errors.name}
              />
              {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                name="location"
                placeholder="e.g., Building A - Main Entrance"
                value={formData.location}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ipAddress">IP Address *</Label>
              <Input
                id="ipAddress"
                name="ipAddress"
                type="text"
                placeholder="192.168.1.100"
                value={formData.ipAddress}
                onChange={handleChange}
                error={errors.ipAddress}
              />
              {errors.ipAddress && <p className="text-sm text-red-500">{errors.ipAddress}</p>}
              <p className="text-xs text-gray-500">IP address of the device on your network</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="port">Port</Label>
              <Input
                id="port"
                name="port"
                type="number"
                placeholder="4370"
                value={formData.port}
                onChange={handleChange}
              />
              <p className="text-xs text-gray-500">Default is 4370 for ZKTeco devices</p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                name="isActive"
                checked={formData.isActive}
                onChange={handleChange}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <Label htmlFor="isActive" className="cursor-pointer">
                Device is active and should sync logs
              </Label>
            </div>

            <div className="flex justify-end gap-4 pt-4 border-t">
              <Link href="/biometric">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating...
                  </span>
                ) : (
                  "Create Device"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Instructions Card */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-900">Setup Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-blue-800">
          <ol className="list-decimal list-inside space-y-2">
            <li>Connect the biometric device to your network via Ethernet or WiFi</li>
            <li>Find the device IP address (usually shown on device screen or via network scan)</li>
            <li>Get the Device ID from the device menu (often under System Info or Comm settings)</li>
            <li>Ensure port 4370 (default) is open on your firewall</li>
            <li>Enter the details above and click "Create Device"</li>
            <li>Use the "Sync Logs" button on the device list to pull attendance data</li>
          </ol>
          <div className="pt-3 border-t border-blue-200">
            <p className="font-medium">Supported Devices:</p>
            <ul className="list-disc list-inside space-y-1 mt-1">
              <li>ZKTeco / ZKSoftware (most models with TCP/IP)</li>
              <li>eSSL / eTimeTrack</li>
              <li>Realand / Anviz</li>
              <li>Any device using ZK protocol on port 4370</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}