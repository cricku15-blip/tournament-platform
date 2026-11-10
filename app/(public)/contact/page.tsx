import type { Metadata } from "next";
import { ContactForm } from "@/components/domain/public/contact-form";

export const metadata: Metadata = { title: "Contact", description: "Get in touch with the GroundWar team.", alternates: { canonical: "/contact" } };

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-4xl font-bold text-ink">Contact us</h1>
      <p className="mb-6 mt-2 text-muted">Questions, feedback or a problem with a payment? Send us a message.</p>
      <ContactForm />
    </div>
  );
}
