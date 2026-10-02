import {
  Home, MessageCircle, Users, User, Sun, Sparkles, GitCompareArrows, Briefcase, Heart,
  FileText, Wallet, CreditCard, Gift, Settings, LifeBuoy, Hand, Hash, Baby, Gem, CalendarClock, ScanFace, Flame, Orbit, Spade,
  Wand, Store,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { href: string; icon: LucideIcon; labelKey: string };

// Flat list of every real (app)/ feature page — shared by AppSidebar (grouped)
// and the header's quick-nav search (flat, filtered by typed text), so the
// two never drift out of sync.
export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", icon: Home, labelKey: "nav.dashboard" },
  { href: "/chat", icon: MessageCircle, labelKey: "nav.chat" },
  { href: "/chat/personas", icon: Users, labelKey: "nav.personas" },
  { href: "/profile", icon: User, labelKey: "nav.profile" },
  { href: "/horoscope", icon: Sun, labelKey: "nav.dailyHoroscope" },
  { href: "/kundli", icon: Sparkles, labelKey: "nav.kundli" },
  { href: "/palm-reading", icon: Hand, labelKey: "nav.palmReading" },
  { href: "/face-reading", icon: ScanFace, labelKey: "nav.faceReading" },
  { href: "/numerology", icon: Hash, labelKey: "nav.numerology" },
  { href: "/baby-names", icon: Baby, labelKey: "nav.babyNames" },
  { href: "/gemstone-suggestion", icon: Gem, labelKey: "nav.gemstone" },
  { href: "/muhurat-finder", icon: CalendarClock, labelKey: "nav.muhurat" },
  { href: "/mangal-dosha", icon: Flame, labelKey: "nav.mangalDosha" },
  { href: "/kaal-sarp-sade-sati", icon: Orbit, labelKey: "nav.kaalSarpSadeSati" },
  { href: "/compatibility", icon: GitCompareArrows, labelKey: "nav.compatibility" },
  { href: "/career", icon: Briefcase, labelKey: "nav.career" },
  { href: "/relationship", icon: Heart, labelKey: "nav.relationship" },
  { href: "/tarot-reading", icon: Spade, labelKey: "nav.tarot" },
  { href: "/vastu-shastra", icon: Home, labelKey: "nav.vastuShastra" },
  { href: "/puja-services", icon: Flame, labelKey: "nav.pujaServices" },
  { href: "/remedies", icon: Wand, labelKey: "nav.remedies" },
  { href: "/reports", icon: FileText, labelKey: "nav.reports" },
  { href: "/shop", icon: Store, labelKey: "nav.shop" },
  { href: "/credits", icon: Wallet, labelKey: "nav.credits" },
  { href: "/payments", icon: CreditCard, labelKey: "nav.payments" },
  { href: "/referral", icon: Gift, labelKey: "nav.referral" },
  { href: "/settings", icon: Settings, labelKey: "nav.settings" },
  { href: "/help", icon: LifeBuoy, labelKey: "nav.help" },
];
