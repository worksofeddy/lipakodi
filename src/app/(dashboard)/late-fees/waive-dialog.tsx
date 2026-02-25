"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface WaiveDialogProps {
  itemId: string;
  amount: number;
  invoiceNumber: string;
  onWaived: () => void;
}

export function WaiveDialog({
  itemId,
  amount,
  invoiceNumber,
  onWaived,
}: WaiveDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reason, setReason] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch(`/api/late-fees/${itemId}/waive`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });

    if (res.ok) {
      setOpen(false);
      setReason("");
      onWaived();
    } else {
      const data = await res.json();
      setError(typeof data.error === "string" ? data.error : "Failed to waive");
    }
    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          Waive
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Waive Late Fee</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
              {error}
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            Waive the late fee of{" "}
            <span className="font-medium text-foreground">
              KES {amount.toLocaleString()}
            </span>{" "}
            on Invoice {invoiceNumber}? This will reduce the invoice total.
          </p>
          <div className="space-y-2">
            <Label htmlFor="waive-reason">Reason for waiver</Label>
            <Textarea
              id="waive-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Tenant had an emergency, first-time grace..."
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading || !reason}>
            {loading ? "Waiving..." : "Confirm Waiver"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
