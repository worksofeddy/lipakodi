import { prisma } from "@/lib/prisma";
import { sendRentReminder } from "@/lib/sms";
import { SmsType } from "@prisma/client";

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
          user: { select: { name: true } },
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

    const result = await sendRentReminder(
      {
        id: invoice.tenant.id,
        phoneNumber: invoice.tenant.phoneNumber,
        user: invoice.tenant.user,
      },
      {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        totalAmount: invoice.totalAmount,
        amountPaid: invoice.amountPaid,
        dueDate: invoice.dueDate,
      },
      smsType
    );

    if (result.success) {
      summary.sent++;

      // Create in-app notification alongside SMS
      await prisma.notification.create({
        data: {
          userId: invoice.tenant.userId,
          title: "Rent Reminder Sent",
          message: `An SMS reminder was sent for Invoice ${invoice.invoiceNumber}.`,
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
