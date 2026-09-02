import { LegalPage } from "@/components/layout/legal-page";

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy">
      <p>
        This policy explains what data Prerna AI (&ldquo;we&rdquo;) collects, why, and the controls you have over it. Prerna AI
        is designed around data minimization and privacy-by-default.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>Account data: name (optional), phone or email, and authentication records.</li>
        <li>
          Birth details (date, time, place): <strong>entirely optional</strong>, stored only if you explicitly
          consent, and used only to personalize insights.
        </li>
        <li>Chat messages and questions you send to Prerna AI, and the AI-generated responses.</li>
        <li>Payment and order records (never full card details — these are handled by our payment processor).</li>
        <li>Basic usage data (feature usage, language preference, device type) to operate and improve the product.</li>
      </ul>

      <h2>How we use it</h2>
      <ul>
        <li>To generate personalized AI guidance and calculate birth-chart data where an engine is connected.</li>
        <li>To process payments, grant entitlements, and provide customer support.</li>
        <li>To maintain safety — reviewing flagged conversations for policy violations.</li>
        <li>We do not use your data to train third-party AI models beyond what your chosen AI provider&apos;s own policy allows for API usage, and we never sell your data.</li>
      </ul>

      <h2>Your controls</h2>
      <ul>
        <li>Edit or permanently delete your birth details anytime from Settings.</li>
        <li>Delete individual chats.</li>
        <li>Export a copy of your data from Settings → Export my data.</li>
        <li>Delete your account entirely from Settings → Delete my account.</li>
      </ul>

      <h2>Data sharing</h2>
      <p>
        We share data only with service providers necessary to run Prerna AI: our database/hosting provider, our
        configured AI provider (Anthropic or OpenAI, depending on deployment), and our payment processor
        (Cashfree). We do not sell personal data to advertisers or data brokers.
      </p>

      <h2>Security</h2>
      <p>
        Data is encrypted in transit (HTTPS). Passwords and OTP codes are hashed, never stored in plain text.
        Access to admin tooling is role-restricted and logged.
      </p>

      <h2>Contact</h2>
      <p>For privacy questions or requests, use the Contact page.</p>
    </LegalPage>
  );
}
