import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import { MapPin } from "lucide-react";
import { AddUnitForm } from "./add-unit-form";
import { EditPropertyForm } from "./edit-property-form";
import { EditUnitForm } from "./edit-unit-form";
import { MpesaConfigForm } from "./mpesa-config-form";
import { LateFeeConfigForm } from "./late-fee-config-form";
import { GenerateOnboardLink } from "./generate-onboard-link";

export default async function PropertyDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const property = await prisma.property.findFirst({
    where: { id: params.id, landlordId: session.user.id },
    include: {
      units: {
        include: { tenant: { include: { user: true } } },
        orderBy: { unitNumber: "asc" },
      },
    },
  });

  if (!property) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{property.name}</h1>
          <div className="flex items-center gap-2 text-muted-foreground mt-1">
            <MapPin className="h-4 w-4" />
            <span>{property.address}, {property.city}</span>
            <Badge variant="secondary" className="ml-2">{property.type}</Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <LateFeeConfigForm
            propertyId={property.id}
            lateFeeType={property.lateFeeType}
            lateFeeAmount={property.lateFeeAmount}
            lateFeeGraceDays={property.lateFeeGraceDays}
            lateFeeEscalationDays={property.lateFeeEscalationDays}
            lateFeeEscalationMultiplier={property.lateFeeEscalationMultiplier}
          />
          <GenerateOnboardLink
            propertyId={property.id}
            propertyName={property.name}
            vacantUnits={property.units.filter((u) => u.status === "VACANT")}
          />
          <EditPropertyForm property={JSON.parse(JSON.stringify(property))} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Units</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{property.units.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Occupied</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {property.units.filter((u) => u.status === "OCCUPIED").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Vacant</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {property.units.filter((u) => u.status === "VACANT").length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Units</CardTitle>
          <AddUnitForm propertyId={property.id} />
        </CardHeader>
        <CardContent>
          {property.units.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">
              No units yet. Add your first unit above.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Unit</TableHead>
                  <TableHead>Account No.</TableHead>
                  <TableHead>Bedrooms</TableHead>
                  <TableHead>Bathrooms</TableHead>
                  <TableHead>Rent</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {property.units.map((unit) => (
                  <TableRow key={unit.id}>
                    <TableCell className="font-medium">{unit.unitNumber}</TableCell>
                    <TableCell className="text-xs font-mono">{unit.accountNumber || "—"}</TableCell>
                    <TableCell>{unit.bedrooms}</TableCell>
                    <TableCell>{unit.bathrooms}</TableCell>
                    <TableCell>{formatCurrency(unit.rent)}</TableCell>
                    <TableCell>
                      <Badge variant={unit.status === "VACANT" ? "secondary" : "default"}>
                        {unit.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {unit.tenant ? unit.tenant.user.name : "—"}
                    </TableCell>
                    <TableCell>
                      <EditUnitForm unit={JSON.parse(JSON.stringify(unit))} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <MpesaConfigForm propertyId={property.id} />
    </div>
  );
}
