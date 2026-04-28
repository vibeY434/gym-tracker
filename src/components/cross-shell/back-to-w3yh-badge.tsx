/**
 * Cross-Subdomain Shell — Back-Badge.
 *
 * Aus w3yh.xyz/src/components/cross-shell/back-to-w3yh-badge.tsx übernommen.
 * Spec: w3yh.xyz/docs/cross-subdomain-shell.md, Baustein 1.
 *
 * CSS: globaler Stylesheet aus
 *   <link rel="stylesheet" href="https://w3yh.xyz/cross-shell/cross-shell.css" />
 * im Wurzel-Layout.
 */
import Link from "next/link";

interface BackToW3yhBadgeProps {
  /** "default" für klare Marken-Spur, "soft" für eigene Marken (Spielgenerator). */
  variant?: "default" | "soft";
  /** "sticky" rendert eine eigene Top-Zeile, "inline" passt in bestehende App-Header. */
  placement?: "sticky" | "inline";
}

export function BackToW3yhBadge({
  variant = "default",
  placement = "sticky",
}: BackToW3yhBadgeProps) {
  const label = variant === "soft" ? "by w3yh.xyz" : "← w3yh.xyz";
  const ariaLabel =
    variant === "soft" ? "Mehr Projekte auf w3yh.xyz" : "Zurück zu w3yh.xyz";
  const className =
    variant === "soft"
      ? "cross-shell-badge cross-shell-badge--soft"
      : "cross-shell-badge";
  const wrapperClassName =
    placement === "inline"
      ? "cross-shell-badge-wrap cross-shell-badge-wrap--inline"
      : "cross-shell-badge-wrap";

  return (
    <div className={wrapperClassName}>
      <Link href="https://w3yh.xyz/" aria-label={ariaLabel} className={className}>
        {label}
      </Link>
    </div>
  );
}
