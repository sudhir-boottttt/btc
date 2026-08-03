import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { question, price, webSearch } = await request.json();
  if (typeof question !== "string" || !question.trim()) return NextResponse.json({ error: "Ask a Bitcoin question first." }, { status: 400 });
  if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: "AI search is not configured. Add OPENAI_API_KEY in Vercel → Project Settings → Environment Variables, then redeploy." }, { status: 503 });
  const input = `You are Satoshi Signal, a cautious Bitcoin market analyst. Answer only about BTC. Current displayed BTC price: ${price || "unavailable"} USD. Never promise prices or tell the user to buy/sell. State uncertainty, a confidence estimate, key risks, and distinguish verified facts from inference. User question: ${question}`;
  try {
    const response = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }, body: JSON.stringify({ model: "gpt-4.1-mini", input, tools: webSearch ? [{ type: "web_search_preview" }] : undefined }) });
    if (!response.ok) throw new Error(await response.text());
    const data = await response.json();
    return NextResponse.json({ answer: data.output_text || "The AI returned no text. Please try again." });
  } catch { return NextResponse.json({ error: "AI search could not be reached. Check the OpenAI key and try again." }, { status: 502 }); }
}
