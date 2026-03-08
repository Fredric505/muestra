import { es } from "date-fns/locale/es";
import { enUS } from "date-fns/locale/en-US";
import { pt } from "date-fns/locale/pt";
import { fr } from "date-fns/locale/fr";
import type { Locale } from "date-fns";

const dateFnsLocales: Record<string, Locale> = { es, en: enUS, pt, fr };

export function getDateLocale(lang: string): Locale {
  return dateFnsLocales[lang?.substring(0, 2)] || es;
}
