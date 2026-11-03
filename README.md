# Satoshi Signal — BTC Market Context & Trading Journal

A personal BTC/USDT research workspace focused on process rather than predictions. It uses live public market data only when a provider responds, and shows `—` / “data unavailable” instead of placeholder scores or stale quotes.

## Run

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Data-provider expansion

Connect CoinGlass, Glassnode, Fear & Greed, news and social APIs in route handlers under `app/api/`. Keep provider tokens server-side in `.env.local` during local development and as Vercel Environment Variable **Secrets** in deployed environments. Never use `NEXT_PUBLIC_` for a key.

The existing `/api/ask` route is a Vercel serverless route; `OPENAI_API_KEY` is read there only and never sent to the browser. Create your local file from the example:

```bash
cp .env.example .env.local
```

Then set `OPENAI_API_KEY` in Vercel Project Settings → Environment Variables as a Secret for each required environment and redeploy. Market and technical routes use live Binance with independent public fallbacks; if all live sources fail, they return an unavailable state with `no-store` caching rather than a stale price.

## Personal records

- **Journal:** entry, stop, target, size, setup, reason, result, feeling, and optional realized P&L.
- **Risk & Futures:** personal caps for per-trade risk, daily loss, leverage, open positions, exchange-provided liquidation price, and funding estimate.
- **Tax P&L:** INR inputs with the selected planning rate. Its default 30% view intentionally does not offset losses against gains; replace the rule/rate with your CA’s directions for futures.
- **Performance:** automatically records each distinct live 4H scenario generated while the page is open, including ideas you skip. Outcomes are manually checked to avoid claiming that a current quote proves which level hit first.

These personal records are stored in the browser’s local storage only. Clearing site data clears them; export or back them up separately if you need permanence.

## Risk policy

The interface is for research and self-review, not personalized investment advice. A live technical scenario is context, not a trade instruction. No outcome is guaranteed.
