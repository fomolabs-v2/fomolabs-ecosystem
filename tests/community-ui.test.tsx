import { test } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { JSDOM } from "jsdom";
import { Keypair, SystemProgram, VersionedTransaction } from "@solana/web3.js";
import {
  buildLaunchTransaction,
  launchMessageHash,
  verifyLaunchTransaction,
  type PreparedLaunch,
} from "../src/lib/launch-safety";
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
const json = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
test("community wallet interactions", async (suite) => {
  const { render, fireEvent, waitFor, cleanup } =
    require("@testing-library/react") as typeof import("@testing-library/react");
  const { WalletContext } =
    require("@solana/wallet-adapter-react") as typeof import("@solana/wallet-adapter-react");
  const { ProfileEditor, CalloutComposer } =
    require("../src/components/launch-community") as typeof import("../src/components/launch-community");
  const { CreateToken } =
    require("../src/components/create-token") as typeof import("../src/components/create-token");
  const pair = Keypair.generate(),
    wallet = pair.publicKey.toBase58(),
    originalFetch = globalThis.fetch;
  await suite.test(
    "rejected profile approval never saves a profile",
    async () => {
      let writes = 0,
        signs = 0;
      globalThis.fetch = async (input) => {
        if (String(input) === "/api/community") {
          writes++;
          return json({ ok: true });
        }
        return json({
          id: "test",
          message: "Public profile approval",
          expiresAt: Date.now() + 300000,
        });
      };
      const context = {
        publicKey: pair.publicKey,
        connected: true,
        signMessage: async () => {
          signs++;
          throw new Error("User rejected message");
        },
      } as any;
      const ui = render(
        <WalletContext.Provider value={context}>
          <ProfileEditor onSaved={() => {}} />
        </WalletContext.Provider>,
      );
      try {
        fireEvent.click(ui.getByRole("button", { name: "Create profile" }));
        fireEvent.change(ui.getByLabelText("Display name"), {
          target: { value: "Test profile" },
        });
        fireEvent.click(
          ui.getByRole("button", { name: "Approve & save profile" }),
        );
        await waitFor(() => assert.ok(ui.getByText("User rejected message")));
        assert.equal(signs, 1);
        assert.equal(writes, 0);
      } finally {
        cleanup();
        globalThis.fetch = originalFetch;
      }
    },
  );
  await suite.test(
    "opening the token picker never posts a callout; rejection never reaches publishing",
    async () => {
      let writes = 0,
        signs = 0;
      globalThis.fetch = async (input) => {
        const path = String(input);
        if (path.startsWith("/api/community/holding"))
          return json({ eligible: true, checkedAt: Date.now() });
        if (path === "/api/community") {
          writes++;
          return json({ ok: true });
        }
        return json({
          id: "test",
          message: "Callout approval",
          expiresAt: Date.now() + 300000,
        });
      };
      const context = {
        publicKey: pair.publicKey,
        connected: true,
        signMessage: async () => {
          signs++;
          throw new Error("User rejected message");
        },
      } as any;
      const ui = render(
        <WalletContext.Provider value={context}>
          <CalloutComposer
            profile={{
              wallet,
              name: "Tester",
              bio: "",
              website: "",
              accent: "cyan",
              updatedAt: Date.now(),
            }}
            onPosted={() => {}}
          />
        </WalletContext.Provider>,
      );
      try {
        await waitFor(() => assert.ok(ui.getByText(/Ready to post/)));
        fireEvent.change(ui.getByLabelText("Your callout"), {
          target: { value: "A token I hold and want to discuss." },
        });
        fireEvent.click(
          ui.getByRole("button", { name: "Choose callout token" }),
        );
        await waitFor(() => assert.ok(ui.getByRole("dialog")));
        assert.equal(signs, 0);
        fireEvent.click(ui.getByRole("button", { name: "Close dialog" }));
        fireEvent.click(
          ui.getByRole("button", { name: "Approve & post callout" }),
        );
        await waitFor(() => assert.ok(ui.getByText("User rejected message")));
        assert.equal(signs, 1);
        assert.equal(writes, 0);
      } finally {
        cleanup();
        globalThis.fetch = originalFetch;
      }
    },
  );
  for (const rejection of [true, false])
    await suite.test(
      `launch requires explicit transaction approval and ${rejection ? "cancellation prevents submission" : "submits both exact signatures"}`,
      async () => {
        localStorage.clear();
        let action: any,
          p: PreparedLaunch,
          executions = 0,
          transactionApprovals = 0,
          messageApprovals = 0;
        globalThis.fetch = async (input, init) => {
          const path = String(input),
            body = init?.body ? JSON.parse(String(init.body)) : {};
          if (path === "/api/community/challenge") {
            action = body.action;
            return json({
              id: "test",
              message: "Publish token metadata",
              expiresAt: Date.now() + 300000,
            });
          }
          if (path === "/api/launch/prepare") {
            const tx = await buildLaunchTransaction({
              wallet,
              mint: action.mint,
              name: action.name,
              symbol: action.symbol,
              uri: `https://www.fomolabs.world/api/launch/metadata/${action.mint}`,
              blockhash: SystemProgram.programId.toBase58(),
            });
            p = {
              id: crypto.randomUUID(),
              wallet,
              mint: action.mint,
              name: action.name,
              symbol: action.symbol,
              description: action.description,
              image: "/image",
              metadataUri: `https://www.fomolabs.world/api/launch/metadata/${action.mint}`,
              transaction: Buffer.from(tx.serialize()).toString("base64"),
              messageHash: launchMessageHash(tx),
              createdAt: Date.now(),
              expiresAt: Date.now() + 60000,
              lastValidBlockHeight: 1,
              estimatedCostLamports: 20000000,
              networkFeeLamports: 14000,
              totalSupply: "1000000000000000",
            };
            return json(p);
          }
          if (path === "/api/launch/execute") {
            assert.ok(body.signedTransaction);
            assert.deepEqual(Object.keys(body).sort(), [
              "id",
              "signedTransaction",
            ]);
            verifyLaunchTransaction(
              p,
              VersionedTransaction.deserialize(
                Buffer.from(body.signedTransaction, "base64"),
              ),
              Date.now(),
            );
            executions++;
            return json({ status: "submitted", mint: action.mint });
          }
          if (path.startsWith("/api/launch/execute?"))
            return json({ status: "submitted", mint: action.mint });
          throw new Error(`Unexpected request ${path}`);
        };
        const context = {
          publicKey: pair.publicKey,
          connected: true,
          signMessage: async () => {
            messageApprovals++;
            return new Uint8Array(64);
          },
          signTransaction: async (tx: VersionedTransaction) => {
            transactionApprovals++;
            if (rejection) throw new Error("User rejected transaction");
            tx.sign([pair]);
            return tx;
          },
        } as any;
        const ui = render(
          <WalletContext.Provider value={context}>
            <CreateToken />
          </WalletContext.Provider>,
        );
        try {
          fireEvent.change(ui.getByLabelText("Token name"), {
            target: { value: "Client test" },
          });
          fireEvent.change(ui.getByLabelText("Symbol"), {
            target: { value: "TEST" },
          });
          fireEvent.change(ui.getByLabelText("Description"), {
            target: { value: "A test-only token description." },
          });
          const bytes = new Uint8Array([137, 80, 78, 71]);
          fireEvent.change(ui.container.querySelector("input[type=file]")!, {
            target: {
              files: [
                {
                  type: "image/png",
                  size: 4,
                  arrayBuffer: async () => bytes.buffer,
                },
              ],
            },
          });
          await waitFor(() =>
            assert.equal(
              (
                ui.getByRole("button", {
                  name: "Approve metadata & review launch",
                }) as HTMLButtonElement
              ).disabled,
              false,
            ),
          );
          fireEvent.click(
            ui.getByRole("button", {
              name: "Approve metadata & review launch",
            }),
          );
          await waitFor(() => assert.ok(ui.getByText("Review your launch")));
          assert.equal(messageApprovals, 1);
          assert.equal(transactionApprovals, 0);
          assert.equal(executions, 0);
          fireEvent.click(ui.getByRole("checkbox"));
          fireEvent.click(
            ui.getByRole("button", { name: "Approve & create token" }),
          );
          if (rejection) {
            await waitFor(() =>
              assert.ok(ui.getByText("User rejected transaction")),
            );
            assert.equal(executions, 0);
          } else {
            await waitFor(() => assert.equal(executions, 1));
            assert.ok(ui.getByText("Waiting for confirmation."));
            assert.ok(!ui.queryByText("Your token is on-chain."));
          }
          assert.equal(transactionApprovals, 1);
        } finally {
          cleanup();
          globalThis.fetch = originalFetch;
          localStorage.clear();
        }
      },
    );
});
