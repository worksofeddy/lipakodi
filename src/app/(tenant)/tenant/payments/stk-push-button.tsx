"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/utils";
import { Smartphone } from "lucide-react";

export function StkPushButton({
  invoiceId,
  amount,
  phoneNumber: defaultPhone,
}: {
  invoiceId: string;
  amount: number;
  phoneNumber: string;
}) {
  const [phone, setPhone] = useState(defaultPhone);
  const [payAmount, setPayAmount] = useState(amount);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showInput, setShowInput] = useState(false);

  async function handlePay() {
    if (!showInput) {
      setShowInput(true);
      return;
    }

    if (!phone) {
      setMessage("Please enter your M-Pesa phone number");
      return;
    }

    const kenyanPhoneRegex = /^(?:\+?254|0)[17]\d{8}$/;
    if (!kenyanPhoneRegex.test(phone.replace(/\s/g, ""))) {
      setMessage("Enter a valid Kenyan phone number (e.g. 0712345678 or 254712345678)");
      return;
    }

    if (!payAmount || payAmount <= 0) {
      setMessage("Please enter a valid amount");
      return;
    }

    if (payAmount > amount) {
      setMessage(`Amount cannot exceed outstanding balance of ${formatCurrency(amount)}`);
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/mpesa/stk-push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId, phoneNumber: phone, amount: payAmount }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage(data.message);
        setShowInput(false);
      } else {
        setMessage(data.error || "Failed to initiate payment");
      }
    } catch {
      setMessage("An error occurred. Please try again.");
    }
    setLoading(false);
  }

  return (
    <div className="space-y-3">
      {showInput && (
        <div className="space-y-3 border rounded-lg p-3 bg-muted/30">
          <div className="space-y-1">
            <Label htmlFor={`phone-${invoiceId}`} className="text-xs">Phone Number</Label>
            <Input
              id={`phone-${invoiceId}`}
              placeholder="e.g. 0712345678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`amount-${invoiceId}`} className="text-xs">
              Amount (Outstanding: {formatCurrency(amount)})
            </Label>
            <Input
              id={`amount-${invoiceId}`}
              type="number"
              min="1"
              max={amount}
              value={payAmount}
              onChange={(e) => setPayAmount(Number(e.target.value))}
            />
          </div>
        </div>
      )}
      {message && (
        <p
          className={`text-sm ${message.includes("Check your phone") ? "text-green-600" : "text-red-600"}`}
        >
          {message}
        </p>
      )}
      <Button onClick={handlePay} disabled={loading} className="w-full sm:w-auto">
        <Smartphone className="mr-2 h-4 w-4" />
        {loading
          ? "Sending..."
          : showInput
            ? `Pay ${formatCurrency(payAmount)} via M-Pesa`
            : `Pay with M-Pesa (${formatCurrency(amount)})`}
      </Button>
    </div>
  );
}
