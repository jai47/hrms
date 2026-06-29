"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Loader2, ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function NewGoogleFormIntegrationPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    deviceId: `GF-${Date.now().toString(36).toUpperCase().slice(-6)}`,
    name: "",
    location: "",
    googleFormUrl: "",
    isActive: true,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }))
  }

  const validate = () => {
    const newErrors: Record<string, string> = {}
    if (!formData.deviceId.trim()) newErrors.deviceId = "Integration ID is required"
    if (!formData.name.trim()) newErrors.name = "Name is required"
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
        body: JSON.stringify({
          ...formData,
          deviceType: "GOOGLE_FORM",
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to create integration")
      }

      const device = await response.json()
      router.push(`/biometric/${device.id}`)
      router.refresh()
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to create integration")
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
          <h1 className="text-3xl font-bold text-gray-900">Add Google Form Integration</h1>
          <p className="text-gray-500">Record attendance when employees submit a Google Form</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Integration Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
            <div className="space-y-2">
              <Label htmlFor="deviceId">Integration ID *</Label>
              <Input
                id="deviceId"
                name="deviceId"
                placeholder="e.g., GF-CHECKIN"
                value={formData.deviceId}
                onChange={handleChange}
              />
              {errors.deviceId && <p className="text-sm text-red-500">{errors.deviceId}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                name="name"
                placeholder="e.g., Office Check-in Form"
                value={formData.name}
                onChange={handleChange}
              />
              {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                name="location"
                placeholder="e.g., Remote / HQ Entrance"
                value={formData.location}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="googleFormUrl">Google Form URL (optional)</Label>
              <Input
                id="googleFormUrl"
                name="googleFormUrl"
                type="url"
                placeholder="https://docs.google.com/forms/d/..."
                value={formData.googleFormUrl}
                onChange={handleChange}
              />
              <p className="text-xs text-gray-500">For your reference only — stored in HRMS</p>
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
                Integration is active
              </Label>
            </div>

            <div className="flex justify-end gap-4 pt-4 border-t">
              <Link href="/biometric">
                <Button type="button" variant="outline">Cancel</Button>
              </Link>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating...
                  </span>
                ) : (
                  "Create Integration"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="text-green-900">How it works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-green-800">
          <ol className="list-decimal list-inside space-y-2">
            <li>Create a Google Form with one short-answer field named <strong>Employee ID</strong> (e.g. EMP-015)</li>
            <li>Link responses to a Google Sheet (Responses → Link to Sheets)</li>
            <li>Create this integration — you will get a webhook URL and Apps Script to paste</li>
            <li>First form submission of the day = check-in; second = check-out</li>
            <li>Submission timestamp from Google Forms is used as the punch time</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  )
}
