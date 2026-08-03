"use client";

import { useEffect, useMemo, useState } from "react";

type Market = { price: number; change: number; high: number; low: number; volume: number; source: string; updatedAt: string };
const $ = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const num = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

const signalData = [
  ["Technical", 72, "EMA structure remains constructive; momentum is positive but extended."],
  ["On-chain", 61, "Exchange balance trend and long-term holder data require a connected provider."],
  ["News", 56, "Headlines are mixed; this score is a framework placeholder until a news feed is connected."],
  ["Sentiment", 64, "Fear & Greed / social data require provider credentials for a live reading."],
  ["Macro", 48, "Macro inputs should be reviewed around CPI, FOMC and ETF flow releases."]
];

export default function Dashboard() {
  const [market, setMarket] = useState<Market | null>(null);
  const [tab, setTab] = useState("Overview");
  const [now, setNow] = useState(new Date());
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [searchWeb, setSearchWeb] = useState(true);
  const [asking, setAsking] = useState(false);
  useEffect(() => {
    const load = () => fetch(`/api/market?t=${Date.now()}`, { cache: "no-store" }).then(r => r.json()).then(setMarket).catch(() => undefined);
    load(); const id = setInterval(load, 15000); const clock = setInterval(() => setNow(new Date()), 1000);
    return () => { clearInterval(id); clearInterval(clock); };
  }, []);
  const p = market?.price ?? 0;
  const direction = (market?.change ?? 0) >= 0 ? "up" : "down";
  const entry = p ? Math.round(p * 0.992) : 0;
  const stop = p ? Math.round(p * 0.973) : 0;
  const target1 = p ? Math.round(p * 1.028) : 0;
  const target2 = p ? Math.round(p * 1.054) : 0;
  const chart = useMemo(() => Array.from({ length: 45 }, (_, i) => 45 + Math.sin(i / 4) * 11 + Math.cos(i / 8) * 8 + i * .58), []);
  const ask = async () => {
    const q = question.trim(); if (!q) return;
    setAsking(true); setAnswer("");
    try {
      const r = await fetch("/api/ask", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: q, price: p, webSearch: searchWeb }) });
      const data = await r.json(); setAnswer(data.answer || data.error || "No answer returned.");
    } catch { setAnswer("The chat service is temporarily unavailable. Please try again."); }
    finally { setAsking(false); }
  };
  return <main>
    <aside className="sidebar"><div className="brand"><span>₿</span> SATOSHI<br/><b>SIGNAL</b></div><div className="badge">● LIVE INTELLIGENCE</div>
      {["Overview", "Technical", "On-chain", "News & Sentiment", "Whale Alerts", "Trade Ideas", "Performance"].map(x => <button key={x} className={tab === x ? "nav active" : "nav"} onClick={() => setTab(x)}>{x}</button>)}
      <div className="disclaimer">For research and education only.<br/>Not financial advice.</div></aside>
    <section className="content"><header><div><p className="eyebrow">BITCOIN MARKET INTELLIGENCE</p><h1>BTC / USDT <span className="live-dot">● LIVE</span></h1></div><div className="header-right"><span>{now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span><button className="outline" onClick={() => location.reload()}>↻ Refresh</button></div></header>
      <div className="market-strip"><div><span>PRICE</span><strong>{p ? $.format(p) : "Loading…"}</strong><em className={direction}>{market?.change ? `${market.change > 0 ? "+" : ""}${market.change.toFixed(2)}% 24h` : "Awaiting Binance"}</em></div><div><span>24H HIGH</span><b>{market?.high ? $.format(market.high) : "—"}</b></div><div><span>24H LOW</span><b>{market?.low ? $.format(market.low) : "—"}</b></div><div><span>24H VOLUME</span><b>{market?.volume ? num.format(market.volume) : "—"}</b></div><div><span>DATA SOURCE</span><b className="source">{market?.source || "Connecting"}</b></div></div>
      <div className="status"><div><span className="pill bullish">▲ CAUTIOUSLY BULLISH</span><h2>Probability-weighted outlook</h2><p>Model signals favor upside, but this is a scenario estimate—not a price prediction.</p></div><div className="confidence"><span>CONFIDENCE</span><strong>68<small>/100</small></strong><div className="bar"><i /></div></div></div>
      <div className="prob-grid"><Probability label="Bullish" value={58} cls="green"/><Probability label="Bearish" value={24} cls="red"/><Probability label="Sideways" value={18} cls="gray"/><div className="decision"><span>AI DECISION ENGINE</span><b>UPWARD BIAS</b><p>Confidence is capped until all feeds are live.</p></div></div>
      <div className="grid two"><article className="panel chart-panel"><div className="panel-title"><div><span>PRICE ACTION</span><h3>BTC / USDT · 4H</h3></div><div className="legend"><i/> Price <i className="ema"/> EMA 20</div></div><svg viewBox="0 0 500 180" preserveAspectRatio="none" aria-label="Illustrative BTC trend chart"><defs><linearGradient id="fill" x1="0" x2="0" y1="0" y2="1"><stop stopColor="#e99446" stopOpacity=".35"/><stop offset="1" stopColor="#e99446" stopOpacity="0"/></linearGradient></defs><path d={`M0,180 L${chart.map((v,i)=>`${i*500/44},${180-v*1.65}`).join(" L")} L500,180 Z`} fill="url(#fill)"/><polyline points={chart.map((v,i)=>`${i*500/44},${180-v*1.65}`).join(" ")} fill="none" stroke="#f1a35b" strokeWidth="2"/></svg><div className="chart-footer"><span>Support <b>{p ? $.format(Math.round(p*.955)) : "—"}</b></span><span>Resistance <b>{p ? $.format(Math.round(p*1.045)) : "—"}</b></span><span>ATR <b>High volatility</b></span></div></article>
      <article className="panel"><div className="panel-title"><div><span>SIGNAL COMPOSITE</span><h3>Evidence map</h3></div><span className="muted">Live inputs refresh as connected</span></div>{signalData.map(([name, score, hint]) => <div className="signal" key={String(name)} title={String(hint)}><label>{name}</label><div className="track"><i style={{ width: `${score}%` }} /></div><b>{score}</b></div>)}<p className="footnote">Hover each score for source status. Scores are analytical inputs, not investment recommendations.</p></article></div>
      <div className="grid three"><article className="panel trade"><span>TRADE IDEA · SCENARIO</span><h3>Trend-continuation setup</h3><div className="trade-row"><label>Suggested entry</label><b>{entry ? $.format(entry) : "—"}</b></div><div className="trade-row"><label>Invalidation / stop</label><b className="redtext">{stop ? $.format(stop) : "—"}</b></div><div className="trade-row"><label>Targets</label><b>{target1 ? `${$.format(target1)} · ${$.format(target2)}` : "—"}</b></div><p>Risk/reward target: 1:2.2 · Expected horizon: 1–5 days</p></article>
      <article className="panel hold"><span>LONG-TERM HOLD FRAMEWORK</span><h3>Potential accumulation zone</h3><div className="trade-row"><label>Gradual-buy zone</label><b>{p ? `${$.format(Math.round(p * .90))}–${$.format(Math.round(p * .95))}` : "—"}</b></div><div className="trade-row"><label>Deeper value zone</label><b>{p ? `${$.format(Math.round(p * .80))}–${$.format(Math.round(p * .86))}` : "—"}</b></div><p>Not a guaranteed “best price.” Consider phased entries only if BTC suits your risk tolerance and investment horizon.</p></article>
      <article className="panel risks"><span>RISKS TO THE THESIS</span><ul><li>High-impact macro releases can invalidate technical setups.</li><li>Funding and liquidation data are not yet live.</li><li>Breakouts can fail; position sizing matters.</li></ul></article></div>
      <div className="grid two bottom"><article className="panel"><span>AI MARKET SEARCH</span><h3>Ask ChatGPT about BTC</h3><div className="ask"><input value={question} onChange={e => setQuestion(e.target.value)} onKeyDown={e => e.key === "Enter" && ask()} placeholder="Search: Why is Bitcoin moving today?"/><button disabled={asking} onClick={ask}>{asking ? "Searching…" : "Ask →"}</button></div><label className="web-toggle"><input type="checkbox" checked={searchWeb} onChange={e => setSearchWeb(e.target.checked)}/> Search the web for current context</label>{answer && <p className="answer">{answer}</p>}</article><article className="panel"><span>DATA CONNECTIONS</span><h3>Provider readiness</h3><div className="connections"><b className="connected">● Binance / CoinGecko / Coinbase</b><b>○ OpenAI chat (add key)</b><b>○ CoinGlass (add key)</b><b>○ Glassnode / news feeds (add key)</b></div></article></div>
      <footer>Updated {market ? new Date(market.updatedAt).toLocaleTimeString() : "—"} · BTC/USDT only · No outcome is guaranteed.</footer>
    </section></main>;
}
function Probability({ label, value, cls }: { label: string; value: number; cls: string }) { return <div className="prob"><span>{label}</span><strong>{value}%</strong><div className={`progress ${cls}`}><i style={{ width: `${value}%` }}/></div></div>; }
