"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, ArrowLeft } from "lucide-react"
import Link from "next/link"

const employeeSchema = z.object({
  employeeId: z.string().min(1, "Employee ID is required"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  address: z.string().optional(),
  departmentId: z.string().optional(),
  position: z.string().min(1, "Position is required"),
  hireDate: z.string().min(1, "Hire date is required"),
  salary: z.string().optional(),
  bankAccount: z.string().optional(),
  emergencyContact: z.string().optional(),
  emergencyPhone: z.string().optional(),
  biometricId: z.string().optional(),
  role: z.enum(["ADMIN", "HR_MANAGER", "MANAGER", "EMPLOYEE"]),
  employmentStatus: z.enum(["ACTIVE", "INACTIVE", "ON_LEAVE", "TERMINATED", "PROBATION"]),
})

type EmployeeForm = z.infer<typeof employeeSchema>
type Department = { id: string; name: string }

export default function EditEmployeeForm({ employeeId }: { employeeId: string }) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [departments, setDepartments] = useState<Department[]>([])
  const [submitError, setSubmitError] = useState("")

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<EmployeeForm>({
    resolver: zodResolver(employeeSchema),
  })

  useEffect(() => {
    Promise.all([
      fetch(`/api/employees/${employeeId}`).then((r) => r.json()),
      fetch("/api/departments").then((r) => r.json()),
    ])
      .then(([employee, deptData]) => {
        if (employee.error) throw new Error(employee.error)
        setDepartments(deptData.departments || [])
        reset({
          employeeId: employee.employeeId,
          firstName: employee.firstName,
          lastName: employee.lastName,
          email: employee.email,
          phone: employee.phone || "",
          dateOfBirth: employee.dateOfBirth
            ? new Date(employee.dateOfBirth).toISOString().split("T")[0]
            : "",
          gender: employee.gender || undefined,
          address: employee.address || "",
          departmentId: employee.departmentId || "",
          position: employee.position,
          hireDate: new Date(employee.hireDate).toISOString().split("T")[0],
          salary: employee.salary != null ? String(employee.salary) : "",
          bankAccount: employee.bankAccount || "",
          emergencyContact: employee.emergencyContact || "",
          emergencyPhone: employee.emergencyPhone || "",
          biometricId: employee.biometricId || "",
          role: employee.role,
          employmentStatus: employee.employmentStatus,
        })
      })
      .catch((err) => {
        setSubmitError(err instanceof Error ? err.message : "Failed to load employee")
      })
      .finally(() => setLoadingData(false))
  }, [employeeId, reset])

  const onSubmit = async (data: EmployeeForm) => {
    setIsLoading(true)
    setSubmitError("")
    try {
      const payload = {
        ...data,
        departmentId: data.departmentId && data.departmentId !== "none" ? data.departmentId : null,
        gender: data.gender || null,
        phone: data.phone || null,
        address: data.address || null,
        bankAccount: data.bankAccount || null,
        emergencyContact: data.emergencyContact || null,
        emergencyPhone: data.emergencyPhone || null,
        biometricId: data.biometricId || null,
        dateOfBirth: data.dateOfBirth || null,
        salary: data.salary ? parseFloat(data.salary) : null,
      }

      const response = await fetch(`/api/employees/${employeeId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Failed to update employee")

      router.push(`/employees/${employeeId}`)
      router.refresh()
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Failed to update employee")
    } finally {
      setIsLoading(false)
    }
  }

  if (loadingData) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/employees/${employeeId}`} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Edit Employee</h1>
          <p className="text-gray-500">Update employee details and department</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Employee Information</CardTitle>
        </CardHeader>
        <CardContent>
          {submitError && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          )}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="employeeId">Employee ID *</Label>
                <Input id="employeeId" {...register("employeeId")} />
                {errors.employeeId && (
                  <p className="text-sm text-red-500">{errors.employeeId.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input id="firstName" {...register("firstName")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input id="lastName" {...register("lastName")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input id="email" type="email" {...register("email")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" {...register("phone")} />
              </div>
              <div className="space-y-2">
                <Label>Department</Label>
                <Controller
                  name="departmentId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value || "none"}
                      onValueChange={(v) => field.onChange(v === "none" ? "" : v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No department</SelectItem>
                        {departments.map((dept) => (
                          <SelectItem key={dept.id} value={dept.id}>
                            {dept.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="position">Position *</Label>
                <Input id="position" {...register("position")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hireDate">Hire Date *</Label>
                <Input id="hireDate" type="date" {...register("hireDate")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="salary">Monthly Salary (₹)</Label>
                <Input id="salary" type="number" step="0.01" {...register("salary")} />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Controller
                  name="role"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EMPLOYEE">Employee</SelectItem>
                        <SelectItem value="MANAGER">Manager</SelectItem>
                        <SelectItem value="HR_MANAGER">HR Manager</SelectItem>
                        <SelectItem value="ADMIN">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Controller
                  name="employmentStatus"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ACTIVE">Active</SelectItem>
                        <SelectItem value="INACTIVE">Inactive</SelectItem>
                        <SelectItem value="ON_LEAVE">On Leave</SelectItem>
                        <SelectItem value="PROBATION">Probation</SelectItem>
                        <SelectItem value="TERMINATED">Terminated</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address">Address</Label>
                <Textarea id="address" {...register("address")} rows={2} />
              </div>
            </div>
            <div className="flex justify-end gap-4 pt-4 border-t">
              <Link href={`/employees/${employeeId}`}>
                <Button type="button" variant="outline">Cancel</Button>
              </Link>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </span>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
