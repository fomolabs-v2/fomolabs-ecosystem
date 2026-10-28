import { createHash, verify } from "node:crypto";
import {
  ComputeBudgetProgram,
  PublicKey,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import { PUMP_SDK, PUMP_PROGRAM_ID, GLOBAL_PDA } from "@pump-fun/pump-sdk";
import { signatureBase58 } from "./dex-volume";
export { GLOBAL_PDA, PUMP_PROGRAM_ID };
export const LAUNCH_ORIGIN = "https://www.fomolabs.world";
export type PreparedLaunch = {
  id: string;
  wallet: string;
  mint: string;
  name: string;
  symbol: string;
  description: string;
  image: string;
  metadataUri: string;
  messageHash: string;
  transaction: string;
  createdAt: number;
  expiresAt: number;
  lastValidBlockHeight: number;
  estimatedCostLamports: number;
  networkFeeLamports: number;
  totalSupply: string;
  signature?: string;
  status?: "submitted" | "confirmed" | "failed" | "expired";
};
export async function buildLaunchTransaction(input: {
  wallet: string;
  mint: string;
  name: string;
  symbol: string;
  uri: string;
  blockhash: string;
}) {
  const user = new PublicKey(input.wallet);
  const create = await PUMP_SDK.createV2Instruction({
    user,
    creator: user,
    mint: new PublicKey(input.mint),
    name: input.name,
    symbol: input.symbol,
    uri: input.uri,
    mayhemMode: false,
    holderReward: false,
  });
  if (
    create.programId.toBase58() !==
    "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P"
  )
    throw new Error("Launch program mismatch.");
  const transaction = new VersionedTransaction(
    new TransactionMessage({
      payerKey: user,
      recentBlockhash: input.blockhash,
      instructions: [
        ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }),
        ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 10_000 }),
        create,
      ],
    }).compileToV0Message(),
  );
  if (
    transaction.serialize().length > 1232 ||
    transaction.message.header.numRequiredSignatures !== 2
  )
    throw new Error("Launch transaction could not be prepared safely.");
  return transaction;
}
export const launchMessageHash = (tx: VersionedTransaction) =>
  createHash("sha256").update(tx.message.serialize()).digest("hex");
export function verifyLaunchTransaction(
  prepared: PreparedLaunch,
  tx: VersionedTransaction,
  now: number,
) {
  if (now >= prepared.expiresAt)
    throw new Error("Launch review expired. Prepare a new review.");
  if (
    launchMessageHash(tx) !== prepared.messageHash ||
    tx.message.staticAccountKeys[0].toBase58() !== prepared.wallet ||
    tx.message.header.numRequiredSignatures !== 2
  )
    throw new Error("Signed launch does not match the reviewed transaction.");
  const keys = tx.message.staticAccountKeys.slice(0, 2);
  if (!keys.some((k) => k.toBase58() === prepared.mint))
    throw new Error("Launch mint mismatch.");
  for (let i = 0; i < 2; i++) {
    const valid = verify(
      null,
      tx.message.serialize(),
      {
        key: Buffer.concat([
          Buffer.from("302a300506032b6570032100", "hex"),
          keys[i].toBuffer(),
        ]),
        format: "der",
        type: "spki",
      },
      tx.signatures[i],
    );
    if (!valid)
      throw new Error("Valid wallet and mint approvals are required.");
  }
  return signatureBase58(tx.signatures[0]);
}
export function confirmedLaunchTransaction(
  prepared: PreparedLaunch,
  result: any,
) {
  if (
    !result?.meta ||
    result.meta.err ||
    !result.blockTime ||
    !Array.isArray(result.transaction)
  )
    return false;
  const tx = VersionedTransaction.deserialize(
    Buffer.from(result.transaction[0], "base64"),
  );
  return (
    launchMessageHash(tx) === prepared.messageHash &&
    signatureBase58(tx.signatures[0]) === prepared.signature
  );
}
