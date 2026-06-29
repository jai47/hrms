import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import bcrypt from "bcryptjs"
import { canManageEmployees, canViewAllLeaves } from "@/lib/rbac"

function isValidObjectId(value: string): boolean {
  return /^[a-f\d]{24}$/i.test(value)
}

function emptyToNull(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null
  return String(value)
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const role = session.user.role
    if (!canManageEmployees(role) && !canViewAllLeaves(role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1", 10) || 1
    const limit = parseInt(searchParams.get("limit") || "10", 10) || 10
    const search = searchParams.get("search") || ""
    const department = searchParams.get("department") || ""
    const status = searchParams.get("status") || ""
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}

    if (search) {
      where.OR = [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { email: { contains: search } },
        { employeeId: { contains: search } },
      ]
    }

    if (department) {
      where.departmentId = department
    }

    if (status) {
      where.employmentStatus = status
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

    return NextResponse.json({
      employees,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
    })
  } catch (error) {
    console.error("Error fetching employees:", error)
    return NextResponse.json(
      { error: "Failed to fetch employees" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!canManageEmployees(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()

    if (!body.employeeId?.trim()) {
      return NextResponse.json({ error: "Employee ID is required" }, { status: 400 })
    }
    if (!body.firstName?.trim()) {
      return NextResponse.json({ error: "First name is required" }, { status: 400 })
    }
    if (!body.lastName?.trim()) {
      return NextResponse.json({ error: "Last name is required" }, { status: 400 })
    }
    if (!body.email?.trim()) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }
    if (!body.position?.trim()) {
      return NextResponse.json({ error: "Position is required" }, { status: 400 })
    }
    if (!body.hireDate) {
      return NextResponse.json({ error: "Hire date is required" }, { status: 400 })
    }

    const biometricId = emptyToNull(body.biometricId)
    const departmentId =
      body.departmentId && isValidObjectId(body.departmentId)
        ? body.departmentId
        : null

    const existingEmployee = await prisma.employee.findFirst({
      where: {
        OR: [
          { email: body.email.trim() },
          { employeeId: body.employeeId.trim() },
          ...(biometricId ? [{ biometricId }] : []),
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

    const plainPassword = body.password || "changeme123"
    const hashedPassword = await bcrypt.hash(plainPassword, 10)

    const employee = await prisma.employee.create({
      data: {
        employeeId: body.employeeId.trim(),
        firstName: body.firstName.trim(),
        lastName: body.lastName.trim(),
        email: body.email.trim().toLowerCase(),
        password: hashedPassword,
        phone: emptyToNull(body.phone),
        dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : null,
        gender: body.gender || null,
        address: emptyToNull(body.address),
        departmentId,
        position: body.position.trim(),
        hireDate: new Date(body.hireDate),
        salary: body.salary ? parseFloat(body.salary) : null,
        bankAccount: emptyToNull(body.bankAccount),
        emergencyContact: emptyToNull(body.emergencyContact),
        emergencyPhone: emptyToNull(body.emergencyPhone),
        biometricId,
        role: body.role || "EMPLOYEE",
      },
      include: { department: true },
    })

    return NextResponse.json(employee, { status: 201 })
  } catch (error) {
    console.error("Error creating employee:", error)
    const message =
      error instanceof Error ? error.message : "Failed to create employee"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
