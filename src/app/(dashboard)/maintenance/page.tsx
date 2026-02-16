import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/utils";
import { UpdateStatusButton } from "./update-status-button";

export default async function MaintenancePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const requests = await prisma.maintenanceRequest.findMany({
    where: { unit: { property: { landlordId: session.user.id } } },
    include: {
      tenant: { include: { user: true } },
      unit: { include: { property: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const openCount = requests.filter((r) => r.status === "OPEN").length;
  const inProgressCount = requests.filter((r) => r.status === "IN_PROGRESS").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Maintenance Requests</h1>
        <p className="text-muted-foreground">
          {openCount} open, {inProgressCount} in progress
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Requests ({requests.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">
              No maintenance requests yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Property / Unit</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell>
                      <Link
                        href={`/maintenance/${req.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {req.title}
                      </Link>
                    </TableCell>
                    <TableCell>{req.tenant.user.name}</TableCell>
                    <TableCell>
                      {req.unit.property.name} — {req.unit.unitNumber}
                    </TableCell>
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
                      <Badge
                        variant={
                          req.status === "OPEN"
                            ? "outline"
                            : req.status === "IN_PROGRESS"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {req.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(req.createdAt)}</TableCell>
                    <TableCell>
                      <UpdateStatusButton
                        requestId={req.id}
                        currentStatus={req.status}
                      />
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
