import Link from "next/link";
import {
  ArrowUpRight,
  ArrowRight,
  ArrowLeftRight,
  Rocket,
  ShieldCheck,
  Layers3,
  Smartphone,
  Compass,
} from "lucide-react";
import { Footer } from "@/components/shell";
import { CopyButton, LiveBadge } from "@/components/ui";
import { InstallButton } from "@/components/pwa";
import { FOMO } from "@/lib/tokens";
export const metadata = { title: "The ecosystem" };
export default function Ecosystem() {
  return (
    <>
      <main id="main-content" className="page-container interior-page">
        <div className="page-heading">
          <div>
            <span className="eyebrow">THE FOMOLABS ECOSYSTEM</span>
            <h1>Connected by possibility.</h1>
            <p>
              Trading is the beginning. We’re building the tools for what comes
              next.
            </p>
          </div>
          <img
            className="ecosystem-heading-logo"
            src="/brand/logo.webp"
            width="100"
            height="100"
            alt="FomoLabs emblem"
          />
        </div>
        <div className="ecosystem-product-list">
          <Link href="/trade" className="ecosystem-product panel">
            <div className="ecosystem-product-icon cyan">
              <ArrowLeftRight size={34} />
            </div>
            <div>
              <LiveBadge>Available now</LiveBadge>
              <h2>FOMO DEX</h2>
              <p>
                One workspace for token discovery, market analysis, and Solana
                swaps powered by Jupiter.
              </p>
              <div className="feature-pills">
                <span>Interactive charts</span>
                <span>Smart routing</span>
                <span>Wallet portfolio</span>
              </div>
            </div>
            <ArrowUpRight size={27} />
          </Link>
          <Link href="/launch" className="ecosystem-product panel">
            <div className="ecosystem-product-icon violet">
              <Rocket size={36} />
            </div>
            <div>
              <span className="badge soon">Coming soon</span>
              <h2>FOMOLAUNCH</h2>
              <p>
                A dedicated launchpad experience for the next generation of
                token creators.
              </p>
              <div className="feature-pills">
                <span>Token creation</span>
                <span>Launch management</span>
                <span>Creator tools</span>
              </div>
            </div>
            <ArrowUpRight size={27} />
          </Link>
        </div>
        <section className="ecosystem-principles">
          <div>
            <ShieldCheck size={25} />
            <h3>Your wallet. Your control.</h3>
            <p>
              Connect your existing wallet. Every trading transaction requires
              your explicit approval.
            </p>
          </div>
          <div>
            <Layers3 size={25} />
            <h3>One visual language.</h3>
            <p>
              A familiar, consistent experience across every product in the
              ecosystem.
            </p>
          </div>
          <div>
            <Smartphone size={25} />
            <h3>Built to move with you.</h3>
            <p>
              A focused desktop terminal and a responsive app that feels at home
              on your phone.
            </p>
          </div>
        </section>
        <section className="ecosystem-token panel">
          <div>
            <span className="eyebrow muted">THE ECOSYSTEM TOKEN</span>
            <h2>Meet FOMO.</h2>
            <p>
              Explore the Fomo Labs token on Solana. Verify the mint address
              before interacting.
            </p>
            <div className="mint-address">
              <code>{FOMO}</code>
              <CopyButton value={FOMO} />
            </div>
          </div>
          <Link className="button primary" href={`/trade?token=${FOMO}`}>
            Explore FOMO <ArrowUpRight size={17} />
          </Link>
        </section>
        <div className="ecosystem-resources">
          <a
            href="https://solscan.io/token/DSEUEGxgDizLLLrVXmCqyAwD9GScpBsoH7HLmMYqfomo"
            target="_blank"
            rel="noopener noreferrer"
          >
            Token explorer <ArrowUpRight size={16} />
          </a>
          <a
            href="https://github.com/FOMOLABS-DEV"
            target="_blank"
            rel="noopener noreferrer"
          >
            FomoLabs on GitHub <ArrowUpRight size={16} />
          </a>
          <InstallButton />
        </div>
      </main>
      <Footer />
    </>
  );
}
