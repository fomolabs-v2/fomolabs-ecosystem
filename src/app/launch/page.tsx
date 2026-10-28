import { Suspense } from "react";
import { LaunchWorkspace } from "@/components/launch-workspace";
export const metadata = {
  title: "FOMOLAUNCH — Create, discover & call out",
  description:
    "Launch a Solana token, create your public profile, and share callouts for tokens you hold.",
};
export default function LaunchPage() {
  return (
    <Suspense
      fallback={
        <main id="main-content" className="page-container">
          <p>Loading FOMOLAUNCH…</p>
        </main>
      }
    >
      <LaunchWorkspace />
    </Suspense>
  );
}
