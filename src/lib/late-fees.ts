import { prisma } from "@/lib/prisma";
import { sendMessage } from "@/lib/messaging";

interface LateFeeSummary {
  processed: number;
  skipped: number;
  errors: number;
}

export async function processLateFees(): Promise<LateFeeSummary> {
  const summary: LateFeeSummary = { processed: 0, skipped: 0, errors: 0 };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Find properties with late fee config
  const properties = await prisma.property.findMany({
    where: { lateFeeType: { not: null } },
    select: {
      id: true,
      name: true,
      lateFeeType: true,
      lateFeeAmount: true,
      lateFeeGraceDays: true,
      lateFeeEscalationDays: true,
      lateFeeEscalationMultiplier: true,
    },
  });

  for (const property of properties) {
    if (!property.lateFeeType || !property.lateFeeAmount) continue;

    const graceDays = property.lateFeeGraceDays || 0;
    const cutoffDate = new Date(today);
    cutoffDate.setDate(cutoffDate.getDate() - graceDays);

    // Find overdue invoices for this property, excluding exempt tenants
    const invoices = await prisma.invoice.findMany({
      where: {
        propertyId: property.id,
        status: { in: ["SENT", "PARTIALLY_PAID", "OVERDUE"] },
        dueDate: { lt: cutoffDate },
        tenant: { lateFeeExempt: false },
      },
      include: {
        items: true,
        tenant: {
          include: {
            user: { select: { name: true, id: true } },
          },
        },
      },
    });

    for (const invoice of invoices) {
      const existingLateFees = invoice.items.filter(
        (item) => item.itemType === "LATE_FEE" && !item.waivedAt
      );

      // Calculate days overdue past grace period
      const dueDate = new Date(invoice.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      const daysOverdue = Math.floor(
        (today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
      ) - graceDays;

      // Determine how many fees should exist
      let expectedFeeCount = 1;
      if (property.lateFeeEscalationDays && property.lateFeeEscalationDays > 0) {
        expectedFeeCount = Math.floor(daysOverdue / property.lateFeeEscalationDays);
        if (expectedFeeCount < 1) expectedFeeCount = 1;
      }

      // Skip if we already have enough fees
      if (existingLateFees.length >= expectedFeeCount) {
        summary.skipped++;
        continue;
      }

      try {
        // Calculate fee amount with escalation
        const level = existingLateFees.length; // 0-indexed current level
        const multiplier = property.lateFeeEscalationMultiplier || 1;
        const baseFee =
          property.lateFeeType === "PERCENTAGE"
            ? (property.lateFeeAmount / 100) * invoice.totalAmount
            : property.lateFeeAmount;
        const feeAmount = baseFee * Math.pow(multiplier, level);

        await prisma.$transaction(async (tx) => {
          // Create late fee invoice item
          await tx.invoiceItem.create({
            data: {
              invoiceId: invoice.id,
              description:
                level > 0
                  ? `Late Fee - Level ${level + 1} (${property.lateFeeType === "PERCENTAGE" ? `${property.lateFeeAmount}%` : `KES ${property.lateFeeAmount}`} x${multiplier}^${level})`
                  : `Late Fee (${property.lateFeeType === "PERCENTAGE" ? `${property.lateFeeAmount}%` : `KES ${property.lateFeeAmount}`})`,
              quantity: 1,
              unitPrice: feeAmount,
              amount: feeAmount,
              itemType: "LATE_FEE",
            },
          });

          // Update invoice totals
          await tx.invoice.update({
            where: { id: invoice.id },
            data: {
              subtotal: { increment: feeAmount },
              totalAmount: { increment: feeAmount },
              status: "OVERDUE",
            },
          });
        });

        // Notify tenant
        if (invoice.tenant.phoneNumber) {
          const name = invoice.tenant.user.name || "Tenant";
          const message = `Hi ${name}, a late fee of KES ${feeAmount.toLocaleString()} has been applied to Invoice ${invoice.invoiceNumber}. New total: KES ${(invoice.totalAmount + feeAmount).toLocaleString()}. Please pay immediately. - LipaKodi`;

          await sendMessage(
            invoice.tenant.phoneNumber,
            message,
            invoice.tenant.channelPreference
          );
        }

        // Create in-app notification
        await prisma.notification.create({
          data: {
            userId: invoice.tenant.user.id,
            title: "Late Fee Applied",
            message: `A late fee of KES ${feeAmount.toLocaleString()} has been applied to Invoice ${invoice.invoiceNumber}.`,
            type: "PAYMENT_OVERDUE",
            invoiceId: invoice.id,
          },
        });

        summary.processed++;
      } catch (error) {
        console.error(
          `Error processing late fee for invoice ${invoice.id}:`,
          error
        );
        summary.errors++;
      }
    }
  }

  return summary;
}
