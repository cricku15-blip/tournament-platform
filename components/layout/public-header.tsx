"use client";

import * as React from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CitySelector } from "./city-selector";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function PublicHeader() {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-40 flex h-[72px] w-full items-center justify-between border-b border-line bg-card/95 px-4 sm:px-8 backdrop-blur-xs select-none">
      <div className="flex items-center gap-6">
        {/* Logo */}
        <Link
          href="/"
          className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-ink hover:text-primary transition-colors"
        >
          GROUND<span className="text-primary">WAR</span>
        </Link>

        {/* City Selector */}
        <div className="hidden sm:block">
          <CitySelector isLoggedIn={false} />
        </div>

        {/* Nav Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-muted">
          <Link
            href="/tournaments"
            className="hover:text-ink transition-colors"
          >
            Tournaments
          </Link>
          <Link
            href="/how-it-works"
            className="hover:text-ink transition-colors"
          >
            How it works
          </Link>
          <Link href="/pricing" className="hover:text-ink transition-colors">
            Pricing
          </Link>
        </nav>
      </div>

      <div className="flex items-center gap-3">
        {/* City selector on mobile */}
        <div className="sm:hidden">
          <CitySelector isLoggedIn={false} />
        </div>

        {/* Desktop auth buttons */}
        <div className="hidden sm:flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/login">Log in</Link>
          </Button>
          <Button variant="primary" size="sm" asChild>
            <Link href="/signup">Sign up</Link>
          </Button>
        </div>

        {/* Mobile menu trigger */}
        <div className="md:hidden">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                aria-label="Open navigation menu"
                className="flex h-9 w-9 items-center justify-center rounded-input border border-line text-ink hover:bg-surface"
              >
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="right">
              <SheetHeader>
                <SheetTitle className="text-left font-display text-2xl font-bold">
                  Menu
                </SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-4 py-6">
                <Link
                  href="/tournaments"
                  onClick={() => setMobileOpen(false)}
                  className="text-lg font-semibold text-ink hover:text-primary"
                >
                  Tournaments
                </Link>
                <Link
                  href="/how-it-works"
                  onClick={() => setMobileOpen(false)}
                  className="text-lg font-semibold text-ink hover:text-primary"
                >
                  How it works
                </Link>
                <Link
                  href="/pricing"
                  onClick={() => setMobileOpen(false)}
                  className="text-lg font-semibold text-ink hover:text-primary"
                >
                  Pricing
                </Link>
                <hr className="border-line my-2" />
                <Button asChild variant="secondary" className="w-full">
                  <Link href="/login" onClick={() => setMobileOpen(false)}>
                    Log in
                  </Link>
                </Button>
                <Button asChild variant="primary" className="w-full">
                  <Link href="/signup" onClick={() => setMobileOpen(false)}>
                    Sign up
                  </Link>
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
