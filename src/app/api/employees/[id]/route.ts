import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { canManageEmployees } from "@/lib/rbac"

function isValidObjectId(value: string): boolean {
  return /^[a-f\d]{24}$/i.test(value)
}

function emptyToNull(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null
  return String(value)
}

function resolveDepartmentId(body: { departmentId?: unknown }): string | null {
  const raw = body.departmentId
  if (raw === null || raw === undefined || raw === "" || raw === "none") return null
  const id = String(raw)
  return isValidObjectId(id) ? id : null
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const employee = await prisma.employee.findUnique({
      where: { id },
      include: {
        department: true,
        attendances: {
          orderBy: { date: "desc" },
          take: 30,
        },
        leaveRequests: {
          orderBy: { createdAt: "desc" },
          take: 20,
        },
        performances: {
          orderBy: { reviewDate: "desc" },
          take: 10,
          include: { reviewer: true },
        },
        documents: {
          orderBy: { uploadedAt: "desc" },
          take: 20,
        },
      },
    })

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 })
    }

    return NextResponse.json(employee)
  } catch (error) {
    console.error("Error fetching employee:", error)
    return NextResponse.json(
      { error: "Failed to fetch employee" },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!canManageEmployees(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const departmentId = resolveDepartmentId(body)

    const existingEmployee = await prisma.employee.findFirst({
      where: {
        AND: [
          { id: { not: id } },
          {
            OR: [
              { email: body.email },
              { employeeId: body.employeeId },
              ...(body.biometricId ? [{ biometricId: body.biometricId }] : []),
            ],
          },
        ],
      },
    })

    if (existingEmployee) {
      return NextResponse.json(
        { error: "Employee with this email, ID, or biometric ID already exists" },
        { status: 400 }
      )
    }

    if (departmentId) {
      const department = await prisma.department.findUnique({
        where: { id: departmentId },
      })
      if (!department) {
        return NextResponse.json({ error: "Selected department not found" }, { status: 400 })
      }
    }

    const employee = await prisma.employee.update({
      where: { id },
      data: {
        employeeId: body.employeeId?.trim(),
        firstName: body.firstName?.trim(),
        lastName: body.lastName?.trim(),
        email: body.email?.trim().toLowerCase(),
        phone: emptyToNull(body.phone),
        dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : null,
        gender: body.gender || null,
        address: emptyToNull(body.address),
        departmentId,
        position: body.position?.trim(),
        hireDate: body.hireDate ? new Date(body.hireDate) : undefined,
        salary: body.salary != null ? parseFloat(String(body.salary)) : null,
        bankAccount: emptyToNull(body.bankAccount),
        emergencyContact: emptyToNull(body.emergencyContact),
        emergencyPhone: emptyToNull(body.emergencyPhone),
        biometricId: emptyToNull(body.biometricId),
        role: body.role,
        employmentStatus: body.employmentStatus,
      },
      include: { department: true },
    })

    return NextResponse.json(employee)
  } catch (error) {
    console.error("Error updating employee:", error)
    return NextResponse.json(
      { error: "Failed to update employee" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!canManageEmployees(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id } = await params

    await prisma.employee.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting employee:", error)
    return NextResponse.json(
      { error: "Failed to delete employee" },
      { status: 500 }
    )
  }
}
