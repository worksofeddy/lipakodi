import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils";
import { StkPushButton } from "./stk-push-button";
import { DownloadReceiptButton } from "./download-receipt-button";
import { ExportCsvButton } from "./export-csv-button";

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  DRAFT: "secondary",
  SENT: "outline",
  PAID: "default",
  PARTIALLY_PAID: "outline",
  OVERDUE: "destructive",
  CANCELLED: "secondary",
};

export default async function TenantPaymentsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const tenant = await prisma.tenant.findFirst({
    where: { userId: session.user.id },
    include: {
      user: { select: { name: true } },
      unit: { include: { property: { include: { mpesaConfig: true } } } },
      invoices: {
        include: { items: true, payments: true },
        orderBy: { createdAt: "desc" },
      },
      payments: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });

  const invoices = tenant?.invoices || [];
  const payments = tenant?.payments || [];
  const mpesaConfig = tenant?.unit.property.mpesaConfig;
  const accountNumber = tenant?.unit.accountNumber;

  const outstandingInvoices = invoices.filter(
    (inv) => inv.status === "SENT" || inv.status === "PARTIALLY_PAID" || inv.status === "OVERDUE"
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Payments</h1>
        <p className="text-muted-foreground">
          View invoices and make payments via M-Pesa
        </p>
      </div>

      {mpesaConfig && accountNumber && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-800">M-Pesa Payment Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="font-medium">1.</span> Go to M-Pesa {"->"} Lipa
              na M-Pesa {"->"} Pay Bill
            </p>
            <p>
              <span className="font-medium">2.</span> Business Number:{" "}
              <span className="font-bold font-mono">{mpesaConfig.shortcode}</span>
            </p>
            <p>
              <span className="font-medium">3.</span> Account Number:{" "}
              <span className="font-bold font-mono">{accountNumber}</span>
            </p>
            <p>
              <span className="font-medium">4.</span> Enter amount and your
              M-Pesa PIN
            </p>
          </CardContent>
        </Card>
      )}

      {outstandingInvoices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Outstanding Invoices</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {outstandingInvoices.map((invoice) => {
              const outstanding = invoice.totalAmount - invoice.amountPaid;
              return (
                <div
                  key={invoice.id}
                  className="border rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold">{invoice.invoiceNumber}</p>
                      <p className="text-sm text-muted-foreground">
                        Due: {formatDate(invoice.dueDate)}
                      </p>
                    </div>
                    <Badge variant={statusVariant[invoice.status] || "secondary"}>
                      {invoice.status.replace("_", " ")}
                    </Badge>
                  </div>
                  <div className="space-y-1 text-sm">
                    {invoice.items.map((item) => (
                      <div key={item.id} className="flex justify-between">
                        <span className="text-muted-foreground">
                          {item.description}
                        </span>
                        <span>{formatCurrency(item.amount)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between border-t pt-1 font-bold">
                      <span>Outstanding</span>
                      <span className="text-red-600">
                        {formatCurrency(outstanding)}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {mpesaConfig && outstanding > 0 && (
                      <StkPushButton
                        invoiceId={invoice.id}
                        amount={outstanding}
                        phoneNumber={tenant?.phoneNumber || ""}
                      />
                    )}
                    <DownloadReceiptButton
                      data={{
                        invoiceNumber: invoice.invoiceNumber,
                        issueDate: formatDate(invoice.issueDate),
                        dueDate: formatDate(invoice.dueDate),
                        status: invoice.status,
                        totalAmount: invoice.totalAmount,
                        amountPaid: invoice.amountPaid,
                        items: invoice.items.map((item) => ({
                          description: item.description,
                          quantity: item.quantity,
                          unitPrice: item.unitPrice,
                          amount: item.amount,
                        })),
                        tenantName: tenant?.user?.name || "Tenant",
                        propertyName: tenant?.unit.property.name || "",
                        unitNumber: tenant?.unit.unitNumber || "",
                        mpesaReceiptNumber:
                          invoice.payments?.[0]?.mpesaReceiptNumber || undefined,
                        paidDate: invoice.payments?.[0]?.paidDate
                          ? formatDate(invoice.payments[0].paidDate)
                          : undefined,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Payment History</CardTitle>
          {payments.length > 0 && (
            <ExportCsvButton
              payments={payments.map((p) => ({
                date: p.paidDate
                  ? formatDate(p.paidDate)
                  : formatDate(p.dueDate),
                amount: p.amount,
                status: p.status,
                method: p.method || "N/A",
                reference: p.mpesaReceiptNumber || p.reference || "N/A",
              }))}
            />
          )}
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">
              No payments recorded.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Reference</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      {payment.paidDate
                        ? formatDate(payment.paidDate)
                        : formatDate(payment.dueDate)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(payment.amount)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          payment.status === "PAID"
                            ? "default"
                            : payment.status === "OVERDUE"
                              ? "destructive"
                              : "secondary"
                        }
                      >
                        {payment.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{payment.method || "—"}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {payment.mpesaReceiptNumber || payment.reference || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
