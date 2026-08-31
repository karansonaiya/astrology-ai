import { LegalPage } from "@/components/layout/legal-page";

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service">
      <p>By using Jyoti AI, you agree to these terms. Please read them along with our Privacy Policy.</p>

      <h2>Eligibility</h2>
      <p>You must be 18 or older, or use Jyoti AI with a guardian&apos;s consent and supervision.</p>

      <h2>Nature of the service</h2>
      <p>
        Jyoti AI provides AI-generated, astrology-style guidance for reflection and entertainment purposes. It is
        not a certain prediction, and not a substitute for professional medical, legal, or financial advice. You
        agree not to rely on Jyoti AI as the sole basis for major life, medical, legal, or financial decisions.
      </p>

      <h2>Acceptable use</h2>
      <ul>
        <li>No attempting to extract another user&apos;s data, abuse rate limits, or circumvent safety controls.</li>
        <li>No using the service for hateful, harassing, or illegal purposes.</li>
        <li>No sharing your account credentials with others.</li>
      </ul>

      <h2>Payments</h2>
      <p>
        Prices are shown before purchase and include applicable taxes unless stated otherwise. Payments are
        processed by Razorpay. See our Refund & Cancellation Policy for refund eligibility.
      </p>

      <h2>Account suspension</h2>
      <p>
        We may suspend or terminate accounts that violate these terms, abuse the platform, or pose a safety risk
        to others.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        Jyoti AI and its operators are not liable for decisions made based on AI-generated content. The service is
        provided &ldquo;as is&rdquo; without guarantees of accuracy, availability, or fitness for a particular purpose.
      </p>

      <h2>Changes</h2>
      <p>We may update these terms from time to time. Continued use after changes means you accept the update.</p>
    </LegalPage>
  );
}
