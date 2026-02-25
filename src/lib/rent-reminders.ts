import { prisma } from "@/lib/prisma";
import { sendMessage } from "@/lib/messaging";
import { normalizePhoneNumber } from "@/lib/mpesa";
import { SmsType, NotificationChannel } from "@prisma/client";

interface ReminderSummary {
  sent: number;
  failed: number;
  skipped: number;
}

function getSmsType(daysUntilDue: number): SmsType | null {
  if (daysUntilDue === 3) return "REMINDER_BEFORE_DUE";
  if (daysUntilDue === 0) return "REMINDER_ON_DUE";
  if (daysUntilDue < 0) return "REMINDER_OVERDUE";
  return null;
}

function formatReminderMessage(
  name: string,
  balance: string,
  invoiceNumber: string,
  dueDate: string,
  type: SmsType
): string {
  switch (type) {
    case "REMINDER_BEFORE_DUE":
      return `Hi ${name}, your rent of KES ${balance} (Invoice ${invoiceNumber}) is due on ${dueDate}. Please pay on time to avoid penalties. - LipaKodi`;
    case "REMINDER_ON_DUE":
      return `Hi ${name}, your rent of KES ${balance} (Invoice ${invoiceNumber}) is due today (${dueDate}). Please make your payment. - LipaKodi`;
    case "REMINDER_OVERDUE":
      return `Hi ${name}, your rent of KES ${balance} (Invoice ${invoiceNumber}) was due on ${dueDate} and is now overdue. Please pay immediately. - LipaKodi`;
  }
}

export async function processRentReminders(): Promise<ReminderSummary> {
  const summary: ReminderSummary = { sent: 0, failed: 0, skipped: 0 };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Query unpaid invoices (SENT, PARTIALLY_PAID, or OVERDUE)
  const invoices = await prisma.invoice.findMany({
    where: {
      status: { in: ["SENT", "PARTIALLY_PAID", "OVERDUE"] },
    },
    include: {
      tenant: {
        include: {
          user: { select: { name: true, id: true } },
        },
      },
      smsLogs: {
        select: { type: true, status: true },
      },
    },
  });

  for (const invoice of invoices) {
    const dueDate = new Date(invoice.dueDate);
    dueDate.setHours(0, 0, 0, 0);

    const diffTime = dueDate.getTime() - today.getTime();
    const daysUntilDue = Math.round(diffTime / (1000 * 60 * 60 * 24));

    const smsType = getSmsType(daysUntilDue);
    if (!smsType) {
      summary.skipped++;
      continue;
    }

    // For overdue, only send once per week (check if sent in last 7 days)
    if (smsType === "REMINDER_OVERDUE") {
      const recentOverdueSms = await prisma.smsLog.findFirst({
        where: {
          invoiceId: invoice.id,
          type: "REMINDER_OVERDUE",
          status: "SENT",
          createdAt: {
            gte: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      });
      if (recentOverdueSms) {
        summary.skipped++;
        continue;
      }
    } else {
      // For BEFORE_DUE and ON_DUE, only send once per invoice
      const alreadySent = invoice.smsLogs.some(
        (log) => log.type === smsType && log.status === "SENT"
      );
      if (alreadySent) {
        summary.skipped++;
        continue;
      }
    }

    if (!invoice.tenant.phoneNumber) {
      summary.skipped++;
      continue;
    }

    const name = invoice.tenant.user.name || "Tenant";
    const balance = (invoice.totalAmount - invoice.amountPaid).toLocaleString();
    const dueDateStr = invoice.dueDate.toLocaleDateString("en-KE", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    const message = formatReminderMessage(
      name,
      balance,
      invoice.invoiceNumber,
      dueDateStr,
      smsType
    );

    const channel: NotificationChannel = invoice.tenant.channelPreference;
    const result = await sendMessage(
      invoice.tenant.phoneNumber,
      message,
      channel
    );

    // Determine provider string for SmsLog
    let provider = "africastalking";
    if (result.channel === "whatsapp") {
      provider = "africastalking-whatsapp";
    } else if (result.channel === "sms-fallback") {
      provider = "africastalking"; // fell back to SMS
    }

    await prisma.smsLog.create({
      data: {
        phoneNumber: normalizePhoneNumber(invoice.tenant.phoneNumber),
        message,
        status: result.success ? "SENT" : "FAILED",
        provider,
        invoiceId: invoice.id,
        tenantId: invoice.tenant.id,
        type: smsType,
        externalId: result.messageId || null,
        errorMessage: result.error || null,
      },
    });

    if (result.success) {
      summary.sent++;

      // Create in-app notification alongside message
      await prisma.notification.create({
        data: {
          userId: invoice.tenant.user.id,
          title: "Rent Reminder Sent",
          message: `A reminder was sent for Invoice ${invoice.invoiceNumber}.`,
          type: "SMS_REMINDER",
          invoiceId: invoice.id,
        },
      });
    } else {
      summary.failed++;
    }
  }

  return summary;
}
