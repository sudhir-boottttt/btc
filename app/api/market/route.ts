import { NextResponse } from "next/server";

const fallback = { price: 0, change: 0, high: 0, low: 0, volume: 0, source: "unavailable", updatedAt: new Date().toISOString() };

export async function GET() {
  try {
    const response = await fetch("https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT", { next: { revalidate: 15 } });
    if (!response.ok) throw new Error("Binance ticker unavailable");
    const ticker = await response.json();
    return NextResponse.json({
      price: Number(ticker.lastPrice), change: Number(ticker.priceChangePercent), high: Number(ticker.highPrice),
      low: Number(ticker.lowPrice), volume: Number(ticker.quoteVolume), source: "Binance BTC/USDT", updatedAt: new Date().toISOString()
    });
  } catch {
    return NextResponse.json(fallback, { status: 200 });
  }
}
