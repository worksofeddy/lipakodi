"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Pencil } from "lucide-react";

interface EditUnitFormProps {
  unit: {
    id: string;
    unitNumber: string;
    accountNumber: string | null;
    bedrooms: number;
    bathrooms: number;
    rent: number;
  };
}

export function EditUnitForm({ unit }: EditUnitFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);

    const res = await fetch(`/api/units/${unit.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        unitNumber: formData.get("unitNumber"),
        accountNumber: formData.get("accountNumber") || null,
        bedrooms: Number(formData.get("bedrooms")),
        bathrooms: Number(formData.get("bathrooms")),
        rent: Number(formData.get("rent")),
      }),
    });

    if (res.ok) {
      setOpen(false);
      router.refresh();
    } else {
      const data = await res.json();
      setError(typeof data.error === "string" ? data.error : "Failed to update unit");
    }
    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Unit {unit.unitNumber}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          {error && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="edit-unit-number">Unit Number</Label>
            <Input
              id="edit-unit-number"
              name="unitNumber"
              defaultValue={unit.unitNumber}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-account-number">Account Number (for M-Pesa)</Label>
            <Input
              id="edit-account-number"
              name="accountNumber"
              defaultValue={unit.accountNumber || ""}
              placeholder="e.g. UNIT101"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-unit-bedrooms">Bedrooms</Label>
              <Input
                id="edit-unit-bedrooms"
                name="bedrooms"
                type="number"
                min="0"
                defaultValue={unit.bedrooms}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-unit-bathrooms">Bathrooms</Label>
              <Input
                id="edit-unit-bathrooms"
                name="bathrooms"
                type="number"
                min="0"
                defaultValue={unit.bathrooms}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-unit-rent">Monthly Rent (KES)</Label>
            <Input
              id="edit-unit-rent"
              name="rent"
              type="number"
              min="0"
              step="0.01"
              defaultValue={unit.rent}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
