"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

const BarChart = dynamic(() => import("./bar-chart"), { ssr: false, loading: () => <Skeleton className="h-36 w-full max-w-xl" /> });

export function PlayerChart(props: { data: Array<{ label: string; value: number }>; label: string }) {
  return <BarChart {...props} />;
}
