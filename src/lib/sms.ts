import AfricasTalking from "africastalking";
import { prisma } from "@/lib/prisma";
import { normalizePhoneNumber } from "@/lib/mpesa";
import { SmsType } from "@prisma/client";

function getSmsClient() {
  if (!process.env.AT_API_KEY || !process.env.AT_USERNAME) {
    throw new Error("Africa's Talking credentials not configured");
  }
  return AfricasTalking({
    apiKey: process.env.AT_API_KEY,
    username: process.env.AT_USERNAME,
  }).SMS;
}

interface SendSmsResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendSms(
  phoneNumber: string,
  message: string
): Promise<SendSmsResult> {
  const normalized = "+" + normalizePhoneNumber(phoneNumber);

  try {
    const result = await getSmsClient().send({
      to: [normalized],
      message,
      ...(process.env.AT_SENDER_ID ? { from: process.env.AT_SENDER_ID } : {}),
    });

    const recipient = result.SMSMessageData?.Recipients?.[0];
    if (recipient && recipient.statusCode === 101) {
      return { success: true, messageId: recipient.messageId };
    }

    return {
      success: false,
      error: recipient?.status || "Unknown error from provider",
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "SMS send failed",
    };
  }
}

interface ReminderRecipient {
  id: string;
  phoneNumber: string | null;
  user: { name: string | null };
}

interface ReminderInvoice {
  id: string;
  invoiceNumber: string;
  totalAmount: number;
  amountPaid: number;
  dueDate: Date;
}

function formatReminderMessage(
  tenant: ReminderRecipient,
  invoice: ReminderInvoice,
  type: SmsType
): string {
  const name = tenant.user.name || "Tenant";
  const balance = (invoice.totalAmount - invoice.amountPaid).toLocaleString();
  const dueDate = invoice.dueDate.toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  switch (type) {
    case "REMINDER_BEFORE_DUE":
      return `Hi ${name}, your rent of KES ${balance} (Invoice ${invoice.invoiceNumber}) is due on ${dueDate}. Please pay on time to avoid penalties. - LipaKodi`;
    case "REMINDER_ON_DUE":
      return `Hi ${name}, your rent of KES ${balance} (Invoice ${invoice.invoiceNumber}) is due today (${dueDate}). Please make your payment. - LipaKodi`;
    case "REMINDER_OVERDUE":
      return `Hi ${name}, your rent of KES ${balance} (Invoice ${invoice.invoiceNumber}) was due on ${dueDate} and is now overdue. Please pay immediately. - LipaKodi`;
  }
}

export async function sendRentReminder(
  tenant: ReminderRecipient,
  invoice: ReminderInvoice,
  type: SmsType
): Promise<SendSmsResult> {
  if (!tenant.phoneNumber) {
    return { success: false, error: "No phone number" };
  }

  const message = formatReminderMessage(tenant, invoice, type);
  const result = await sendSms(tenant.phoneNumber, message);

  await prisma.smsLog.create({
    data: {
      phoneNumber: normalizePhoneNumber(tenant.phoneNumber),
      message,
      status: result.success ? "SENT" : "FAILED",
      invoiceId: invoice.id,
      tenantId: tenant.id,
      type,
      externalId: result.messageId || null,
      errorMessage: result.error || null,
    },
  });

  return result;
}
