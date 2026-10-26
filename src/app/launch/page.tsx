"use client";
import { useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  ArrowRight,
  Rocket,
  Sparkles,
  SlidersHorizontal,
  Droplets,
  Layers3,
  Check,
  CircleDashed,
} from "lucide-react";
import { Footer } from "@/components/shell";
const features = [
  {
    id: "01",
    name: "Token creation",
    label: "Start with your idea.",
    text: "A guided creation experience for your token’s identity, supply, and permissions. Built around clear decisions from the very first step.",
    Icon: Sparkles,
    details: [
      "Token identity & metadata",
      "Supply and authority controls",
      "Transparent pre-launch review",
    ],
  },
  {
    id: "02",
    name: "Launch management",
    label: "Bring every detail together.",
    text: "A dedicated workspace to plan your launch, organize project information, and follow each milestone as your token takes shape.",
    Icon: SlidersHorizontal,
    details: [
      "Launch configuration",
      "Project workspace",
      "Milestones & launch visibility",
    ],
  },
  {
    id: "03",
    name: "Liquidity integrations",
    label: "Build a path to your market.",
    text: "Planned liquidity integrations will help creators understand pool setup and connect their tokens with the wider Solana ecosystem.",
    Icon: Droplets,
    details: [
      "Pool setup guidance",
      "Liquidity visibility",
      "Connection to FOMO DEX",
    ],
  },
  {
    id: "04",
    name: "Creator tools",
    label: "Keep building beyond launch.",
    text: "A growing set of tools designed to give creators a clearer view of their project, community, and next opportunity.",
    Icon: Layers3,
    details: [
      "Project insights",
      "Creator dashboard",
      "Future ecosystem integrations",
    ],
  },
];
export default function Launch() {
  const [selected, setSelected] = useState(0);
  const active = features[selected];
  return (
    <>
      <main id="main-content">
        <section className="launch-hero page-container">
          <div className="launch-hero-copy">
            <span className="badge soon">THE NEXT CHAPTER · COMING SOON</span>
            <div className="launch-wordmark">
              FOMO<span>LAUNCH</span>
            </div>
            <h1>
              Every great token
              <br />
              starts with{" "}
              <span className="gradient-text purple-text">a bold idea.</span>
            </h1>
            <p>
              Meet the future launchpad for creators on Solana.
              <br />
              From your first spark to what comes next, all within FomoLabs.
            </p>
            <a href="#launch-vision" className="button primary large">
              Explore the vision <ArrowRight size={17} />
            </a>
            <span className="launch-disclaimer">
              In development. Token creation and launches are not yet available.
            </span>
          </div>
          <div className="launch-art" aria-hidden="true">
            <div className="launch-orbit" />
            <div className="launch-orbit two" />
            <div className="rocket-body">
              <Rocket size={132} strokeWidth={1} />
              <span />
            </div>
            <div className="launch-art-label">
              <span className="tiny-orbit" /> YOUR IDEAS. THE NEXT ORBIT.
            </div>
            <div className="launch-spark one">+</div>
            <div className="launch-spark two">+</div>
          </div>
        </section>
        <section className="launch-vision page-container" id="launch-vision">
          <div className="section-heading">
            <div>
              <span className="eyebrow muted">DESIGNED AROUND CREATORS</span>
              <h2>A launch is just the beginning.</h2>
            </div>
            <p>Four building blocks. One connected vision.</p>
          </div>
          <div className="launch-feature-layout">
            <div
              className="launch-feature-tabs"
              role="tablist"
              aria-label="Planned launchpad tools"
            >
              {features.map((f, i) => (
                <button
                  key={f.id}
                  className={selected === i ? "active" : ""}
                  onClick={() => setSelected(i)}
                  role="tab"
                  id={`feature-tab-${i}`}
                  aria-controls="feature-panel"
                  aria-selected={selected === i}
                >
                  <span>{f.id}</span>
                  <f.Icon size={19} />
                  <strong>{f.name}</strong>
                  <ArrowUpRight size={16} />
                </button>
              ))}
            </div>
            <div
              className="launch-feature-panel panel"
              role="tabpanel"
              id="feature-panel"
              aria-labelledby={`feature-tab-${selected}`}
            >
              <div className="feature-panel-icon">
                <active.Icon size={34} />
              </div>
              <span className="badge soon">Planned feature</span>
              <h3>{active.label}</h3>
              <p>{active.text}</p>
              <div className="feature-details">
                {active.details.map((t) => (
                  <span key={t}>
                    <CircleDashed size={15} />
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="launch-timeline">
            <div>
              <span className="timeline-node live" />
              <small>AVAILABLE NOW</small>
              <strong>FOMO DEX</strong>
              <p>Discover. Analyze. Swap.</p>
            </div>
            <div>
              <span className="timeline-node" />
              <small>NEXT CHAPTER</small>
              <strong>FOMOLAUNCH</strong>
              <p>Token creation & launch tools.</p>
            </div>
            <div>
              <span className="timeline-node" />
              <small>ON THE HORIZON</small>
              <strong>A connected ecosystem</strong>
              <p>More possibilities for creators.</p>
            </div>
          </div>
          <div className="launch-bottom-cta">
            <div>
              <h2>Until then, find your next move.</h2>
              <p>The FomoLabs ecosystem starts with FOMO DEX.</p>
            </div>
            <Link href="/trade" className="button secondary">
              Explore FOMO DEX <ArrowUpRight size={17} />
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
