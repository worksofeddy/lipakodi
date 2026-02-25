"use client";

import { useState } from "react";
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
import { Link2, Copy, Check } from "lucide-react";

interface VacantUnit {
  id: string;
  unitNumber: string;
  rent: number;
}

interface GenerateOnboardLinkProps {
  propertyId: string;
  propertyName: string;
  vacantUnits: VacantUnit[];
}

export function GenerateOnboardLink({
  propertyId,
  propertyName,
  vacantUnits,
}: GenerateOnboardLinkProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [link, setLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState("");

  async function handleGenerate() {
    if (!selectedUnit) {
      setError("Please select a unit");
      return;
    }

    setLoading(true);
    setError("");
    setLink("");

    const res = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        unitId: selectedUnit,
        propertyId,
      }),
    });

    const data = await res.json();

    if (res.ok) {
      setLink(data.link);
    } else {
      setError(
        typeof data.error === "string" ? data.error : "Failed to generate link"
      );
    }
    setLoading(false);
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) {
          setLink("");
          setError("");
          setSelectedUnit("");
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={vacantUnits.length === 0}>
          <Link2 className="mr-2 h-4 w-4" />
          Onboard Tenant
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Generate Onboarding Link</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {error && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
              {error}
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            Generate a link for a new tenant to self-register and move into a
            vacant unit at <strong>{propertyName}</strong>. The link expires in 7
            days.
          </p>
          <div className="space-y-2">
            <Label>Select Vacant Unit</Label>
            <Select value={selectedUnit} onValueChange={setSelectedUnit}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a unit" />
              </SelectTrigger>
              <SelectContent>
                {vacantUnits.map((unit) => (
                  <SelectItem key={unit.id} value={unit.id}>
                    Unit {unit.unitNumber} — KES{" "}
                    {unit.rent.toLocaleString()}/mo
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!link ? (
            <Button
              className="w-full"
              onClick={handleGenerate}
              disabled={loading}
            >
              {loading ? "Generating..." : "Generate Link"}
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Onboarding Link</Label>
                <div className="flex gap-2">
                  <Input value={link} readOnly className="text-xs" />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopy}
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Share this link with the tenant. They will be able to register
                and will automatically be assigned to the selected unit.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
