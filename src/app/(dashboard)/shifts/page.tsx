import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { requireRoles } from "@/lib/auth-guard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Timer } from "lucide-react"
import { parseWorkingDays } from "@/lib/shifts"
import { CreateShiftForm, AssignShiftForm } from "./client-components"

export default async function ShiftsPage() {
  await requireRoles(["ADMIN", "HR_MANAGER"])
  const session = await auth()

  const [shifts, employees] = await Promise.all([
    prisma.shift.findMany({
      include: {
        department: { select: { name: true } },
        assignments: {
          include: {
            employee: {
              select: { id: true, firstName: true, lastName: true, employeeId: true },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.employee.findMany({
      where: { employmentStatus: "ACTIVE" },
      select: { id: true, firstName: true, lastName: true, employeeId: true },
      orderBy: { firstName: "asc" },
    }),
  ])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Shifts</h1>
          <p className="text-gray-500">Manage work shifts and employee assignments</p>
        </div>
        <CreateShiftForm />
      </div>

      {shifts.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-gray-500">
            <Timer className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>No shifts configured yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {shifts.map((shift) => {
            const days = parseWorkingDays(shift.workingDays)
            return (
              <Card key={shift.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Timer className="h-5 w-5" />
                      {shift.name}
                    </CardTitle>
                    <Badge variant={shift.isActive ? "success" : "secondary"}>
                      {shift.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <p>
                    <span className="font-medium">Hours:</span> {shift.startTime} – {shift.endTime}
                  </p>
                  <p>
                    <span className="font-medium">Break:</span> {shift.breakMinutes} min
                  </p>
                  <p>
                    <span className="font-medium">Days:</span> {days.join(", ")}
                  </p>
                  {shift.department && (
                    <p>
                      <span className="font-medium">Department:</span> {shift.department.name}
                    </p>
                  )}

                  <div>
                    <p className="font-medium mb-2">
                      Assignments ({shift.assignments.length})
                    </p>
                    {shift.assignments.length === 0 ? (
                      <p className="text-gray-500">No employees assigned</p>
                    ) : (
                      <ul className="space-y-1 text-gray-600">
                        {shift.assignments.map((a) => (
                          <li key={a.id}>
                            {a.employee.firstName} {a.employee.lastName} — from{" "}
                            {new Date(a.startDate).toLocaleDateString()}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {session?.user?.role === "ADMIN" || session?.user?.role === "HR_MANAGER" ? (
                    <AssignShiftForm shiftId={shift.id} employees={employees} />
                  ) : null}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
