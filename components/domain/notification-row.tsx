"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/format";
import { markRead } from "@/app/(app)/notifications/actions";

export function NotificationRow({
  id,
  title,
  body,
  link,
  createdAt,
  read,
}: {
  id: string;
  title: string;
  body: string | null;
  link: string | null;
  createdAt: string;
  read: boolean;
}) {
  const [isRead, setIsRead] = React.useState(read);
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="font-semibold text-ink">{title}</p>
        {!isRead && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />}
      </div>
      {body && <p className="mt-0.5 text-sm text-muted">{body}</p>}
      <p className="mt-1 text-xs text-muted/70">{formatDateTime(createdAt)}</p>
    </>
  );
  const cls = cn("block min-h-11 w-full p-4 text-left hover:bg-surface/60", !isRead && "bg-primary/5");
  const onClick = () => {
    if (!isRead) {
      setIsRead(true);
      void markRead(id);
    }
  };
  return link ? (
    <Link href={link} onClick={onClick} className={cls}>
      {content}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={cls}>
      {content}
    </button>
  );
}
