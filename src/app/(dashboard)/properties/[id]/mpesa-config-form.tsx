"use client";

import { useState, useEffect } from "react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface MpesaConfig {
  consumerKey: string;
  consumerSecret: string;
  shortcode: string;
  passkey: string;
  environment: string;
  isActive: boolean;
}

export function MpesaConfigForm({ propertyId }: { propertyId: string }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [config, setConfig] = useState<MpesaConfig | null>(null);
  const [message, setMessage] = useState("");

  const [consumerKey, setConsumerKey] = useState("");
  const [consumerSecret, setConsumerSecret] = useState("");
  const [shortcode, setShortcode] = useState("");
  const [passkey, setPasskey] = useState("");
  const [environment, setEnvironment] = useState("SANDBOX");

  useEffect(() => {
    async function loadConfig() {
      setLoading(true);
      try {
        const res = await fetch(`/api/properties/${propertyId}/mpesa-config`);
        const data = await res.json();
        if (data.config) {
          setConfig(data.config);
          setConsumerKey(data.config.consumerKey);
          setConsumerSecret(data.config.consumerSecret);
          setShortcode(data.config.shortcode);
          setPasskey(data.config.passkey);
          setEnvironment(data.config.environment);
        }
      } catch {
        console.error("Failed to load M-Pesa config");
      }
      setLoading(false);
    }
    loadConfig();
  }, [propertyId]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      const res = await fetch(`/api/properties/${propertyId}/mpesa-config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          consumerKey,
          consumerSecret,
          shortcode,
          passkey,
          environment,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setConfig(data.config);
        setMessage("M-Pesa configuration saved successfully!");
      } else {
        setMessage("Failed to save configuration.");
      }
    } catch {
      setMessage("An error occurred.");
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading M-Pesa configuration...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>M-Pesa Configuration</CardTitle>
          {config && (
            <Badge variant={config.isActive ? "default" : "secondary"}>
              {config.isActive ? "Active" : "Inactive"}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="shortcode">Paybill Number (Shortcode)</Label>
            <Input
              id="shortcode"
              value={shortcode}
              onChange={(e) => setShortcode(e.target.value)}
              placeholder="e.g. 174379"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="consumerKey">Consumer Key</Label>
            <Input
              id="consumerKey"
              value={consumerKey}
              onChange={(e) => setConsumerKey(e.target.value)}
              placeholder="Daraja API Consumer Key"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="consumerSecret">Consumer Secret</Label>
            <Input
              id="consumerSecret"
              type="password"
              value={consumerSecret}
              onChange={(e) => setConsumerSecret(e.target.value)}
              placeholder="Daraja API Consumer Secret"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="passkey">Passkey</Label>
            <Input
              id="passkey"
              type="password"
              value={passkey}
              onChange={(e) => setPasskey(e.target.value)}
              placeholder="Lipa Na M-Pesa Online Passkey"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="environment">Environment</Label>
            <Select value={environment} onValueChange={setEnvironment}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SANDBOX">Sandbox (Testing)</SelectItem>
                <SelectItem value="PRODUCTION">Production</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {message && (
            <p
              className={`text-sm ${message.includes("success") ? "text-green-600" : "text-red-600"}`}
            >
              {message}
            </p>
          )}
          <Button type="submit" disabled={saving} className="w-full">
            {saving ? "Saving..." : config ? "Update Configuration" : "Save Configuration"}
          </Button>
        </form>

        {config && (
          <div className="mt-6 border-t pt-4 space-y-3">
            <div>
              <h4 className="font-medium text-sm">C2B Paybill Registration</h4>
              <p className="text-xs text-muted-foreground mt-1">
                Register your confirmation URLs with Safaricom so tenants can pay directly
                from M-Pesa using your Paybill number and their account number — no portal needed.
              </p>
            </div>
            <Button
              variant="outline"
              className="w-full"
              disabled={registering}
              onClick={async () => {
                setRegistering(true);
                setMessage("");
                try {
                  const res = await fetch("/api/mpesa/register-urls", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ propertyId }),
                  });
                  const data = await res.json();
                  if (res.ok) {
                    setMessage("C2B URLs registered successfully! Tenants can now pay directly via M-Pesa Paybill.");
                  } else {
                    setMessage(data.error || "Failed to register C2B URLs");
                  }
                } catch {
                  setMessage("An error occurred while registering URLs.");
                }
                setRegistering(false);
              }}
            >
              {registering ? "Registering..." : "Register C2B Paybill URLs"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
