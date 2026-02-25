"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RevenueChart } from "@/components/charts/revenue-chart";
import { OccupancyChart } from "@/components/charts/occupancy-chart";
import { ArrearsChart } from "@/components/charts/arrears-chart";
import { PropertyFilter } from "./property-filter";
import {
  TrendingUp,
  Users,
  DollarSign,
  AlertTriangle,
} from "lucide-react";

interface AnalyticsData {
  stats: {
    occupancyRate: number;
    collectionRate: number;
    monthlyRevenue: number;
    totalArrears: number;
  };
  revenueByMonth: { month: string; revenue: number }[];
  arrears: Record<string, number>;
  occupancyByProperty: {
    name: string;
    total: number;
    occupied: number;
    rate: number;
  }[];
  properties: { id: string; name: string }[];
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [propertyId, setPropertyId] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const params = propertyId !== "all" ? `?propertyId=${propertyId}` : "";
      const res = await fetch(`/api/analytics${params}`);
      if (res.ok) {
        setData(await res.json());
      }
      setLoading(false);
    }
    fetchData();
  }, [propertyId]);

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">Loading analytics data...</p>
      </div>
    );
  }

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
    }).format(n);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">
            Revenue, occupancy, and arrears overview
          </p>
        </div>
        <PropertyFilter
          properties={data.properties}
          value={propertyId}
          onChange={setPropertyId}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Occupancy Rate
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.stats.occupancyRate}%
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Collection Rate
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.stats.collectionRate}%
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Monthly Revenue
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(data.stats.monthlyRevenue)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Total Arrears
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(data.stats.totalArrears)}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenue Trend (12 Months)</CardTitle>
          </CardHeader>
          <CardContent>
            <RevenueChart data={data.revenueByMonth} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Arrears Aging</CardTitle>
          </CardHeader>
          <CardContent>
            <ArrearsChart data={data.arrears} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Occupancy by Property</CardTitle>
        </CardHeader>
        <CardContent>
          <OccupancyChart data={data.occupancyByProperty} />
        </CardContent>
      </Card>
    </div>
  );
}
