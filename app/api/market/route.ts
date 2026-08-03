import { NextResponse } from "next/server";

type Quote = { price: number; change: number; high: number; low: number; volume: number; source: string };
const unavailable: Quote = { price: 0, change: 0, high: 0, low: 0, volume: 0, source: "All public sources unavailable" };

async function binance(): Promise<Quote> {
  const r = await fetch("https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT", { next: { revalidate: 15 } });
  if (!r.ok) throw new Error("Binance unavailable");
  const d = await r.json();
  return { price: +d.lastPrice, change: +d.priceChangePercent, high: +d.highPrice, low: +d.lowPrice, volume: +d.quoteVolume, source: "Binance BTC/USDT" };
}
async function coingecko(): Promise<Quote> {
  const r = await fetch("https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin&price_change_percentage=24h", { headers: { accept: "application/json" }, next: { revalidate: 30 } });
  if (!r.ok) throw new Error("CoinGecko unavailable");
  const d = (await r.json())[0];
  if (!d?.current_price) throw new Error("CoinGecko returned no BTC price");
  return { price: +d.current_price, change: +d.price_change_percentage_24h || 0, high: +d.high_24h || 0, low: +d.low_24h || 0, volume: +d.total_volume || 0, source: "CoinGecko BTC/USD fallback" };
}
async function coinbase(): Promise<Quote> {
  const [tickerResponse, statsResponse] = await Promise.all([fetch("https://api.exchange.coinbase.com/products/BTC-USD/ticker", { next: { revalidate: 15 } }), fetch("https://api.exchange.coinbase.com/products/BTC-USD/stats", { next: { revalidate: 15 } })]);
  if (!tickerResponse.ok || !statsResponse.ok) throw new Error("Coinbase unavailable");
  const ticker = await tickerResponse.json(), stats = await statsResponse.json(), open = +stats.open;
  return { price: +ticker.price, change: open ? ((+ticker.price - open) / open) * 100 : 0, high: +stats.high, low: +stats.low, volume: (+stats.volume || 0) * (+ticker.price || 0), source: "Coinbase BTC/USD fallback" };
}
export async function GET() {
  for (const source of [binance, coingecko, coinbase]) { try { return NextResponse.json({ ...(await source()), updatedAt: new Date().toISOString() }); } catch { /* Try another independent source. */ } }
  return NextResponse.json({ ...unavailable, updatedAt: new Date().toISOString() });
}
