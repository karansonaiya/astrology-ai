"use client";

import { Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function AdminAnalyticsPage() {
  return (
    <div className="p-6">
      <h1 className="font-heading text-2xl font-semibold">Analytics</h1>
      <p className="mt-1 max-w-xl text-sm text-muted">
        Aggregate metrics live on the Dashboard, AI Usage, and Payments pages. Export raw order data as CSV below —
        exports never include birth details or chat content.
      </p>

      <Card className="mt-5 max-w-md">
        <CardHeader>
          <CardTitle className="text-base">Orders export</CardTitle>
          <CardDescription>CSV of all orders (id, type, status, amount, date).</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <a href="/api/admin/analytics/export" download>
              <Download size={14} /> Download CSV
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
