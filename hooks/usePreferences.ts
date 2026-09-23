"use client";

import { useCallback, useEffect, useState } from "react";

export type Theme = "light" | "dark";

import { THEME_KEY } from "@/lib/theme.ts";

const SOUND_KEY = "bandit-island:sound";

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* storage unavailable (private mode etc.) — preference just won't persist */
  }
}

export function usePreferences() {
  const [theme, setTheme] = useState<Theme>("light");
  const [sound, setSound] = useState(true);

  // Sync with what the pre-paint script in layout.tsx applied.
  useEffect(() => {
    setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
    setSound(read(SOUND_KEY) !== "off");
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((current) => {
      const next: Theme = current === "dark" ? "light" : "dark";
      document.documentElement.classList.toggle("dark", next === "dark");
      write(THEME_KEY, next);
      return next;
    });
  }, []);

  const toggleSound = useCallback(() => {
    setSound((current) => {
      write(SOUND_KEY, current ? "off" : "on");
      return !current;
    });
  }, []);

  return { theme, dark: theme === "dark", sound, toggleTheme, toggleSound };
}
