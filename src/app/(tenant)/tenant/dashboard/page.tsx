import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Building2, CreditCard, Wrench, Calendar } from "lucide-react";
import Link from "next/link";

export default async function TenantDashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const tenant = await prisma.tenant.findFirst({
    where: { userId: session.user.id, status: "ACTIVE" },
    include: {
      unit: { include: { property: { include: { mpesaConfig: true } } } },
      invoices: {
        where: { status: { in: ["SENT", "PARTIALLY_PAID", "OVERDUE"] } },
        include: { items: true },
        orderBy: { dueDate: "asc" },
        take: 5,
      },
      payments: { orderBy: { createdAt: "desc" }, take: 5 },
      maintenanceRequests: {
        where: { status: { in: ["OPEN", "IN_PROGRESS"] } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!tenant) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Tenant Dashboard</h1>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              You are not currently assigned to any unit. Please contact your landlord.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const mpesaConfig = tenant.unit.property.mpesaConfig;
  const accountNumber = tenant.unit.accountNumber;
  const totalOutstanding = tenant.invoices.reduce(
    (sum, inv) => sum + (inv.totalAmount - inv.amountPaid),
    0
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Welcome, {session.user.name}</h1>
        <p className="text-muted-foreground">Your tenant dashboard</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Property</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">{tenant.unit.property.name}</div>
            <p className="text-sm text-muted-foreground">Unit {tenant.unit.unitNumber}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Rent</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(tenant.rentAmount)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Lease Ends</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">{formatDate(tenant.leaseEnd)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Open Requests</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tenant.maintenanceRequests.length}</div>
          </CardContent>
        </Card>
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
              <span className="font-bold font-mono text-lg">{mpesaConfig.shortcode}</span>
            </p>
            <p>
              <span className="font-medium">3.</span> Account Number:{" "}
              <span className="font-bold font-mono text-lg">{accountNumber}</span>
            </p>
            <p>
              <span className="font-medium">4.</span> Enter amount and your
              M-Pesa PIN
            </p>
          </CardContent>
        </Card>
      )}

      {tenant.invoices.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-orange-800">Outstanding Invoices</CardTitle>
            <span className="text-lg font-bold text-orange-800">
              {formatCurrency(totalOutstanding)}
            </span>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {tenant.invoices.map((invoice) => {
                const outstanding = invoice.totalAmount - invoice.amountPaid;
                return (
                  <div key={invoice.id} className="flex justify-between items-center border-b border-orange-200 pb-2 last:border-0">
                    <div>
                      <p className="font-medium">{invoice.invoiceNumber}</p>
                      <div className="text-xs text-muted-foreground space-x-2">
                        {invoice.items.map((item) => (
                          <span key={item.id}>
                            {item.itemType.replace("_", " ")}: {formatCurrency(item.amount)}
                          </span>
                        ))}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Due {formatDate(invoice.dueDate)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-orange-800">{formatCurrency(outstanding)}</p>
                      <Badge variant={invoice.status === "OVERDUE" ? "destructive" : "outline"} className="text-xs">
                        {invoice.status.replace("_", " ")}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
            <Link
              href="/tenant/payments"
              className="block mt-4 text-center text-sm text-primary hover:underline font-medium"
            >
              View all & pay with M-Pesa
            </Link>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Recent Payments</CardTitle>
        </CardHeader>
        <CardContent>
          {tenant.payments.length === 0 ? (
            <p className="text-muted-foreground text-sm">No payments yet.</p>
          ) : (
            <div className="space-y-3">
              {tenant.payments.map((payment) => (
                <div key={payment.id} className="flex justify-between items-center border-b pb-2 last:border-0">
                  <div>
                    <p className="font-medium">{formatCurrency(payment.amount)}</p>
                    <p className="text-sm text-muted-foreground">
                      {payment.paidDate ? formatDate(payment.paidDate) : `Due ${formatDate(payment.dueDate)}`}
                    </p>
                  </div>
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
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
