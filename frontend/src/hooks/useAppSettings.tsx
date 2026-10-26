import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { PerformanceTier, ThemeMode } from "@/types";
import { usePrefersReducedMotion } from "./useMediaQueries";
import { usePerformanceTier } from "./usePerformanceTier";

interface Settings {
  theme: ThemeMode;
  reducedMotion: boolean;
  highContrast: boolean;
  tier: PerformanceTier;
  toggleTheme: () => void;
  toggleReduced: () => void;
  toggleContrast: () => void;
  setTier: (t: PerformanceTier) => void;
}

const SettingsContext = createContext<Settings | null>(null);

const read = (key: string): string | null => {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem(key);
};

export function AppSettingsProvider({ children }: { children: ReactNode }) {
  const osReduced = usePrefersReducedMotion();
  const [theme, setTheme] = useState<ThemeMode>(() =>
    read("lumo:theme") === "dark" ? "dark" : "light",
  );
  const [manualReduced, setManualReduced] = useState<boolean | null>(() => {
    const v = read("lumo:reduced");
    return v === null ? null : v === "true";
  });
  const [highContrast, setHighContrast] = useState(() => read("lumo:contrast") === "true");
  const [tierOverride, setTierOverride] = useState<PerformanceTier | null>(null);
  const detectedTier = usePerformanceTier();
  const tier = tierOverride ?? detectedTier;

  const reducedMotion = manualReduced ?? osReduced;

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.classList.toggle("light", theme === "light");
    root.dataset.reduced = reducedMotion ? "true" : "false";
    root.dataset.contrast = highContrast ? "high" : "normal";
    root.style.colorScheme = theme;
    localStorage.setItem("lumo:theme", theme);
    localStorage.setItem("lumo:reduced", String(manualReduced));
    localStorage.setItem("lumo:contrast", String(highContrast));
  }, [theme, reducedMotion, manualReduced, highContrast]);

  const value = useMemo<Settings>(
    () => ({
      theme,
      reducedMotion,
      highContrast,
      tier,
      toggleTheme: () => setTheme((t) => (t === "light" ? "dark" : "light")),
      toggleReduced: () => setManualReduced((v) => !(v ?? osReduced)),
      toggleContrast: () => setHighContrast((v) => !v),
      setTier: setTierOverride,
    }),
    [theme, reducedMotion, highContrast, tier, osReduced],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used inside AppSettingsProvider");
  return ctx;
}

/** Accessible theme toggle that also honours the keyboard. */
export function useThemeControls() {
  const { theme, toggleTheme } = useSettings();
  const onKey = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggleTheme();
      }
    },
    [toggleTheme],
  );
  return { theme, toggleTheme, onKey };
}
