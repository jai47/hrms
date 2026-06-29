import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: projectId } = await params
    const body = await request.json()
    const { employeeId, role } = body

    if (!employeeId) {
      return NextResponse.json({ error: "employeeId is required" }, { status: 400 })
    }

    const member = await prisma.projectMember.upsert({
      where: {
        projectId_employeeId: { projectId, employeeId },
      },
      update: { role: role || "MEMBER" },
      create: {
        projectId,
        employeeId,
        role: role || "MEMBER",
      },
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    })

    return NextResponse.json(member, { status: 201 })
  } catch (error) {
    console.error("Error adding project member:", error)
    return NextResponse.json({ error: "Failed to add member" }, { status: 500 })
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

    const { id: projectId } = await params
    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get("employeeId")

    if (!employeeId) {
      return NextResponse.json({ error: "employeeId is required" }, { status: 400 })
    }

    await prisma.projectMember.delete({
      where: {
        projectId_employeeId: { projectId, employeeId },
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error removing project member:", error)
    return NextResponse.json({ error: "Failed to remove member" }, { status: 500 })
  }
}
