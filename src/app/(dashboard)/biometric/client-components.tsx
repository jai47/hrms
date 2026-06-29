"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, RefreshCw } from "lucide-react"

export function SyncDeviceButton({ deviceId, className }: { deviceId: string; className?: string }) {
  const [isSyncing, setIsSyncing] = useState(false)

  const syncDevice = async () => {
    setIsSyncing(true)
    try {
      const response = await fetch("/api/biometric/sync/pull", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId }),
      })
      const data = await response.json()
      if (data.success) {
        alert(
          `Synced ${data.processed ?? 0} attendance records (${data.logsFetched ?? 0} logs fetched from device)`
        )
        window.location.reload()
      } else {
        alert(`Sync failed: ${data.error || data.message}`)
      }
    } catch {
      alert("Failed to sync device")
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={syncDevice}
      disabled={isSyncing}
      className={className}
    >
      {isSyncing ? (
        <span className="flex items-center justify-center gap-1">
          <Loader2 className="h-4 w-4 animate-spin" />
          Syncing...
        </span>
      ) : (
        <span className="flex items-center justify-center gap-1">
          <RefreshCw className="h-4 w-4" />
          Sync
        </span>
      )}
    </Button>
  )
}

export function SyncAllDevicesButton({ className }: { className?: string }) {
  const [isSyncing, setIsSyncing] = useState(false)

  const syncAll = async () => {
    setIsSyncing(true)
    try {
      const response = await fetch("/api/biometric/sync/all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      const data = await response.json()
      if (data.success) {
        const totalProcessed = (data.results ?? []).reduce(
          (sum: number, r: { processed?: number }) => sum + (r.processed ?? 0),
          0
        )
        alert(`Synced ${data.devicesSynced} device(s), ${totalProcessed} records processed`)
        window.location.reload()
      } else {
        alert(`Sync failed: ${data.error || "One or more devices failed"}`)
      }
    } catch {
      alert("Failed to sync devices")
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <Button variant="outline" onClick={syncAll} disabled={isSyncing} className={className}>
      {isSyncing ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Syncing all...
        </>
      ) : (
        <>
          <RefreshCw className="h-4 w-4 mr-2" />
          Sync All Devices
        </>
      )}
    </Button>
  )
}

export function ToggleDeviceButton({ deviceId, isActive, className }: { deviceId: string; isActive: boolean; className?: string }) {
  const [isLoading, setIsLoading] = useState(false)

  const handleToggle = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/biometric/devices/${deviceId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      })
      if (response.ok) window.location.reload()
    } catch {
      alert("Failed to toggle device")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      variant={isActive ? "outline" : "default"}
      onClick={handleToggle}
      disabled={isLoading}
      className={className}
    >
      {isLoading ? (
        <span className="flex items-center justify-center gap-1">
          <Loader2 className="h-4 w-4 animate-spin" />
          Updating...
        </span>
      ) : (
        isActive ? "Deactivate" : "Activate"
      )}
    </Button>
  )
}
