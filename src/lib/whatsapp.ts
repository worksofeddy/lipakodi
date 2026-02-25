import { normalizePhoneNumber } from "@/lib/mpesa";

interface SendWhatsAppResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendWhatsApp(
  phoneNumber: string,
  message: string
): Promise<SendWhatsAppResult> {
  const apiKey = process.env.AT_API_KEY;
  const username = process.env.AT_USERNAME;

  if (!apiKey || !username) {
    return { success: false, error: "Africa's Talking credentials not configured" };
  }

  const normalized = "+" + normalizePhoneNumber(phoneNumber);

  try {
    // Africa's Talking WhatsApp API (requires business approval)
    const response = await fetch("https://content.africastalking.com/version1/messaging", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
        apiKey: apiKey,
      },
      body: new URLSearchParams({
        username: username,
        productName: process.env.AT_WHATSAPP_PRODUCT || "LipaKodi",
        to: normalized,
        message: message,
        channel: "whatsapp",
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return {
        success: true,
        messageId: data?.SMSMessageData?.Recipients?.[0]?.messageId,
      };
    }

    return {
      success: false,
      error: `WhatsApp API returned ${response.status}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "WhatsApp send failed",
    };
  }
}
