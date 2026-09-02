import { LegalPage } from "@/components/layout/legal-page";

export default function SafetyPage() {
  return (
    <LegalPage title="Safety & Disclaimer">
      <p>
        Prerna AI provides <strong>AI-generated, astrology-style guidance for reflection</strong>. It is not a
        certain prediction of future events, and it is not a substitute for professional advice.
      </p>

      <h2>What Prerna AI is</h2>
      <ul>
        <li>An AI chat and content experience that produces astrology-style reflective guidance.</li>
        <li>A tool for self-reflection on career, relationships, business, and daily life questions.</li>
        <li>Available in Gujarati, Hindi, and English, with every substantial answer labelled as AI-generated.</li>
      </ul>

      <h2>What Prerna AI is not</h2>
      <ul>
        <li>Not a medical, legal, or financial advisor. It cannot diagnose conditions, give legal conclusions, or predict markets.</li>
        <li>Not a crisis or emergency service.</li>
        <li>Not a guarantee of any outcome — career, marriage, business, or otherwise.</li>
      </ul>

      <h2>If you are in crisis</h2>
      <p>
        If you or someone you know is in danger, thinking about self-harm, or facing abuse, please contact local
        emergency services immediately, or a trusted person near you. In India, the KIRAN mental health helpline
        (1800-599-0019) is free and available 24/7. Prerna AI will always redirect these conversations toward real
        support rather than continuing as an astrology chat.
      </p>

      <h2>Our content promise</h2>
      <ul>
        <li>We never claim guaranteed outcomes.</li>
        <li>We never use fear-based language about doshas, curses, or inevitable disaster.</li>
        <li>We never tell you to spend money on rituals or remedies to avoid misfortune.</li>
        <li>We never advise ending a relationship, quitting a job, or taking a loan based on astrology alone.</li>
      </ul>

      <h2>Reporting a concern</h2>
      <p>
        Every AI answer has a &ldquo;Report this response&rdquo; option. Reports are reviewed by our safety team.
        You can also reach us via the Contact page.
      </p>
    </LegalPage>
  );
}
