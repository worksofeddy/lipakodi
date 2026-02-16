"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Unit {
  id: string;
  unitNumber: string;
  rent: number;
  status: string;
  property: { id: string; name: string };
}

export default function NewTenantPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [units, setUnits] = useState<Unit[]>([]);
  const [selectedUnit, setSelectedUnit] = useState("");

  useEffect(() => {
    fetch("/api/units")
      .then((res) => res.json())
      .then((data) => setUnits(data.filter((u: Unit) => u.status === "VACANT")));
  }, []);

  const selectedUnitData = units.find((u) => u.id === selectedUnit);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const phoneNumber = formData.get("phoneNumber") as string;

    // First, register the tenant user or find existing
    const registerRes = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formData.get("name"),
        email,
        password: formData.get("password"),
        role: "TENANT",
        phoneNumber,
      }),
    });

    let userId: string;

    if (registerRes.ok) {
      const userData = await registerRes.json();
      userId = userData.user.id;
    } else {
      const errData = await registerRes.json();
      if (errData.error === "Email already registered") {
        // Try to find existing tenant user
        setError("Email already registered. Please use a different email or find the existing user.");
        setLoading(false);
        return;
      }
      setError(typeof errData.error === "string" ? errData.error : "Failed to create tenant user");
      setLoading(false);
      return;
    }

    // Now create the tenant assignment
    const tenantRes = await fetch("/api/tenants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        unitId: selectedUnit,
        leaseStart: formData.get("leaseStart"),
        leaseEnd: formData.get("leaseEnd"),
        rentAmount: selectedUnitData?.rent || 0,
        phoneNumber,
      }),
    });

    if (tenantRes.ok) {
      router.push("/tenants");
      router.refresh();
    } else {
      const errData = await tenantRes.json();
      setError(typeof errData.error === "string" ? errData.error : "Failed to assign tenant");
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold tracking-tight mb-6">Add Tenant</h1>
      <Card>
        <CardHeader>
          <CardTitle>Tenant Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            {error && (
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" name="name" placeholder="Jane Doe" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" placeholder="tenant@example.com" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Phone Number</Label>
              <Input id="phoneNumber" name="phoneNumber" type="tel" placeholder="e.g. 0712345678" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Temporary Password</Label>
              <Input id="password" name="password" type="password" placeholder="Min. 6 characters" required />
            </div>

            <div className="space-y-2">
              <Label>Assign to Unit</Label>
              <Select value={selectedUnit} onValueChange={setSelectedUnit}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a vacant unit" />
                </SelectTrigger>
                <SelectContent>
                  {units.map((unit) => (
                    <SelectItem key={unit.id} value={unit.id}>
                      {unit.property.name} — Unit {unit.unitNumber} (${unit.rent}/mo)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {units.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No vacant units available. Add a property with units first.
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="leaseStart">Lease Start</Label>
                <Input id="leaseStart" name="leaseStart" type="date" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="leaseEnd">Lease End</Label>
                <Input id="leaseEnd" name="leaseEnd" type="date" required />
              </div>
            </div>

            {selectedUnitData && (
              <div className="bg-muted p-3 rounded-md text-sm">
                <strong>Monthly Rent:</strong> ${selectedUnitData.rent}
              </div>
            )}

            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={loading || !selectedUnit}>
                {loading ? "Creating..." : "Add Tenant"}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
