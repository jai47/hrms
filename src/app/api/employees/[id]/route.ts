import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

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

    const { id } = await params
    const body = await request.json()

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

    const employee = await prisma.employee.update({
      where: { id },
      data: {
        employeeId: body.employeeId,
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email,
        phone: body.phone,
        dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : null,
        gender: body.gender,
        address: body.address,
        departmentId: body.departmentId,
        position: body.position,
        hireDate: body.hireDate ? new Date(body.hireDate) : undefined,
        salary: body.salary ? parseFloat(body.salary) : null,
        bankAccount: body.bankAccount,
        emergencyContact: body.emergencyContact,
        emergencyPhone: body.emergencyPhone,
        biometricId: body.biometricId,
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