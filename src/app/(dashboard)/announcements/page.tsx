import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { canManageAnnouncements } from "@/lib/rbac"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Megaphone } from "lucide-react"
import { formatDate } from "@/lib/utils"
import { CreateAnnouncementForm } from "./client-components"

const priorityColors: Record<string, string> = {
  LOW: "bg-gray-100 text-gray-800",
  NORMAL: "bg-blue-100 text-blue-800",
  HIGH: "bg-amber-100 text-amber-800",
  URGENT: "bg-red-100 text-red-800",
}

async function getAnnouncements(departmentId?: string | null) {
  const now = new Date()
  return prisma.announcement.findMany({
    where: {
      isActive: true,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      AND: [
        {
          OR: [
            { departmentId: null },
            ...(departmentId ? [{ departmentId }] : []),
          ],
        },
      ],
    },
    include: {
      author: { select: { firstName: true, lastName: true } },
      department: { select: { name: true } },
    },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    take: 30,
  })
}

export default async function AnnouncementsPage() {
  const session = await auth()
  const role = session?.user?.role ?? "EMPLOYEE"
  const canManage = canManageAnnouncements(role)

  const employee = session?.user?.id
    ? await prisma.employee.findUnique({
        where: { id: session.user.id },
        select: { departmentId: true },
      })
    : null

  const [announcements, departments] = await Promise.all([
    getAnnouncements(employee?.departmentId),
    canManage
      ? prisma.department.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } })
      : Promise.resolve([]),
  ])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Announcements</h1>
          <p className="text-gray-500">Company news and updates</p>
        </div>
        {canManage && <CreateAnnouncementForm departments={departments} />}
      </div>

      {announcements.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-gray-500">
            <Megaphone className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>No announcements at this time.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {announcements.map((item) => (
            <Card key={item.id}>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <CardTitle className="text-lg">{item.title}</CardTitle>
                  <Badge className={priorityColors[item.priority] || priorityColors.NORMAL}>
                    {item.priority}
                  </Badge>
                </div>
                <p className="text-sm text-gray-500">
                  {item.author.firstName} {item.author.lastName}
                  {item.department ? ` · ${item.department.name}` : " · Company-wide"}
                  {" · "}
                  {formatDate(item.createdAt)}
                  {item.expiresAt && ` · Expires ${formatDate(item.expiresAt)}`}
                </p>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 whitespace-pre-wrap">{item.content}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
