import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Palette, Sun, Moon } from "lucide-react";
import { THEME_PRESETS, customColorToPreset, applyThemeToDOM, resolvePreset } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";

interface ThemeSelectorProps {
  themePreset: string;
  customPrimaryColor: string | null;
  colorMode: "dark" | "light";
  onThemePresetChange: (preset: string) => void;
  onCustomColorChange: (color: string | null) => void;
  onColorModeChange: (mode: "dark" | "light") => void;
}

export function ThemeSelector({
  themePreset,
  customPrimaryColor,
  colorMode,
  onThemePresetChange,
  onCustomColorChange,
  onColorModeChange,
}: ThemeSelectorProps) {
  const { t } = useTranslation();
  const [customHex, setCustomHex] = useState(customPrimaryColor || "#3b82f6");

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5 text-primary" />
          {t("settings.themeTitle")}
        </CardTitle>
        <CardDescription>
          {t("settings.themeDesc")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Color mode toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="flex items-center gap-2">
              {colorMode === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              {colorMode === "dark" ? t("settings.darkMode") : t("settings.lightMode")}
            </Label>
            <p className="text-xs text-muted-foreground">
              {t("settings.toggleModeDesc")}
            </p>
          </div>
          <Switch
            checked={colorMode === "light"}
            onCheckedChange={(checked) => {
              const newMode = checked ? "light" : "dark";
              onColorModeChange(newMode);
              applyThemeToDOM(resolvePreset(themePreset, customPrimaryColor), newMode);
            }}
          />
        </div>

        {/* Preset grid */}
        <div className="space-y-2">
          <Label>{t("settings.colorTheme")}</Label>
          <div className="grid grid-cols-4 gap-3">
            {THEME_PRESETS.map((preset) => {
              const isActive = themePreset === preset.key;
              const hslParts = preset.primary.replace(/%/g, "").split(/\s+/);
              const bgColor = `hsl(${hslParts[0]}, ${hslParts[1]}%, ${hslParts[2]}%)`;

              return (
                <button
                  key={preset.key}
                  onClick={() => {
                    onThemePresetChange(preset.key);
                    onCustomColorChange(null);
                    applyThemeToDOM(preset, colorMode);
                  }}
                  className={cn(
                    "relative flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all",
                    isActive
                      ? "border-primary bg-primary/10 scale-105"
                      : "border-border hover:border-muted-foreground/40"
                  )}
                >
                  <div
                    className="h-8 w-8 rounded-full shadow-md"
                    style={{ backgroundColor: bgColor }}
                  />
                  <span className="text-xs font-medium text-foreground">{t(`settings.color${preset.key.charAt(0).toUpperCase() + preset.key.slice(1)}`)}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom color */}
        <div className="space-y-2">
          <Label>{t("settings.customColor")}</Label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={customHex}
              onChange={(e) => {
                setCustomHex(e.target.value);
              }}
              className="h-10 w-10 rounded-lg border border-border cursor-pointer bg-transparent"
            />
            <Input
              value={customHex}
              onChange={(e) => setCustomHex(e.target.value)}
              placeholder="#3b82f6"
              className="w-32 font-mono"
            />
            <button
              onClick={() => {
                onThemePresetChange("custom");
                onCustomColorChange(customHex);
                applyThemeToDOM(customColorToPreset(customHex), colorMode);
              }}
              className={cn(
                "px-3 py-2 text-sm rounded-lg border transition-all",
                themePreset === "custom"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:border-muted-foreground/40 text-foreground"
              )}
            >
              {t("settings.apply")}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            {t("settings.customColorHint")}
          </p>
        </div>

        {/* Live preview strip */}
        <div className="space-y-2">
          <Label>{t("settings.livePreview")}</Label>
          <div className="flex gap-2 p-3 rounded-lg bg-card border border-border">
            {(() => {
              const active = themePreset === "custom" && customPrimaryColor
                ? customColorToPreset(customPrimaryColor)
                : THEME_PRESETS.find((p) => p.key === themePreset) || THEME_PRESETS[0];
              const primaryParts = active.primary.replace(/%/g, "").split(/\s+/);
              const accentParts = active.accent.replace(/%/g, "").split(/\s+/);
              return (
                <>
                  <div className="h-6 flex-1 rounded" style={{ backgroundColor: `hsl(${primaryParts[0]}, ${primaryParts[1]}%, ${primaryParts[2]}%)` }} />
                  <div className="h-6 flex-1 rounded" style={{ backgroundColor: `hsl(${accentParts[0]}, ${accentParts[1]}%, ${accentParts[2]}%)` }} />
                  <div className="h-6 flex-1 rounded bg-secondary" />
                  <div className="h-6 flex-1 rounded bg-muted" />
                </>
              );
            })()}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
