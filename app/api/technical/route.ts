import { NextResponse } from "next/server";

type Candle = { close: number; high: number; low: number; closeTime: number };
const headers = { "Cache-Control": "no-store, max-age=0" };
const ema = (values: number[], period: number) => values.reduce((current, value, index) => index === 0 ? value : value * (2 / (period + 1)) + current * (1 - 2 / (period + 1)), values[0]);
function rsi(values: number[], period = 14) { const changes = values.slice(-period - 1).slice(1).map((v, i) => v - values.slice(-period - 1)[i]); const gain = changes.reduce((a, v) => a + Math.max(v, 0), 0) / period, loss = changes.reduce((a, v) => a + Math.max(-v, 0), 0) / period; return loss ? 100 - 100 / (1 + gain / loss) : 100; }
function toResponse(candles: Candle[], source: string) {
  const completed = candles.filter(candle => candle.closeTime <= Date.now());
  if (completed.length < 50) throw new Error("Not enough completed candles");
  const closes = completed.map(c => c.close), last = closes.at(-1)!, lastCandle = completed.at(-1)!;
  const ema20 = ema(closes.slice(-100), 20), ema50 = ema(closes.slice(-150), 50), fast = ema(closes.slice(-80), 12), slow = ema(closes.slice(-80), 26);
  const macd = fast - slow, signal = ema(closes.slice(-40).map((_, i, a) => ema(closes.slice(Math.max(0, closes.length - 40 + i - 26), closes.length - 40 + i + 1), 12) - ema(closes.slice(Math.max(0, closes.length - 40 + i - 26), closes.length - 40 + i + 1), 26)), 9);
  const support = Math.min(...completed.slice(-40).map(c => c.low)), resistance = Math.max(...completed.slice(-40).map(c => c.high));
  const momentum = rsi(closes), bullish = last > ema20 && ema20 > ema50 && macd > signal, bearish = last < ema20 && ema20 < ema50 && macd < signal;
  const trend = bullish ? "Bullish" : bearish ? "Bearish" : "Sideways";
  const entryLow = bullish ? Math.min(last * .997, ema20) : bearish ? Math.max(last * 1.003, ema20) : support * 1.005, entryHigh = bullish ? Math.max(last * .997, ema20) : bearish ? Math.min(last * 1.003, ema20) : resistance * .995;
  const stop = bullish ? support * .997 : bearish ? resistance * 1.003 : support * .992, risk = Math.abs(entryHigh - stop), target1 = bullish ? entryHigh + risk * 2 : bearish ? entryLow - risk * 2 : resistance * .99, target2 = bullish ? entryHigh + risk * 3 : bearish ? entryLow - risk * 3 : resistance;
  const riskReward = risk ? `1:${(Math.abs(target1 - entryHigh) / risk).toFixed(1)}` : "—";
  return { source, updatedAt: new Date().toISOString(), candleClosedAt: new Date(lastCandle.closeTime).toISOString(), price: last, ema20, ema50, rsi: momentum, macd, macdSignal: signal, support, resistance, trend, chart: closes.slice(-45), idea: { direction: bullish ? "Long" : bearish ? "Short" : "Range", entryLow, entryHigh, stop, target1, target2, riskReward, invalid: bullish ? "4H candle closes below support / stop" : bearish ? "4H candle reclaims resistance / stop" : "4H candle closes outside the range" } };
}
async function binance() { const r = await fetch("https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=4h&limit=200", { cache: "no-store" }); if (!r.ok) throw new Error(); const d = await r.json(); return { candles: d.map((c: string[]) => ({ high: +c[2], low: +c[3], close: +c[4], closeTime: +c[6] })), source: "Binance BTC/USDT 4H" }; }
async function coinbase() { const r = await fetch("https://api.exchange.coinbase.com/products/BTC-USD/candles?granularity=14400", { cache: "no-store" }); if (!r.ok) throw new Error(); const d = await r.json(); return { candles: d.map((c: number[]) => ({ low: +c[1], high: +c[2], close: +c[4], closeTime: (+c[0] + 14_400) * 1000 })).reverse(), source: "Coinbase BTC/USD 4H fallback" }; }
export async function GET() { for (const source of [binance, coinbase]) try { const data = await source(); return NextResponse.json(toResponse(data.candles, data.source), { headers }); } catch { /* next provider */ } return NextResponse.json({ error: "Live 4H candle data unavailable" }, { status: 503, headers }); }
