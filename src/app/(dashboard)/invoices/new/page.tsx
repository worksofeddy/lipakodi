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
import { Plus, Trash2 } from "lucide-react";

interface Tenant {
  id: string;
  rentAmount: number;
  user: { name: string };
  unit: { unitNumber: string; property: { id: string; name: string } };
}

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  itemType: string;
}

const ITEM_TYPES = [
  { value: "RENT", label: "Rent" },
  { value: "WATER", label: "Water" },
  { value: "ELECTRICITY", label: "Electricity" },
  { value: "SERVICE_CHARGE", label: "Service Charge" },
  { value: "GARBAGE", label: "Garbage" },
  { value: "PARKING", label: "Parking" },
  { value: "LATE_FEE", label: "Late Fee" },
  { value: "OTHER", label: "Other" },
];

export default function NewInvoicePage() {
  const router = useRouter();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [sendImmediately, setSendImmediately] = useState(false);
  const [items, setItems] = useState<LineItem[]>([
    { description: "Monthly Rent", quantity: 1, unitPrice: 0, itemType: "RENT" },
  ]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadTenants() {
      const res = await fetch("/api/tenants");
      if (res.ok) {
        const data = await res.json();
        setTenants(data);
      }
    }
    loadTenants();
  }, []);

  const selectedTenant = tenants.find((t) => t.id === selectedTenantId);

  useEffect(() => {
    if (selectedTenant) {
      setItems((prev) => {
        const newItems = [...prev];
        if (newItems[0]?.itemType === "RENT") {
          newItems[0].unitPrice = selectedTenant.rentAmount;
        }
        return newItems;
      });
    }
  }, [selectedTenant]);

  function addItem() {
    setItems([
      ...items,
      { description: "", quantity: 1, unitPrice: 0, itemType: "OTHER" },
    ]);
  }

  function removeItem(index: number) {
    setItems(items.filter((_, i) => i !== index));
  }

  function updateItem(index: number, field: keyof LineItem, value: string | number) {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  }

  const total = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTenantId || !dueDate || items.length === 0) return;
    setLoading(true);

    const res = await fetch("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tenantId: selectedTenantId,
        propertyId: selectedTenant?.unit.property.id,
        dueDate,
        items,
        notes,
        sendImmediately,
      }),
    });

    if (res.ok) {
      router.push("/invoices");
    }
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create Invoice</h1>
        <p className="text-muted-foreground">Create a new invoice for a tenant</p>
      </div>

      <form onSubmit={onSubmit}>
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Invoice Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Tenant</Label>
                <Select value={selectedTenantId} onValueChange={setSelectedTenantId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select tenant" />
                  </SelectTrigger>
                  <SelectContent>
                    {tenants.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.user.name} - Unit {t.unit.unitNumber} ({t.unit.property.name})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Notes (optional)</Label>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any additional notes"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="sendImmediately"
                  checked={sendImmediately}
                  onChange={(e) => setSendImmediately(e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="sendImmediately">Send to tenant immediately</Label>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Line Items</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="mr-2 h-4 w-4" /> Add Item
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {items.map((item, index) => (
                <div key={index} className="flex gap-2 items-end border-b pb-3">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Type</Label>
                    <Select
                      value={item.itemType}
                      onValueChange={(val) => updateItem(index, "itemType", val)}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ITEM_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Description</Label>
                    <Input
                      className="h-9"
                      value={item.description}
                      onChange={(e) => updateItem(index, "description", e.target.value)}
                      placeholder="Description"
                    />
                  </div>
                  <div className="w-16 space-y-1">
                    <Label className="text-xs">Qty</Label>
                    <Input
                      className="h-9"
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, "quantity", Number(e.target.value))}
                    />
                  </div>
                  <div className="w-28 space-y-1">
                    <Label className="text-xs">Price (KES)</Label>
                    <Input
                      className="h-9"
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(e) => updateItem(index, "unitPrice", Number(e.target.value))}
                    />
                  </div>
                  {items.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9"
                      onClick={() => removeItem(index)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}

              <div className="flex justify-between items-center pt-4 border-t font-bold">
                <span>Total</span>
                <span>KES {total.toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 flex gap-2">
          <Button type="submit" disabled={loading || !selectedTenantId}>
            {loading ? "Creating..." : "Create Invoice"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
