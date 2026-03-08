import { createContext, useContext, useEffect, ReactNode } from "react";
import { useBrand } from "@/contexts/BrandContext";

// ── Theme presets ──────────────────────────────────────────────
export interface ThemePreset {
  key: string;
  label: string;
  emoji: string;
  primary: string;        // HSL values only  e.g. "142 71% 45%"
  accent: string;
  ring: string;
  sidebarPrimary: string;
}

export const THEME_PRESETS: ThemePreset[] = [
  { key: "green",   label: "Verde",    emoji: "🟢", primary: "142 71% 45%",  accent: "162 63% 44%",  ring: "142 71% 45%",  sidebarPrimary: "142 71% 45%" },
  { key: "blue",    label: "Azul",     emoji: "🔵", primary: "217 91% 60%",  accent: "199 89% 48%",  ring: "217 91% 60%",  sidebarPrimary: "217 91% 60%" },
  { key: "red",     label: "Rojo",     emoji: "🔴", primary: "0 84% 60%",    accent: "350 89% 60%",  ring: "0 84% 60%",    sidebarPrimary: "0 84% 60%" },
  { key: "purple",  label: "Púrpura",  emoji: "🟣", primary: "262 83% 58%",  accent: "280 65% 60%",  ring: "262 83% 58%",  sidebarPrimary: "262 83% 58%" },
  { key: "orange",  label: "Naranja",  emoji: "🟠", primary: "25 95% 53%",   accent: "38 92% 50%",   ring: "25 95% 53%",   sidebarPrimary: "25 95% 53%" },
  { key: "cyan",    label: "Cian",     emoji: "🩵", primary: "186 94% 42%",  accent: "199 89% 48%",  ring: "186 94% 42%",  sidebarPrimary: "186 94% 42%" },
  { key: "pink",    label: "Rosa",     emoji: "🩷", primary: "330 81% 60%",  accent: "340 75% 55%",  ring: "330 81% 60%",  sidebarPrimary: "330 81% 60%" },
  { key: "amber",   label: "Ámbar",    emoji: "🟡", primary: "45 93% 47%",   accent: "38 92% 50%",   ring: "45 93% 47%",   sidebarPrimary: "45 93% 47%" },
];

// ── Dark / Light base tokens ───────────────────────────────────
const DARK_BASE = {
  background: "222 47% 11%",
  foreground: "210 40% 98%",
  card: "222 47% 13%",
  cardForeground: "210 40% 98%",
  popover: "222 47% 13%",
  popoverForeground: "210 40% 98%",
  primaryForeground: "222 47% 11%",
  secondary: "217 33% 17%",
  secondaryForeground: "210 40% 98%",
  muted: "217 33% 17%",
  mutedForeground: "215 20% 65%",
  border: "217 33% 22%",
  input: "217 33% 22%",
  sidebarBackground: "222 47% 9%",
  sidebarForeground: "210 40% 98%",
  sidebarAccent: "217 33% 17%",
  sidebarAccentForeground: "210 40% 98%",
  sidebarBorder: "217 33% 22%",
};

const LIGHT_BASE = {
  background: "0 0% 100%",
  foreground: "222 47% 11%",
  card: "0 0% 98%",
  cardForeground: "222 47% 11%",
  popover: "0 0% 100%",
  popoverForeground: "222 47% 11%",
  primaryForeground: "0 0% 100%",
  secondary: "220 14% 96%",
  secondaryForeground: "222 47% 11%",
  muted: "220 14% 96%",
  mutedForeground: "215 16% 47%",
  border: "220 13% 91%",
  input: "220 13% 91%",
  sidebarBackground: "220 14% 96%",
  sidebarForeground: "222 47% 11%",
  sidebarAccent: "220 14% 92%",
  sidebarAccentForeground: "222 47% 11%",
  sidebarBorder: "220 13% 91%",
};

// ── Helper: parse "H S% L%" into [h, s, l] ─────────────────────
function parseHSL(hsl: string): [number, number, number] {
  const parts = hsl.replace(/%/g, "").split(/\s+/).map(Number);
  return [parts[0], parts[1], parts[2]];
}

function hslString(h: number, s: number, l: number) {
  return `${Math.round(h)} ${Math.round(s)}% ${Math.round(l)}%`;
}

// ── Derive a full preset from a custom hex color ───────────────
function hexToHSL(hex: string): [number, number, number] {
  hex = hex.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0));
    else if (max === g) h = ((b - r) / d + 2);
    else h = ((r - g) / d + 4);
    h *= 60;
  }
  return [h, s * 100, l * 100];
}

export function customColorToPreset(hex: string): ThemePreset {
  const [h, s, l] = hexToHSL(hex);
  const primary = hslString(h, s, Math.max(l, 45));
  const accent = hslString((h + 30) % 360, s * 0.8, Math.max(l, 48));
  return { key: "custom", label: "Personalizado", emoji: "🎨", primary, accent, ring: primary, sidebarPrimary: primary };
}

// ── Context ────────────────────────────────────────────────────
interface ThemeContextType {
  currentPreset: ThemePreset;
  colorMode: "dark" | "light";
}

const ThemeContext = createContext<ThemeContextType>({
  currentPreset: THEME_PRESETS[0],
  colorMode: "dark",
});

export const useTheme = () => useContext(ThemeContext);

// ── Provider ───────────────────────────────────────────────────
export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const { brand } = useBrand();

  const themePresetKey = (brand as any)?.theme_preset || "green";
  const customColor = (brand as any)?.custom_primary_color || null;
  const colorMode: "dark" | "light" = (brand as any)?.color_mode === "light" ? "light" : "dark";

  const preset: ThemePreset =
    themePresetKey === "custom" && customColor
      ? customColorToPreset(customColor)
      : THEME_PRESETS.find((p) => p.key === themePresetKey) || THEME_PRESETS[0];

  // Apply CSS variables to :root
  useEffect(() => {
    const root = document.documentElement;
    const base = colorMode === "light" ? LIGHT_BASE : DARK_BASE;

    // Base tokens
    root.style.setProperty("--background", base.background);
    root.style.setProperty("--foreground", base.foreground);
    root.style.setProperty("--card", base.card);
    root.style.setProperty("--card-foreground", base.cardForeground);
    root.style.setProperty("--popover", base.popover);
    root.style.setProperty("--popover-foreground", base.popoverForeground);
    root.style.setProperty("--primary-foreground", base.primaryForeground);
    root.style.setProperty("--secondary", base.secondary);
    root.style.setProperty("--secondary-foreground", base.secondaryForeground);
    root.style.setProperty("--muted", base.muted);
    root.style.setProperty("--muted-foreground", base.mutedForeground);
    root.style.setProperty("--border", base.border);
    root.style.setProperty("--input", base.input);
    root.style.setProperty("--sidebar-background", base.sidebarBackground);
    root.style.setProperty("--sidebar-foreground", base.sidebarForeground);
    root.style.setProperty("--sidebar-accent", base.sidebarAccent);
    root.style.setProperty("--sidebar-accent-foreground", base.sidebarAccentForeground);
    root.style.setProperty("--sidebar-border", base.sidebarBorder);

    // Theme-color tokens
    root.style.setProperty("--primary", preset.primary);
    root.style.setProperty("--accent", preset.accent);
    root.style.setProperty("--ring", preset.ring);
    root.style.setProperty("--sidebar-primary", preset.sidebarPrimary);
    root.style.setProperty("--sidebar-primary-foreground", base.primaryForeground);
    root.style.setProperty("--sidebar-ring", preset.ring);
    root.style.setProperty("--success", preset.primary);
    root.style.setProperty("--success-foreground", base.primaryForeground);

    // Toggle dark class for tailwind
    if (colorMode === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [preset, colorMode]);

  return (
    <ThemeContext.Provider value={{ currentPreset: preset, colorMode }}>
      {children}
    </ThemeContext.Provider>
  );
};
