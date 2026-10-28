import {
  BaseMessageSignerWalletAdapter,
  WalletConnectionError,
  WalletNotConnectedError,
  WalletReadyState,
  WalletSignTransactionError,
  WalletSignMessageError,
  scopePollingDetectionStrategy,
  type WalletName,
} from "@solana/wallet-adapter-base";
import {
  PublicKey,
  type Transaction,
  type VersionedTransaction,
  type TransactionVersion,
} from "@solana/web3.js";

export interface OkxSolanaProvider {
  signMessage?(
    message: Uint8Array,
    display?: "utf8",
  ): Promise<{ signature: Uint8Array }>;
  publicKey?: { toString(): string } | null;
  connect(): Promise<{ publicKey?: { toString(): string } }>;
  disconnect(): Promise<void>;
  signTransaction<T extends Transaction | VersionedTransaction>(
    transaction: T,
  ): Promise<T>;
  on(event: string, listener: (...args: any[]) => void): void;
  removeListener(event: string, listener: (...args: any[]) => void): void;
}
function injectedProvider(): OkxSolanaProvider | undefined {
  return typeof window === "undefined"
    ? undefined
    : (window as Window & { okxwallet?: { solana?: OkxSolanaProvider } })
        .okxwallet?.solana;
}

/** Legacy injected OKX fallback. Wallet Standard discovery takes priority when registered. */
export class OkxWalletAdapter extends BaseMessageSignerWalletAdapter {
  name = "OKX Wallet" as WalletName<"OKX Wallet">;
  url = "https://web3.okx.com/download";
  icon =
    "data:image/svg+xml," +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" rx="16" fill="#161b24"/><g fill="white"><path d="M14 14h12v12H14zM38 14h12v12H38zM26 26h12v12H26zM14 38h12v12H14zM38 38h12v12H38z"/></g></svg>',
    );
  supportedTransactionVersions: ReadonlySet<TransactionVersion> = new Set([
    "legacy",
    0,
  ]);
  private _publicKey: PublicKey | null = null;
  private _connecting = false;
  private provider: OkxSolanaProvider | null = null;
  private _readyState =
    typeof window === "undefined"
      ? WalletReadyState.Unsupported
      : WalletReadyState.NotDetected;
  constructor(private getProvider = injectedProvider) {
    super();
    if (getProvider()) this._readyState = WalletReadyState.Installed;
    else if (typeof window !== "undefined")
      scopePollingDetectionStrategy(() => {
        if (!getProvider()) return false;
        this._readyState = WalletReadyState.Installed;
        this.emit("readyStateChange", this._readyState);
        return true;
      });
  }
  get publicKey() {
    return this._publicKey;
  }
  get connecting() {
    return this._connecting;
  }
  get readyState() {
    return this._readyState;
  }
  private clear = () => {
    this.provider?.removeListener("disconnect", this.clear);
    this.provider?.removeListener("accountChanged", this.accountChanged);
    this.provider = null;
    this._publicKey = null;
    this.emit("disconnect");
  };
  private accountChanged = (key: { toString(): string } | null) => {
    if (!key) {
      this.clear();
      return;
    }
    try {
      this._publicKey = new PublicKey(key.toString());
      this.emit("connect", this._publicKey);
    } catch {
      this.clear();
    }
  };
  async connect() {
    if (this.connected || this.connecting) return;
    this._connecting = true;
    try {
      const provider = this.getProvider();
      if (!provider) throw new Error("OKX Wallet not found in this browser.");
      const result = await provider.connect();
      const key = result.publicKey || provider.publicKey;
      if (!key) throw new Error("OKX did not return a Solana account.");
      this._publicKey = new PublicKey(key.toString());
      this.provider = provider;
      provider.on("disconnect", this.clear);
      provider.on("accountChanged", this.accountChanged);
      this.emit("connect", this._publicKey);
    } catch (error) {
      const failure = new WalletConnectionError(
        error instanceof Error ? error.message : "OKX connection failed",
        error,
      );
      this.emit("error", failure);
      throw failure;
    } finally {
      this._connecting = false;
    }
  }
  async disconnect() {
    const provider = this.provider;
    this.clear();
    await provider?.disconnect();
  }
  async signMessage(message: Uint8Array): Promise<Uint8Array> {
    if (!this.provider || !this.connected) throw new WalletNotConnectedError();
    try {
      if (!this.provider.signMessage)
        throw new Error(
          "This OKX version does not support message approval. Update your wallet.",
        );
      const result = await this.provider.signMessage(message, "utf8");
      if (!result?.signature || result.signature.length !== 64)
        throw new Error("OKX did not return a valid message signature.");
      return new Uint8Array(result.signature);
    } catch (error) {
      const failure = new WalletSignMessageError(
        error instanceof Error ? error.message : "Wallet approval cancelled",
        error,
      );
      this.emit("error", failure);
      throw failure;
    }
  }
  async signTransaction<T extends Transaction | VersionedTransaction>(
    transaction: T,
  ): Promise<T> {
    if (!this.provider || !this.connected) throw new WalletNotConnectedError();
    try {
      return await this.provider.signTransaction(transaction);
    } catch (error) {
      const failure = new WalletSignTransactionError(
        error instanceof Error ? error.message : "Wallet approval cancelled",
        error,
      );
      this.emit("error", failure);
      throw failure;
    }
  }
}
