/**
 * Common traditional pujas/rituals — real traditional knowledge (same
 * "accurate reference, not invented" treatment as tarot/catalog.ts and
 * vastu/catalog.ts), used as trusted context so the AI's recommendation is
 * grounded in a real, standard list rather than the model inventing ritual
 * names or claims about them.
 */

export type PujaOccasionTag =
  | "career" | "health" | "marriage" | "wealth" | "peace" | "dosha_remedy" | "new_beginnings" | "family";

export type Puja = {
  code: string;
  name: string;
  occasions: PujaOccasionTag[];
  significance: string;
};

export const PUJA_CATALOG: Puja[] = [
  { code: "ganesh_puja", name: "Ganesh Puja", occasions: ["new_beginnings", "peace"], significance: "Invokes Lord Ganesha to remove obstacles before starting something new — a home, a venture, a journey, or any significant undertaking." },
  { code: "navgraha_shanti", name: "Navgraha Shanti Puja", occasions: ["dosha_remedy", "peace"], significance: "Propitiates all nine planets together to ease general planetary affliction and restore balance when multiple areas of life feel disturbed at once." },
  { code: "rudra_abhishek", name: "Rudra Abhishek", occasions: ["health", "peace", "dosha_remedy"], significance: "A ritual bathing of the Shiva Lingam, traditionally sought for health, protection from misfortune, and inner peace." },
  { code: "satyanarayan_puja", name: "Satyanarayan Puja", occasions: ["family", "peace", "new_beginnings"], significance: "Performed to seek Lord Vishnu's blessings for family harmony, gratitude after a wish fulfilled, or before an important family occasion." },
  { code: "lakshmi_puja", name: "Lakshmi Puja", occasions: ["wealth"], significance: "Invokes Goddess Lakshmi for prosperity and financial stability — commonly performed at Diwali or before a major financial decision." },
  { code: "kaal_sarp_puja", name: "Kaal Sarp Dosha Puja", occasions: ["dosha_remedy"], significance: "The traditional remedy specifically for Kaal Sarp Dosha, typically performed at a Nag temple (e.g. Trimbakeshwar), to ease its traditionally attributed effects." },
  { code: "mangal_dosha_puja", name: "Mangal Dosha (Kumbh Vivah / Mars) Puja", occasions: ["marriage", "dosha_remedy"], significance: "The traditional remedy for Mangal Dosha before marriage, easing Mars's traditionally attributed effect on marital harmony." },
  { code: "durga_puja", name: "Durga Puja / Chandi Path", occasions: ["health", "peace", "career"], significance: "Invokes Goddess Durga for strength and protection against obstacles, commonly sought during a difficult stretch in career or health." },
  { code: "vastu_shanti", name: "Vastu Shanti Puja", occasions: ["new_beginnings", "peace"], significance: "Performed when moving into a new home or after Vastu corrections, to harmonize the space's energy per traditional practice." },
  { code: "graha_shanti", name: "Graha Shanti Puja", occasions: ["dosha_remedy", "peace"], significance: "A focused ritual for one specific troubling planet (rather than all nine), when only one real placement is the concern." },
  { code: "hanuman_puja", name: "Hanuman Puja / Chalisa Path", occasions: ["health", "career", "peace"], significance: "Sought for courage, protection, and overcoming a specific obstacle or fear, especially during Saturn-related periods like Sade Sati." },
  { code: "sade_sati_shanti", name: "Sade Sati Shanti Puja", occasions: ["dosha_remedy", "peace"], significance: "The traditional remedy specifically for Sade Sati (Saturn's transit), typically involving Shani/Hanuman worship, sought to ease this particular period." },
];
