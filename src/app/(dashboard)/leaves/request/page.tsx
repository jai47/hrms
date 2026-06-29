"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
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
import { Loader2, ArrowLeft, Calendar } from "lucide-react"
import Link from "next/link"
import { differenceInCalendarDays } from "date-fns"
import { canViewAllLeaves } from "@/lib/rbac"

const leaveSchema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  leaveType: z.enum([
    "ANNUAL",
    "SICK",
    "CASUAL",
    "MATERNITY",
    "PATERNITY",
    "EMERGENCY",
    "UNPAID",
    "COMPENSATORY",
  ]),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  reason: z.string().min(1, "Reason is required"),
})

type LeaveForm = z.infer<typeof leaveSchema>

type EmployeeOption = {
  id: string
  firstName: string
  lastName: string
  employeeId: string
}

const leaveTypeOptions = [
  { value: "ANNUAL", label: "Annual Leave" },
  { value: "SICK", label: "Sick Leave" },
  { value: "CASUAL", label: "Casual Leave" },
  { value: "MATERNITY", label: "Maternity Leave" },
  { value: "PATERNITY", label: "Paternity Leave" },
  { value: "EMERGENCY", label: "Emergency Leave" },
  { value: "UNPAID", label: "Unpaid Leave" },
  { value: "COMPENSATORY", label: "Compensatory Leave" },
] as const

export default function LeaveRequestPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [isLoading, setIsLoading] = useState(false)
  const [submitError, setSubmitError] = useState("")
  const [employees, setEmployees] = useState<EmployeeOption[]>([])
  const [totalDays, setTotalDays] = useState(0)

  const role = session?.user?.role ?? "EMPLOYEE"
  const canPickEmployee = canViewAllLeaves(role)
  const selfId = session?.user?.id ?? ""

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors },
  } = useForm<LeaveForm>({
    resolver: zodResolver(leaveSchema),
    defaultValues: {
      employeeId: "",
      startDate: new Date().toISOString().split("T")[0],
      endDate: new Date().toISOString().split("T")[0],
    },
  })

  const startDate = watch("startDate")
  const endDate = watch("endDate")

  useEffect(() => {
    if (canPickEmployee) {
      fetch("/api/employees?limit=100")
        .then((r) => r.json())
        .then((data) => setEmployees(data.employees || []))
        .catch(() => setEmployees([]))
    } else if (selfId) {
      setValue("employeeId", selfId, { shouldValidate: true })
    }
  }, [canPickEmployee, selfId, setValue])

  useEffect(() => {
    if (startDate && endDate) {
      const start = new Date(startDate)
      const end = new Date(endDate)
      if (end >= start) {
        setTotalDays(differenceInCalendarDays(end, start) + 1)
      } else {
        setTotalDays(0)
      }
    }
  }, [startDate, endDate])

  const onSubmit = async (data: LeaveForm) => {
    setIsLoading(true)
    setSubmitError("")
    try {
      const response = await fetch("/api/leaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, totalDays }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to submit leave request")
      }

      router.push("/leaves")
      router.refresh()
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Failed to submit leave request")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/leaves" className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Request Leave</h1>
          <p className="text-gray-500">
            {canPickEmployee ? "Submit a leave request for an employee" : "Submit your leave request"}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Leave Request Form</CardTitle>
        </CardHeader>
        <CardContent>
          {submitError && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          )}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              {canPickEmployee ? (
                <div className="space-y-2">
                  <Label>Employee *</Label>
                  <Controller
                    name="employeeId"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select employee" />
                        </SelectTrigger>
                        <SelectContent>
                          {employees.map((emp) => (
                            <SelectItem key={emp.id} value={emp.id}>
                              {emp.firstName} {emp.lastName} ({emp.employeeId})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.employeeId && (
                    <p className="text-sm text-red-500">{errors.employeeId.message}</p>
                  )}
                </div>
              ) : (
                <div className="space-y-2 md:col-span-2">
                  <Label>Employee</Label>
                  <p className="text-sm font-medium text-gray-900 py-2">
                    {session?.user?.name} (you)
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label>Leave Type *</Label>
                <Controller
                  name="leaveType"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select leave type" />
                      </SelectTrigger>
                      <SelectContent>
                        {leaveTypeOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.leaveType && (
                  <p className="text-sm text-red-500">{errors.leaveType.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date *</Label>
                <Input id="startDate" type="date" {...register("startDate")} />
                {errors.startDate && (
                  <p className="text-sm text-red-500">{errors.startDate.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="endDate">End Date *</Label>
                <Input id="endDate" type="date" {...register("endDate")} />
                {errors.endDate && (
                  <p className="text-sm text-red-500">{errors.endDate.message}</p>
                )}
              </div>
            </div>

            {totalDays > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  <span className="font-medium text-blue-800">
                    Total Days: {totalDays} day{totalDays !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="reason">Reason *</Label>
              <Textarea
                id="reason"
                placeholder="Please provide the reason for your leave request..."
                {...register("reason")}
                rows={4}
              />
              {errors.reason && (
                <p className="text-sm text-red-500">{errors.reason.message}</p>
              )}
            </div>

            <div className="flex justify-end gap-4 pt-4 border-t">
              <Link href="/leaves">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={isLoading || (!canPickEmployee && !selfId)}>
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting...
                  </span>
                ) : (
                  "Submit Request"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
