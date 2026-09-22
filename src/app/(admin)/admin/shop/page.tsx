"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { formatInr, formatDateTime } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

type Product = {
  id: string; name: string; description: string; category: string; priceInPaise: number; imageUrl: string | null; active: boolean;
};
type Inquiry = {
  id: string; productId: string; contactName: string; contactPhone: string; message: string | null; status: string; createdAt: string;
  product: { name: string };
};

export default function AdminShopPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: "", description: "", category: "gemstone", priceInPaise: "", imageUrl: "" });
  const [pendingDelete, setPendingDelete] = useState<Product | null>(null);

  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ["admin-shop-products"],
    queryFn: () => apiFetch<{ products: Product[] }>("/api/admin/shop/products"),
  });
  const { data: inquiriesData, isLoading: inquiriesLoading } = useQuery({
    queryKey: ["admin-shop-inquiries"],
    queryFn: () => apiFetch<{ inquiries: Inquiry[] }>("/api/admin/shop/inquiries"),
  });

  const createProduct = useMutation({
    mutationFn: () =>
      apiFetch("/api/admin/shop/products", {
        method: "POST",
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim(),
          category: form.category,
          priceInPaise: Math.round(Number(form.priceInPaise) * 100),
          imageUrl: form.imageUrl.trim() || undefined,
        }),
      }),
    onSuccess: () => {
      setForm({ name: "", description: "", category: "gemstone", priceInPaise: "", imageUrl: "" });
      qc.invalidateQueries({ queryKey: ["admin-shop-products"] });
    },
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      apiFetch(`/api/admin/shop/products/${id}`, { method: "PATCH", body: JSON.stringify({ active }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-shop-products"] }),
  });

  const deleteProduct = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/admin/shop/products/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      setPendingDelete(null);
      qc.invalidateQueries({ queryKey: ["admin-shop-products"] });
    },
  });

  const inquiryCountFor = (productId: string) => inquiriesData?.inquiries.filter((i) => i.productId === productId).length ?? 0;

  const updateInquiryStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiFetch(`/api/admin/shop/inquiries/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-shop-inquiries"] }),
  });

  const formValid = form.name.trim().length > 0 && form.description.trim().length > 0 && Number(form.priceInPaise) > 0;

  return (
    <div className="p-6">
      <h1 className="font-heading text-2xl font-semibold">Spiritual Shop</h1>
      <p className="mt-1 text-sm text-muted">Starts empty — add real products (real photos/pricing) as they become available.</p>

      <Card className="mt-4">
        <CardHeader><CardTitle className="text-base">Add product</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label className="mb-1.5 block text-xs">Name</Label>
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <Label className="mb-1.5 block text-xs">Category</Label>
            <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="gemstone">Gemstone</SelectItem>
                <SelectItem value="rudraksha">Rudraksha</SelectItem>
                <SelectItem value="yantra">Yantra</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label className="mb-1.5 block text-xs">Description</Label>
            <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="min-h-16" />
          </div>
          <div>
            <Label className="mb-1.5 block text-xs">Price (INR)</Label>
            <Input type="number" min="0" step="0.01" value={form.priceInPaise} onChange={(e) => setForm((f) => ({ ...f, priceInPaise: e.target.value }))} />
          </div>
          <div>
            <Label className="mb-1.5 block text-xs">Image URL (optional)</Label>
            <Input value={form.imageUrl} onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))} />
          </div>
          <div className="sm:col-span-2">
            <Button disabled={!formValid || createProduct.isPending} onClick={() => createProduct.mutate()}>Add product</Button>
          </div>
        </CardContent>
      </Card>

      <h2 className="mt-6 text-sm font-semibold uppercase tracking-wide text-muted">Products</h2>
      {productsLoading ? (
        <Skeleton className="mt-3 h-32" />
      ) : (
        <div className="mt-3 flex flex-col gap-2">
          {productsData?.products.map((p) => (
            <Card key={p.id}>
              <CardContent className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium">{p.name} <span className="text-xs text-muted capitalize">({p.category})</span></p>
                  <p className="text-xs text-muted">{formatInr(p.priceInPaise)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={p.active ? "success" : "default"}>{p.active ? "active" : "hidden"}</Badge>
                  <Button size="sm" variant="outline" onClick={() => toggleActive.mutate({ id: p.id, active: !p.active })}>
                    {p.active ? "Hide" : "Show"}
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => setPendingDelete(p)}>Delete</Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {productsData?.products.length === 0 && <p className="py-6 text-center text-sm text-muted">No products yet.</p>}
        </div>
      )}

      <h2 className="mt-6 text-sm font-semibold uppercase tracking-wide text-muted">Inquiries</h2>
      {inquiriesLoading ? (
        <Skeleton className="mt-3 h-32" />
      ) : (
        <div className="mt-3 flex flex-col gap-2">
          {inquiriesData?.inquiries.map((i) => (
            <Card key={i.id}>
              <CardContent className="flex items-center justify-between py-3">
                <div className="min-w-0 break-words">
                  <p className="text-sm font-medium">{i.contactName} — {i.product.name}</p>
                  <p className="text-xs text-muted">{i.contactPhone}{i.message ? ` · ${i.message}` : ""}</p>
                  <p className="text-xs text-muted">{formatDateTime(i.createdAt)}</p>
                </div>
                <Select value={i.status} onValueChange={(status) => updateInquiryStatus.mutate({ id: i.id, status })}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">new</SelectItem>
                    <SelectItem value="contacted">contacted</SelectItem>
                    <SelectItem value="closed">closed</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          ))}
          {inquiriesData?.inquiries.length === 0 && <p className="py-6 text-center text-sm text-muted">No inquiries yet.</p>}
        </div>
      )}

      <Dialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete &ldquo;{pendingDelete?.name}&rdquo;?</DialogTitle>
            <DialogDescription>
              {pendingDelete && inquiryCountFor(pendingDelete.id) > 0
                ? `This permanently deletes ${inquiryCountFor(pendingDelete.id)} real customer inquiry record(s) tied to this product too — their contact info will be gone for good. If you just want it off the public shop, use "Hide" instead.`
                : 'This cannot be undone. If you just want it off the public shop, use "Hide" instead.'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setPendingDelete(null)} disabled={deleteProduct.isPending}>Cancel</Button>
            <Button variant="danger" onClick={() => pendingDelete && deleteProduct.mutate(pendingDelete.id)} disabled={deleteProduct.isPending}>
              {deleteProduct.isPending ? "Deleting..." : "Delete permanently"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
