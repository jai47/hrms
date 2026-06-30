"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2, Upload } from "lucide-react"
import { canManageEmployees } from "@/lib/rbac"

type EmployeeOption = {
  id: string
  firstName: string
  lastName: string
  employeeId: string
}

const DOC_TYPES = [
  { value: "CONTRACT", label: "Contract" },
  { value: "ID_DOCUMENT", label: "ID Document" },
  { value: "CERTIFICATE", label: "Certificate" },
  { value: "MEDICAL", label: "Medical" },
  { value: "TAX_DOCUMENT", label: "Tax Document" },
  { value: "OTHER", label: "Other" },
] as const

export function DocumentUploadForm({ employees = [] }: { employees?: EmployeeOption[] }) {
  const router = useRouter()
  const { data: session } = useSession()
  const [title, setTitle] = useState("")
  const [type, setType] = useState("OTHER")
  const [employeeId, setEmployeeId] = useState("")
  const [expiryDate, setExpiryDate] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const role = session?.user?.role ?? "EMPLOYEE"
  const canPickEmployee = canManageEmployees(role) || role === "MANAGER"

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file || !title.trim()) {
      setError("Title and file are required")
      return
    }

    setIsLoading(true)
    setError("")

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("title", title.trim())
      formData.append("type", type)
      formData.append("employeeId", employeeId || session?.user?.id || "")
      if (expiryDate) formData.append("expiryDate", expiryDate)

      const response = await fetch("/api/documents", { method: "POST", body: formData })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to upload document")
      }

      setTitle("")
      setType("OTHER")
      setExpiryDate("")
      setFile(null)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload document")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload Document
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="docTitle">Title *</Label>
              <Input
                id="docTitle"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Document title"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOC_TYPES.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {canPickEmployee && employees.length > 0 && (
              <div className="space-y-2">
                <Label>Employee</Label>
                <Select value={employeeId} onValueChange={setEmployeeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.firstName} {emp.lastName} ({emp.employeeId})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="expiryDate">Expiry Date</Label>
              <Input
                id="expiryDate"
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="docFile">File *</Label>
              <Input
                id="docFile"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                required
              />
            </div>
          </div>

          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
