export type Theme = "light" | "dark" | "system";

export function getTheme(): Theme {
  if (typeof window === "undefined") return "system";
  const match = document.cookie.match(/theme=(light|dark|system)/);
  return (match?.[1] as Theme) || "system";
}

export function setTheme(theme: Theme) {
  if (typeof window === "undefined") return;

  // Persist in cookie (1 year expiry)
  document.cookie = `theme=${theme}; path=/; max-age=31536000; SameSite=Lax`;

  if (theme === "system") {
    delete document.documentElement.dataset.theme;
  } else {
    document.documentElement.dataset.theme = theme;
  }
}
