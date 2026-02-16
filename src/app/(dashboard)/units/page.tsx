import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";

export default async function UnitsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const units = await prisma.unit.findMany({
    where: { property: { landlordId: session.user.id } },
    include: {
      property: true,
      tenant: { include: { user: true } },
    },
    orderBy: { property: { name: "asc" } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">All Units</h1>
        <p className="text-muted-foreground">Overview of all units across properties</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Units ({units.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {units.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">
              No units yet. Add units from a property page.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Property</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Bed/Bath</TableHead>
                  <TableHead>Rent</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tenant</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {units.map((unit) => (
                  <TableRow key={unit.id}>
                    <TableCell>
                      <Link
                        href={`/properties/${unit.propertyId}`}
                        className="text-primary hover:underline"
                      >
                        {unit.property.name}
                      </Link>
                    </TableCell>
                    <TableCell className="font-medium">{unit.unitNumber}</TableCell>
                    <TableCell>{unit.bedrooms}bd / {unit.bathrooms}ba</TableCell>
                    <TableCell>{formatCurrency(unit.rent)}</TableCell>
                    <TableCell>
                      <Badge variant={unit.status === "VACANT" ? "secondary" : "default"}>
                        {unit.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{unit.tenant ? unit.tenant.user.name : "—"}</TableCell>
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
