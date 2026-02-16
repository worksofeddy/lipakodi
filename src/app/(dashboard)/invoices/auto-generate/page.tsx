"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Zap } from "lucide-react";

interface Property {
  id: string;
  name: string;
}

export default function AutoGenerateInvoicesPage() {
  const router = useRouter();
  const [properties, setProperties] = useState<Property[]>([]);
  const [propertyId, setPropertyId] = useState("");
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [dueDay, setDueDay] = useState(5);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");

  useEffect(() => {
    async function loadProperties() {
      const res = await fetch("/api/properties");
      if (res.ok) {
        const data = await res.json();
        setProperties(data);
      }
    }
    loadProperties();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!propertyId) return;
    setLoading(true);
    setResult("");

    const res = await fetch("/api/invoices/auto-generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ propertyId, month, year, dueDay }),
    });

    const data = await res.json();
    if (res.ok) {
      setResult(data.message);
      setTimeout(() => router.push("/invoices"), 2000);
    } else {
      setResult(data.error || "Failed to generate invoices");
    }
    setLoading(false);
  }

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Auto-Generate Invoices</h1>
        <p className="text-muted-foreground">
          Generate rent invoices for all active tenants in a property
        </p>
      </div>

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Generate Options</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Property</Label>
              <Select value={propertyId} onValueChange={setPropertyId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select property" />
                </SelectTrigger>
                <SelectContent>
                  {properties.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Month</Label>
                <Select
                  value={String(month)}
                  onValueChange={(v) => setMonth(Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((m, i) => (
                      <SelectItem key={i} value={String(i + 1)}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Year</Label>
                <Input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  min={2024}
                  max={2030}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Due Day of Month</Label>
              <Input
                type="number"
                value={dueDay}
                onChange={(e) => setDueDay(Number(e.target.value))}
                min={1}
                max={28}
              />
            </div>
            {result && (
              <p
                className={`text-sm ${result.includes("Generated") ? "text-green-600" : "text-red-600"}`}
              >
                {result}
              </p>
            )}
            <Button type="submit" disabled={loading || !propertyId} className="w-full">
              <Zap className="mr-2 h-4 w-4" />
              {loading ? "Generating..." : "Generate Invoices"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
