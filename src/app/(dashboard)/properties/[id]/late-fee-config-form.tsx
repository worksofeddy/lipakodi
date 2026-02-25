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
import { Clock } from "lucide-react";

interface LateFeeConfigFormProps {
  propertyId: string;
  lateFeeType: string | null;
  lateFeeAmount: number | null;
  lateFeeGraceDays: number;
  lateFeeEscalationDays: number | null;
  lateFeeEscalationMultiplier: number | null;
}

export function LateFeeConfigForm({
  propertyId,
  lateFeeType,
  lateFeeAmount,
  lateFeeGraceDays,
  lateFeeEscalationDays,
  lateFeeEscalationMultiplier,
}: LateFeeConfigFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [feeType, setFeeType] = useState(lateFeeType || "");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const selectedType = feeType || null;

    const res = await fetch(`/api/properties/${propertyId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lateFeeType: selectedType || null,
        lateFeeAmount: selectedType
          ? Number(formData.get("lateFeeAmount"))
          : null,
        lateFeeGraceDays: Number(formData.get("lateFeeGraceDays")) || 0,
        lateFeeEscalationDays: formData.get("lateFeeEscalationDays")
          ? Number(formData.get("lateFeeEscalationDays"))
          : null,
        lateFeeEscalationMultiplier: formData.get("lateFeeEscalationMultiplier")
          ? Number(formData.get("lateFeeEscalationMultiplier"))
          : null,
      }),
    });

    if (res.ok) {
      setOpen(false);
      router.refresh();
    } else {
      const data = await res.json();
      setError(
        typeof data.error === "string" ? data.error : "Failed to save"
      );
    }
    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Clock className="mr-2 h-4 w-4" />
          Late Fees
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Late Fee Configuration</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          {error && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label>Fee Type</Label>
            <Select value={feeType} onValueChange={setFeeType}>
              <SelectTrigger>
                <SelectValue placeholder="No late fees" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">No Late Fees</SelectItem>
                <SelectItem value="PERCENTAGE">
                  Percentage of Invoice
                </SelectItem>
                <SelectItem value="FIXED">Fixed Amount</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {feeType && feeType !== "NONE" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="lateFeeAmount">
                  {feeType === "PERCENTAGE"
                    ? "Percentage (%)"
                    : "Amount (KES)"}
                </Label>
                <Input
                  id="lateFeeAmount"
                  name="lateFeeAmount"
                  type="number"
                  min="0"
                  step={feeType === "PERCENTAGE" ? "0.1" : "1"}
                  defaultValue={lateFeeAmount || ""}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lateFeeGraceDays">
                  Grace Period (days after due date)
                </Label>
                <Input
                  id="lateFeeGraceDays"
                  name="lateFeeGraceDays"
                  type="number"
                  min="0"
                  defaultValue={lateFeeGraceDays}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lateFeeEscalationDays">
                  Escalation Interval (days, optional)
                </Label>
                <Input
                  id="lateFeeEscalationDays"
                  name="lateFeeEscalationDays"
                  type="number"
                  min="1"
                  defaultValue={lateFeeEscalationDays || ""}
                  placeholder="e.g. 7 (apply additional fee every 7 days)"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lateFeeEscalationMultiplier">
                  Escalation Multiplier (optional)
                </Label>
                <Input
                  id="lateFeeEscalationMultiplier"
                  name="lateFeeEscalationMultiplier"
                  type="number"
                  min="1"
                  step="0.1"
                  defaultValue={lateFeeEscalationMultiplier || ""}
                  placeholder="e.g. 1.5 (each fee is 1.5x the previous)"
                />
              </div>
            </>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Saving..." : "Save Configuration"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
