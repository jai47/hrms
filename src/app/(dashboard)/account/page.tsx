import { requireAuth } from "@/lib/auth-guard"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChangePasswordForm } from "@/components/account/change-password-form"
import { User } from "lucide-react"

export default async function AccountPage() {
  const session = await requireAuth()

  const employee = await prisma.employee.findUnique({
    where: { id: session.user.id },
    select: {
      firstName: true,
      lastName: true,
      email: true,
      employeeId: true,
      role: true,
      position: true,
      department: { select: { name: true } },
    },
  })

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Account</h1>
        <p className="text-gray-500 mt-1">Manage your profile and security settings</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <User className="h-5 w-5" />
            Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 text-sm">
          <div>
            <p className="text-gray-500">Name</p>
            <p className="font-medium text-gray-900">
              {employee?.firstName} {employee?.lastName}
            </p>
          </div>
          <div>
            <p className="text-gray-500">Employee ID</p>
            <p className="font-medium text-gray-900">{employee?.employeeId}</p>
          </div>
          <div>
            <p className="text-gray-500">Email</p>
            <p className="font-medium text-gray-900 break-all">{employee?.email}</p>
          </div>
          <div>
            <p className="text-gray-500">Role</p>
            <p className="font-medium text-gray-900 capitalize">
              {employee?.role.toLowerCase().replace("_", " ")}
            </p>
          </div>
          {employee?.position && (
            <div>
              <p className="text-gray-500">Position</p>
              <p className="font-medium text-gray-900">{employee.position}</p>
            </div>
          )}
          {employee?.department?.name && (
            <div>
              <p className="text-gray-500">Department</p>
              <p className="font-medium text-gray-900">{employee.department.name}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <ChangePasswordForm />
    </div>
  )
}
