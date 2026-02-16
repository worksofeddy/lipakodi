import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Plus } from "lucide-react";

export default async function TenantsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const tenants = await prisma.tenant.findMany({
    where: { unit: { property: { landlordId: session.user.id } } },
    include: {
      user: true,
      unit: { include: { property: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tenants</h1>
          <p className="text-muted-foreground">Manage your tenants and leases</p>
        </div>
        <Button asChild>
          <Link href="/tenants/new">
            <Plus className="mr-2 h-4 w-4" /> Add Tenant
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Tenants ({tenants.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {tenants.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">
              No tenants yet. Add a tenant to get started.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Property / Unit</TableHead>
                  <TableHead>Rent</TableHead>
                  <TableHead>Lease End</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenants.map((tenant) => (
                  <TableRow key={tenant.id}>
                    <TableCell>
                      <Link
                        href={`/tenants/${tenant.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {tenant.user.name}
                      </Link>
                    </TableCell>
                    <TableCell>{tenant.user.email}</TableCell>
                    <TableCell>{tenant.phoneNumber || tenant.user.phoneNumber || "—"}</TableCell>
                    <TableCell>
                      {tenant.unit.property.name} — Unit {tenant.unit.unitNumber}
                    </TableCell>
                    <TableCell>{formatCurrency(tenant.rentAmount)}</TableCell>
                    <TableCell>{formatDate(tenant.leaseEnd)}</TableCell>
                    <TableCell>
                      <Badge variant={tenant.status === "ACTIVE" ? "default" : "secondary"}>
                        {tenant.status}
                      </Badge>
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
