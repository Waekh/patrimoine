"use client";

import { useSyncExternalStore } from "react";
import { Select } from "@/components/ui/input";

type Theme = "light" | "dark";
const KEY = "patrimoine.theme";
const listeners = new Set<() => void>();

function readTheme(): Theme {
  try {
    return localStorage.getItem(KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function applyTheme(next: Theme): void {
  document.documentElement.classList.toggle("dark", next === "dark");
  try {
    localStorage.setItem(KEY, next);
  } catch {
    /* storage unavailable: the choice only lasts for this page */
  }
  for (const listener of listeners) listener();
}

/** UI preference only; stored in localStorage, never a source of truth for data. */
export function ThemeToggle({ id }: { id: string }) {
  const theme = useSyncExternalStore(subscribe, readTheme, () => "light" as Theme);
  return (
    <Select
      id={id}
      value={theme}
      onChange={(e) => applyTheme(e.target.value === "dark" ? "dark" : "light")}
      className="max-w-xs"
    >
      <option value="light">Clair</option>
      <option value="dark">Sombre</option>
    </Select>
  );
}
