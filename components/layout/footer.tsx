import * as React from "react";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-line bg-card text-ink py-12 px-4 sm:px-8 mt-auto select-none">
      <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
        <div>
          <h4 className="font-display text-base font-bold text-ink mb-3 uppercase tracking-wider">
            Product
          </h4>
          <ul className="space-y-2 text-sm text-muted">
            <li>
              <Link href="/tournaments" className="hover:text-primary transition-colors">
                Tournaments
              </Link>
            </li>
            <li>
              <Link href="/how-it-works" className="hover:text-primary transition-colors">
                How it works
              </Link>
            </li>
            <li>
              <Link href="/pricing" className="hover:text-primary transition-colors">
                Pricing
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="font-display text-base font-bold text-ink mb-3 uppercase tracking-wider">
            Company
          </h4>
          <ul className="space-y-2 text-sm text-muted">
            <li>
              <Link href="/about" className="hover:text-primary transition-colors">
                About
              </Link>
            </li>
            <li>
              <Link href="/contact" className="hover:text-primary transition-colors">
                Contact
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="font-display text-base font-bold text-ink mb-3 uppercase tracking-wider">
            Support
          </h4>
          <ul className="space-y-2 text-sm text-muted">
            <li>
              <Link href="/faq" className="hover:text-primary transition-colors">
                FAQ
              </Link>
            </li>
            <li>
              <Link href="/refund-policy" className="hover:text-primary transition-colors">
                Refund policy
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="font-display text-base font-bold text-ink mb-3 uppercase tracking-wider">
            Legal
          </h4>
          <ul className="space-y-2 text-sm text-muted">
            <li>
              <Link href="/terms" className="hover:text-primary transition-colors">
                Terms of service
              </Link>
            </li>
            <li>
              <Link href="/privacy" className="hover:text-primary transition-colors">
                Privacy policy
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="max-w-7xl mx-auto border-t border-line mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted">
        <p>© {new Date().getFullYear()} Sports Tournament Platform. All rights reserved.</p>
        <div className="flex items-center gap-4">
          <span>India (English)</span>
        </div>
      </div>
    </footer>
  );
}
