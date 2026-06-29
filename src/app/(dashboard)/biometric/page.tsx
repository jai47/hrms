import { prisma } from "@/lib/prisma"
import { requireRoles } from "@/lib/auth-guard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Plus, Search, Wifi, WifiOff, RefreshCw, Loader2, Edit, Trash2 } from "lucide-react"
import { formatDateTime } from "@/lib/utils"
import { SyncDeviceButton, SyncAllDevicesButton } from "./client-components"

async function getDevices() {
  return prisma.biometricDevice.findMany({
    include: {
      _count: {
        select: { logs: true },
      },
    },
    orderBy: { createdAt: "desc" },
  })
}

export default async function BiometricDevicesPage() {
  await requireRoles(["ADMIN", "HR_MANAGER"])
  const devices = await getDevices()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Biometric Devices</h1>
          <p className="text-gray-500">Manage fingerprint attendance devices</p>
        </div>
        <div className="flex gap-2">
          {devices.length > 0 && <SyncAllDevicesButton />}
          <Link href="/biometric/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Device
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registered Devices</CardTitle>
        </CardHeader>
        <CardContent>
          {devices.length === 0 ? (
            <div className="text-center py-12">
              <WifiOff className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No devices registered</h3>
              <p className="text-gray-500 mb-4">Add your first biometric device to start syncing attendance</p>
              <Link href="/biometric/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Device
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {devices.map((device) => (
                <div
                  key={device.id}
                  className="border border-gray-200 rounded-lg p-6 hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-gray-900">{device.name}</h3>
                      <p className="text-sm text-gray-500">{device.deviceId}</p>
                    </div>
                    <Badge
                      variant={device.isActive ? "success" : "secondary"}
                      className="text-xs"
                    >
                      {device.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>

                  <div className="space-y-2 text-sm text-gray-600 mb-4">
                    {device.location && (
                      <div className="flex items-center gap-1">
                        <span className="font-medium">Location:</span> {device.location}
                      </div>
                    )}
                    {device.ipAddress && (
                      <div className="flex items-center gap-1">
                        <Wifi className="h-4 w-4" />
                        <span>{device.ipAddress}:{device.port}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <span className="font-medium">Logs:</span> {device._count.logs}
                    </div>
                    {device.lastSync && (
                      <div className="flex items-center gap-1">
                        <span className="font-medium">Last Sync:</span>{" "}
                        {formatDateTime(device.lastSync)}
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <span className="font-medium">Added:</span>{" "}
                      {formatDateTime(device.createdAt)}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <SyncDeviceButton deviceId={device.deviceId} className="flex-1" />
                    <Link
                      href={`/biometric/${device.id}`}
                      className="flex-1"
                    >
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4 mr-1" />
                        Manage
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
