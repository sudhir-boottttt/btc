import { NextResponse } from "next/server";

type Quote = { price: number; change: number; high: number; low: number; volume: number; source: string };
const headers = { "Cache-Control": "no-store, max-age=0" };

async function binance(): Promise<Quote> {
  const r = await fetch("https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT", { cache: "no-store" });
  if (!r.ok) throw new Error("Binance unavailable");
  const d = await r.json();
  return { price: +d.lastPrice, change: +d.priceChangePercent, high: +d.highPrice, low: +d.lowPrice, volume: +d.quoteVolume, source: "Binance BTC/USDT" };
}
async function coingecko(): Promise<Quote> {
  const r = await fetch("https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin&price_change_percentage=24h", { headers: { accept: "application/json" }, cache: "no-store" });
  if (!r.ok) throw new Error("CoinGecko unavailable");
  const d = (await r.json())[0];
  if (!d?.current_price) throw new Error("CoinGecko returned no BTC price");
  return { price: +d.current_price, change: +d.price_change_percentage_24h || 0, high: +d.high_24h || 0, low: +d.low_24h || 0, volume: +d.total_volume || 0, source: "CoinGecko BTC/USD fallback" };
}
async function coinbase(): Promise<Quote> {
  const [tickerResponse, statsResponse] = await Promise.all([fetch("https://api.exchange.coinbase.com/products/BTC-USD/ticker", { cache: "no-store" }), fetch("https://api.exchange.coinbase.com/products/BTC-USD/stats", { cache: "no-store" })]);
  if (!tickerResponse.ok || !statsResponse.ok) throw new Error("Coinbase unavailable");
  const ticker = await tickerResponse.json(), stats = await statsResponse.json(), open = +stats.open;
  return { price: +ticker.price, change: open ? ((+ticker.price - open) / open) * 100 : 0, high: +stats.high, low: +stats.low, volume: (+stats.volume || 0) * (+ticker.price || 0), source: "Coinbase BTC/USD fallback" };
}
export async function GET() {
  for (const source of [binance, coingecko, coinbase]) {
    try {
      return NextResponse.json({ ...(await source()), available: true, updatedAt: new Date().toISOString() }, { headers });
    } catch {
      // Try an independent live source. Nothing cached is presented as a quote.
    }
  }
  return NextResponse.json({ available: false, price: null, change: null, high: null, low: null, volume: null, source: "Live market data unavailable", updatedAt: new Date().toISOString() }, { status: 503, headers });
}
