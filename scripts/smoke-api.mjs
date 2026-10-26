import assert from 'node:assert/strict';
import { Keypair, SystemProgram, TransactionMessage, VersionedTransaction } from '@solana/web3.js';
import { mkdir, writeFile } from 'node:fs/promises';
const base = process.argv[2] || 'http://localhost:4210';
const SOL = 'So11111111111111111111111111111111111111112', USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', FOMO = 'DSEUEGxgDizLLLrVXmCqyAwD9GScpBsoH7HLmMYqfomo';
const report = { base, checkedAt: new Date().toISOString(), pages: [], checks: [] };
async function json(path, init) { const res = await fetch(base + path, { ...init, signal: AbortSignal.timeout(45000) }); const body = await res.json(); return { status: res.status, body }; }
for (const path of ['/','/trade','/markets','/analytics','/portfolio','/activity','/ecosystem','/launch','/manifest.webmanifest','/sw.js','/offline.html']) {
  const response = await fetch(base + path, { signal: AbortSignal.timeout(30000) });
  assert.equal(response.status,200,`${path} must return 200`); report.pages.push({ path, status: response.status });
}
const markets = await json('/api/markets'); assert.equal(markets.status,200); assert.ok(markets.body.markets.length >= 5);
report.checks.push({ name:'live-markets', tokens:markets.body.markets.map(m=>m.token.symbol), partial:markets.body.partial });
const market = markets.body.markets.find(m=>m.token.address === SOL); assert.ok(market.pool);
for (const [name,path] of [['candles',`/api/chart?pool=${market.pool}&interval=1h`],['pool-trades',`/api/chart?pool=${market.pool}&kind=trades`],['token-search','/api/tokens?q=FOMO']]) {
  const result = await json(path); assert.equal(result.status,200,JSON.stringify(result.body)); const values = result.body.candles || result.body.trades || result.body.tokens; assert.ok(values.length); report.checks.push({name,count:values.length});
}
const quotePath = `/api/order?inputMint=${SOL}&outputMint=${USDC}&amount=1000000&slippageBps=50`;
const quote = await json(quotePath); assert.equal(quote.status,200,JSON.stringify(quote.body)); assert.ok(BigInt(quote.body.outAmount) > 0n); assert.ok(BigInt(quote.body.otherAmountThreshold) <= BigInt(quote.body.outAmount));
report.checks.push({ name:'SOL-USDC-quote', inAmount:quote.body.inAmount, outAmount:quote.body.outAmount, minimum:quote.body.otherAmountThreshold, feeBps:quote.body.feeBps, impact:quote.body.priceImpact, router:quote.body.router });
await new Promise(resolve=>setTimeout(resolve,2300));
const fomo = await json(`/api/order?inputMint=${SOL}&outputMint=${FOMO}&amount=1000000&slippageBps=50`);
report.checks.push({ name:'FOMO-route', status:fomo.status, outAmount:fomo.body.outAmount, error:fomo.body.error });
const payer = Keypair.generate().publicKey;
const wallet = await json(`/api/wallet?address=${payer.toBase58()}`); assert.equal(wallet.status,200,JSON.stringify(wallet.body)); assert.equal(wallet.body.balances[0].raw,'0');
report.checks.push({name:'unfunded-wallet-read',historyAvailable:wallet.body.historyAvailable,partial:wallet.body.partial});
await new Promise(resolve=>setTimeout(resolve,2300));
const order = await json(`${quotePath}&taker=${payer.toBase58()}`);
if (order.status === 200) {
  const tx = VersionedTransaction.deserialize(Buffer.from(order.body.transaction,'base64')); assert.ok(tx.message.staticAccountKeys[0].equals(payer)); report.checks.push({name:'unsigned-order-build',status:200,bytes:tx.serialize().length,signaturesRequired:tx.message.header.numRequiredSignatures});
} else { assert.ok(order.status >= 400); report.checks.push({name:'unfunded-order-response',status:order.status,error:order.body.error}); }
const message = new TransactionMessage({payerKey:payer,recentBlockhash:SystemProgram.programId.toBase58(),instructions:[]}).compileToV0Message();
const unsigned = new VersionedTransaction(message);
const execute = await json('/api/execute',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({requestId:'read-only-test-id',signedTransaction:Buffer.from(unsigned.serialize()).toString('base64')})});
assert.equal(execute.status,400); assert.match(execute.body.error,/approval/); report.checks.push({name:'unsigned-submission-blocked',status:execute.status});
for(const path of ['/api/order?inputMint=bad&outputMint=bad&amount=1','/api/wallet?address=bad','/api/chart?pool=bad']){ const result=await json(path); assert.equal(result.status,400); report.checks.push({name:'invalid-input-rejected',path,status:result.status}); }
const rpc = await json('/api/rpc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'sendTransaction',params:[]})}); assert.equal(rpc.status,400); report.checks.push({name:'RPC-broadcast-blocked',status:rpc.status});
await mkdir('qa',{recursive:true}); await writeFile(`qa/api-${new URL(base).hostname}.json`,JSON.stringify(report,null,2)); console.log(JSON.stringify(report,null,2));
