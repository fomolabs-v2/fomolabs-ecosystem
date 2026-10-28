import { test } from "node:test";
import assert from "node:assert/strict";
import { createPrivateKey, randomUUID, sign } from "node:crypto";
import { Keypair } from "@solana/web3.js";
import {
  applyCommunityAction,
  challengeMessage,
  communityAction,
  emptyCommunity,
  heldTokenAmount,
  verifyChallenge,
  type Challenge,
  type CommunityAction,
} from "../src/lib/community";
import { TOKENS } from "../src/lib/tokens";
const pair = Keypair.generate(),
  wallet = pair.publicKey.toBase58(),
  token = TOKENS[2],
  now = Date.now();
function challenge(action: CommunityAction, owner = wallet): Challenge {
  const c = {
    id: randomUUID(),
    wallet: owner,
    origin: "https://www.fomolabs.world",
    issuedAt: now - 100,
    expiresAt: now + 30000,
    action,
  };
  return { ...c, message: challengeMessage(c) };
}
function signature(c: Challenge) {
  return sign(
    null,
    Buffer.from(c.message),
    createPrivateKey({
      key: Buffer.concat([
        Buffer.from("302e020100300506032b657004220420", "hex"),
        Buffer.from(pair.secretKey.slice(0, 32)),
      ]),
      format: "der",
      type: "pkcs8",
    }),
  ).toString("base64");
}
const profile: CommunityAction = {
  kind: "profile",
  name: "Test author",
  bio: "",
  website: "",
  accent: "cyan",
};
const post: CommunityAction = {
  kind: "callout",
  mint: token.address,
  text: "An actual holder perspective.",
  disclosure: "team",
};
const holding = {
  token,
  holding: { eligible: true, slot: 123, checkedAt: now },
};
function stateWithProfile() {
  const state = emptyCommunity();
  applyCommunityAction(state, challenge(profile), now);
  return state;
}
test("wallet approval binds the action, origin, nonce, wallet, and expiry", () => {
  const c = challenge(profile),
    sig = signature(c);
  verifyChallenge(c, sig, c.origin, now);
  for (const changed of [
    { ...c, action: { ...profile, name: "Impersonator" } },
    { ...c, id: randomUUID() },
    { ...c, wallet: Keypair.generate().publicKey.toBase58() },
  ])
    assert.throws(() =>
      verifyChallenge(changed as Challenge, sig, c.origin, now),
    );
  assert.throws(() => verifyChallenge(c, sig, "https://attacker.example", now));
  assert.throws(() => verifyChallenge(c, sig, c.origin, c.expiresAt));
  assert.throws(() =>
    verifyChallenge(c, Buffer.alloc(64).toString("base64"), c.origin, now),
  );
});
test("single-use proof rejects replay without changing another profile", () => {
  const state = emptyCommunity(),
    c = challenge(profile);
  applyCommunityAction(state, c, now);
  assert.throws(() => applyCommunityAction(state, c, now), /already been used/);
  assert.equal(Object.keys(state.profiles).length, 1);
  assert.equal(state.profiles[wallet].name, "Test author");
});
function account(
  amount: string,
  mint = token.address,
  owner = wallet,
  program = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
  state = "initialized",
) {
  return {
    account: {
      owner: program,
      data: {
        parsed: { info: { owner, mint, state, tokenAmount: { amount } } },
      },
    },
  };
}
test("holding verification aggregates exact SPL and Token-2022 amounts and excludes frozen balances", () => {
  const result = heldTokenAmount(
    {
      context: { slot: 55 },
      value: [
        account("9007199254740993"),
        account(
          "7",
          token.address,
          wallet,
          "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb",
        ),
        account("9000000", token.address, wallet, undefined, "frozen"),
      ],
    },
    wallet,
    token.address,
  );
  assert.equal(result.raw, "9007199254741000");
  assert.equal(result.eligible, true);
  assert.equal(
    heldTokenAmount({ context: { slot: 55 }, value: [] }, wallet, token.address)
      .eligible,
    false,
  );
  assert.equal(
    heldTokenAmount(
      {
        context: { slot: 55 },
        value: [account("1", token.address, wallet, undefined, "frozen")],
      },
      wallet,
      token.address,
    ).eligible,
    false,
  );
});
test("RPC errors, other mints, other owners, wrong programs, and invalid amounts fail closed", () => {
  for (const result of [
    null,
    { value: [] },
    { context: { slot: 55 }, value: [account("1", TOKENS[0].address)] },
    {
      context: { slot: 55 },
      value: [
        account("1", token.address, Keypair.generate().publicKey.toBase58()),
      ],
    },
    {
      context: { slot: 55 },
      value: [
        account("1", token.address, wallet, "11111111111111111111111111111111"),
      ],
    },
    { context: { slot: 55 }, value: [account("1e9")] },
  ])
    assert.throws(() => heldTokenAmount(result, wallet, token.address));
});
test("callouts require a profile and a fresh holding of the same token, record point-in-time evidence", () => {
  assert.throws(
    () => applyCommunityAction(emptyCommunity(), challenge(post), now, holding),
    /profile/,
  );
  for (const extra of [
    undefined,
    { ...holding, holding: { ...holding.holding, eligible: false } },
    { ...holding, token: TOKENS[0] },
    { ...holding, holding: { ...holding.holding, checkedAt: now - 30001 } },
  ])
    assert.throws(
      () =>
        applyCommunityAction(stateWithProfile(), challenge(post), now, extra),
      /Hold this token/,
    );
  const state = stateWithProfile();
  applyCommunityAction(state, challenge(post), now, holding);
  assert.equal(state.callouts[0].token.address, token.address);
  assert.equal(state.callouts[0].holdingSlot, 123);
  assert.equal(state.callouts[0].disclosure, "team");
  assert.throws(
    () => applyCommunityAction(state, challenge(post), now + 1, holding),
    /wait before posting/,
  );
});
test("only the post author can delete; reports are deduplicated and never auto-hide", () => {
  const state = stateWithProfile(),
    c = challenge(post);
  applyCommunityAction(state, c, now, holding);
  const other = Keypair.generate().publicKey.toBase58();
  assert.throws(
    () =>
      applyCommunityAction(
        state,
        challenge({ kind: "delete-callout", id: c.id }, other),
        now,
      ),
    /Only the author/,
  );
  for (let i = 0; i < 2; i++)
    applyCommunityAction(
      state,
      challenge({ kind: "report", id: c.id, reason: "spam" }, other),
      now,
    );
  assert.equal(state.reports[c.id].length, 1);
  assert.equal(state.callouts.length, 1);
  applyCommunityAction(
    state,
    challenge({ kind: "delete-callout", id: c.id }),
    now,
  );
  assert.equal(state.callouts.length, 0);
});
test("unsafe URLs, control characters, excess text, and unknown action fields are rejected", () => {
  for (const action of [
    { ...profile, website: "javascript:alert(1)" },
    { ...profile, website: "https://user:password@example.com" },
    { ...profile, name: "name\u0000" },
    { ...post, text: "x".repeat(501) },
    { ...post, holder: true },
  ])
    assert.equal(communityAction.safeParse(action).success, false);
});
