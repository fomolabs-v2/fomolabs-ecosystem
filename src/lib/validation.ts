import { PublicKey } from "@solana/web3.js";
export function validAddress(value: unknown): value is string {
  try {
    return (
      typeof value === "string" && new PublicKey(value).toBase58() === value
    );
  } catch {
    return false;
  }
}
export function atomicAmount(value: string, decimals: number): string {
  if (
    !/^\d+(\.\d*)?$/.test(value) ||
    !Number.isInteger(decimals) ||
    decimals < 0 ||
    decimals > 18
  )
    throw new Error("Enter a valid positive amount.");
  const [whole, fraction = ""] = value.split(".");
  if (fraction.length > decimals)
    throw new Error(`This token supports at most ${decimals} decimal places.`);
  const amount =
    BigInt(whole) * 10n ** BigInt(decimals) +
    BigInt(fraction.padEnd(decimals, "0") || "0");
  if (amount <= 0n || amount > 18446744073709551615n)
    throw new Error("Amount is outside the supported range.");
  return amount.toString();
}
export function decimalAmount(value: string, decimals: number): string {
  if (!/^\d+$/.test(value)) return "0";
  if (decimals === 0) return value;
  const padded = value.padStart(decimals + 1, "0");
  return (
    `${padded.slice(0, -decimals)}.${padded.slice(-decimals)}`.replace(
      /\.?0+$/,
      "",
    ) || "0"
  );
}
export function validateOrderParams(
  input: string,
  output: string,
  amount: string,
  slippage: number,
  taker?: string,
) {
  if (!validAddress(input) || !validAddress(output) || input === output)
    throw new Error("Select two different Solana tokens.");
  if (
    !/^\d{1,20}$/.test(amount) ||
    BigInt(amount) <= 0n ||
    BigInt(amount) > 18446744073709551615n
  )
    throw new Error("Invalid token amount.");
  if (!Number.isInteger(slippage) || slippage < 10 || slippage > 300)
    throw new Error("Slippage must be between 0.1% and 3%.");
  if (taker && !validAddress(taker)) throw new Error("Invalid wallet address.");
}
