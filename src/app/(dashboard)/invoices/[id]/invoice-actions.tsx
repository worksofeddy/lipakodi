"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Send, Ban } from "lucide-react";

export function InvoiceActions({
  invoiceId,
  currentStatus,
}: {
  invoiceId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function updateStatus(status: string) {
    setLoading(true);
    const res = await fetch(`/api/invoices/${invoiceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <div className="flex gap-2">
      {currentStatus === "DRAFT" && (
        <Button
          size="sm"
          onClick={() => updateStatus("SENT")}
          disabled={loading}
        >
          <Send className="mr-2 h-4 w-4" />
          {loading ? "Sending..." : "Send to Tenant"}
        </Button>
      )}
      {(currentStatus === "DRAFT" || currentStatus === "SENT") && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => updateStatus("CANCELLED")}
          disabled={loading}
        >
          <Ban className="mr-2 h-4 w-4" />
          Cancel
        </Button>
      )}
    </div>
  );
}
