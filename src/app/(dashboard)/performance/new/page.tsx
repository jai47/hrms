"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm, useFieldArray } from "react-hook-form"
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
import { Loader2, ArrowLeft, Plus, Trash2 } from "lucide-react"
import Link from "next/link"

const kpiSchema = z.object({
  name: z.string().min(1, "KPI name is required"),
  target: z.number().min(0, "Target must be positive"),
  actual: z.number().min(0, "Actual must be positive"),
  weight: z.number().min(0.1, "Weight must be positive"),
  rating: z.enum(["EXCEEDS_EXPECTATIONS", "MEETS_EXPECTATIONS", "BELOW_EXPECTATIONS", "NEEDS_IMPROVEMENT"]),
})

const performanceSchema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  reviewPeriod: z.string().min(1, "Review period is required (e.g., 2024-Q1)"),
  reviewDate: z.string().min(1, "Review date is required"),
  reviewerId: z.string().min(1, "Reviewer is required"),
  overallRating: z.enum(["EXCEEDS_EXPECTATIONS", "MEETS_EXPECTATIONS", "BELOW_EXPECTATIONS", "NEEDS_IMPROVEMENT"]),
  goals: z.string().optional(),
  achievements: z.string().optional(),
  strengths: z.string().optional(),
  improvements: z.string().optional(),
  comments: z.string().optional(),
  status: z.enum(["DRAFT", "SUBMITTED", "REVIEWED", "APPROVED", "FINALIZED"]),
  kpis: z.array(kpiSchema).min(1, "At least one KPI is required"),
})

type PerformanceForm = z.infer<typeof performanceSchema>

const mockEmployees = [
  { id: "1", name: "John Doe", employeeId: "EMP-001" },
  { id: "2", name: "Jane Smith", employeeId: "EMP-002" },
  { id: "3", name: "Bob Johnson", employeeId: "EMP-003" },
]

const ratingOptions = [
  { value: "EXCEEDS_EXPECTATIONS", label: "Exceeds Expectations" },
  { value: "MEETS_EXPECTATIONS", label: "Meets Expectations" },
  { value: "BELOW_EXPECTATIONS", label: "Below Expectations" },
  { value: "NEEDS_IMPROVEMENT", label: "Needs Improvement" },
]

const statusOptions = [
  { value: "DRAFT", label: "Draft" },
  { value: "SUBMITTED", label: "Submitted" },
  { value: "REVIEWED", label: "Reviewed" },
  { value: "APPROVED", label: "Approved" },
  { value: "FINALIZED", label: "Finalized" },
]

export default function NewPerformancePage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<PerformanceForm>({
    resolver: zodResolver(performanceSchema),
    defaultValues: {
      reviewDate: new Date().toISOString().split("T")[0],
      status: "DRAFT",
      kpis: [
        { name: "", target: 0, actual: 0, weight: 1, rating: "MEETS_EXPECTATIONS" },
      ],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: "kpis",
  })

  const onSubmit = async (data: PerformanceForm) => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/performance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Failed to create performance review")
      }

      router.push("/performance")
      router.refresh()
    } catch (error) {
      console.error(error)
      alert(error instanceof Error ? error.message : "Failed to create performance review")
    } finally {
      setIsLoading(false)
    }
  }

  const addKpi = () => {
    append({ name: "", target: 0, actual: 0, weight: 1, rating: "MEETS_EXPECTATIONS" })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/performance" className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">New Performance Review</h1>
          <p className="text-gray-500">Create a new performance evaluation</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Review Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="employeeId">Employee *</Label>
                <Select {...register("employeeId")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockEmployees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.name} ({emp.employeeId})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.employeeId && <p className="text-sm text-red-500">{errors.employeeId.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="reviewerId">Reviewer *</Label>
                <Select {...register("reviewerId")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select reviewer" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockEmployees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.name} ({emp.employeeId})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.reviewerId && <p className="text-sm text-red-500">{errors.reviewerId.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="reviewPeriod">Review Period *</Label>
                <Input
                  id="reviewPeriod"
                  placeholder="2024-Q1"
                  {...register("reviewPeriod")}
                  error={errors.reviewPeriod?.message}
                />
                {errors.reviewPeriod && <p className="text-sm text-red-500">{errors.reviewPeriod.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="reviewDate">Review Date *</Label>
                <Input
                  id="reviewDate"
                  type="date"
                  {...register("reviewDate")}
                  error={errors.reviewDate?.message}
                />
                {errors.reviewDate && <p className="text-sm text-red-500">{errors.reviewDate.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="overallRating">Overall Rating *</Label>
                <Select {...register("overallRating")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select rating" />
                  </SelectTrigger>
                  <SelectContent>
                    {ratingOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.overallRating && <p className="text-sm text-red-500">{errors.overallRating.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select {...register("status")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* KPIs Section */}
            <div className="border-t pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Key Performance Indicators (KPIs)</h3>
                <Button type="button" variant="outline" size="sm" onClick={addKpi}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add KPI
                </Button>
              </div>

              {fields.map((field, index) => (
                <div key={field.id} className="border border-gray-200 rounded-lg p-4 mb-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">KPI #{index + 1}</h4>
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => remove(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid gap-4 md:grid-cols-4">
                    <div className="space-y-2 md:col-span-2">
                      <Label>KPI Name *</Label>
                      <Input
                        placeholder="e.g., Code Quality, Sales Target"
                        {...register(`kpis.${index}.name`)}
                        error={errors.kpis?.[index]?.name?.message}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Target *</Label>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="100"
                        {...register(`kpis.${index}.target`, { valueAsNumber: true })}
                        error={errors.kpis?.[index]?.target?.message}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Actual *</Label>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="85"
                        {...register(`kpis.${index}.actual`, { valueAsNumber: true })}
                        error={errors.kpis?.[index]?.actual?.message}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Weight</Label>
                      <Input
                        type="number"
                        step="0.1"
                        min="0.1"
                        placeholder="1"
                        {...register(`kpis.${index}.weight`, { valueAsNumber: true })}
                        error={errors.kpis?.[index]?.weight?.message}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Rating *</Label>
                      <Select {...register(`kpis.${index}.rating`)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select rating" />
                        </SelectTrigger>
                        <SelectContent>
                          {ratingOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.kpis?.[index]?.rating && (
                        <p className="text-sm text-red-500">{errors.kpis[index].rating.message}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {fields.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No KPIs added yet. Click "Add KPI" to add one.
                </div>
              )}
            </div>

            {/* Additional Sections */}
            <div className="grid gap-4 md:grid-cols-2 border-t pt-6">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="goals">Goals & Objectives</Label>
                <Textarea
                  id="goals"
                  placeholder="List the goals and objectives for this review period..."
                  {...register("goals")}
                  rows={3}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="achievements">Achievements</Label>
                <Textarea
                  id="achievements"
                  placeholder="List key achievements during this period..."
                  {...register("achievements")}
                  rows={3}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="strengths">Strengths</Label>
                <Textarea
                  id="strengths"
                  placeholder="Areas where the employee excelled..."
                  {...register("strengths")}
                  rows={3}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="improvements">Areas for Improvement</Label>
                <Textarea
                  id="improvements"
                  placeholder="Areas where the employee can improve..."
                  {...register("improvements")}
                  rows={3}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="comments">Additional Comments</Label>
                <Textarea
                  id="comments"
                  placeholder="Any additional comments..."
                  {...register("comments")}
                  rows={3}
                />
              </div>
            </div>

            <div className="flex justify-end gap-4 pt-4 border-t">
              <Link href="/performance">
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
                  "Create Review"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}