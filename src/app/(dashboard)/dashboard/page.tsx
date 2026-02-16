import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, CreditCard, Wrench, DoorOpen } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  if (session.user.role === "TENANT") {
    redirect("/tenant/dashboard");
  }

  const userId = session.user.id;

  const [propertyCount, unitCount, tenantCount, payments, maintenanceCount] =
    await Promise.all([
      prisma.property.count({ where: { landlordId: userId } }),
      prisma.unit.count({
        where: { property: { landlordId: userId } },
      }),
      prisma.tenant.count({
        where: { unit: { property: { landlordId: userId } }, status: "ACTIVE" },
      }),
      prisma.payment.findMany({
        where: {
          tenant: { unit: { property: { landlordId: userId } } },
          status: "PAID",
        },
        select: { amount: true },
      }),
      prisma.maintenanceRequest.count({
        where: {
          unit: { property: { landlordId: userId } },
          status: { in: ["OPEN", "IN_PROGRESS"] },
        },
      }),
    ]);

  const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);

  const recentPayments = await prisma.payment.findMany({
    where: { tenant: { unit: { property: { landlordId: userId } } } },
    include: { tenant: { include: { user: true, unit: true } } },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  const stats = [
    { label: "Properties", value: propertyCount, icon: Building2 },
    { label: "Total Units", value: unitCount, icon: DoorOpen },
    { label: "Active Tenants", value: tenantCount, icon: Users },
    { label: "Total Revenue", value: formatCurrency(totalRevenue), icon: CreditCard },
    { label: "Open Requests", value: maintenanceCount, icon: Wrench },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {session.user.name}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Payments</CardTitle>
        </CardHeader>
        <CardContent>
          {recentPayments.length === 0 ? (
            <p className="text-muted-foreground text-sm">No payments yet.</p>
          ) : (
            <div className="space-y-4">
              {recentPayments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between border-b pb-3 last:border-0"
                >
                  <div>
                    <p className="font-medium">{payment.tenant.user.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Unit {payment.tenant.unit.unitNumber}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      {formatCurrency(payment.amount)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {payment.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
