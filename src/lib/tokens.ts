export type Token = {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  icon?: string;
  verified?: boolean;
};
export const SOL = "So11111111111111111111111111111111111111112";
export const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
export const FOMO = "DSEUEGxgDizLLLrVXmCqyAwD9GScpBsoH7HLmMYqfomo";
export const TOKENS: Token[] = [
  { address: SOL, symbol: "SOL", name: "Solana", decimals: 9, verified: true },
  {
    address: USDC,
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
    verified: true,
  },
  {
    address: FOMO,
    symbol: "FOMO",
    name: "Fomo Labs",
    decimals: 9,
    icon: "/brand/icon-192.png",
  },
  {
    address: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
    symbol: "JUP",
    name: "Jupiter",
    decimals: 6,
    verified: true,
  },
  {
    address: "jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL",
    symbol: "JTO",
    name: "Jito",
    decimals: 9,
    verified: true,
  },
  {
    address: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
    symbol: "BONK",
    name: "Bonk",
    decimals: 5,
    verified: true,
  },
  {
    address: "Ai66LHZG9MCzg1WKdawwqduVAXpNDUuV8M3uyq5ppump",
    symbol: "CATE",
    name: "Cate",
    decimals: 6,
    icon: "https://cdn.dexscreener.com/cms/images/_aILGflqFiJQJ4A-?width=64&height=64&quality=90&format=webp",
  },
  {
    address: "H74CYmXgMkYHYuSRsZt6RJb4NYp2u72Vw8BS5huApump",
    symbol: "LMAO!",
    name: "LMAO!",
    decimals: 6,
    icon: "https://cdn.dexscreener.com/cms/images/JndZ_JL2k9Bd0cS-?width=64&height=64&quality=90&format=webp",
  },
];
export type Market = {
  token: Token;
  price: number;
  change: number;
  volume: number;
  liquidity: number;
  marketCap: number | null;
  fdv: number | null;
  pool: string;
  dex: string;
  quote: string;
  buys: number;
  sells: number;
  url: string;
  updatedAt: string;
};
export type Candle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};
export type PoolTrade = {
  hash: string;
  side: string;
  price: number;
  volume: number;
  time: string;
};
export const shortAddress = (a: string) => `${a.slice(0, 5)}…${a.slice(-4)}`;
export function money(value: number | null | undefined, compact = false) {
  if (value == null || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: compact ? "compact" : "standard",
    maximumFractionDigits: compact ? 2 : value > 1 ? 2 : value > 0.001 ? 5 : 9,
  }).format(value);
}
export const amountFormat = (value: number) =>
  new Intl.NumberFormat("en-US", {
    maximumFractionDigits: value > 1 ? 5 : 9,
  }).format(value);
