"use client";

import { Button } from "@/components/ui/button";
import { FileSpreadsheet } from "lucide-react";

interface PaymentRow {
  date: string;
  amount: number;
  status: string;
  method: string;
  reference: string;
}

export function ExportCsvButton({ payments }: { payments: PaymentRow[] }) {
  function handleExport() {
    const headers = ["Date", "Amount", "Status", "Method", "Reference"];
    const rows = payments.map((p) => [
      p.date,
      p.amount.toString(),
      p.status,
      p.method,
      p.reference,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `payments-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Button variant="outline" size="sm" onClick={handleExport}>
      <FileSpreadsheet className="mr-2 h-4 w-4" />
      Export CSV
    </Button>
  );
}
