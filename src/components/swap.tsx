"use client";
import { useEffect, useState, useRef } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import {
  orderExpiry,
  isConfirmedExecution,
  validateReviewedTransaction,
  validateSignedTransaction,
  priceImpactMagnitude,
} from "@/lib/trade-safety";
import { Buffer } from "buffer";
import {
  ArrowDownUp,
  ChevronDown,
  SlidersHorizontal,
  ShieldCheck,
  ArrowRight,
  Route,
  LoaderCircle,
  CircleAlert,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { TokenPicker } from "./token-picker";
import { Modal, DataError, TokenIcon } from "./ui";
import { useData, useDebounced, useMarkets } from "./use-data";
import {
  TOKENS,
  SOL,
  USDC,
  type Token,
  money,
  shortAddress,
} from "@/lib/tokens";
import { atomicAmount, decimalAmount } from "@/lib/validation";
type Order = {
  inputMint: string;
  outputMint: string;
  inAmount: string;
  outAmount: string;
  otherAmountThreshold: string;
  priceImpact?: number;
  feeBps?: number;
  transaction?: string;
  requestId?: string;
  receivedAt: number;
  expireAt?: string | number;
  routePlan?: { swapInfo: { label: string } }[];
  router?: string;
  signatureFeeLamports?: number;
  prioritizationFeeLamports?: number;
  rentFeeLamports?: number;
};
type Balances = {
  balances: { address: string; raw: string; decimals: number }[];
  partial?: boolean;
};
export function SwapPanel({ target }: { target?: Token }) {
  const [input, setInput] = useState(TOKENS[0]),
    [output, setOutput] = useState(TOKENS[1]),
    [amount, setAmount] = useState(""),
    [slippage, setSlippage] = useState(50),
    [settings, setSettings] = useState(false),
    [review, setReview] = useState<Order | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null),
    [ack, setAck] = useState(false),
    [tick, setTick] = useState(Date.now()),
    [signature, setSignature] = useState<string | null>(null);
  const {
      publicKey,
      connected,
      signTransaction,
      wallet: selectedWallet,
    } = useWallet(),
    { setVisible } = useWalletModal();
  const wallet = publicKey?.toBase58();
  const currentContext = useRef<string>("");
  currentContext.current = [
    wallet,
    input.address,
    output.address,
    amount,
    slippage,
  ].join(":");
  const { data: markets } = useMarkets();
  const {
    data: balances,
    error: balanceError,
    loading: balancesLoading,
    refresh: refreshBalances,
  } = useData<Balances>(wallet ? `/api/wallet?address=${wallet}` : null, 30000);
  useEffect(() => {
    if (target) {
      setInput(TOKENS[0]);
      setOutput(target.address === SOL ? TOKENS[1] : target);
      setAmount("");
    }
  }, [target?.address]);
  useEffect(() => {
    setReview(null);
    setError(null);
    setAck(false);
  }, [amount, input.address, output.address, slippage, wallet]);
  useEffect(() => {
    if (!review) return;
    const id = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, [review]);
  let atomic = "",
    inputError = "";
  try {
    if (amount) atomic = atomicAmount(amount, input.decimals);
  } catch (e) {
    inputError = (e as Error).message;
  }
  const query =
    atomic && input.address !== output.address
      ? `/api/order?${new URLSearchParams({ inputMint: input.address, outputMint: output.address, amount: atomic, slippageBps: String(slippage) })}`
      : null;
  const debouncedQuery = useDebounced(query, 1100);
  const quoteData = useData<Order>(debouncedQuery, 15000);
  const quote =
    query === debouncedQuery &&
    !quoteData.error &&
    quoteData.data?.inputMint === input.address &&
    quoteData.data?.outputMint === output.address &&
    quoteData.data?.inAmount === atomic
      ? quoteData.data
      : null;
  const balance = balances?.balances.find((b) => b.address === input.address);
  const hasBalance =
    balances && (!balance || (atomic && BigInt(balance.raw) < BigInt(atomic)));
  const balanceUnavailable =
    connected &&
    (!balances || !!balanceError || (!!balances.partial && !balance));
  const unsupportedWallet =
    connected &&
    (!signTransaction ||
      !selectedWallet?.adapter.supportedTransactionVersions?.has(0));
  const inputPrice = markets?.markets.find(
    (m) => m.token.address === input.address,
  )?.price;
  const outputAmount = quote
    ? decimalAmount(quote.outAmount, output.decimals)
    : "";
  const expires = review ? orderExpiry(review.receivedAt, review.expireAt) : 0;
  const expired = !!review && tick >= expires;
  const priceImpact = review ? priceImpactMagnitude(review.priceImpact) : 0;
  const networkReserve =
    input.address === SOL && balance && atomic
      ? BigInt(balance.raw) - BigInt(atomic) < 10000000n
      : false;
  async function prepare() {
    if (!connected) {
      setVisible(true);
      return;
    }
    if (
      !query ||
      !wallet ||
      busy ||
      balanceUnavailable ||
      unsupportedWallet ||
      hasBalance ||
      networkReserve
    )
      return;
    const requestedContext = currentContext.current;
    setBusy(true);
    setError(null);
    setAck(false);
    try {
      const res = await fetch(`${query}&taker=${wallet}`, {
        cache: "no-store",
        signal: AbortSignal.timeout(25000),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error);
      if (!body.transaction || !body.requestId)
        throw new Error("The provider could not prepare this swap.");
      if (currentContext.current !== requestedContext)
        throw new Error(
          "Wallet or trade changed. Please review your current trade again.",
        );
      setTick(Date.now());
      setReview(body);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function approve() {
    if (
      !review ||
      !publicKey ||
      !signTransaction ||
      expired ||
      (priceImpact > 3 && !ack) ||
      priceImpact > 15 ||
      busy
    )
      return;
    const snapshot = review;
    const approvedContext = currentContext.current;
    setBusy(true);
    setError(null);
    try {
      if (!navigator.onLine)
        throw new Error("Reconnect to the internet before trading.");
      if (
        Date.now() >= expires ||
        snapshot.inputMint !== input.address ||
        snapshot.outputMint !== output.address ||
        snapshot.inAmount !== atomic
      )
        throw new Error("This quote has changed. Please request a new review.");
      const transaction = validateReviewedTransaction(
        snapshot.transaction!,
        publicKey.toBase58(),
      );
      if (!transaction.message.staticAccountKeys[0].equals(publicKey))
        throw new Error(
          "The transaction wallet does not match your connected wallet.",
        );
      const signed = await signTransaction(transaction);
      if (currentContext.current !== approvedContext)
        throw new Error(
          "Wallet or trade changed during approval. Nothing was submitted.",
        );
      if (Date.now() >= expires)
        throw new Error(
          "Quote expired while awaiting approval. Nothing was submitted. Please review a new quote.",
        );
      validateSignedTransaction(
        snapshot.transaction!,
        signed,
        publicKey.toBase58(),
      );
      const response = await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signedTransaction: Buffer.from(signed.serialize()).toString("base64"),
          requestId: snapshot.requestId,
        }),
      });
      const result = await response.json();
      if (!response.ok || !isConfirmedExecution(result))
        throw new Error(
          result.error ||
            result.errorMessage ||
            (result.signature
              ? `Execution not confirmed. Check activity before retrying: ${result.signature}`
              : "Swap was not confirmed. Check wallet activity before retrying."),
        );
      setSignature(result.signature);
      setReview(null);
      setAmount("");
      refreshBalances();
      toast.success("Swap confirmed on Solana");
    } catch (e) {
      setError((e as Error).message || "Wallet approval was cancelled.");
      setReview(null);
    } finally {
      setBusy(false);
    }
  }
  function setMax() {
    if (!balance) return;
    const reserve = input.address === SOL ? 10000000n : 0n;
    const value = BigInt(balance.raw) - reserve;
    if (value > 0n) setAmount(decimalAmount(value.toString(), input.decimals));
  }
  return (
    <section className="swap-panel panel">
      <div className="swap-heading">
        <div>
          <h2>Swap</h2>
          <span>Find your next opportunity.</span>
        </div>
        <button
          className={`icon-button ${settings ? "selected" : ""}`}
          onClick={() => setSettings(!settings)}
          aria-label="Swap settings"
          aria-expanded={settings}
        >
          <SlidersHorizontal size={18} />
        </button>
      </div>
      {settings && (
        <div className="swap-settings">
          <div>
            <span>Slippage tolerance</span>
            <span>{(slippage / 100).toFixed(1)}%</span>
          </div>
          <div className="segmented">
            {[10, 50, 100, 300].map((bps) => (
              <button
                key={bps}
                className={slippage === bps ? "active" : ""}
                onClick={() => setSlippage(bps)}
              >
                {bps / 100}%
              </button>
            ))}
          </div>
          <p>
            Maximum price movement accepted. Higher slippage can increase your
            cost.
          </p>
        </div>
      )}
      <div className="swap-input">
        <label htmlFor="pay-amount">You pay</label>
        <div className="amount-row">
          <input
            id="pay-amount"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0.00"
            value={amount}
            onChange={(e) => {
              const value = e.target.value.replace(",", ".");
              if (/^\d*\.?\d*$/.test(value))
                setAmount(value.startsWith(".") ? `0${value}` : value);
            }}
            aria-describedby="amount-hint"
          />
          <TokenPicker
            token={input}
            onChange={(t) => {
              if (t.address === output.address) setOutput(input);
              setInput(t);
            }}
            label="Select pay token"
          />
        </div>
        <div className="amount-meta">
          <span id="amount-hint">
            {amount && inputPrice
              ? `≈ ${money(Number(amount) * inputPrice)}`
              : "Enter an amount"}
          </span>
          <button className="text-button" disabled={!balance} onClick={setMax}>
            {balance
              ? `Bal: ${Number(decimalAmount(balance.raw, input.decimals)).toLocaleString(undefined, { maximumFractionDigits: 4 })}`
              : "Balance: —"}{" "}
            <b>MAX</b>
          </button>
        </div>
      </div>
      <div className="swap-direction">
        <button
          aria-label="Reverse swap tokens"
          onClick={() => {
            setInput(output);
            setOutput(input);
            setAmount("");
          }}
        >
          <ArrowDownUp size={17} />
        </button>
      </div>
      <div className="swap-input receive-input">
        <span>You receive</span>
        <div className="amount-row">
          <output className={!outputAmount ? "placeholder" : ""}>
            {quoteData.loading && atomic ? (
              <LoaderCircle className="spin" size={24} />
            ) : outputAmount ? (
              Number(outputAmount).toLocaleString(undefined, {
                maximumFractionDigits: Math.min(output.decimals, 9),
              })
            ) : (
              "0.00"
            )}
          </output>
          <TokenPicker
            token={output}
            onChange={(t) => {
              if (t.address === input.address) setInput(output);
              setOutput(t);
            }}
            label="Select receive token"
          />
        </div>
        <div className="amount-meta">
          <span>Estimated output</span>
          <span>On Solana</span>
        </div>
      </div>
      {quote && (
        <div className="quote-summary">
          <div>
            <span>Slippage</span>
            <strong>{slippage / 100}%</strong>
          </div>
          <div>
            <span>Price impact</span>
            <strong
              className={
                priceImpactMagnitude(quote.priceImpact) > 3
                  ? "negative"
                  : "positive"
              }
            >
              {priceImpactMagnitude(quote.priceImpact).toFixed(3)}%
            </strong>
          </div>
          <div>
            <span>Provider fee</span>
            <strong>{(quote.feeBps || 0) / 100}%</strong>
          </div>
          <div>
            <span>
              <Route size={12} /> Route
            </span>
            <strong>
              {quote.routePlan
                ?.map((r) => r.swapInfo.label)
                .filter((v, i, a) => a.indexOf(v) === i)
                .join(" → ") ||
                quote.router ||
                "Jupiter"}
            </strong>
          </div>
        </div>
      )}
      {inputError && <DataError error={inputError} />}
      <button
        className="button primary swap-submit"
        disabled={
          busy ||
          (connected &&
            (!atomic ||
              !!inputError ||
              !!hasBalance ||
              !!networkReserve ||
              balanceUnavailable ||
              unsupportedWallet))
        }
        onClick={prepare}
      >
        {busy ? (
          <>
            <LoaderCircle size={17} className="spin" /> Preparing swap
          </>
        ) : !connected ? (
          "Connect wallet"
        ) : unsupportedWallet ? (
          "Update or change wallet"
        ) : balanceUnavailable ? (
          balancesLoading ? (
            "Checking balance…"
          ) : (
            "Balance unavailable"
          )
        ) : hasBalance ? (
          "Insufficient balance"
        ) : networkReserve ? (
          "Keep 0.01 SOL for network fees"
        ) : (
          "Review swap"
        )}
        {!busy && <ArrowRight size={16} />}
      </button>
      {unsupportedWallet && (
        <DataError error="This wallet version cannot sign this swap. Update it, or choose another Solana wallet." />
      )}
      {connected && (balanceError || (balances?.partial && !balance)) && (
        <DataError
          error={
            balanceError ||
            "Token balance could not be verified. Refresh before trading."
          }
          retry={refreshBalances}
        />
      )}
      {(error || (query === debouncedQuery && quoteData.error)) && (
        <DataError
          error={error || quoteData.error!}
          retry={() => {
            setError(null);
            quoteData.refresh();
          }}
        />
      )}{" "}
      {signature && (
        <a
          className="success-message"
          href={`https://solscan.io/tx/${signature}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Swap confirmed <ExternalLink size={13} />
        </a>
      )}
      <p className="swap-security">
        <ShieldCheck size={13} /> Your assets stay in your wallet.
      </p>
      <div className="powered-by">
        <span>Routing powered by</span>
        <strong>
          JUPITER <span>↗</span>
        </strong>
      </div>
      <Modal
        open={!!review}
        onOpenChange={(value) => {
          if (!value && !busy) setReview(null);
        }}
        title="Review your swap"
        description="Review the exact amounts and fees. Your wallet will ask you to approve the transaction."
      >
        {review && (
          <>
            <div className="review-amount">
              <TokenIcon token={input} />
              <div>
                <small>You pay</small>
                <strong>
                  {amount} {input.symbol}
                </strong>
              </div>
            </div>
            <div className="review-arrow">
              <ArrowDownUp size={18} />
            </div>
            <div className="review-amount">
              <TokenIcon token={output} />
              <div>
                <small>Estimated receive</small>
                <strong>
                  {decimalAmount(review.outAmount, output.decimals)}{" "}
                  {output.symbol}
                </strong>
              </div>
            </div>
            <div className="quote-summary">
              <div>
                <span>Minimum received</span>
                <strong>
                  {decimalAmount(review.otherAmountThreshold, output.decimals)}{" "}
                  {output.symbol}
                </strong>
              </div>
              <div>
                <span>Slippage limit</span>
                <strong>{slippage / 100}%</strong>
              </div>
              <div>
                <span>Price impact</span>
                <strong>{priceImpact.toFixed(3)}%</strong>
              </div>
              <div>
                <span>Provider fee</span>
                <strong>{(review.feeBps || 0) / 100}%</strong>
              </div>
              <div>
                <span>Network / priority / rent</span>
                <strong>
                  {typeof review.signatureFeeLamports === "number"
                    ? `${((review.signatureFeeLamports || 0) + (review.prioritizationFeeLamports || 0) + (review.rentFeeLamports || 0)) / 1e9} SOL`
                    : "Shown in your wallet"}
                </strong>
              </div>
              <div>
                <span>Wallet</span>
                <strong>{wallet && shortAddress(wallet)}</strong>
              </div>
              <div>
                <span>Review expires in</span>
                <strong>
                  {Math.max(0, Math.ceil((expires - tick) / 1000))}s
                </strong>
              </div>
            </div>
            {priceImpact > 15 ? (
              <DataError error="Price impact exceeds 15%. This trade is blocked. Try a smaller amount." />
            ) : (
              priceImpact > 3 && (
                <label className="risk-ack">
                  <input
                    type="checkbox"
                    checked={ack}
                    onChange={(e) => setAck(e.target.checked)}
                  />{" "}
                  I understand this trade has high price impact.
                </label>
              )
            )}
            {expired && (
              <DataError error="Quote expired. Close this review and request a fresh quote." />
            )}
            <button
              className="button primary full-width"
              onClick={approve}
              disabled={
                busy || expired || priceImpact > 15 || (priceImpact > 3 && !ack)
              }
            >
              {busy ? (
                <>
                  <LoaderCircle size={17} className="spin" /> Waiting for wallet
                </>
              ) : (
                "Approve in wallet"
              )}
            </button>
            <p className="fineprint">Output token: {output.address}</p>
          </>
        )}
      </Modal>
    </section>
  );
}
