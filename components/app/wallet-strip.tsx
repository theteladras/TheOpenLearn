import { Coins } from "lucide-react";
import { Link } from "@/i18n/navigation";

export function WalletStrip({
  plan,
  coins,
  openLabel,
}: {
  plan: string;
  coins: number;
  /** Accessible name: e.g. “Open coins and referrals”. */
  openLabel: string;
}) {
  if (plan !== "FREE") return null;
  return (
    <Link
      href="/dashboard/wallet"
      className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-semibold tabular-nums text-amber-900 transition-colors hover:bg-amber-500/25 dark:text-amber-200"
      aria-label={openLabel}
    >
      <Coins className="h-3.5 w-3.5 opacity-90" aria-hidden />
      {coins}
    </Link>
  );
}
