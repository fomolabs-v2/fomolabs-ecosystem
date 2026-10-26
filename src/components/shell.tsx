"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Menu,
  X,
  ArrowUpRight,
  House,
  ChartNoAxesCombined,
  ArrowLeftRight,
  Wallet,
  Layers,
  ChevronDown,
  Activity,
  Clock3,
  Rocket,
} from "lucide-react";
import { ConnectButton, Logo, LiveBadge } from "./ui";
import { InstallButton } from "./pwa";
const links = [
  { href: "/", label: "Home" },
  { href: "/trade", label: "FOMO DEX" },
  { href: "/launch", label: "FOMOLAUNCH", soon: true },
  { href: "/markets", label: "Markets" },
  { href: "/analytics", label: "Analytics" },
  { href: "/ecosystem", label: "Ecosystem" },
];
export function Header() {
  const path = usePathname(),
    [menu, setMenu] = useState(false);
  return (
    <header className="site-header">
      <div className="header-inner">
        <Link
          href="/"
          aria-label="FomoLabs home"
          onClick={() => setMenu(false)}
        >
          <Logo />
        </Link>
        <nav className="desktop-nav" aria-label="Main navigation">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={path === link.href ? "active" : ""}
            >
              {link.label}
              {link.soon && <span className="nav-soon">SOON</span>}
            </Link>
          ))}
        </nav>
        <div className="header-actions">
          <span className="network-pill">
            <i className="network-dot" />
            Solana <ChevronDown size={12} />
          </span>
          <ConnectButton />
          <button
            className="icon-button mobile-menu-toggle"
            onClick={() => setMenu(!menu)}
            aria-label={menu ? "Close navigation" : "Open navigation"}
            aria-expanded={menu}
          >
            {menu ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>
      </div>
      {menu && (
        <nav className="mobile-menu" aria-label="Mobile navigation">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={path === link.href ? "active" : ""}
              onClick={() => setMenu(false)}
            >
              {link.label}
              {link.soon && <span className="badge soon">Coming soon</span>}
              <ArrowUpRight size={16} />
            </Link>
          ))}
          <Link href="/portfolio" onClick={() => setMenu(false)}>
            Portfolio
            <Wallet size={16} />
          </Link>
          <InstallButton />
        </nav>
      )}
    </header>
  );
}
export function Footer() {
  return (
    <footer className="footer">
      <div>
        <Link href="/">
          <Logo small />
        </Link>
        <p>A new perspective on decentralized finance.</p>
      </div>
      <div className="footer-center">
        <LiveBadge>Built on Solana</LiveBadge>
        <span>Self-custody. Your wallet, your control.</span>
      </div>
      <div className="footer-right">
        <InstallButton />
        <a href="https://github.com/fomolabs-v2/fomolabs-ecosystem" target="_blank" rel="noopener noreferrer">
          GitHub <ArrowUpRight size={12} />
        </a>
        <Link href="/about">
          Privacy & disclosures <ArrowUpRight size={12} />
        </Link>
        <span>© {new Date().getFullYear()} FomoLabs</span>
      </div>
    </footer>
  );
}
export function MobileNav() {
  const path = usePathname();
  const items = [
    { href: "/", label: "Home", Icon: House },
    { href: "/markets", label: "Markets", Icon: ChartNoAxesCombined },
    { href: "/trade", label: "Trade", Icon: ArrowLeftRight },
    { href: "/activity", label: "Activity", Icon: Clock3 },
    { href: "/portfolio", label: "Wallet", Icon: Wallet },
  ];
  return (
    <nav className="mobile-bottom" aria-label="Quick navigation">
      {items.map(({ href, label, Icon }) => (
        <Link
          key={href}
          href={href}
          className={`${path === href ? "active" : ""} ${href === "/trade" ? "trade-tab" : ""}`}
        >
          <span>
            <Icon size={19} />
          </span>
          {label}
        </Link>
      ))}
    </nav>
  );
}
export function TerminalSidebar() {
  const path = usePathname();
  return (
    <aside className="terminal-sidebar">
      <span className="sidebar-caption">WORKSPACE</span>
      {[
        { href: "/trade", label: "Trade", Icon: ArrowLeftRight },
        { href: "/markets", label: "Markets", Icon: ChartNoAxesCombined },
        { href: "/analytics", label: "Analytics", Icon: Activity },
        { href: "/portfolio", label: "Portfolio", Icon: Wallet },
        { href: "/activity", label: "Activity", Icon: Clock3 },
      ].map(({ href, label, Icon }) => (
        <Link key={href} href={href} className={path === href ? "active" : ""}>
          <Icon size={18} />
          <span>{label}</span>
        </Link>
      ))}
      <div className="sidebar-bottom">
        <Link href="/launch" className="sidebar-launch">
          <Rocket size={24} />
          <strong>
            Next up.
            <br />
            FOMOLAUNCH
          </strong>
          <span className="badge soon">Coming soon</span>
        </Link>
        <Link href="/ecosystem">
          <Layers size={17} /> Ecosystem <ArrowUpRight size={13} />
        </Link>
      </div>
    </aside>
  );
}
