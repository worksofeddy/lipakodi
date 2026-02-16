import { prisma } from "@/lib/prisma";
import { normalizePhoneNumber } from "@/lib/mpesa";

export function normalizeAccountNumber(str: string): string {
  return str.replace(/\s+/g, "").toUpperCase();
}

interface C2BCallbackData {
  TransID: string;
  TransAmount: string;
  BusinessShortCode: string;
  BillRefNumber?: string;
  MSISDN: string;
  FirstName?: string;
  LastName?: string;
  TransTime: string;
}

interface StkCallbackData {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResultCode: number;
  ResultDesc: string;
  CallbackMetadata?: {
    Item: Array<{ Name: string; Value?: string | number }>;
  };
}

async function findTenantByAccountOrPhone(
  billRef: string | undefined,
  msisdn: string
) {
  if (billRef) {
    const normalized = normalizeAccountNumber(billRef);
    const unit = await prisma.unit.findFirst({
      where: { accountNumber: normalized },
      include: {
        tenant: {
          include: {
            user: true,
            unit: { include: { property: true } },
          },
        },
      },
    });
    if (unit?.tenant) return unit.tenant;
  }

  const normalizedPhone = normalizePhoneNumber(msisdn);
  const phoneVariants = [
    normalizedPhone,
    "+" + normalizedPhone,
    "0" + normalizedPhone.substring(3),
  ];

  const tenant = await prisma.tenant.findFirst({
    where: {
      OR: [
        { phoneNumber: { in: phoneVariants } },
        { user: { phoneNumber: { in: phoneVariants } } },
      ],
      status: "ACTIVE",
    },
    include: {
      user: true,
      unit: { include: { property: true } },
    },
  });

  return tenant;
}

export async function reconcileC2BPayment(data: C2BCallbackData) {
  const existing = await prisma.mpesaTransaction.findUnique({
    where: { transId: data.TransID },
  });
  if (existing) return existing;

  const tenant = await findTenantByAccountOrPhone(
    data.BillRefNumber,
    data.MSISDN
  );

  const amount = parseFloat(data.TransAmount);

  const result = await prisma.$transaction(async (tx) => {
    let payment = null;
    let reconciliationStatus: "MATCHED" | "UNMATCHED" = "UNMATCHED";

    if (tenant) {
      reconciliationStatus = "MATCHED";

      const openInvoice = await tx.invoice.findFirst({
        where: {
          tenantId: tenant.id,
          status: { in: ["SENT", "PARTIALLY_PAID"] },
        },
        orderBy: { dueDate: "asc" },
      });

      payment = await tx.payment.create({
        data: {
          tenantId: tenant.id,
          amount,
          dueDate: openInvoice?.dueDate ?? new Date(),
          paidDate: new Date(),
          status: "PAID",
          method: "MPESA",
          reference: data.TransID,
          mpesaReceiptNumber: data.TransID,
          mpesaPhoneNumber: data.MSISDN,
          invoiceId: openInvoice?.id,
          reconciliationStatus,
        },
      });

      if (openInvoice) {
        const newAmountPaid = openInvoice.amountPaid + amount;
        const newStatus =
          newAmountPaid >= openInvoice.totalAmount ? "PAID" : "PARTIALLY_PAID";

        await tx.invoice.update({
          where: { id: openInvoice.id },
          data: { amountPaid: newAmountPaid, status: newStatus },
        });
      }

      const landlord = await tx.property.findUnique({
        where: { id: tenant.unit.propertyId },
        select: { landlordId: true },
      });

      if (landlord) {
        await tx.notification.create({
          data: {
            userId: landlord.landlordId,
            title: "Payment Received",
            message: `${data.FirstName || "Tenant"} ${data.LastName || ""} paid KES ${amount.toLocaleString()} via M-Pesa. Ref: ${data.TransID}`,
            type: "PAYMENT_RECEIVED",
            paymentId: payment.id,
            invoiceId: openInvoice?.id,
          },
        });
      }
    }

    const mpesaTx = await tx.mpesaTransaction.create({
      data: {
        transId: data.TransID,
        transAmount: amount,
        businessShortCode: data.BusinessShortCode,
        billRefNumber: data.BillRefNumber,
        msisdn: data.MSISDN,
        firstName: data.FirstName,
        lastName: data.LastName,
        transTime: data.TransTime,
        paymentId: payment?.id,
        isReconciled: !!tenant,
        rawCallbackData: data as object,
      },
    });

    return mpesaTx;
  });

  return result;
}

export async function reconcileStkCallback(data: StkCallbackData) {
  if (data.ResultCode !== 0) return null;

  const metadata = data.CallbackMetadata?.Item || [];
  const getValue = (name: string) =>
    metadata.find((i) => i.Name === name)?.Value;

  const amount = getValue("Amount") as number;
  const receiptNumber = getValue("MpesaReceiptNumber") as string;
  const phone = String(getValue("PhoneNumber") || "");

  if (!receiptNumber) return null;

  return reconcileC2BPayment({
    TransID: receiptNumber,
    TransAmount: String(amount),
    BusinessShortCode: "",
    MSISDN: phone,
    TransTime: new Date().toISOString(),
  });
}
