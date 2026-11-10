"use client";

import * as React from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";

export function FaqList({ items }: { items: Array<{ group: string; q: string; a: string }> }) {
  const [query, setQuery] = React.useState("");
  const q = query.trim().toLowerCase();
  const filtered = q ? items.filter((i) => `${i.q} ${i.a}`.toLowerCase().includes(q)) : items;
  const groups = [...new Set(filtered.map((i) => i.group))];
  return (
    <div>
      <label htmlFor="faq-search" className="sr-only">
        Search questions
      </label>
      <Input id="faq-search" type="search" placeholder="Search questions" value={query} onChange={(e) => setQuery(e.target.value)} />
      <div aria-live="polite" className="mt-6 flex flex-col gap-8">
        {groups.length === 0 && <p className="text-muted">No questions match your search.</p>}
        {groups.map((g) => (
          <section key={g}>
            <h2 className="mb-2 font-display text-2xl font-bold">{g}</h2>
            <Accordion type="single" collapsible>
              {filtered
                .filter((i) => i.group === g)
                .map((i) => (
                  <AccordionItem key={i.q} value={i.q}>
                    <AccordionTrigger>{i.q}</AccordionTrigger>
                    <AccordionContent>{i.a}</AccordionContent>
                  </AccordionItem>
                ))}
            </Accordion>
          </section>
        ))}
      </div>
    </div>
  );
}
