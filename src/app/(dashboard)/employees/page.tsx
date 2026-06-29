import { prisma } from "@/lib/prisma"
import { requireRoles } from "@/lib/auth-guard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Plus } from "lucide-react"
import { formatDate } from "@/lib/utils"

function buildEmployeeSearchFilter(search: string) {
  return {
    OR: [
      { firstName: { contains: search } },
      { lastName: { contains: search } },
      { email: { contains: search } },
      { employeeId: { contains: search } },
    ],
  }
}

async function getEmployees(searchParams: {
  page?: string
  search?: string
  department?: string
  status?: string
}) {
  const page = parseInt(searchParams.page || "1", 10) || 1
  const limit = 10
  const skip = (page - 1) * limit

  const where: Record<string, unknown> = {}

  if (searchParams.search) {
    Object.assign(where, buildEmployeeSearchFilter(searchParams.search))
  }

  if (searchParams.department && searchParams.department !== "all") {
    where.departmentId = searchParams.department
  }

  if (searchParams.status && searchParams.status !== "all") {
    where.employmentStatus = searchParams.status
  }

  const [employees, total] = await Promise.all([
    prisma.employee.findMany({
      where,
      include: { department: true },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.employee.count({ where }),
  ])

  return {
    employees,
    total,
    totalPages: Math.ceil(total / limit),
    currentPage: page,
  }
}

async function getDepartments() {
  return prisma.department.findMany({ orderBy: { name: "asc" } })
}

const statusColors: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-800",
  INACTIVE: "bg-gray-100 text-gray-800",
  ON_LEAVE: "bg-blue-100 text-blue-800",
  TERMINATED: "bg-red-100 text-red-800",
  PROBATION: "bg-yellow-100 text-yellow-800",
}

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string
    search?: string
    department?: string
    status?: string
  }>
}) {
  await requireRoles(["ADMIN", "HR_MANAGER"])
  const resolvedSearchParams = await searchParams
  const { employees, total, totalPages, currentPage } = await getEmployees(resolvedSearchParams)
  const departments = await getDepartments()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Employees</h1>
          <p className="text-gray-500">Manage your team members</p>
        </div>
        <Link href="/employees/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Employee
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle>Employee List</CardTitle>
            <form method="GET" className="flex flex-wrap items-center gap-3">
              <input
                type="search"
                name="search"
                placeholder="Search employees..."
                defaultValue={resolvedSearchParams.search || ""}
                className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground w-64"
              />
              <select
                name="status"
                defaultValue={resolvedSearchParams.status || "all"}
                className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
              >
                <option value="all">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="ON_LEAVE">On Leave</option>
                <option value="TERMINATED">Terminated</option>
                <option value="PROBATION">Probation</option>
              </select>
              <select
                name="department"
                defaultValue={resolvedSearchParams.department || "all"}
                className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
              >
                <option value="all">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
              <Button type="submit" variant="secondary" size="sm">
                Filter
              </Button>
            </form>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Employee ID</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Name</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Email</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Department</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Position</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Hire Date</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {employees.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-gray-500">
                      No employees found
                    </td>
                  </tr>
                ) : (
                  employees.map((employee) => (
                    <tr key={employee.id} className="hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm text-gray-900">{employee.employeeId}</td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-gray-900">
                          {employee.firstName} {employee.lastName}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-500">{employee.email}</td>
                      <td className="py-3 px-4 text-sm text-gray-500">
                        {employee.department?.name || "N/A"}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-500">{employee.position}</td>
                      <td className="py-3 px-4">
                        <Badge
                          variant="default"
                          className={statusColors[employee.employmentStatus] || "bg-gray-100 text-gray-800"}
                        >
                          {employee.employmentStatus}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-500">
                        {formatDate(employee.hireDate)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          href={`/employees/${employee.id}`}
                          className="text-primary hover:underline text-sm"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-gray-500">
                Showing {(currentPage - 1) * 10 + 1} to {Math.min(currentPage * 10, total)} of {total} employees
              </p>
              <div className="flex gap-2">
                {currentPage > 1 && (
                  <Link
                    href={`?${new URLSearchParams({ ...resolvedSearchParams, page: String(currentPage - 1) })}`}
                    className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                  >
                    Previous
                  </Link>
                )}
                {currentPage < totalPages && (
                  <Link
                    href={`?${new URLSearchParams({ ...resolvedSearchParams, page: String(currentPage + 1) })}`}
                    className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                  >
                    Next
                  </Link>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
