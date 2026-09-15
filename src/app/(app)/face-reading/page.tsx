"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Camera, Upload, Sparkles, ScanFace, FileText } from "lucide-react";
import { useI18n, useT } from "@/lib/i18n/provider";
import { apiFetch, ApiError } from "@/lib/api-client";
import { formatInr } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AiDisclosureBadge } from "@/components/layout/disclaimer-badge";
import { OutOfCreditsDialog } from "@/components/ui/out-of-credits-dialog";
import { useToast } from "@/components/ui/toast";
import { ALLOWED_IMAGE_MIME_TYPES, MAX_IMAGE_BASE64_LENGTH } from "@/lib/validations/chat";
import { detectFaceFeatures, type FaceFeaturePoint } from "@/lib/face-detection/detect-features";
import { compressImageFile } from "@/lib/image/compress-image";
import { FACE_REPORT_CODES } from "@/lib/pricing/catalog";
import { FaceReferenceDiagram } from "@/components/face-reference-diagram";

const MAX_IMAGE_BYTES = Math.floor((MAX_IMAGE_BASE64_LENGTH * 3) / 4);

type FaceFeatureResult = { name: string; observation: string; meaning: string };
type FaceReading = { overview: string; faceShape: string; features: FaceFeatureResult[]; summary: string; followUpQuestion: string };
type ReportTemplate = { code: string; priceInPaise: number };

export default function FaceReadingPage() {
  const t = useT();
  const { locale } = useI18n();
  const router = useRouter();
  const { toast } = useToast();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [image, setImage] = useState<{ data: string; mimeType: string; previewUrl: string } | null>(null);
  const [points, setPoints] = useState<FaceFeaturePoint[] | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [reading, setReading] = useState<FaceReading | null>(null);
  const [outOfCreditsOpen, setOutOfCreditsOpen] = useState(false);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    if (!(ALLOWED_IMAGE_MIME_TYPES as readonly string[]).includes(file.type)) {
      toast({ title: t("chat.invalidImageType"), variant: "danger" });
      return;
    }

    // Same reasoning as palm-reading/page.tsx — a real phone camera photo
    // is routinely 5-12MB at native resolution; compress first.
    const { data, mimeType } = await compressImageFile(file);
    const compressedBytes = Math.floor((data.length * 3) / 4);
    if (compressedBytes > MAX_IMAGE_BYTES) {
      toast({ title: t("chat.imageTooLarge"), variant: "danger" });
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setImage({ data, mimeType, previewUrl });
    setReading(null);
    setPoints(null);

    // Best-effort, real face-landmark detection for the feature labels — a
    // failure/no-face-found here doesn't block getting the actual AI
    // reading below, it just means no labels are shown on the photo.
    setDetecting(true);
    const img = new window.Image();
    img.onload = async () => {
      const detected = await detectFaceFeatures(img);
      setPoints(detected);
      setDetecting(false);
    };
    img.onerror = () => setDetecting(false);
    img.src = previewUrl;
  };

  const getReading = useMutation({
    mutationFn: () => apiFetch<{ reading: FaceReading }>("/api/face-reading", { method: "POST", body: JSON.stringify({ image: { data: image!.data, mimeType: image!.mimeType } }) }),
    onSuccess: (res) => setReading(res.reading),
    onError: (err) => {
      if (err instanceof ApiError && err.status === 402) setOutOfCreditsOpen(true);
      else toast({ title: t("errors.generic"), variant: "danger" });
    },
  });

  const { data: templatesData } = useQuery({
    queryKey: ["report-templates"],
    queryFn: () => apiFetch<{ templates: ReportTemplate[] }>("/api/reports/templates"),
  });
  const detailedReportPrice = templatesData?.templates.find((tp) => FACE_REPORT_CODES.has(tp.code))?.priceInPaise;

  const goToDetailedReport = () => {
    // Hands the ALREADY-compressed photo forward so the Report Store's
    // photo-capture dialog can skip asking the customer to retake it.
    if (image) {
      try {
        sessionStorage.setItem("prerna:face-photo-handoff", JSON.stringify({ data: image.data, mimeType: image.mimeType, savedAt: Date.now() }));
      } catch {
        // sessionStorage unavailable — the paid flow's own capture dialog still works, it just asks for a fresh photo.
      }
    }
    router.push("/reports?upsell=face-reading");
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-6">
      <h1 className="flex items-center gap-2 font-heading text-2xl font-semibold">
        <ScanFace size={22} className="text-primary" /> {t("faceReading.title")}
      </h1>
      <p className="mt-1 text-sm text-muted">{t("faceReading.subtitle")}</p>

      {!image ? (
        <Card className="mt-6">
          <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
            <p className="text-sm text-muted">{t("faceReading.captureHint")}</p>
            <p className="max-w-sm text-xs text-muted">{t("faceReading.faceGuidance")}</p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button onClick={() => cameraInputRef.current?.click()}>
                <Camera size={16} /> {t("faceReading.takePhoto")}
              </Button>
              <Button variant="outline" onClick={() => galleryInputRef.current?.click()}>
                <Upload size={16} /> {t("faceReading.uploadPhoto")}
              </Button>
            </div>
            <input
              ref={cameraInputRef}
              type="file"
              accept={ALLOWED_IMAGE_MIME_TYPES.join(",")}
              capture="user"
              className="hidden"
              onChange={(e) => {
                handleFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            <input
              ref={galleryInputRef}
              type="file"
              accept={ALLOWED_IMAGE_MIME_TYPES.join(",")}
              className="hidden"
              onChange={(e) => {
                handleFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </CardContent>
        </Card>
      ) : (
        <Card className="mt-6">
          <CardContent className="flex flex-col items-center gap-4 py-5">
            <div className="relative inline-block max-w-full">
              {/* eslint-disable-next-line @next/next/no-img-element -- a locally-picked File's object URL, not a static/remote asset next/image can optimize */}
              <img src={image.previewUrl} alt="" className="max-h-96 max-w-full rounded-xl" />
              {points?.map((p) => (
                <div
                  key={p.label}
                  className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
                  style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}
                >
                  <span className="h-2.5 w-2.5 rounded-full bg-gold ring-2 ring-white" />
                  <span className="mt-1 whitespace-nowrap rounded bg-foreground/80 px-1.5 py-0.5 text-[10px] font-medium text-background">
                    {p.label}
                  </span>
                </div>
              ))}
            </div>
            {detecting && <p className="text-xs text-muted">{t("faceReading.detecting")}</p>}

            {!reading && (
              <div className="flex flex-wrap justify-center gap-3">
                <Button onClick={() => getReading.mutate()} disabled={getReading.isPending}>
                  <Sparkles size={16} />
                  {getReading.isPending ? t("faceReading.reading") : t("faceReading.getReading")}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setImage(null);
                    setPoints(null);
                    setReading(null);
                  }}
                >
                  {t("faceReading.retake")}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {getReading.isPending && <Skeleton className="mt-4 h-40" />}

      {reading && (
        <div className="mt-6 flex flex-col gap-4">
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="py-4">
              <div className="mb-2">
                <AiDisclosureBadge label={t("common.aiGuidanceBadge")} />
              </div>
              <p className="text-sm leading-relaxed">{reading.overview}</p>
              <p className="mt-2 text-sm font-medium text-foreground">{reading.faceShape}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("faceReading.referenceDiagramTitle")}</CardTitle>
            </CardHeader>
            <CardContent>
              <FaceReferenceDiagram />
            </CardContent>
          </Card>

          {reading.features.map((f) => (
            <Card key={f.name}>
              <CardHeader>
                <CardTitle className="text-base">{f.name}</CardTitle>
                <CardDescription>{f.observation}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed">{f.meaning}</p>
              </CardContent>
            </Card>
          ))}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("faceReading.summary")}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed">{reading.summary}</p>
            </CardContent>
          </Card>

          {reading.followUpQuestion && <p className="text-sm italic text-muted">{reading.followUpQuestion}</p>}

          <Card className="border-gold/30 bg-gold/5">
            <CardContent className="flex flex-col items-start gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium">{t("faceReading.detailedReportTitle")}</p>
                <p className="text-xs text-muted">{t("faceReading.detailedReportDesc")}</p>
              </div>
              <Button onClick={goToDetailedReport} className="shrink-0">
                <FileText size={16} />
                {t("faceReading.getDetailedReport")}
                {detailedReportPrice != null && <span className="ml-1">— {formatInr(detailedReportPrice, `${locale}-IN`)}</span>}
              </Button>
            </CardContent>
          </Card>

          <Button
            variant="outline"
            className="w-fit"
            onClick={() => {
              setImage(null);
              setPoints(null);
              setReading(null);
            }}
          >
            {t("faceReading.retake")}
          </Button>
        </div>
      )}

      <OutOfCreditsDialog open={outOfCreditsOpen} onOpenChange={setOutOfCreditsOpen} />
    </div>
  );
}
