"use client";

import { useEffect } from "react";

/** Sets <html lang> from the active locale (root layout cannot read [locale] params). */
export function DocumentLang({ locale }: { locale: string }) {
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  return null;
}
