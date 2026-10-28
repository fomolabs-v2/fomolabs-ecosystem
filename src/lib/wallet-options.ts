export const WALLET_OPTIONS = [
  {
    name: "Phantom",
    aliases: ["Phantom"],
    website: "https://phantom.com/download",
    mark: "P",
    color: "#a991f3",
  },
  {
    name: "Solflare",
    aliases: ["Solflare"],
    website: "https://solflare.com",
    mark: "S",
    color: "#ffb153",
  },
  {
    name: "OKX Wallet",
    aliases: ["OKX", "OKX Wallet"],
    website: "https://web3.okx.com/download",
    mark: "OKX",
    color: "#e9eef5",
  },
  {
    name: "Backpack",
    aliases: ["Backpack"],
    website: "https://backpack.app",
    mark: "B",
    color: "#f46b72",
  },
  {
    name: "Trust Wallet",
    aliases: ["Trust", "Trust Wallet"],
    website: "https://trustwallet.com",
    mark: "T",
    color: "#66a5ff",
  },
  {
    name: "Coinbase Wallet",
    aliases: ["Coinbase Wallet", "Coinbase", "Base Account"],
    website: "https://www.coinbase.com/wallet",
    mark: "C",
    color: "#6b8dff",
  },
  {
    name: "Bitget Wallet",
    aliases: ["Bitget", "Bitget Wallet", "BitKeep"],
    website: "https://web3.bitget.com",
    mark: "B",
    color: "#58e1dd",
  },
] as const;
export type WalletOption = (typeof WALLET_OPTIONS)[number];

export function walletBrowseLink(
  name: string,
  location: string,
): string | null {
  const url = new URL(location);
  if (url.protocol !== "https:" && url.hostname !== "localhost") return null;
  // Only forward the route and public token selection, never arbitrary query data.
  const safe = new URL(url.pathname, url.origin);
  const token = url.searchParams.get("token");
  if (token && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(token))
    safe.searchParams.set("token", token);
  const tab = url.searchParams.get("tab");
  if (
    url.pathname === "/launch" &&
    tab &&
    ["explore", "callouts", "create"].includes(tab)
  )
    safe.searchParams.set("tab", tab);
  const target = encodeURIComponent(safe.href),
    ref = encodeURIComponent(url.origin);
  if (name === "Phantom")
    return `https://phantom.app/ul/browse/${target}?ref=${ref}`;
  if (name === "Solflare")
    return `https://solflare.com/ul/v1/browse/${target}?ref=${ref}`;
  return null;
}

export function walletConnectionError(error: unknown): string {
  const value = error instanceof Error ? error.message : String(error);
  if (/reject|cancel|declin|4001/i.test(value))
    return "Connection cancelled. You can choose a wallet and try again.";
  if (/not.?ready|not.?found|not.?installed/i.test(value))
    return "Wallet unavailable here. Open FomoLabs inside your wallet's browser, or install its browser extension.";
  return value || "Unable to connect. Unlock your wallet and try again.";
}
