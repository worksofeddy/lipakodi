import { sendSms } from "@/lib/sms";
import { sendWhatsApp } from "@/lib/whatsapp";
import { NotificationChannel } from "@prisma/client";

interface SendMessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
  channel: string;
}

export async function sendMessage(
  phoneNumber: string,
  message: string,
  channel: NotificationChannel = "SMS"
): Promise<SendMessageResult> {
  if (channel === "WHATSAPP") {
    const result = await sendWhatsApp(phoneNumber, message);
    if (result.success) {
      return { ...result, channel: "whatsapp" };
    }
    // Fallback to SMS if WhatsApp fails
    console.warn("WhatsApp failed, falling back to SMS:", result.error);
    const smsResult = await sendSms(phoneNumber, message);
    return { ...smsResult, channel: "sms-fallback" };
  }

  const result = await sendSms(phoneNumber, message);
  return { ...result, channel: "sms" };
}
