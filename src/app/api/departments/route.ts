import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function GET() {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const departments = await prisma.department.findMany({
      include: {
        _count: { select: { employees: true } },
        manager: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { name: "asc" },
    })

    return NextResponse.json({ departments })
  } catch (error) {
    console.error("Error fetching departments:", error)
    return NextResponse.json({ error: "Failed to fetch departments" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const name = body.name?.trim()

    if (!name) {
      return NextResponse.json({ error: "Department name is required" }, { status: 400 })
    }

    const existing = await prisma.department.findUnique({ where: { name } })
    if (existing) {
      return NextResponse.json({ error: "Department already exists" }, { status: 400 })
    }

    const department = await prisma.department.create({
      data: {
        name,
        description: body.description?.trim() || null,
        managerId: body.managerId || null,
      },
    })

    return NextResponse.json(department, { status: 201 })
  } catch (error) {
    console.error("Error creating department:", error)
    return NextResponse.json({ error: "Failed to create department" }, { status: 500 })
  }
}
