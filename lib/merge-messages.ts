import type { AbstractIntlMessages } from "next-intl";

/**
 * Message trees can include arrays (e.g. legal page `sections`), which `AbstractIntlMessages`
 * does not model; next-intl accepts these at runtime.
 */
export type MessageValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | MessageTree
  | MessageValue[];

export type MessageTree = {
  [key: string]: MessageValue;
};

/** Deep-merge locale messages over English so new locales can ship partial files. */
export function mergeMessages(
  base: MessageTree,
  override: MessageTree,
): AbstractIntlMessages {
  const out: MessageTree = { ...base };
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
      out[key] = mergeMessages(bVal as MessageTree, oVal as MessageTree);
    } else if (oVal !== undefined) {
      out[key] = oVal;
    }
  }
  return out as AbstractIntlMessages;
}
