"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Gem, Store } from "lucide-react";
import { useI18n, useT } from "@/lib/i18n/provider";
import { apiFetch } from "@/lib/api-client";
import { formatInr } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";

type Product = {
  id: string;
  name: string;
  description: string;
  category: string;
  priceInPaise: number;
  imageUrl: string | null;
};

export default function ShopPage() {
  const t = useT();
  const { locale } = useI18n();
  const { toast } = useToast();
  const [inquiryProduct, setInquiryProduct] = useState<Product | null>(null);
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [message, setMessage] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["shop-products"],
    queryFn: () => apiFetch<{ products: Product[] }>("/api/shop/products"),
  });

  const inquire = useMutation({
    mutationFn: () =>
      apiFetch("/api/shop/inquire", {
        method: "POST",
        body: JSON.stringify({ productId: inquiryProduct!.id, contactName: contactName.trim(), contactPhone: contactPhone.trim(), message: message.trim() || undefined }),
      }),
    onSuccess: () => {
      toast({ title: t("shop.inquirySentNotice"), variant: "success" });
      setInquiryProduct(null);
      setContactName("");
      setContactPhone("");
      setMessage("");
    },
    onError: () => toast({ title: t("errors.generic"), variant: "danger" }),
  });

  const inquiryValid = contactName.trim().length > 0 && contactPhone.trim().length >= 4;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-6">
      <h1 className="flex items-center gap-2 font-heading text-2xl font-semibold">
        <Store size={22} className="text-primary" /> {t("shop.title")}
      </h1>
      <p className="mt-1 text-sm text-muted">{t("shop.subtitle")}</p>

      {isLoading && (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-56" />)}
        </div>
      )}

      {!isLoading && data?.products.length === 0 && (
        <Card className="mt-6">
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <Gem size={28} className="text-muted" />
            <p className="text-sm text-muted">{t("shop.emptyNotice")}</p>
          </CardContent>
        </Card>
      )}

      <div className="mt-6 grid gap-5 sm:grid-cols-2 md:grid-cols-3">
        {data?.products.map((p) => (
          <Card key={p.id} className="flex flex-col">
            <CardHeader>
              <div className="mb-2 flex h-32 items-center justify-center rounded-lg bg-surface-raised">
                <Gem size={32} className="text-gold" />
              </div>
              <CardTitle className="text-base">{p.name}</CardTitle>
              <Badge variant="gold" className="w-fit capitalize">{p.category}</Badge>
              <CardDescription>{p.description}</CardDescription>
            </CardHeader>
            <CardFooter className="mt-auto flex items-center justify-between">
              <span className="font-semibold text-gold">{formatInr(p.priceInPaise, `${locale}-IN`)}</span>
              <Button size="sm" onClick={() => setInquiryProduct(p)}>{t("shop.imInterested")}</Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <Dialog open={!!inquiryProduct} onOpenChange={(open) => !open && setInquiryProduct(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("shop.inquiryTitle")}</DialogTitle>
            <DialogDescription>{inquiryProduct?.name}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div>
              <Label className="mb-1.5 block text-xs">{t("shop.contactNameLabel")}</Label>
              <Input value={contactName} onChange={(e) => setContactName(e.target.value)} />
            </div>
            <div>
              <Label className="mb-1.5 block text-xs">{t("pujaServices.contactPhoneLabel")}</Label>
              <Input type="tel" placeholder="+91 9XXXXXXXXX" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
            </div>
            <div>
              <Label className="mb-1.5 block text-xs">{t("common.optional")}: {t("pujaServices.notesLabel")}</Label>
              <Textarea value={message} onChange={(e) => setMessage(e.target.value)} className="min-h-16" />
            </div>
            <Button disabled={!inquiryValid || inquire.isPending} onClick={() => inquire.mutate()}>
              {t("shop.sendInquiry")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
