export const SUPPORTED_CURRENCIES = [
  "USD",
  "NIO",
  "HNL",
  "GTQ",
  "CRC",
  "PAB",
  "MXN",
  "COP",
  "PEN",
  "ARS",
  "CLP",
  "BRL",
  "EUR",
  "DOP",
  "BOB",
] as const;

const currencySymbols: Record<string, string> = {
  USD: "$",
  NIO: "C$",
  HNL: "L",
  GTQ: "Q",
  CRC: "₡",
  PAB: "B/.",
  MXN: "$",
  COP: "$",
  PEN: "S/",
  ARS: "$",
  CLP: "$",
  BRL: "R$",
  EUR: "€",
  DOP: "RD$",
  BOB: "Bs",
};

export const getCurrencySymbol = (currency?: string | null): string => {
  const code = (currency || "USD").toUpperCase();
  return currencySymbols[code] || code;
};

export const getCurrencyCode = (currency?: string | null): string => {
  return (currency || "USD").toUpperCase();
};

export const getCurrencyDisplay = (currency?: string | null): string => {
  const code = getCurrencyCode(currency);
  return `${getCurrencySymbol(code)} ${code}`;
};
