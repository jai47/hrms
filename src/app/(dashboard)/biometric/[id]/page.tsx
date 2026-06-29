import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { formatDateTime, getLeaveStatusColor } from "@/lib/utils"
import { Wifi, WifiOff, RefreshCw, Loader2, Edit, Trash2, Clock } from "lucide-react"
import { ToggleDeviceButton, SyncDeviceButton } from "../client-components"

async function getDevice(id: string) {
  return prisma.biometricDevice.findUnique({
    where: { id },
    include: {
      _count: {
        select: { logs: true },
      },
      logs: {
        orderBy: { timestamp: "desc" },
        take: 100,
        include: {
          employee: {
            select: { id: true, firstName: true, lastName: true, employeeId: true },
          },
        },
      },
    },
  })
}

export default async function BiometricDeviceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const device = await getDevice(id)

  if (!device) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{device.name}</h1>
          <p className="text-gray-500">{device.deviceId} • {device.location || "No location set"}</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/biometric/${device.id}/edit`}>
            <Button variant="outline">
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Device Info */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wifi className="h-5 w-5" />
              Device Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Status</span>
              <Badge variant={device.isActive ? "success" : "secondary"}>
                {device.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">IP Address</span>
              <span className="font-mono text-sm">{device.ipAddress || "Not set"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Port</span>
              <span className="font-mono text-sm">{device.port}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Total Logs</span>
              <span className="font-medium">{device._count.logs}</span>
            </div>
            {device.lastSync && (
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Last Sync</span>
                <span className="text-sm text-gray-900">{formatDateTime(device.lastSync)}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Registered</span>
              <span className="text-sm text-gray-900">{formatDateTime(device.createdAt)}</span>
            </div>

            <div className="pt-4 border-t space-y-2">
              <ToggleDeviceButton deviceId={device.id} isActive={device.isActive} className="w-full" />
              <SyncDeviceButton deviceId={device.deviceId} className="w-full" />
            </div>
          </CardContent>
        </Card>

        {/* Recent Logs */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Biometric Logs
            </CardTitle>
          </CardHeader>
          <CardContent>
            {device.logs.length === 0 ? (
              <p className="text-center py-8 text-gray-500">No logs recorded yet. Click "Sync Logs Now" to pull data from the device.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-4 text-sm font-medium text-gray-500">Time</th>
                      <th className="text-left py-2 px-4 text-sm font-medium text-gray-500">Employee</th>
                      <th className="text-left py-2 px-4 text-sm font-medium text-gray-500">Biometric ID</th>
                      <th className="text-left py-2 px-4 text-sm font-medium text-gray-500">Event</th>
                      <th className="text-left py-2 px-4 text-sm font-medium text-gray-500">Processed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {device.logs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="py-2 px-4 text-sm">{formatDateTime(log.timestamp)}</td>
                        <td className="py-2 px-4 text-sm">
                          {log.employee
                            ? `${log.employee.firstName} ${log.employee.lastName}`
                            : <span className="text-gray-400">Unknown</span>}
                        </td>
                        <td className="py-2 px-4 text-sm font-mono">{log.biometricId}</td>
                        <td className="py-2 px-4">
                          <Badge variant="default" className="bg-blue-100 text-blue-800">
                            {log.eventType}
                          </Badge>
                        </td>
                        <td className="py-2 px-4">
                          <Badge variant={log.processed ? "success" : "warning"}>
                            {log.processed ? "Yes" : "No"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
