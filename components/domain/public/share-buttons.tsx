"use client";

import * as React from "react";
import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";

export function ShareButtons({ url, title }: { url: string; title: string }) {
  const [canNative, setCanNative] = React.useState(false);
  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- feature detection only exists in the browser
    setCanNative(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <CopyButton value={url} />
      <Button asChild variant="secondary" size="sm">
        <a href={`https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`} target="_blank" rel="noopener noreferrer">
          WhatsApp
        </a>
      </Button>
      {canNative && (
        <Button variant="secondary" size="sm" onClick={() => navigator.share({ title, url }).catch(() => {})}>
          <Share2 className="h-4 w-4" aria-hidden /> Share
        </Button>
      )}
    </div>
  );
}
