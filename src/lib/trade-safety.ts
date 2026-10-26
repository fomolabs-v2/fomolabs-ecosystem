import { PublicKey, VersionedTransaction } from "@solana/web3.js";
import { Buffer } from "buffer";
export function priceImpactMagnitude(value: number | undefined): number {
  // Jupiter V2 reports signed percentage points; a negative number can mean a loss.
  return typeof value === "number" && Number.isFinite(value)
    ? Math.abs(value)
    : Infinity;
}
export function orderExpiry(
  receivedAt: number,
  expireAt?: string | number | null,
): number {
  let providerExpiry = Infinity;
  if (expireAt != null) {
    const value =
      typeof expireAt === "number"
        ? expireAt
        : /^\d+$/.test(expireAt)
          ? Number(expireAt)
          : Date.parse(expireAt);
    if (Number.isFinite(value))
      providerExpiry = value < 1e12 ? value * 1000 : value;
  }
  return Math.min(receivedAt + 30000, providerExpiry);
}
export function isConfirmedExecution(result: {
  status?: string;
  code?: number;
  signature?: string;
}) {
  return (
    result.status === "Success" &&
    result.code === 0 &&
    typeof result.signature === "string" &&
    result.signature.length >= 64
  );
}
export function validateReviewedTransaction(
  base64: string,
  wallet: string,
): VersionedTransaction {
  const transaction = VersionedTransaction.deserialize(
    Buffer.from(base64, "base64"),
  );
  if (!transaction.message.staticAccountKeys[0].equals(new PublicKey(wallet)))
    throw new Error(
      "The transaction wallet does not match your connected wallet.",
    );
  return transaction;
}

export function validateSignedTransaction(
  reviewed: string,
  signed: VersionedTransaction,
  wallet: string,
): void {
  const original = validateReviewedTransaction(reviewed, wallet);
  if (
    !Buffer.from(signed.message.serialize()).equals(
      Buffer.from(original.message.serialize()),
    )
  )
    throw new Error(
      "The wallet changed the reviewed transaction. Nothing was submitted.",
    );
  if (
    !signed.signatures[0] ||
    signed.signatures[0].every((value) => value === 0)
  )
    throw new Error("Wallet approval is missing. Nothing was submitted.");
}
