import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
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
import { InvoiceActions } from "./invoice-actions";

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  DRAFT: "secondary",
  SENT: "outline",
  PAID: "default",
  PARTIALLY_PAID: "outline",
  OVERDUE: "destructive",
  CANCELLED: "secondary",
};

export default async function InvoiceDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const invoice = await prisma.invoice.findUnique({
    where: { id: params.id },
    include: {
      tenant: {
        include: {
          user: { select: { name: true, email: true } },
          unit: { include: { property: true } },
        },
      },
      items: true,
      payments: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!invoice) notFound();

  const outstanding = invoice.totalAmount - invoice.amountPaid;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Invoice {invoice.invoiceNumber}
          </h1>
          <p className="text-muted-foreground">
            {invoice.tenant.unit.property.name} - Unit{" "}
            {invoice.tenant.unit.unitNumber}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge
            variant={statusVariant[invoice.status] || "secondary"}
            className="text-sm px-3 py-1"
          >
            {invoice.status.replace("_", " ")}
          </Badge>
          <InvoiceActions invoiceId={invoice.id} currentStatus={invoice.status} />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tenant Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p>
              <span className="text-muted-foreground">Name:</span>{" "}
              {invoice.tenant.user.name}
            </p>
            <p>
              <span className="text-muted-foreground">Email:</span>{" "}
              {invoice.tenant.user.email}
            </p>
            <p>
              <span className="text-muted-foreground">Property:</span>{" "}
              {invoice.tenant.unit.property.name}
            </p>
            <p>
              <span className="text-muted-foreground">Unit:</span>{" "}
              {invoice.tenant.unit.unitNumber}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Invoice Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p>
              <span className="text-muted-foreground">Issue Date:</span>{" "}
              {formatDate(invoice.issueDate)}
            </p>
            <p>
              <span className="text-muted-foreground">Due Date:</span>{" "}
              {formatDate(invoice.dueDate)}
            </p>
            <p>
              <span className="text-muted-foreground">Total:</span>{" "}
              <span className="font-bold">
                {formatCurrency(invoice.totalAmount)}
              </span>
            </p>
            <p>
              <span className="text-muted-foreground">Paid:</span>{" "}
              {formatCurrency(invoice.amountPaid)}
            </p>
            <p>
              <span className="text-muted-foreground">Outstanding:</span>{" "}
              <span className={outstanding > 0 ? "text-red-600 font-bold" : "text-green-600 font-bold"}>
                {formatCurrency(outstanding)}
              </span>
            </p>
            {invoice.notes && (
              <p>
                <span className="text-muted-foreground">Notes:</span>{" "}
                {invoice.notes}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Line Items</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoice.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Badge variant="outline">
                      {item.itemType.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>{item.description}</TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(item.unitPrice)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(item.amount)}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell colSpan={4} className="text-right font-bold">
                  Total
                </TableCell>
                <TableCell className="text-right font-bold">
                  {formatCurrency(invoice.totalAmount)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {invoice.payments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Payment History</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      {payment.paidDate
                        ? formatDate(payment.paidDate)
                        : formatDate(payment.createdAt)}
                    </TableCell>
                    <TableCell>{formatCurrency(payment.amount)}</TableCell>
                    <TableCell>{payment.method || "—"}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {payment.mpesaReceiptNumber || payment.reference || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          payment.status === "PAID" ? "default" : "secondary"
                        }
                      >
                        {payment.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
