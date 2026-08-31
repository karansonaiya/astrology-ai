import { LegalPage } from "@/components/layout/legal-page";

export default function RefundPolicyPage() {
  return (
    <LegalPage title="Refund & Cancellation Policy">
      <h2>Credit packs</h2>
      <p>
        Unused AI-question credits may be eligible for a refund within 7 days of purchase if you have not used
        them. Partially used credit packs are refunded on a pro-rata basis at our discretion.
      </p>

      <h2>Reports</h2>
      <p>
        Because reports are generated immediately on purchase, refund requests for reports are reviewed
        case-by-case — for example, a technical failure to generate your report is eligible for a full refund.
      </p>

      <h2>Monthly Premium subscription</h2>
      <p>
        You can cancel anytime from Settings; cancellation takes effect at the end of the current billing period.
        We do not provide partial-period refunds for subscriptions, except where required by law.
      </p>

      <h2>How to request a refund</h2>
      <p>
        Go to My Payments, select the relevant transaction, and choose &ldquo;Request refund&rdquo; with a reason. Our team
        manually reviews every request — refunds are never auto-approved. You&apos;ll be notified of the decision, and
        approved refunds are credited back to your original payment method within 5–7 business days.
      </p>

      <h2>Non-refundable situations</h2>
      <ul>
        <li>Fully-used credit packs.</li>
        <li>Reports already downloaded/viewed, except in cases of technical failure or duplicate charge.</li>
        <li>Requests made after 30 days from the original purchase date.</li>
      </ul>
    </LegalPage>
  );
}
