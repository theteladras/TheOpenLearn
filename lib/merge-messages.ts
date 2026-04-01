import type { AbstractIntlMessages } from "next-intl";

/** Deep-merge locale messages over English so new locales can ship partial files. */
export function mergeMessages(
  base: AbstractIntlMessages,
  override: AbstractIntlMessages,
): AbstractIntlMessages {
  const out: AbstractIntlMessages = { ...base };
  for (const key of Object.keys(override)) {
    const oVal = override[key];
    const bVal = base[key];
    if (
      oVal !== null &&
      typeof oVal === "object" &&
      !Array.isArray(oVal) &&
      bVal !== null &&
      typeof bVal === "object" &&
      !Array.isArray(bVal)
    ) {
      out[key] = mergeMessages(
        bVal as AbstractIntlMessages,
        oVal as AbstractIntlMessages,
      );
    } else if (oVal !== undefined) {
      out[key] = oVal;
    }
  }
  return out;
}
