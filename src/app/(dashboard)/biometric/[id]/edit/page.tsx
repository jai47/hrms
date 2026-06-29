"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Loader2 } from "lucide-react"

export default function EditBiometricDevicePage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState("")
  const [location, setLocation] = useState("")
  const [ipAddress, setIpAddress] = useState("")
  const [port, setPort] = useState("4370")

  useEffect(() => {
    fetch(`/api/biometric/devices/${id}`)
      .then((r) => r.json())
      .then((d) => {
        setName(d.name || "")
        setLocation(d.location || "")
        setIpAddress(d.ipAddress || "")
        setPort(String(d.port || 4370))
      })
      .finally(() => setLoading(false))
  }, [id])

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch(`/api/biometric/devices/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          location,
          ipAddress,
          port: parseInt(port, 10) || 4370,
        }),
      })
      if (res.ok) {
        router.push(`/biometric/${id}`)
        router.refresh()
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
  }

  return (
    <div className="space-y-6 max-w-lg">
      <div className="flex items-center gap-4">
        <Link href={`/biometric/${id}`} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold">Edit Device</h1>
      </div>
      <Card>
        <CardHeader><CardTitle>Device Settings</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={save} className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>IP Address</Label>
              <Input value={ipAddress} onChange={(e) => setIpAddress(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Port</Label>
              <Input value={port} onChange={(e) => setPort(e.target.value)} />
            </div>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
