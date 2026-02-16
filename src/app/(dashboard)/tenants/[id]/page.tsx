import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { EditTenantForm } from "./edit-tenant-form";

export default async function TenantDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const tenant = await prisma.tenant.findFirst({
    where: {
      id: params.id,
      unit: { property: { landlordId: session.user.id } },
    },
    include: {
      user: true,
      unit: { include: { property: true } },
      payments: { orderBy: { dueDate: "desc" } },
      maintenanceRequests: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!tenant) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{tenant.user.name}</h1>
          <p className="text-muted-foreground">{tenant.user.email}</p>
          {(tenant.phoneNumber || tenant.user.phoneNumber) && (
            <p className="text-muted-foreground">{tenant.phoneNumber || tenant.user.phoneNumber}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <EditTenantForm tenant={JSON.parse(JSON.stringify(tenant))} />
          <Badge variant={tenant.status === "ACTIVE" ? "default" : "secondary"}>
            {tenant.status}
          </Badge>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Lease Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Property</span>
              <span className="font-medium">{tenant.unit.property.name}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Unit</span>
              <span className="font-medium">{tenant.unit.unitNumber}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Monthly Rent</span>
              <span className="font-medium">{formatCurrency(tenant.rentAmount)}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Lease Start</span>
              <span className="font-medium">{formatDate(tenant.leaseStart)}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Lease End</span>
              <span className="font-medium">{formatDate(tenant.leaseEnd)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Payment Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Payments</span>
              <span className="font-medium">{tenant.payments.length}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Paid</span>
              <span className="font-medium">
                {formatCurrency(
                  tenant.payments
                    .filter((p) => p.status === "PAID")
                    .reduce((sum, p) => sum + p.amount, 0)
                )}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pending</span>
              <span className="font-medium">
                {formatCurrency(
                  tenant.payments
                    .filter((p) => p.status === "PENDING" || p.status === "OVERDUE")
                    .reduce((sum, p) => sum + p.amount, 0)
                )}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          {tenant.payments.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">No payments recorded.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Paid Date</TableHead>
                  <TableHead>Method</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenant.payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>{formatDate(payment.dueDate)}</TableCell>
                    <TableCell>{formatCurrency(payment.amount)}</TableCell>
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
                    <TableCell>
                      {payment.paidDate ? formatDate(payment.paidDate) : "—"}
                    </TableCell>
                    <TableCell>{payment.method || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Maintenance Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {tenant.maintenanceRequests.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">No maintenance requests.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenant.maintenanceRequests.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell className="font-medium">{req.title}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          req.priority === "URGENT" || req.priority === "HIGH"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {req.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={req.status === "OPEN" ? "outline" : "secondary"}>
                        {req.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(req.createdAt)}</TableCell>
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
