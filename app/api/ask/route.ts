import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  let body: { question?: unknown; price?: unknown; webSearch?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const { question, price, webSearch } = body;
  if (typeof question !== "string" || !question.trim()) return NextResponse.json({ error: "Ask a Bitcoin question first." }, { status: 400 });
  if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: "AI search is not configured. Add OPENAI_API_KEY in Vercel → Project Settings → Environment Variables, then redeploy." }, { status: 503 });
  const safePrice = typeof price === "number" && Number.isFinite(price) ? price : "unavailable";
  const input = `You are Satoshi Signal, a cautious Bitcoin market-research assistant. Answer only about BTC. Current displayed BTC price: ${safePrice} USD. Never tell the user to buy, sell, open, close, or size a trade. Do not invent numerical confidence, probabilities, prices, targets, or facts. Distinguish verified facts from inference, include key risks, and say when data is unavailable. User question: ${question}`;
  try {
    const response = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }, body: JSON.stringify({ model: "gpt-4.1-mini", input, tools: webSearch === true ? [{ type: "web_search_preview" }] : undefined }) });
    if (!response.ok) throw new Error(await response.text());
    const data = await response.json();
    return NextResponse.json({ answer: data.output_text || "The AI returned no text. Please try again." });
  } catch (error) { console.error("AI search request failed", error); return NextResponse.json({ error: "AI search could not be reached. Check the server-side key and try again." }, { status: 502 }); }
}
