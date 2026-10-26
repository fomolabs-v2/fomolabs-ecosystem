import { test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import React, { useState } from "react";

const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "https://fomolabs.test",
});
for (const key of [
  "window",
  "document",
  "navigator",
  "HTMLElement",
  "HTMLInputElement",
  "Element",
  "Node",
  "NodeFilter",
  "DocumentFragment",
  "MutationObserver",
  "CustomEvent",
  "Event",
  "MouseEvent",
  "KeyboardEvent",
  "FocusEvent",
  "localStorage",
])
  Object.defineProperty(globalThis, key, {
    value: (dom.window as any)[key],
    configurable: true,
    writable: true,
  });
Object.assign(globalThis, {
  getComputedStyle: dom.window.getComputedStyle,
  requestAnimationFrame: (cb: () => void) => setTimeout(cb, 0),
  cancelAnimationFrame: clearTimeout,
  IS_REACT_ACT_ENVIRONMENT: true,
});

test("wallet chooser integration", async (suite) => {
  const { render, fireEvent, waitFor, cleanup } =
    require("@testing-library/react") as typeof import("@testing-library/react");
  const { ConnectionProvider, WalletProvider } =
    require("@solana/wallet-adapter-react") as typeof import("@solana/wallet-adapter-react");
  const { BaseSignerWalletAdapter, WalletReadyState, WalletConnectionError } =
    require("@solana/wallet-adapter-base") as typeof import("@solana/wallet-adapter-base");
  const { PublicKey } =
    require("@solana/web3.js") as typeof import("@solana/web3.js");
  const { WalletConnectionProvider } =
    require("../src/components/wallet-dialog") as typeof import("../src/components/wallet-dialog");
  const { ConnectButton } =
    require("../src/components/ui") as typeof import("../src/components/ui");

  class TestWallet extends BaseSignerWalletAdapter {
    name = "QA Wallet" as any;
    url = "https://example.test";
    icon = "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg'/>";
    supportedTransactionVersions = new Set<any>(["legacy", 0]);
    publicKey: InstanceType<typeof PublicKey> | null = null;
    connecting = false;
    readyState = WalletReadyState.Installed;
    requests = 0;
    rejectNext = false;
    async connect() {
      this.requests++;
      if (this.rejectNext) {
        this.rejectNext = false;
        const error = new WalletConnectionError("User rejected request");
        this.emit("error", error);
        throw error;
      }
      this.publicKey = new PublicKey(
        "So11111111111111111111111111111111111111112",
      );
      this.emit("connect", this.publicKey);
    }
    async disconnect() {
      this.publicKey = null;
      this.emit("disconnect");
    }
    async signTransaction<T>(tx: T): Promise<T> {
      throw new Error("Signing is forbidden in connection tests");
    }
  }
  function Harness({ adapter }: { adapter: TestWallet }) {
    const [error, setError] = useState<string | null>(null);
    return (
      <ConnectionProvider endpoint="https://api.mainnet-beta.solana.com">
        <WalletProvider
          wallets={[adapter]}
          autoConnect={false}
          onError={(e) => setError(e.message)}
        >
          <WalletConnectionProvider
            error={error}
            clearError={() => setError(null)}
          >
            <ConnectButton />
          </WalletConnectionProvider>
        </WalletProvider>
      </ConnectionProvider>
    );
  }
  await suite.test(
    "choosing a detected wallet requests a real adapter connection; manage button does not disconnect",
    async () => {
      localStorage.clear();
      const adapter = new TestWallet();
      const ui = render(<Harness adapter={adapter} />);
      try {
        fireEvent.click(ui.getByRole("button", { name: "Connect wallet" }));
        fireEvent.click(ui.getByRole("button", { name: /QA Wallet Detected/ }));
        await waitFor(() => assert.equal(adapter.requests, 1));
        await waitFor(() =>
          assert.ok(
            ui.getByRole("button", { name: "Manage connected wallet" }),
          ),
        );
        fireEvent.click(
          ui.getByRole("button", { name: "Manage connected wallet" }),
        );
        assert.ok(ui.getByText("Connected · Solana mainnet"));
        assert.ok(adapter.publicKey);
        fireEvent.click(ui.getByRole("button", { name: /^Disconnect$/ }));
        await waitFor(() => assert.equal(adapter.publicKey, null));
        await waitFor(() =>
          assert.ok(ui.getByRole("button", { name: "Connect wallet" })),
        );
      } finally {
        cleanup();
      }
    },
  );
  await suite.test(
    "rejected connection stays actionable and selecting again retries",
    async () => {
      localStorage.clear();
      const adapter = new TestWallet();
      adapter.rejectNext = true;
      const ui = render(<Harness adapter={adapter} />);
      try {
        fireEvent.click(ui.getByRole("button", { name: "Connect wallet" }));
        fireEvent.click(ui.getByRole("button", { name: /QA Wallet Detected/ }));
        await waitFor(() => assert.ok(ui.getByText(/Connection cancelled/)));
        assert.equal(adapter.publicKey, null);
        fireEvent.click(ui.getByRole("button", { name: /QA Wallet Detected/ }));
        await waitFor(() => assert.equal(adapter.requests, 2));
        await waitFor(() =>
          assert.ok(
            ui.getByRole("button", { name: "Manage connected wallet" }),
          ),
        );
      } finally {
        cleanup();
      }
    },
  );
  await suite.test(
    "unavailable OKX shows mobile instructions without pretending to connect",
    async () => {
      localStorage.clear();
      const adapter = new TestWallet();
      const ui = render(<Harness adapter={adapter} />);
      try {
        fireEvent.click(ui.getByRole("button", { name: "Connect wallet" }));
        fireEvent.click(
          ui.getByRole("button", { name: /OKX Wallet Mobile app/ }),
        );
        assert.ok(ui.getByRole("heading", { name: "Use OKX Wallet" }));
        assert.ok(ui.getByRole("button", { name: "Copy FomoLabs link" }));
        assert.equal(adapter.requests, 0);
      } finally {
        cleanup();
      }
    },
  );
  await suite.test(
    "swap review requests approval and a rejected signature never reaches execution",
    async () => {
      const { WalletContext } =
        require("@solana/wallet-adapter-react") as typeof import("@solana/wallet-adapter-react");
      const { SwapPanel } =
        require("../src/components/swap") as typeof import("../src/components/swap");
      const { MarketProvider } =
        require("../src/components/use-data") as typeof import("../src/components/use-data");
      const { TransactionMessage, VersionedTransaction, SystemProgram } =
        require("@solana/web3.js") as typeof import("@solana/web3.js");
      const key = new PublicKey("So11111111111111111111111111111111111111112"),
        adapter = new TestWallet();
      let signRequests = 0,
        executionRequests = 0;
      const unsigned = new VersionedTransaction(
        new TransactionMessage({
          payerKey: key,
          recentBlockhash: SystemProgram.programId.toBase58(),
          instructions: [],
        }).compileToV0Message(),
      );
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async (input) => {
        const url = new URL(String(input), "https://fomolabs.test");
        let body: unknown = {};
        if (url.pathname === "/api/wallet")
          body = {
            balances: [
              { address: key.toBase58(), raw: "1000000000", decimals: 9 },
            ],
            partial: false,
          };
        if (url.pathname === "/api/markets")
          body = { markets: [], partial: false };
        if (url.pathname === "/api/order")
          body = {
            inputMint: url.searchParams.get("inputMint"),
            outputMint: url.searchParams.get("outputMint"),
            inAmount: url.searchParams.get("amount"),
            outAmount: "99000",
            otherAmountThreshold: "98000",
            priceImpact: 0.1,
            feeBps: 0,
            receivedAt: Date.now(),
            transaction: Buffer.from(unsigned.serialize()).toString("base64"),
            requestId: "test-review-only",
          };
        if (url.pathname === "/api/execute") {
          executionRequests++;
          throw new Error("Test must never submit a transaction");
        }
        return new Response(JSON.stringify(body), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      };
      const context = {
        connected: true,
        publicKey: key,
        wallet: { adapter, readyState: adapter.readyState },
        signTransaction: async () => {
          signRequests++;
          throw new Error("User rejected transaction");
        },
      } as any;
      const ui = render(
        <WalletContext.Provider value={context}>
          <MarketProvider>
            <SwapPanel />
          </MarketProvider>
        </WalletContext.Provider>,
      );
      try {
        fireEvent.change(ui.getByLabelText("You pay"), {
          target: { value: ".001" },
        });
        assert.equal(
          (ui.getByLabelText("You pay") as HTMLInputElement).value,
          "0.001",
        );
        await waitFor(() =>
          assert.equal(
            (
              ui.getByRole("button", {
                name: /Review swap/,
              }) as HTMLButtonElement
            ).disabled,
            false,
          ),
        );
        fireEvent.click(ui.getByRole("button", { name: /Review swap/ }));
        await waitFor(() =>
          assert.ok(ui.getByRole("heading", { name: "Review your swap" })),
        );
        assert.equal(signRequests, 0);
        fireEvent.click(ui.getByRole("button", { name: "Approve in wallet" }));
        await waitFor(() => assert.equal(signRequests, 1));
        await waitFor(() =>
          assert.ok(ui.getByText("User rejected transaction")),
        );
        assert.equal(executionRequests, 0);
      } finally {
        cleanup();
        globalThis.fetch = originalFetch;
      }
    },
  );
});
