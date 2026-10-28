import { VersionedTransaction } from "@solana/web3.js";
export function validateLaunchMessage(
  tx: VersionedTransaction,
  wallet: string,
  mint: string,
) {
  const m = tx.message;
  if (
    m.header.numRequiredSignatures !== 2 ||
    m.staticAccountKeys[0].toBase58() !== wallet ||
    m.staticAccountKeys[1].toBase58() !== mint ||
    m.addressTableLookups.length
  )
    throw new Error("Launch transaction does not match your wallet and token.");
  const programs = m.compiledInstructions.map((i) =>
    m.staticAccountKeys[i.programIdIndex].toBase58(),
  );
  if (
    programs.length !== 3 ||
    programs[0] !== "ComputeBudget111111111111111111111111111111" ||
    programs[1] !== programs[0] ||
    programs[2] !== "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P"
  )
    throw new Error("Unexpected launch instructions. Please retry.");
}
export const sameMessage = (a: Uint8Array, b: Uint8Array) =>
  a.length === b.length && a.every((v, i) => v === b[i]);
