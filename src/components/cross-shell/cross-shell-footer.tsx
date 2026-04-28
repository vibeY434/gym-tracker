/**
 * Cross-Subdomain Shell — Footer.
 *
 * Aus w3yh.xyz/src/components/cross-shell/cross-shell-footer.tsx übernommen.
 * Spec: w3yh.xyz/docs/cross-subdomain-shell.md, Baustein 2.
 */
interface CrossShellFooterProps {
  /** Anzeigename der App, z. B. "Gym Tracker". */
  appName: string;
  /** Volle Domain der App, z. B. "gym.w3yh.xyz". */
  appDomain: string;
}

export function CrossShellFooter({ appName, appDomain }: CrossShellFooterProps) {
  const year = new Date().getFullYear();

  return (
    <footer className="cross-shell-footer">
      <div className="cross-shell-footer__inner">
        <span className="cross-shell-footer__app">
          {appName} · {appDomain}
        </span>
        <a className="cross-shell-footer__brand" href="https://w3yh.xyz/">
          Teil von w3yh.xyz
        </a>
        <span className="cross-shell-footer__legal">
          © {year} Dominik Weyh · Private Seite, Meinungen meine eigenen.
        </span>
      </div>
    </footer>
  );
}
