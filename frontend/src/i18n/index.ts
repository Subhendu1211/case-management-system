import { useSyncExternalStore } from "react";
import en from "./en.json";
import or from "./or.json";

type Lang = "en" | "or";

const resources: Record<Lang, unknown> = { en, or };
const listeners = new Set<() => void>();

const getStoredLang = (): Lang => {
  if (typeof window === "undefined") return "en";
  const stored = window.localStorage.getItem("site_language");
  return stored === "or" ? "or" : "en";
};

let currentLang: Lang = getStoredLang();

const resolveValue = (obj: unknown, key: string): unknown => {
  return key.split(".").reduce((acc, part) => {
    if (acc && typeof acc === "object" && part in acc) {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, obj as unknown);
};

const interpolate = (
  value: string,
  vars?: Record<string, string | number>,
): string => {
  if (!vars) return value;
  return Object.entries(vars).reduce(
    (acc, [key, val]) => acc.replaceAll(`{${key}}`, String(val)),
    value,
  );
};

export const t = (
  key: string,
  vars?: Record<string, string | number>,
  fallback?: string,
): string => {
  const value =
    resolveValue(resources[currentLang], key) ??
    resolveValue(resources.en, key) ??
    fallback ??
    key;
  if (typeof value !== "string") return fallback ?? key;
  return interpolate(value, vars);
};

export const tArray = (key: string, fallback: string[] = []): string[] => {
  const value =
    resolveValue(resources[currentLang], key) ??
    resolveValue(resources.en, key);
  return Array.isArray(value) ? (value as string[]) : fallback;
};

export const getLang = (): Lang => currentLang;

export const setLang = (lang: Lang) => {
  if (lang === currentLang) return;
  currentLang = lang;
  if (typeof window !== "undefined") {
    window.localStorage.setItem("site_language", lang);
  }
  listeners.forEach((fn) => fn());
};

export const subscribeLang = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useLang = () => useSyncExternalStore(subscribeLang, getLang, getLang);
