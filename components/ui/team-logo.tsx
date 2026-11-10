import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { getInitials } from "./avatar";

export interface TeamLogoProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  name: string;
  size?: "sm" | "md" | "lg" | "xl";
}

const TEAM_PALETTES = [
  { bg: "#1F7A4D", text: "#FFFFFF" }, // Turf
  { bg: "#0F2A43", text: "#FFFFFF" }, // Ink
  { bg: "#C8553D", text: "#FFFFFF" }, // Clay
  { bg: "#D97706", text: "#FFFFFF" }, // Amber
  { bg: "#4338CA", text: "#FFFFFF" }, // Indigo
  { bg: "#0F766E", text: "#FFFFFF" }, // Teal
  { bg: "#475569", text: "#FFFFFF" }, // Slate
  { bg: "#7C3AED", text: "#FFFFFF" }, // Violet
  { bg: "#BE123C", text: "#FFFFFF" }, // Rose
  { bg: "#0369A1", text: "#FFFFFF" }, // Sky
];

export function getTeamColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % TEAM_PALETTES.length;
  return TEAM_PALETTES[index];
}

export function TeamLogo({
  src,
  name,
  size = "md",
  className,
  ...props
}: TeamLogoProps) {
  const [imageError, setImageError] = React.useState(false);

  const sizeClasses = {
    sm: "h-8 w-8 text-xs rounded-input",
    md: "h-10 w-10 text-sm rounded-input",
    lg: "h-12 w-12 text-base rounded-input",
    xl: "h-16 w-16 text-lg rounded-card",
  };

  const pixelSizes = {
    sm: 32,
    md: 40,
    lg: 48,
    xl: 64,
  };

  const palette = React.useMemo(() => getTeamColor(name), [name]);
  const hasImage = Boolean(src && !imageError);

  return (
    <div
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden border border-line font-bold font-display tracking-wider select-none shadow-2xs",
        sizeClasses[size],
        className
      )}
      style={!hasImage ? { backgroundColor: palette.bg, color: palette.text } : undefined}
      {...props}
    >
      {hasImage ? (
        <Image
          src={src!}
          alt={name}
          width={pixelSizes[size]}
          height={pixelSizes[size]}
          className="h-full w-full object-cover"
          onError={() => setImageError(true)}
        />
      ) : (
        <span>{getInitials(name)}</span>
      )}
    </div>
  );
}
