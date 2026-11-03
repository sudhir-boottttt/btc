import { NextResponse } from "next/server";

type Sentiment = "Bullish" | "Bearish" | "Neutral";
const decode = (value: string) => value.replace(/<!\[CDATA\[|\]\]>/g, "").replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();
const field = (item: string, name: string) => decode(item.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, "i"))?.[1] || "");

function classify(title: string): Sentiment {
  const text = title.toLowerCase();
  if (/(etf inflow|adoption|approval|surge|rally|record high|accumulate|bullish|buy)/.test(text)) return "Bullish";
  if (/(outflow|hack|ban|crackdown|sell-off|plunge|drop|bearish|liquidation|fraud)/.test(text)) return "Bearish";
  return "Neutral";
}

export async function GET() {
  try {
    const response = await fetch("https://news.google.com/rss/search?q=Bitcoin%20when%3A2d&hl=en-US&gl=US&ceid=US%3Aen", { headers: { "User-Agent": "SatoshiSignal/1.0" }, next: { revalidate: 300 } });
    if (!response.ok) throw new Error("News feed unavailable");
    const xml = await response.text();
    const articles = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].slice(0, 8).map(match => {
      const item = match[1], title = field(item, "title"), source = field(item, "source") || title.split(" - ").at(-1) || "Google News";
      return { title, url: field(item, "link"), source, publishedAt: field(item, "pubDate"), sentiment: classify(title) };
    }).filter(article => article.title && article.url);
    return NextResponse.json({ articles, updatedAt: new Date().toISOString(), source: "Google News RSS" });
  } catch {
    return NextResponse.json({ articles: [], updatedAt: new Date().toISOString(), source: "News feed temporarily unavailable" });
  }
}
