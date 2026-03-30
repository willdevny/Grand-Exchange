from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import yfinance as yf
import pandas as pd

app = FastAPI(title="Grand Exchange Market Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def calculate_sma(series: pd.Series, window: int) -> float | None:
    if len(series) < window:
        return None
    value = series.rolling(window=window).mean().iloc[-1]
    if pd.isna(value):
        return None
    return round(float(value), 2)


def calculate_rsi(series: pd.Series, period: int = 14) -> float | None:
    if len(series) <= period:
        return None

    delta = series.diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)

    avg_gain = gain.rolling(window=period).mean().iloc[-1]
    avg_loss = loss.rolling(window=period).mean().iloc[-1]

    if pd.isna(avg_gain) or pd.isna(avg_loss):
        return None

    if avg_loss == 0:
        return 100.0

    rs = avg_gain / avg_loss
    rsi = 100 - (100 / (1 + rs))
    return round(float(rsi), 2)


def calculate_volatility(series: pd.Series, window: int = 30) -> float | None:
    if len(series) < window + 1:
        return None

    returns = series.pct_change().dropna().tail(window)
    if len(returns) == 0:
        return None

    volatility = returns.std() * 100
    return round(float(volatility), 2)


def summarize_trend(latest_close: float | None, sma20: float | None, sma50: float | None) -> str:
    if latest_close is None or sma20 is None or sma50 is None:
        return "unknown"

    if latest_close > sma20 and sma20 > sma50:
        return "bullish"
    if latest_close < sma20 and sma20 < sma50:
        return "bearish"
    return "mixed"


@app.get("/market")
def get_market_data(ticker: str, period: str = "6mo"):
    try:
        stock = yf.Ticker(ticker)
        hist = stock.history(period=period, interval="1d", auto_adjust=False)

        if hist.empty:
            raise HTTPException(status_code=404, detail=f"No historical data found for ticker '{ticker}'")

        hist = hist.reset_index()
        hist["Date"] = pd.to_datetime(hist["Date"]).dt.strftime("%Y-%m-%d")

        close_series = hist["Close"].astype(float)

        latest_close = round(float(close_series.iloc[-1]), 2) if len(close_series) > 0 else None
        sma20 = calculate_sma(close_series, 20)
        sma50 = calculate_sma(close_series, 50)
        rsi14 = calculate_rsi(close_series, 14)
        volatility30 = calculate_volatility(close_series, 30)
        trend = summarize_trend(latest_close, sma20, sma50)

        recent_prices = []
        for _, row in hist.tail(30).iterrows():
            recent_prices.append(
                {
                    "date": row["Date"],
                    "close": round(float(row["Close"]), 2),
                    "volume": int(row["Volume"]) if not pd.isna(row["Volume"]) else 0,
                }
            )

        return {
            "ticker": ticker.upper(),
            "latestClose": latest_close,
            "sma20": sma20,
            "sma50": sma50,
            "rsi14": rsi14,
            "volatility30": volatility30,
            "trend": trend,
            "recentPrices": recent_prices,
        }

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to fetch market data: {str(exc)}")