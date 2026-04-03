# The Grand Exchange

The Grand Exchange is Penn State Harrisburg Team 205's stock analysis and prediction capstone project. The current web application includes watchlist management, headline-based market context, stock graphing experiments, and an agent page that aggregates price data and sentiment.

## Team
- Rashawn Sherman
- Christian Lehman
- William Devenney
- Taquae Nelson

## Repository
GitHub: https://github.com/willdevny/Grand-Exchange

## Tech Stack
- Next.js 16 with the App Router
- React 19 + TypeScript
- Tailwind CSS 4
- NextAuth for authentication
- Python microservice for market analytics (optional local service)

## Main Features
- **Home page** introducing the project and navigation.
- **Trending Stocks page** for stock discovery.
- **X/Twitter Stocks page** for watchlist quotes and news headlines.
- **Stock Graphing page** for protected graphing experiments.
- **Stock Agent page** that aggregates market data and news sentiment.

## Local Development
```bash
npm install
npm run dev
```
Open `http://localhost:3000` in your browser.

## Environment Variables
Create a `.env.local` file and provide the keys required by the routes you plan to exercise.

Typical keys used by the current codebase:
- `FINNHUB_API_KEY`
- `FMP_API_KEY`
- `NEWSAPI_KEY`
- `PYTHON_MARKET_SERVICE_URL`

## Testing
This project is configured for Jest-based testing.

### Install test dependencies
```bash
npm install
```

### Run the test suite
```bash
npm test
```

### Run the test suite with coverage
```bash
npm run test:coverage
```

### Test scope
The included test plan targets:
- market indicator calculations
- news sentiment scoring
- basic sentiment classification
- API aggregation behavior for the stock agent route
- selected UI/component behavior for HelpPanel and dark-mode state

## API Documentation
An OpenAPI document is included at `docs/openapi.yaml`.

Recommended workflow:
1. Start the app locally.
2. Open Swagger Editor or Swagger UI.
3. Import `docs/openapi.yaml`.

## Project Structure
```text
app/                 Next.js routes and pages
components/          Shared UI components
lib/                 Data-fetching and sentiment/indicator logic
python/              Local Python market service
__tests__/           Jest unit and component tests
```

## Notes
- The Python market service is optional during UI development; the agent route already falls back to `null` market data when the service is unavailable.
- Some capstone requirements in the SRS are still planned rather than fully implemented, especially the ML prediction engine and the final LLM analysis layer.
