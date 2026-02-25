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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pencil } from "lucide-react";

interface EditTenantFormProps {
  tenant: {
    id: string;
    phoneNumber: string | null;
    channelPreference: string;
    rentAmount: number;
    leaseStart: string;
    leaseEnd: string;
    status: string;
    lateFeeExempt: boolean;
    lateFeeExemptReason: string | null;
    user: {
      name: string | null;
      email: string;
      phoneNumber: string | null;
    };
  };
}

export function EditTenantForm({ tenant }: EditTenantFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lateFeeExempt, setLateFeeExempt] = useState(tenant.lateFeeExempt);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);

    const res = await fetch(`/api/tenants/${tenant.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formData.get("name"),
        email: formData.get("email"),
        phoneNumber: formData.get("phoneNumber"),
        channelPreference: formData.get("channelPreference"),
        rentAmount: Number(formData.get("rentAmount")),
        leaseStart: formData.get("leaseStart"),
        leaseEnd: formData.get("leaseEnd"),
        status: formData.get("status"),
        lateFeeExempt,
        lateFeeExemptReason: lateFeeExempt
          ? (formData.get("lateFeeExemptReason") as string) || null
          : null,
      }),
    });

    if (res.ok) {
      setOpen(false);
      router.refresh();
    } else {
      const data = await res.json();
      setError(typeof data.error === "string" ? data.error : "Failed to update tenant");
    }
    setLoading(false);
  }

  const formatDate = (d: string) => new Date(d).toISOString().split("T")[0];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil className="mr-2 h-4 w-4" /> Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Tenant</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          {error && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="edit-name">Full Name</Label>
            <Input
              id="edit-name"
              name="name"
              defaultValue={tenant.user.name || ""}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-email">Email</Label>
            <Input
              id="edit-email"
              name="email"
              type="email"
              defaultValue={tenant.user.email}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-phone">Phone Number</Label>
            <Input
              id="edit-phone"
              name="phoneNumber"
              type="tel"
              defaultValue={tenant.phoneNumber || tenant.user.phoneNumber || ""}
              placeholder="e.g. 0712345678"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-channel">Notification Channel</Label>
            <Select name="channelPreference" defaultValue={tenant.channelPreference || "SMS"}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SMS">SMS</SelectItem>
                <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-rent">Monthly Rent (KES)</Label>
            <Input
              id="edit-rent"
              name="rentAmount"
              type="number"
              min="0"
              step="0.01"
              defaultValue={tenant.rentAmount}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-leaseStart">Lease Start</Label>
              <Input
                id="edit-leaseStart"
                name="leaseStart"
                type="date"
                defaultValue={formatDate(tenant.leaseStart)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-leaseEnd">Lease End</Label>
              <Input
                id="edit-leaseEnd"
                name="leaseEnd"
                type="date"
                defaultValue={formatDate(tenant.leaseEnd)}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-status">Status</Label>
            <Select name="status" defaultValue={tenant.status}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="edit-lateFeeExempt"
                checked={lateFeeExempt}
                onChange={(e) => setLateFeeExempt(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="edit-lateFeeExempt">
                Exempt from late fees
              </Label>
            </div>
            {lateFeeExempt && (
              <div className="space-y-2 pl-6">
                <Label htmlFor="edit-lateFeeExemptReason">Reason</Label>
                <Input
                  id="edit-lateFeeExemptReason"
                  name="lateFeeExemptReason"
                  defaultValue={tenant.lateFeeExemptReason || ""}
                  placeholder="e.g. Special arrangement"
                />
              </div>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
