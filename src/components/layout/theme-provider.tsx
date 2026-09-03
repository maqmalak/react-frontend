import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export type Theme = "light" | "dark";

/** Persist and toggle the app theme (Tailwind "dark" class). */
export function ThemeToggle({ initial }: { initial?: Theme }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = initial ?? (localStorage.getItem("apparel-theme") as Theme | null);
    if (stored === "light" || stored === "dark") return stored;
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("apparel-theme", theme);
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

/** Initializer that reads the persisted theme before first paint. */
export function applyInitialTheme() {
  const stored = localStorage.getItem("apparel-theme");
  const dark =
    stored === "dark" ||
    (!stored && window.matchMedia?.("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}