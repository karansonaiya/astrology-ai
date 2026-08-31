import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function AiDisclosureBadge({ label }: { label: string }) {
  return (
    <Badge variant="gold">
      <Sparkles size={12} /> {label}
    </Badge>
  );
}
