import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export type Theme = "light" | "dark";

/** Theme for a visitor who hasn't chosen one (no saved choice): dark, whatever the OS setting. */
export const DEFAULT_THEME: Theme = "dark";

/** Persist and toggle the app theme (Tailwind "dark" class). */
export function ThemeToggle({ initial }: { initial?: Theme }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = initial ?? (localStorage.getItem("micromax-theme") as Theme | null);
    if (stored === "light" || stored === "dark") return stored;
    return DEFAULT_THEME;
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.style.colorScheme = theme;
    try {
      localStorage.setItem("micromax-theme", theme);
    } catch {
      /* storage blocked — the choice just isn't remembered */
    }
  }, [theme]);

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
      aria-label="Toggle theme"
      title="Toggle theme"
    >
      {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </Button>
  );
}

/** Initializer that reads the persisted theme before first paint (index.html already sets it inline). */
export function applyInitialTheme() {
  let stored: string | null = null;
  try {
    stored = localStorage.getItem("micromax-theme");
  } catch {
    /* storage blocked — fall back to the default */
  }
  const dark = stored ? stored === "dark" : DEFAULT_THEME === "dark";
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
}