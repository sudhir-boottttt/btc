"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";

type Market = {
  available: boolean;
  price: number | null;
  change: number | null;
  high: number | null;
  low: number | null;
  volume: number | null;
  source: string;
  updatedAt: string;
};
type Idea = {
  direction: "Long" | "Short" | "Range";
  entryLow: number;
  entryHigh: number;
  stop: number;
  target1: number;
  target2: number;
  riskReward: string;
  invalid: string;
};
type Technical = {
  source: string;
  updatedAt: string;
  candleClosedAt: string;
  price: number;
  ema20: number;
  ema50: number;
  rsi: number;
  macd: number;
  macdSignal: number;
  support: number;
  resistance: number;
  trend: "Bullish" | "Bearish" | "Sideways";
  chart: number[];
  idea: Idea;
};
type TradeResult = "Open" | "Win" | "Loss" | "Breakeven";
type Feeling = "Calm" | "FOMO" | "Revenge" | "Anxious" | "Neutral";
type JournalEntry = {
  id: string;
  date: string;
  direction: "Long" | "Short";
  entry: number;
  stop: number;
  target: number;
  size: number;
  setup: string;
  reason: string;
  result: TradeResult;
  feeling: Feeling;
  pnlUsdt?: number;
};
type IdeaOutcome = "Monitoring" | "Target reached" | "Invalidated" | "No entry / skipped" | "Unclear";
type IdeaRecord = Idea & { id: string; generatedAt: string; source: string; outcome: IdeaOutcome };
type RiskRules = { equity: number; maxRiskPercent: number; maxDailyLossPercent: number; maxLeverage: number; maxOpenPositions: number };
type TaxInputs = { gainsInr: number; lossesInr: number; taxRate: number };
type Article = { title: string; url: string; source: string; publishedAt: string; sentiment: "Bullish" | "Bearish" | "Neutral" };

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const JOURNAL_KEY = "satoshi-signal-journal-v1";
const IDEAS_KEY = "satoshi-signal-ideas-v1";
const RISK_KEY = "satoshi-signal-risk-v1";
const TAX_KEY = "satoshi-signal-tax-v1";
const defaultRiskRules: RiskRules = { equity: 0, maxRiskPercent: 1, maxDailyLossPercent: 2, maxLeverage: 3, maxOpenPositions: 2 };
const defaultTax: TaxInputs = { gainsInr: 0, lossesInr: 0, taxRate: 30 };

function readStored<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch {
    return fallback;
  }
}
function writeStored<T>(key: string, value: T) {
  try { window.localStorage.setItem(key, JSON.stringify(value)); } catch { /* Browser storage is optional. */ }
}
function money(value: number | null | undefined) { return typeof value === "number" && Number.isFinite(value) ? usd.format(value) : "—"; }
function number(value: number | null | undefined, digits = 1) { return typeof value === "number" && Number.isFinite(value) ? value.toFixed(digits) : "—"; }
function localDateTime() { const value = new Date(); value.setMinutes(value.getMinutes() - value.getTimezoneOffset()); return value.toISOString().slice(0, 16); }
function tradeId() { return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`; }
function sameLocalDay(value: string) { return new Date(value).toDateString() === new Date().toDateString(); }

export default function Dashboard() {
  const [market, setMarket] = useState<Market | null>(null);
  const [technical, setTechnical] = useState<Technical | null>(null);
  const [marketNotice, setMarketNotice] = useState("Connecting to live market data…");
  const [technicalNotice, setTechnicalNotice] = useState("Connecting to live 4H candles…");
  const [tab, setTab] = useState("Overview");
  const [now, setNow] = useState<Date | null>(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [searchWeb, setSearchWeb] = useState(true);
  const [asking, setAsking] = useState(false);
  const [journal, setJournal] = useState<JournalEntry[]>([]);
  const [ideas, setIdeas] = useState<IdeaRecord[]>([]);
  const [riskRules, setRiskRules] = useState<RiskRules>(defaultRiskRules);
  const [taxInputs, setTaxInputs] = useState<TaxInputs>(defaultTax);
  const [storageReady, setStorageReady] = useState(false);

  useEffect(() => {
    setJournal(readStored(JOURNAL_KEY, []));
    setIdeas(readStored(IDEAS_KEY, []));
    setRiskRules(readStored(RISK_KEY, defaultRiskRules));
    setTaxInputs(readStored(TAX_KEY, defaultTax));
    setStorageReady(true);
  }, []);
  useEffect(() => { if (storageReady) writeStored(JOURNAL_KEY, journal); }, [journal, storageReady]);
  useEffect(() => { if (storageReady) writeStored(IDEAS_KEY, ideas); }, [ideas, storageReady]);
  useEffect(() => { if (storageReady) writeStored(RISK_KEY, riskRules); }, [riskRules, storageReady]);
  useEffect(() => { if (storageReady) writeStored(TAX_KEY, taxInputs); }, [taxInputs, storageReady]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const response = await fetch(`/api/market?t=${Date.now()}`, { cache: "no-store" });
        const data = await response.json() as Market;
        if (!active) return;
        setMarket(data);
        setMarketNotice(data.available ? `Live via ${data.source}` : "Live market data unavailable — no cached quote is shown.");
      } catch {
        if (!active) return;
        setMarket(null);
        setMarketNotice("Live market data unavailable — no cached quote is shown.");
      }
    };
    load();
    const id = window.setInterval(load, 15_000);
    return () => { active = false; window.clearInterval(id); };
  }, []);
  useEffect(() => {
    if (!storageReady) return;
    let active = true;
    const load = async () => {
      try {
        const response = await fetch(`/api/technical?t=${Date.now()}`, { cache: "no-store" });
        if (!response.ok) throw new Error("Technical feed unavailable");
        const data = await response.json() as Technical;
        if (!active) return;
        setTechnical(data);
        setTechnicalNotice(`Live 4H data via ${data.source}`);
        const id = `${data.source}:${data.candleClosedAt}:${data.idea.direction}`;
        setIdeas(current => current.some(idea => idea.id === id) ? current : [{ id, generatedAt: data.candleClosedAt, source: data.source, outcome: "Monitoring" as IdeaOutcome, ...data.idea }, ...current].slice(0, 250));
      } catch {
        if (!active) return;
        setTechnical(null);
        setTechnicalNotice("Live 4H candle data unavailable — no scenario is shown.");
      }
    };
    load();
    const id = window.setInterval(load, 60_000);
    return () => { active = false; window.clearInterval(id); };
  }, [storageReady]);
  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 1_000);
    return () => window.clearInterval(id);
  }, []);

  const displayedPrice = market?.available ? market.price : null;
  const ask = async () => {
    const q = question.trim();
    if (!q) return;
    setAsking(true);
    setAnswer("");
    try {
      const response = await fetch("/api/ask", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: q, price: displayedPrice, webSearch: searchWeb }) });
      const data = await response.json();
      setAnswer(data.answer || data.error || "No answer returned.");
    } catch {
      setAnswer("The chat service is temporarily unavailable. Please try again.");
    } finally {
      setAsking(false);
    }
  };

  const navItems = ["Overview", "Technical", "Journal", "Risk & Futures", "Tax P&L", "Performance", "On-chain", "News & Sentiment", "Whale Alerts", "Trade Ideas"];
  return <main>
    <aside className="sidebar">
      <div className="brand"><span>₿</span> SATOSHI<br /><b>SIGNAL</b></div>
      <div className={market?.available ? "badge" : "badge unavailable-badge"}>● {market?.available ? "LIVE MARKET DATA" : "DATA UNAVAILABLE"}</div>
      {navItems.map(item => <button key={item} className={tab === item ? "nav active" : "nav"} onClick={() => setTab(item)}>{item}</button>)}
      <div className="disclaimer">Research and self-review only.<br />Never a trade instruction.</div>
    </aside>
    <section className="content">
      <header>
        <div><p className="eyebrow">BITCOIN MARKET CONTEXT</p><h1>BTC / USDT <span className={market?.available ? "live-dot" : "live-dot offline"}>{market?.available ? "● LIVE" : "○ UNAVAILABLE"}</span></h1></div>
        <div className="header-right"><span>{now ? now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "—"}</span><button className="outline" onClick={() => window.location.reload()}>↻ Refresh</button></div>
      </header>
      {tab === "Overview" ? <OverviewView market={market} technical={technical} marketNotice={marketNotice} technicalNotice={technicalNotice} question={question} setQuestion={setQuestion} answer={answer} searchWeb={searchWeb} setSearchWeb={setSearchWeb} asking={asking} ask={ask} /> : <FeatureView tab={tab} market={market} technical={technical} technicalNotice={technicalNotice} journal={journal} setJournal={setJournal} ideas={ideas} setIdeas={setIdeas} riskRules={riskRules} setRiskRules={setRiskRules} taxInputs={taxInputs} setTaxInputs={setTaxInputs} />}
      <footer>Market data and scenarios are context only. Personal journal, risk rules, tax inputs, and idea records are stored in this browser.</footer>
    </section>
  </main>;
}

function OverviewView({ market, technical, marketNotice, technicalNotice, question, setQuestion, answer, searchWeb, setSearchWeb, asking, ask }: { market: Market | null; technical: Technical | null; marketNotice: string; technicalNotice: string; question: string; setQuestion: (value: string) => void; answer: string; searchWeb: boolean; setSearchWeb: (value: boolean) => void; asking: boolean; ask: () => void }) {
  const price = market?.available ? market.price : null;
  const direction = typeof market?.change === "number" && market.change !== 0 ? market.change > 0 ? "up" : "down" : "";
  const chartPoints = useMemo(() => makeChartPoints(technical?.chart || []), [technical?.chart]);
  const evidence = [
    ["Technical", technical ? "Live 4H calculation" : "—", technical ? technical.source : technicalNotice],
    ["On-chain", "—", "No connected on-chain provider"],
    ["News", "Live headlines only", "Headlines are not converted into a score"],
    ["Sentiment", "—", "Not computed from a connected live source"],
    ["Macro", "—", "Review events manually; no macro score is calculated"]
  ];
  return <>
    <div className="market-strip">
      <div><span>PRICE</span><strong>{money(price)}</strong><em className={direction}>{typeof market?.change === "number" ? `${market.change > 0 ? "+" : ""}${market.change.toFixed(2)}% 24h` : "—"}</em></div>
      <div><span>24H HIGH</span><b>{money(market?.available ? market.high : null)}</b></div>
      <div><span>24H LOW</span><b>{money(market?.available ? market.low : null)}</b></div>
      <div><span>24H VOLUME</span><b>{market?.available && typeof market.volume === "number" ? compact.format(market.volume) : "—"}</b></div>
      <div><span>DATA SOURCE</span><b className={market?.available ? "source" : "redtext"}>{market?.available ? market.source : "Data unavailable"}</b></div>
    </div>
    <div className="data-notice">{marketNotice}</div>
    <div className="status honest-status">
      <div><span className="pill neutral-pill">CONTEXT ONLY</span><h2>{technical ? `${technical.trend} 4H structure` : "No market outlook when data is unavailable"}</h2><p>This workspace does not publish a confidence score, probability, or trade command. Use your journal and risk limits to decide whether a setup deserves attention.</p></div>
      <div className="context-field"><span>LIVE TECHNICAL DATA</span><strong>{technical ? "Available" : "—"}</strong><small>{technical ? technical.source : "No candle feed"}</small></div>
    </div>
    <div className="grid two">
      <article className="panel chart-panel"><div className="panel-title"><div><span>PRICE ACTION</span><h3>BTC / USDT · Live 4H closes</h3></div><div className="legend"><i /> Live close</div></div>{chartPoints ? <svg viewBox="0 0 500 180" preserveAspectRatio="none" aria-label="Live BTC 4H closing-price chart"><defs><linearGradient id="fill" x1="0" x2="0" y1="0" y2="1"><stop stopColor="#e99446" stopOpacity=".35" /><stop offset="1" stopColor="#e99446" stopOpacity="0" /></linearGradient></defs><path d={`M0,180 L${chartPoints} L500,180 Z`} fill="url(#fill)" /><polyline points={chartPoints} fill="none" stroke="#f1a35b" strokeWidth="2" /></svg> : <div className="chart-unavailable">Live 4H candle data unavailable.</div>}<div className="chart-footer"><span>Support <b>{technical ? money(technical.support) : "—"}</b></span><span>Resistance <b>{technical ? money(technical.resistance) : "—"}</b></span><span>Latest 4H close <b>{technical ? money(technical.price) : "—"}</b></span></div></article>
      <article className="panel"><div className="panel-title"><div><span>DATA INTEGRITY</span><h3>What is and is not live</h3></div><span className="muted">No placeholder scores</span></div>{evidence.map(([name, state, hint]) => <div className="evidence" key={name}><div><label>{name}</label><small>{hint}</small></div><b>{state}</b></div>)}<p className="footnote">A dash means the item is not computed from a connected live data source.</p></article>
    </div>
    <div className="grid three">
      <ScenarioPanel technical={technical} />
      <article className="panel"><span>SELF-REVIEW FIRST</span><h3>Before any position</h3><ul><li>Write the one-line reason in the journal.</li><li>Check risk, daily stop, leverage, liquidation, and funding.</li><li>Log the outcome even if you skipped the dashboard scenario.</li></ul></article>
      <article className="panel risks"><span>RISKS TO REMEMBER</span><ul><li>Technical conditions can change before a candle closes.</li><li>Funding and liquidation data require an exchange or provider feed.</li><li>A scenario is context, never a reason to enter.</li></ul></article>
    </div>
    <div className="grid two bottom">
      <article className="panel"><span>AI MARKET RESEARCH</span><h3>Ask about BTC context</h3><div className="ask"><input value={question} onChange={event => setQuestion(event.target.value)} onKeyDown={event => event.key === "Enter" && ask()} placeholder="Why is Bitcoin moving today?" /><button disabled={asking} onClick={ask}>{asking ? "Searching…" : "Ask →"}</button></div><label className="web-toggle"><input type="checkbox" checked={searchWeb} onChange={event => setSearchWeb(event.target.checked)} /> Search the web for current context</label>{answer && <p className="answer">{answer}</p>}</article>
      <article className="panel"><span>DATA CONNECTIONS</span><h3>Provider readiness</h3><div className="connections"><b className={market?.available ? "connected" : ""}>{market?.available ? "●" : "○"} Market quote fallback</b><b className={technical ? "connected" : ""}>{technical ? "●" : "○"} Live 4H candles</b><b>○ Funding / liquidation feed</b><b>○ On-chain provider</b></div><p className="footnote">Keys belong only in Vercel server-side environment variables; none are exposed in this page.</p></article>
    </div>
  </>;
}

function FeatureView({ tab, market, technical, technicalNotice, journal, setJournal, ideas, setIdeas, riskRules, setRiskRules, taxInputs, setTaxInputs }: { tab: string; market: Market | null; technical: Technical | null; technicalNotice: string; journal: JournalEntry[]; setJournal: (value: JournalEntry[] | ((current: JournalEntry[]) => JournalEntry[])) => void; ideas: IdeaRecord[]; setIdeas: (value: IdeaRecord[] | ((current: IdeaRecord[]) => IdeaRecord[])) => void; riskRules: RiskRules; setRiskRules: (value: RiskRules | ((current: RiskRules) => RiskRules)) => void; taxInputs: TaxInputs; setTaxInputs: (value: TaxInputs | ((current: TaxInputs) => TaxInputs)) => void }) {
  if (tab === "Journal") return <JournalView journal={journal} setJournal={setJournal} />;
  if (tab === "Risk & Futures") return <RiskView journal={journal} rules={riskRules} setRules={setRiskRules} />;
  if (tab === "Tax P&L") return <TaxView taxInputs={taxInputs} setTaxInputs={setTaxInputs} />;
  if (tab === "Performance") return <PerformanceView journal={journal} ideas={ideas} setIdeas={setIdeas} market={market} />;
  if (tab === "Technical") return <TechnicalView technical={technical} technicalNotice={technicalNotice} />;
  if (tab === "Trade Ideas") return <TradeIdeasView technical={technical} />;
  if (tab === "News & Sentiment") return <section className="feature-view"><FeatureHeader title="News & sentiment" subtitle="Live Bitcoin headlines with unscored, rule-based labels" /><NewsPanel /></section>;
  if (tab === "On-chain") return <section className="feature-view"><FeatureHeader title="On-chain dashboard" subtitle="No on-chain score is displayed until a provider is connected" /><div className="grid four"><Metric label="Exchange netflow" value="—" note="No live provider" /><Metric label="Whale activity" value="—" note="No live provider" /><Metric label="LTH supply" value="—" note="No live provider" /><Metric label="Miner flow" value="—" note="No live provider" /></div><article className="panel"><span>CONNECTION STATUS</span><h3>Glassnode / CoinGlass</h3><p className="answer">Add provider keys as Vercel server-side secrets and validate timestamps before displaying on-chain figures. Until then, this page remains intentionally blank.</p></article></section>;
  return <section className="feature-view"><FeatureHeader title="Whale alerts" subtitle="Alerts remain unavailable until an on-chain or derivatives provider is connected" /><div className="grid three"><Metric label="Transfer threshold" value="—" note="No live alert feed" /><Metric label="Exchange deposits" value="—" note="No live alert feed" /><Metric label="Liquidation bursts" value="—" note="No live alert feed" /></div><article className="panel"><span>ALERT SAFETY</span><h3>No simulated whale alerts</h3><p className="answer">The dashboard will not imitate alerts or derivatives stress until a live, timestamped source is connected.</p></article></section>;
}

function TechnicalView({ technical, technicalNotice }: { technical: Technical | null; technicalNotice: string }) {
  return <section className="feature-view"><FeatureHeader title="Technical dashboard" subtitle="Calculated from the latest live 4H candles; no confidence score is shown" /><div className="data-notice">{technicalNotice}</div><div className="grid four"><Metric label="EMA 20" value={technical ? money(technical.ema20) : "—"} note={technical?.source || "Data unavailable"} good={technical ? technical.price > technical.ema20 : false} /><Metric label="EMA 50" value={technical ? money(technical.ema50) : "—"} note="Intermediate trend" good={technical ? technical.ema20 > technical.ema50 : false} /><Metric label="RSI (14)" value={technical ? number(technical.rsi) : "—"} note={technical ? technical.rsi > 70 ? "Overbought watch" : technical.rsi < 30 ? "Oversold watch" : "Middle range" : "Data unavailable"} /><Metric label="MACD" value={technical ? number(technical.macd, 0) : "—"} note={technical ? technical.macd > technical.macdSignal ? "Above signal" : "Below signal" : "Data unavailable"} good={technical ? technical.macd > technical.macdSignal : false} /></div><div className="grid two"><article className="panel"><span>AUTOMATIC PRICE STRUCTURE</span><h3>{technical ? `${technical.trend} 4H levels` : "Data unavailable"}</h3><div className="trade-row"><label>40-candle support</label><b>{technical ? money(technical.support) : "—"}</b></div><div className="trade-row"><label>40-candle resistance</label><b>{technical ? money(technical.resistance) : "—"}</b></div><div className="trade-row"><label>Latest closed candle</label><b>{technical ? new Date(technical.candleClosedAt).toLocaleString() : "—"}</b></div><p className="footnote">Levels are the lowest low and highest high of the latest 40 live four-hour candles.</p></article><article className="panel"><span>LIVE CONDITIONS</span><h3>Evidence, not a forecast</h3><div className="trade-row"><label>Price vs EMA 20</label><b>{technical ? technical.price > technical.ema20 ? "Above" : "Below" : "—"}</b></div><div className="trade-row"><label>EMA 20 vs EMA 50</label><b>{technical ? technical.ema20 > technical.ema50 ? "Above" : "Below" : "—"}</b></div><div className="trade-row"><label>MACD vs signal</label><b>{technical ? technical.macd > technical.macdSignal ? "Above" : "Below" : "—"}</b></div><p className="footnote">These checks are observable conditions, not an outcome probability.</p></article></div></section>;
}

function TradeIdeasView({ technical }: { technical: Technical | null }) {
  return <section className="feature-view"><FeatureHeader title="Live technical scenario" subtitle="Automatically logged in Performance, whether or not you take it" />{technical ? <div className="grid two"><ScenarioPanel technical={technical} /><article className="panel"><span>LIVE EVIDENCE</span><h3>{technical.trend} conditions</h3><div className="trade-row"><label>Price vs EMA 20</label><b>{technical.price > technical.ema20 ? "Above" : "Below"}</b></div><div className="trade-row"><label>EMA structure</label><b>{technical.ema20 > technical.ema50 ? "EMA 20 above EMA 50" : "EMA 20 below EMA 50"}</b></div><div className="trade-row"><label>RSI (14)</label><b>{number(technical.rsi)}</b></div><div className="trade-row"><label>MACD momentum</label><b>{technical.macd > technical.macdSignal ? "Above signal" : "Below signal"}</b></div><p className="footnote">The scenario is derived from live candle calculations, but it is never a reason to bypass your risk rules.</p></article></div> : <article className="panel"><p className="answer">Live 4H data is unavailable, so no scenario is displayed or logged.</p></article>}<p className="footnote">A logged scenario may still be skipped. Record that outcome in Performance so the dashboard cannot cherry-pick its ideas.</p></section>;
}

function ScenarioPanel({ technical }: { technical: Technical | null }) {
  if (!technical) return <article className="panel trade"><span>LIVE SCENARIO</span><h3>Data unavailable</h3><p className="answer">No entry, stop, or target is shown without live 4H candle data.</p></article>;
  const { idea } = technical;
  return <article className="panel trade"><span>LIVE TECHNICAL SCENARIO · {idea.direction.toUpperCase()}</span><h3>{technical.trend} structure</h3><div className="trade-row"><label>Entry zone</label><b>{money(idea.entryLow)}–{money(idea.entryHigh)}</b></div><div className="trade-row"><label>Invalidation / stop</label><b className="redtext">{money(idea.stop)}</b></div><div className="trade-row"><label>First / second target</label><b>{money(idea.target1)} · {money(idea.target2)}</b></div><div className="trade-row"><label>Calculated risk / reward</label><b>{idea.riskReward}</b></div><p className="invalid"><b>Invalid if:</b> {idea.invalid}</p></article>;
}

function JournalView({ journal, setJournal }: { journal: JournalEntry[]; setJournal: (value: JournalEntry[] | ((current: JournalEntry[]) => JournalEntry[])) => void }) {
  const [form, setForm] = useState({ date: localDateTime(), direction: "Long" as "Long" | "Short", entry: "", stop: "", target: "", size: "", setup: "Pullback", reason: "", result: "Open" as TradeResult, feeling: "Calm" as Feeling, pnlUsdt: "" });
  const [error, setError] = useState("");
  const closed = journal.filter(trade => trade.result !== "Open");
  const wins = closed.filter(trade => trade.result === "Win").length;
  const setupInsight = insightBySetup(closed);
  const timeInsight = insightByHour(closed);
  const afterWin = lossAfterWin(closed);
  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const entry = Number(form.entry), stop = Number(form.stop), target = Number(form.target), size = Number(form.size), pnl = form.pnlUsdt.trim() === "" ? undefined : Number(form.pnlUsdt);
    if (!form.date || !form.reason.trim() || ![entry, stop, target, size].every(value => Number.isFinite(value) && value > 0) || (pnl !== undefined && !Number.isFinite(pnl))) { setError("Add a date, valid entry/stop/target/size, and a one-line reason before saving."); return; }
    setJournal(current => [{ id: tradeId(), date: form.date, direction: form.direction, entry, stop, target, size, setup: form.setup.trim() || "Unclassified", reason: form.reason.trim(), result: form.result, feeling: form.feeling, ...(pnl === undefined ? {} : { pnlUsdt: pnl }) }, ...current]);
    setForm({ date: localDateTime(), direction: "Long", entry: "", stop: "", target: "", size: "", setup: "Pullback", reason: "", result: "Open", feeling: "Calm", pnlUsdt: "" });
    setError("");
  };
  return <section className="feature-view"><FeatureHeader title="Trade journal" subtitle="Your decisions, outcomes, and emotions—kept privately in this browser" /><div className="grid two journal-layout"><article className="panel"><span>LOG A TRADE</span><h3>Record the decision, not just the result</h3><form className="journal-form" onSubmit={save}><label>Date & time<input type="datetime-local" value={form.date} onChange={event => setForm({ ...form, date: event.target.value })} /></label><label>Direction<select value={form.direction} onChange={event => setForm({ ...form, direction: event.target.value as JournalEntry["direction"] })}><option>Long</option><option>Short</option></select></label><label>Entry (USDT)<input inputMode="decimal" value={form.entry} onChange={event => setForm({ ...form, entry: event.target.value })} /></label><label>Stop (USDT)<input inputMode="decimal" value={form.stop} onChange={event => setForm({ ...form, stop: event.target.value })} /></label><label>Target (USDT)<input inputMode="decimal" value={form.target} onChange={event => setForm({ ...form, target: event.target.value })} /></label><label>Size (BTC)<input inputMode="decimal" value={form.size} onChange={event => setForm({ ...form, size: event.target.value })} /></label><label>Setup tag<select value={form.setup} onChange={event => setForm({ ...form, setup: event.target.value })}><option>Pullback</option><option>Breakout</option><option>Range</option><option>Trend continuation</option><option>Other</option></select></label><label>How did you feel?<select value={form.feeling} onChange={event => setForm({ ...form, feeling: event.target.value as Feeling })}><option>Calm</option><option>FOMO</option><option>Revenge</option><option>Anxious</option><option>Neutral</option></select></label><label className="wide">Reason for entering<input maxLength={180} value={form.reason} onChange={event => setForm({ ...form, reason: event.target.value })} placeholder="One sentence: what made this worth considering?" /></label><label>Result<select value={form.result} onChange={event => setForm({ ...form, result: event.target.value as TradeResult })}><option>Open</option><option>Win</option><option>Loss</option><option>Breakeven</option></select></label><label>Realized P&L (USDT)<input inputMode="decimal" value={form.pnlUsdt} onChange={event => setForm({ ...form, pnlUsdt: event.target.value })} placeholder="Optional" /></label><div className="wide form-actions"><button type="submit">Save journal entry</button>{error && <small className="error-text">{error}</small>}</div></form></article><article className="panel"><span>YOUR PATTERN REVIEW</span><h3>{closed.length < 30 ? `${closed.length} of 30 closed trades logged` : `${closed.length} closed trades logged`}</h3><div className="journal-stat"><span>Recorded win rate</span><b>{closed.length ? `${((wins / closed.length) * 100).toFixed(0)}% (${wins}/${closed.length})` : "—"}</b></div><div className="journal-stat"><span>Best observed setup</span><b>{setupInsight || "—"}</b></div><div className="journal-stat"><span>Toughest observed hour</span><b>{timeInsight || "—"}</b></div><div className="journal-stat"><span>Losses after a win</span><b>{afterWin || "—"}</b></div><p className="footnote">Treat patterns as tentative until 30–50 closed trades. The useful question is often whether losses cluster after FOMO, revenge, a time of day, or a recent win.</p></article></div><article className="panel"><div className="panel-title"><div><span>JOURNAL HISTORY</span><h3>Every trade you chose to log</h3></div><span className="muted">{journal.length} entries</span></div>{journal.length ? <div className="journal-history">{journal.map(trade => <div className="journal-entry" key={trade.id}><div><b>{trade.direction} · {trade.setup}</b><small>{new Date(trade.date).toLocaleString()} · {trade.feeling} · {trade.result}</small><small>{trade.reason}</small></div><div className="journal-numbers"><span>{money(trade.entry)} → {money(trade.target)}</span><b className={typeof trade.pnlUsdt === "number" && trade.pnlUsdt < 0 ? "redtext" : ""}>{typeof trade.pnlUsdt === "number" ? `${trade.pnlUsdt >= 0 ? "+" : ""}${trade.pnlUsdt.toFixed(2)} USDT` : "—"}</b><button className="text-button" onClick={() => setJournal(current => current.filter(item => item.id !== trade.id))}>Remove</button></div></div>)}</div> : <p className="answer">No trades logged yet. Log the reason and feeling at entry, then review the outcome later.</p>}</article></section>;
}

function RiskView({ journal, rules, setRules }: { journal: JournalEntry[]; rules: RiskRules; setRules: (value: RiskRules | ((current: RiskRules) => RiskRules)) => void }) {
  const [order, setOrder] = useState({ entry: "", stop: "", size: "", leverage: "", liquidation: "", funding: "" });
  const entry = Number(order.entry), stop = Number(order.stop), size = Number(order.size), leverage = Number(order.leverage), liquidation = Number(order.liquidation), funding = order.funding.trim() === "" ? null : Number(order.funding);
  const hasPositionInputs = [entry, stop, size].every(value => Number.isFinite(value) && value > 0);
  const stopRisk = hasPositionInputs ? Math.abs(entry - stop) * size : null;
  const riskPercent = stopRisk !== null && rules.equity > 0 ? stopRisk / rules.equity * 100 : null;
  const notional = hasPositionInputs ? entry * size : null;
  const initialMargin = notional !== null && leverage > 0 ? notional / leverage : null;
  const todayLoss = journal.filter(trade => sameLocalDay(trade.date) && typeof trade.pnlUsdt === "number" && trade.pnlUsdt < 0).reduce((sum, trade) => sum + Math.abs(trade.pnlUsdt || 0), 0);
  const dailyLimit = rules.equity > 0 ? rules.equity * rules.maxDailyLossPercent / 100 : null;
  const openPositions = journal.filter(trade => trade.result === "Open").length;
  const warnings: string[] = [];
  if (!hasPositionInputs) warnings.push("Enter entry, stop, and size to calculate stop risk.");
  if (riskPercent === null && rules.equity <= 0) warnings.push("Set account equity before relying on a risk percentage.");
  if (riskPercent !== null && riskPercent > rules.maxRiskPercent) warnings.push(`Stop risk is ${riskPercent.toFixed(2)}%, above your ${rules.maxRiskPercent}% per-trade cap.`);
  if (dailyLimit !== null && todayLoss >= dailyLimit) warnings.push(`Daily loss limit reached (${todayLoss.toFixed(2)} / ${dailyLimit.toFixed(2)} USDT). Stop trading today.`);
  if (leverage > rules.maxLeverage) warnings.push(`Leverage is above your ${rules.maxLeverage}× cap.`);
  if (openPositions >= rules.maxOpenPositions) warnings.push(`${openPositions} open journal positions meets your ${rules.maxOpenPositions}-position cap.`);
  if (!Number.isFinite(liquidation) || liquidation <= 0) warnings.push("Add the exchange-provided liquidation price; this tool does not invent one.");
  const setRule = (key: keyof RiskRules, value: string) => setRules(current => ({ ...current, [key]: Math.max(0, Number(value) || 0) }));
  return <section className="feature-view"><FeatureHeader title="Risk & futures guardrails" subtitle="A position planner that warns; it never places or recommends a trade" /><div className="grid two journal-layout"><article className="panel"><span>YOUR RULES</span><h3>Set your own hard limits</h3><div className="journal-form"><label>Account equity (USDT)<input type="number" min="0" value={rules.equity || ""} onChange={event => setRule("equity", event.target.value)} placeholder="Required" /></label><label>Max risk / trade (%)<input type="number" min="0" step="0.1" value={rules.maxRiskPercent} onChange={event => setRule("maxRiskPercent", event.target.value)} /></label><label>Daily loss limit (%)<input type="number" min="0" step="0.1" value={rules.maxDailyLossPercent} onChange={event => setRule("maxDailyLossPercent", event.target.value)} /></label><label>Maximum leverage (×)<input type="number" min="0" step="1" value={rules.maxLeverage} onChange={event => setRule("maxLeverage", event.target.value)} /></label><label className="wide">Maximum open positions<input type="number" min="0" step="1" value={rules.maxOpenPositions} onChange={event => setRule("maxOpenPositions", event.target.value)} /></label></div><p className="footnote">A 1–2% per-trade risk cap is a common prompt, not a rule chosen for you. Adjust the fields to your written plan.</p></article><article className="panel"><span>FUTURES POSITION CHECK</span><h3>Use exchange values, especially liquidation</h3><div className="journal-form"><label>Entry (USDT)<input inputMode="decimal" value={order.entry} onChange={event => setOrder({ ...order, entry: event.target.value })} /></label><label>Stop (USDT)<input inputMode="decimal" value={order.stop} onChange={event => setOrder({ ...order, stop: event.target.value })} /></label><label>Size (BTC)<input inputMode="decimal" value={order.size} onChange={event => setOrder({ ...order, size: event.target.value })} /></label><label>Leverage (×)<input inputMode="decimal" value={order.leverage} onChange={event => setOrder({ ...order, leverage: event.target.value })} /></label><label>Liquidation price (USDT)<input inputMode="decimal" value={order.liquidation} onChange={event => setOrder({ ...order, liquidation: event.target.value })} placeholder="From exchange" /></label><label>Funding cost estimate (USDT)<input inputMode="decimal" value={order.funding} onChange={event => setOrder({ ...order, funding: event.target.value })} placeholder="For intended hold" /></label></div></article></div><div className="grid two"><article className="panel"><span>POSITION SNAPSHOT</span><h3>Calculated from your inputs</h3><div className="trade-row"><label>Stop risk</label><b>{stopRisk === null ? "—" : `${stopRisk.toFixed(2)} USDT`}</b></div><div className="trade-row"><label>Risk as account equity</label><b className={riskPercent !== null && riskPercent > rules.maxRiskPercent ? "redtext" : ""}>{riskPercent === null ? "—" : `${riskPercent.toFixed(2)}%`}</b></div><div className="trade-row"><label>Position notional</label><b>{notional === null ? "—" : `${notional.toFixed(2)} USDT`}</b></div><div className="trade-row"><label>Initial margin estimate</label><b>{initialMargin === null ? "—" : `${initialMargin.toFixed(2)} USDT`}</b></div><div className="trade-row"><label>Liquidation price</label><b className="redtext">{Number.isFinite(liquidation) && liquidation > 0 ? money(liquidation) : "—"}</b></div><div className="trade-row"><label>Funding cost estimate</label><b>{funding !== null && Number.isFinite(funding) && funding >= 0 ? `${funding.toFixed(2)} USDT` : "—"}</b></div></article><article className="panel warning-panel"><span>RULE WARNINGS</span><h3>{warnings.length ? "Review before acting" : "No current rule breach"}</h3>{warnings.length ? <ul>{warnings.map(warning => <li key={warning}>{warning}</li>)}</ul> : <p className="answer">Your entered position is within the limits you set. It still carries market, execution, funding, and liquidation risk.</p>}<p className="footnote">Today’s loss ({todayLoss.toFixed(2)} USDT) comes only from negative P&L journal entries dated today. Open positions recorded in the journal: {openPositions}.</p></article></div></section>;
}

function TaxView({ taxInputs, setTaxInputs }: { taxInputs: TaxInputs; setTaxInputs: (value: TaxInputs | ((current: TaxInputs) => TaxInputs)) => void }) {
  const hasInputs = taxInputs.gainsInr > 0 || taxInputs.lossesInr > 0;
  const taxDue = taxInputs.gainsInr * taxInputs.taxRate / 100;
  const netAfterTaxAndLosses = taxInputs.gainsInr - taxDue - taxInputs.lossesInr;
  const update = (key: keyof TaxInputs, value: string) => setTaxInputs(current => ({ ...current, [key]: Math.max(0, Number(value) || 0) }));
  return <section className="feature-view"><FeatureHeader title="Tax-aware P&L" subtitle="A personal planning view—enter INR totals from your records and apply your CA’s rules" /><div className="grid two"><article className="panel"><span>INPUTS IN INR</span><h3>Losses do not reduce the taxable gains in this view</h3><div className="journal-form"><label>Realized gains (₹)<input type="number" min="0" value={taxInputs.gainsInr || ""} onChange={event => update("gainsInr", event.target.value)} placeholder="Enter total gains" /></label><label>Realized losses (₹)<input type="number" min="0" value={taxInputs.lossesInr || ""} onChange={event => update("lossesInr", event.target.value)} placeholder="Enter total losses" /></label><label className="wide">Planning tax rate (%)<input type="number" min="0" step="0.1" value={taxInputs.taxRate} onChange={event => update("taxRate", event.target.value)} /></label></div><p className="footnote">The default 30% is a personal planning assumption requested for this tool, not a statement of the tax treatment of futures. Update the rate and inputs to match your CA’s written advice.</p></article><article className="panel"><span>AFTER-TAX VIEW</span><h3>Losses stay economically real</h3><div className="trade-row"><label>Taxable gains used</label><b>{hasInputs ? inr.format(taxInputs.gainsInr) : "—"}</b></div><div className="trade-row"><label>Tax estimate ({taxInputs.taxRate}%)</label><b className="redtext">{hasInputs ? inr.format(taxDue) : "—"}</b></div><div className="trade-row"><label>Losses (not offset)</label><b className="redtext">{hasInputs ? inr.format(taxInputs.lossesInr) : "—"}</b></div><div className="trade-row"><label>Net after tax and losses</label><b>{hasInputs ? inr.format(netAfterTaxAndLosses) : "—"}</b></div><p className="answer">Formula: gains − tax on gains − losses. It deliberately does not net losses against gains before calculating tax.</p></article></div></section>;
}

function PerformanceView({ journal, ideas, setIdeas, market }: { journal: JournalEntry[]; ideas: IdeaRecord[]; setIdeas: (value: IdeaRecord[] | ((current: IdeaRecord[]) => IdeaRecord[])) => void; market: Market | null }) {
  const resolved = ideas.filter(idea => idea.outcome === "Target reached" || idea.outcome === "Invalidated");
  const targets = resolved.filter(idea => idea.outcome === "Target reached").length;
  const closed = journal.filter(trade => trade.result !== "Open");
  const livePrice = market?.available ? market.price : null;
  const updateOutcome = (id: string, outcome: IdeaOutcome) => setIdeas(current => current.map(idea => idea.id === id ? { ...idea, outcome } : idea));
  return <section className="feature-view"><FeatureHeader title="Performance & accountability" subtitle="Every generated live scenario is logged locally; skipped ideas stay in the record" /><div className="grid four"><Metric label="Journal closed trades" value={String(closed.length)} note="Your completed trade records" /><Metric label="Ideas logged" value={String(ideas.length)} note="Live scenarios, including skipped" /><Metric label="Ideas resolved" value={String(resolved.length)} note="Manually checked outcomes" /><Metric label="Target rate" value={resolved.length ? `${((targets / resolved.length) * 100).toFixed(0)}%` : "—"} note={resolved.length ? "Based on your checks" : "No resolved ideas"} /></div><div className="grid two"><article className="panel"><span>ACCOUNTABILITY RULE</span><h3>No cherry-picking</h3><p className="answer">When a new live 4H candle generates a scenario, it is saved here automatically. Later, mark it as target reached, invalidated, no entry / skipped, or unclear after checking the actual candle sequence. The tool never claims an outcome from the latest price alone.</p><p className="footnote">Current live-price context: {money(livePrice)}. A current quote cannot prove which level was touched first, so it is not used to auto-grade a scenario.</p></article><article className="panel"><span>JOURNAL CHECK</span><h3>Use both records together</h3><div className="trade-row"><label>Logged trades</label><b>{journal.length}</b></div><div className="trade-row"><label>Open trades</label><b>{journal.filter(trade => trade.result === "Open").length}</b></div><div className="trade-row"><label>Closed trades</label><b>{closed.length}</b></div><p className="footnote">A dashboard idea is not the same as a trade. Compare this idea log with the journal to see whether the ideas you take improve or damage your process.</p></article></div><article className="panel"><div className="panel-title"><div><span>GENERATED IDEA LOG</span><h3>Live technical scenarios</h3></div><span className="muted">Stored in this browser</span></div>{ideas.length ? <div className="idea-history">{ideas.map(idea => <div className="idea-entry" key={idea.id}><div><b>{idea.direction} · {new Date(idea.generatedAt).toLocaleString()}</b><small>{idea.source}</small><small>Entry {money(idea.entryLow)}–{money(idea.entryHigh)} · Stop {money(idea.stop)} · First target {money(idea.target1)}</small></div><label>Observed outcome<select value={idea.outcome} onChange={event => updateOutcome(idea.id, event.target.value as IdeaOutcome)}><option>Monitoring</option><option>Target reached</option><option>Invalidated</option><option>No entry / skipped</option><option>Unclear</option></select></label></div>)}</div> : <p className="answer">No live scenarios have been generated yet.</p>}</article></section>;
}

function FeatureHeader({ title, subtitle }: { title: string; subtitle: string }) { return <div className="feature-header"><p className="eyebrow">{title.toUpperCase()}</p><h2>{title}</h2><p>{subtitle}</p></div>; }
function Metric({ label, value, note, good }: { label: string; value: string; note: string; good?: boolean }) { return <article className="panel metric"><span>{label}</span><h3 className={good ? "good" : ""}>{value}</h3><p>{note}</p></article>; }
function makeChartPoints(values: number[]) { if (values.length < 2) return ""; const min = Math.min(...values), max = Math.max(...values), range = max - min || 1; return values.map((value, index) => `${index * 500 / (values.length - 1)},${164 - ((value - min) / range) * 136}`).join(" "); }

function insightBySetup(trades: JournalEntry[]) { const grouped = new Map<string, { wins: number; count: number }>(); for (const trade of trades) { const item = grouped.get(trade.setup) || { wins: 0, count: 0 }; item.count++; if (trade.result === "Win") item.wins++; grouped.set(trade.setup, item); } const best = [...grouped.entries()].filter(([, value]) => value.count >= 2).sort((a, b) => b[1].wins / b[1].count - a[1].wins / a[1].count)[0]; return best ? `${best[0]} (${best[1].wins}/${best[1].count} wins)` : "Need 2 trades per setup"; }
function insightByHour(trades: JournalEntry[]) { const grouped = new Map<number, { losses: number; count: number }>(); for (const trade of trades) { const hour = new Date(trade.date).getHours(), item = grouped.get(hour) || { losses: 0, count: 0 }; item.count++; if (trade.result === "Loss") item.losses++; grouped.set(hour, item); } const worst = [...grouped.entries()].filter(([, value]) => value.count >= 2).sort((a, b) => b[1].losses / b[1].count - a[1].losses / a[1].count)[0]; return worst ? `${String(worst[0]).padStart(2, "0")}:00 (${worst[1].losses}/${worst[1].count} losses)` : "Need 2 trades per hour"; }
function lossAfterWin(trades: JournalEntry[]) { const ordered = [...trades].sort((a, b) => +new Date(a.date) - +new Date(b.date)); const following = ordered.slice(1).filter((trade, index) => ordered[index].result === "Win"); if (!following.length) return "Need a trade after a win"; const losses = following.filter(trade => trade.result === "Loss").length; return `${losses}/${following.length} next trades were losses`; }

function NewsPanel() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [newsState, setNewsState] = useState("Loading live headlines…");
  useEffect(() => { let active = true; fetch(`/api/news?t=${Date.now()}`, { cache: "no-store" }).then(response => response.json()).then(data => { if (!active) return; setArticles(data.articles || []); setNewsState(data.articles?.length ? `Live via ${data.source}` : data.source); }).catch(() => { if (active) setNewsState("News feed temporarily unavailable"); }); return () => { active = false; }; }, []);
  return <div className="grid two"><article className="panel news-feed"><div className="panel-title"><div><span>LIVE BITCOIN NEWS</span><h3>Latest headlines</h3></div><span className="muted">{newsState}</span></div>{articles.length ? articles.map(article => <a className="headline" key={article.url} href={article.url} target="_blank" rel="noreferrer"><div><b>{article.title}</b><small>{article.source} · {new Date(article.publishedAt).toLocaleString()}</small></div><span className={`sentiment ${article.sentiment.toLowerCase()}`}>{article.sentiment}</span></a>) : <p className="answer">No headlines returned yet. Refresh in a few moments.</p>}</article><article className="panel"><span>LABEL METHOD</span><h3>Not a sentiment score</h3><div className="news-row"><b>Bullish</b><span>Rule-based label for positive-adoption and inflow terms</span></div><div className="news-row"><b className="bearish">Bearish</b><span>Rule-based label for outflow, hack, and stress terms</span></div><div className="news-row"><b className="neutral">Neutral</b><span>Routine or ambiguous Bitcoin coverage</span></div><p className="footnote">Open and verify the source article. Labels are not a forecast, probability, or numerical impact score.</p></article></div>;
}
