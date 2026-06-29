import { prisma } from "@/lib/prisma"
import { requireRoles } from "@/lib/auth-guard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Plus, Building2 } from "lucide-react"
import { CreateDepartmentForm } from "./client-components"

async function getDepartments() {
  return prisma.department.findMany({
    include: {
      _count: { select: { employees: true } },
      manager: { select: { firstName: true, lastName: true } },
    },
    orderBy: { name: "asc" },
  })
}

export default async function DepartmentsPage() {
  await requireRoles(["ADMIN", "HR_MANAGER"])
  const departments = await getDepartments()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Departments</h1>
          <p className="text-gray-500">Organizational units</p>
        </div>
        <CreateDepartmentForm />
      </div>

      {departments.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Building2 className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500">No departments yet. Create departments when adding employees.</p>
            <Link href="/employees/new" className="inline-block mt-4">
              <Button>Add Employee</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {departments.map((dept) => (
            <Card key={dept.id}>
              <CardHeader>
                <CardTitle>{dept.name}</CardTitle>
              </CardHeader>
              <CardContent>
                {dept.description && <p className="text-sm text-gray-600 mb-2">{dept.description}</p>}
                <p className="text-sm text-gray-500">{dept._count.employees} employees</p>
                {dept.manager && (
                  <p className="text-xs text-gray-400 mt-1">
                    Manager: {dept.manager.firstName} {dept.manager.lastName}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
