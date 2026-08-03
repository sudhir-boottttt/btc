# Satoshi Signal — BTC Market Intelligence

A BTC/USDT-only, probability-based market-intelligence dashboard. It fetches a live Binance 24-hour ticker through `/api/market` and deliberately labels unconnected provider data as placeholders rather than presenting it as live analysis.

## Run

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Data-provider expansion

Connect CoinGlass, Glassnode, Fear & Greed, news and social APIs in route handlers under `app/api/`. Keep provider tokens server-side in `.env.local`; never expose them to the client. Add rate limits, data timestamps, validation, and source labels for every signal before treating it as live.

## Risk policy

The interface uses scenarios, probabilities, confidence, invalidation and risks. It must not be construed as personalized investment advice or a promise of returns.
