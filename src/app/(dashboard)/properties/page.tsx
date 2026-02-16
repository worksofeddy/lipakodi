import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Plus, MapPin } from "lucide-react";

export default async function PropertiesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const properties = await prisma.property.findMany({
    where: { landlordId: session.user.id },
    include: {
      units: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Properties</h1>
          <p className="text-muted-foreground">Manage your rental properties</p>
        </div>
        <Button asChild>
          <Link href="/properties/new">
            <Plus className="mr-2 h-4 w-4" /> Add Property
          </Link>
        </Button>
      </div>

      {properties.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No properties yet</h3>
            <p className="text-muted-foreground mb-4">
              Get started by adding your first property
            </p>
            <Button asChild>
              <Link href="/properties/new">
                <Plus className="mr-2 h-4 w-4" /> Add Property
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {properties.map((property) => {
            const occupiedUnits = property.units.filter(
              (u) => u.status === "OCCUPIED"
            ).length;
            const totalUnits = property.units.length;
            return (
              <Link key={property.id} href={`/properties/${property.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{property.name}</CardTitle>
                      <Badge variant="secondary">{property.type}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center text-sm text-muted-foreground mb-3">
                      <MapPin className="mr-1 h-4 w-4" />
                      {property.address}, {property.city}
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span>
                        {totalUnits} unit{totalUnits !== 1 ? "s" : ""}
                      </span>
                      <span>
                        {occupiedUnits} occupied / {totalUnits - occupiedUnits}{" "}
                        vacant
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
