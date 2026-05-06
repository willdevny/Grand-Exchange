import yfinance as yf
import numpy as np
import pandas as pd
import os

def fetch_data_for_prediction(ticker: str, date_start="2024-11-01", date_end="2026-03-29"):
    latest_features = calc_data(ticker, date_start, date_end).iloc[-1,:-3]
    return latest_features.to_json()

#fetch training data without LLM feature concat
def fetch_data_for_training(ticker: str, date_start="2010-01-07", date_end="2026-04-15"):
    data = calc_data(ticker,date_start,date_end).loc['2011':'2025']
    return data.dropna()

#fetch training data with LLM feature concat
def fetch_data_for_trainingwith_LLM(ticker: str, LLM_features: pd.Series, date_start="2010-06-01", date_end="2026-03-29"):
    data = calc_data(ticker,date_start,date_end).loc['2011':'2025']

    #earnings call dates
    ticker1 = ticker
    for i in range(2):
        testVals, targVals = ['DD','BLK'], ['IBM','APPL']
        if ticker1 in testVals:
            ticker1 = targVals[i]

    dates = yf.Ticker(ticker1).get_earnings_dates(limit=75)

    dates = dates.sort_index()
    dates = dates.loc['2011':'2025']
    dates.index = dates.index.date
      
    LLM_df = pd.DataFrame({"LLM_feature": LLM_features}, index=dates.index)
    data = data.join(LLM_df, how='left')
    data['LLM_feature'] = data['LLM_feature'].ffill()

    return data.dropna()

def calc_data(ticker: str, date_start="2010-01-07", date_end="2026-04-15"):
    #download and process historical market data
    df_datesBeforeTrim = pd.DataFrame(index = pd.date_range(start=date_start, end=date_end, freq="B").date)

    data = yf.download(
        ticker,
        start=date_start,
        end=date_end,
        auto_adjust=False,
        progress=False
    )

    #day of the week feature
    data['DayOfWeek'] = data.index.weekday + 1

    #format initial data
    data.index = data.index.date
    data.columns = data.columns.droplevel(1)

    data = pd.concat([df_datesBeforeTrim,data], axis=1)
    data = data.dropna()

    data = data.drop(columns=['Close', 'High', 'Low', 'Open'])
    data = data.rename(columns={'Adj Close':'adjClose'})

    #calculate relative volume previous 3,5,10,20,30,40,50,60
    data['rvol_3'] = data['Volume'] / data['Volume'].shift(1).rolling(3).mean()
    data['rvol_5'] = data['Volume'] / data['Volume'].shift(1).rolling(5).mean()
    data['rvol_10'] = data['Volume'] / data['Volume'].shift(1).rolling(10).mean()
    data['rvol_20'] = data['Volume'] / data['Volume'].shift(1).rolling(20).mean()
    data['rvol_30'] = data['Volume'] / data['Volume'].shift(1).rolling(30).mean()
    data['rvol_40'] = data['Volume'] / data['Volume'].shift(1).rolling(40).mean()
    data['rvol_50'] = data['Volume'] / data['Volume'].shift(1).rolling(50).mean()
    data['rvol_60'] = data['Volume'] / data['Volume'].shift(1).rolling(60).mean()

    #log volume
    data['Volume'] = np.log10(data['Volume'])
    data = data.rename(columns={'Volume':'log_vol'})

    #log volume min/max scaled
    data['logVol_scaled'] = (data['log_vol'] - data['log_vol'].min()) / (data['log_vol'].max() - data['log_vol'].min())

    #calculate adjClose returns (not smoothed, short term)
    data['1d_pastReturn'] = data['adjClose'].pct_change(1)
    data['3d_pastReturn'] = data['adjClose'].pct_change(3)
    data['5d_pastReturn'] = data['adjClose'].pct_change(5)
    data['10d_pastReturn'] = data['adjClose'].pct_change(10)
    data['15d_pastReturn'] = data['adjClose'].pct_change(15)

    #calculate feature returns (3 day smoothed, long term)
    data['2day_pastAvg'] = data['adjClose'].rolling(2).mean()

    #remove adj close
    data = data.drop(columns=['adjClose'])

    #calculate smoothed returns using 3 day average
    data['20day_pastReturn'] = data['2day_pastAvg'].pct_change(20)
    data['30day_pastReturn'] = data['2day_pastAvg'].pct_change(30)
    data['40day_pastReturn'] = data['2day_pastAvg'].pct_change(40)
    data['50day_pastReturn'] = data['2day_pastAvg'].pct_change(50)
    data['60day_pastReturn'] = data['2day_pastAvg'].pct_change(60)
    data['70day_pastReturn'] = data['2day_pastAvg'].pct_change(70)

    #volatility based on 1 day returns
    data['10day_volatility'] = data['1d_pastReturn'].rolling(10).std()
    data['20day_volatility'] = data['1d_pastReturn'].rolling(20).std()
    data['30day_volatility'] = data['1d_pastReturn'].rolling(30).std()
    data['40day_volatility'] = data['1d_pastReturn'].rolling(40).std()
    data['50day_volatility'] = data['1d_pastReturn'].rolling(50).std()
    data['60day_volatility'] = data['1d_pastReturn'].rolling(60).std()
    data['70day_volatility'] = data['1d_pastReturn'].rolling(70).std()

    '''MARKET DATA SECTION'''
    #now do market data rvol and returns as features
    marketData = yf.download(
        ["^NYA", "^IXIC", "^GSPC"],
        start=date_start,
        end=date_end,
        auto_adjust=False,
        progress=False)[['Adj Close','Volume']]   
    marketData.columns = [f"{ticker.replace('^','')}_{col.replace('Adj Close','close').lower()}" for col, ticker in marketData.columns]

    #market rvols for 5,10,20 days
    marketData['NYA_rvol_5'] = marketData['NYA_volume'] / marketData['NYA_volume'].shift(1).rolling(5).mean()
    marketData['NYA_rvol_10'] = marketData['NYA_volume'] / marketData['NYA_volume'].shift(1).rolling(10).mean()
    marketData['NYA_rvol_20'] = marketData['NYA_volume'] / marketData['NYA_volume'].shift(1).rolling(20).mean()
    marketData['NYA_rvol_30'] = marketData['NYA_volume'] / marketData['NYA_volume'].shift(1).rolling(30).mean()
    marketData['NYA_rvol_40'] = marketData['NYA_volume'] / marketData['NYA_volume'].shift(1).rolling(40).mean()
    marketData['NYA_rvol_50'] = marketData['NYA_volume'] / marketData['NYA_volume'].shift(1).rolling(50).mean()
    marketData['IXIC_rvol_5'] = marketData['IXIC_volume'] / marketData['IXIC_volume'].shift(1).rolling(5).mean()
    marketData['IXIC_rvol_10'] = marketData['IXIC_volume'] / marketData['IXIC_volume'].shift(1).rolling(10).mean()
    marketData['IXIC_rvol_20'] = marketData['IXIC_volume'] / marketData['IXIC_volume'].shift(1).rolling(20).mean()
    marketData['IXIC_rvol_30'] = marketData['IXIC_volume'] / marketData['IXIC_volume'].shift(1).rolling(30).mean()
    marketData['IXIC_rvol_40'] = marketData['IXIC_volume'] / marketData['IXIC_volume'].shift(1).rolling(40).mean()
    marketData['IXIC_rvol_50'] = marketData['IXIC_volume'] / marketData['IXIC_volume'].shift(1).rolling(50).mean()
    marketData['GSPC_rvol_5'] = marketData['GSPC_volume'] / marketData['GSPC_volume'].shift(1).rolling(5).mean()
    marketData['GSPC_rvol_10'] = marketData['GSPC_volume'] / marketData['GSPC_volume'].shift(1).rolling(10).mean()
    marketData['GSPC_rvol_20'] = marketData['GSPC_volume'] / marketData['GSPC_volume'].shift(1).rolling(20).mean()
    marketData['GSPC_rvol_20'] = marketData['GSPC_volume'] / marketData['GSPC_volume'].shift(1).rolling(30).mean()
    marketData['GSPC_rvol_40'] = marketData['GSPC_volume'] / marketData['GSPC_volume'].shift(1).rolling(40).mean()
    marketData['GSPC_rvol_50'] = marketData['GSPC_volume'] / marketData['GSPC_volume'].shift(1).rolling(50).mean()

    #market returns 1d
    marketData['NYA_1dReturn'] = marketData['NYA_close'].pct_change(1)
    marketData['IXIC_1dReturn'] = marketData['IXIC_close'].pct_change(1)
    marketData['GSPC_1dReturn'] = marketData['GSPC_close'].pct_change(1)

    #2 day avg for the long dist returns
    marketData['NYA_2dAvg'] = marketData['NYA_close'].rolling(2).mean()
    marketData['IXIC_2dAvg'] = marketData['IXIC_close'].rolling(2).mean()
    marketData['GSPC_2dAvg'] = marketData['GSPC_close'].rolling(2).mean()

    #returns 10d,30d,60d,90d
    marketData['NYA_5dReturn'] = marketData['NYA_close'].pct_change(5)
    marketData['NYA_10dReturn'] = marketData['NYA_close'].pct_change(10)
    marketData['NYA_20dReturn'] = marketData['NYA_2dAvg'].pct_change(20)
    marketData['NYA_30dReturn'] = marketData['NYA_2dAvg'].pct_change(30)
    marketData['NYA_40dReturn'] = marketData['NYA_2dAvg'].pct_change(40)
    marketData['NYA_50dReturn'] = marketData['NYA_2dAvg'].pct_change(50)
    marketData['NYA_60dReturn'] = marketData['NYA_2dAvg'].pct_change(60)
    marketData['IXIC_5dReturn'] = marketData['IXIC_close'].pct_change(5)
    marketData['IXIC_10dReturn'] = marketData['IXIC_close'].pct_change(10)
    marketData['IXIC_20dReturn'] = marketData['IXIC_2dAvg'].pct_change(20)
    marketData['IXIC_30dReturn'] = marketData['IXIC_2dAvg'].pct_change(30)
    marketData['IXIC_40dReturn'] = marketData['IXIC_2dAvg'].pct_change(40)
    marketData['IXIC_50dReturn'] = marketData['IXIC_2dAvg'].pct_change(50)
    marketData['IXIC_60dReturn'] = marketData['IXIC_2dAvg'].pct_change(60)
    marketData['GSPC_5dReturn'] = marketData['GSPC_close'].pct_change(5)
    marketData['GSPC_10dReturn'] = marketData['GSPC_close'].pct_change(10)
    marketData['GSPC_20dReturn'] = marketData['GSPC_2dAvg'].pct_change(20)
    marketData['GSPC_30dReturn'] = marketData['GSPC_2dAvg'].pct_change(30)
    marketData['GSPC_40dReturn'] = marketData['GSPC_close'].pct_change(40)
    marketData['GSPC_50dReturn'] = marketData['GSPC_close'].pct_change(50)
    marketData['GSPC_60dReturn'] = marketData['GSPC_close'].pct_change(60)

    #market volatility
    marketData['NYA_5dVol'] = marketData['NYA_1dReturn'].rolling(5).std()
    marketData['NYA_10dVol'] = marketData['NYA_1dReturn'].rolling(10).std()
    marketData['NYA_20dVol'] = marketData['NYA_1dReturn'].rolling(20).std()
    marketData['NYA_30dVol'] = marketData['NYA_1dReturn'].rolling(30).std()
    marketData['NYA_40dVol'] = marketData['NYA_1dReturn'].rolling(40).std()
    marketData['NYA_50dVol'] = marketData['NYA_1dReturn'].rolling(50).std()
    marketData['NYA_60dVol'] = marketData['NYA_1dReturn'].rolling(60).std()
    marketData['ICIX_5dVol'] = marketData['IXIC_1dReturn'].rolling(5).std()
    marketData['ICIX_10dVol'] = marketData['IXIC_1dReturn'].rolling(10).std()
    marketData['ICIX_20dVol'] = marketData['IXIC_1dReturn'].rolling(20).std()
    marketData['ICIX_30dVol'] = marketData['IXIC_1dReturn'].rolling(30).std()
    marketData['ICIX_40dVol'] = marketData['IXIC_1dReturn'].rolling(40).std()
    marketData['ICIX_50dVol'] = marketData['IXIC_1dReturn'].rolling(50).std()
    marketData['ICIX_60dVol'] = marketData['IXIC_1dReturn'].rolling(60).std()
    marketData['GSPC_5dVol'] = marketData['GSPC_1dReturn'].rolling(5).std()
    marketData['GSPC_10dVol'] = marketData['GSPC_1dReturn'].rolling(10).std()
    marketData['GSPC_20dVol'] = marketData['GSPC_1dReturn'].rolling(20).std()
    marketData['GSPC_30dVol'] = marketData['GSPC_1dReturn'].rolling(30).std()
    marketData['GSPC_40dVol'] = marketData['GSPC_1dReturn'].rolling(40).std()
    marketData['GSPC_50dVol'] = marketData['GSPC_1dReturn'].rolling(50).std()
    marketData['GSPC_60dVol'] = marketData['GSPC_1dReturn'].rolling(60).std()


    marketData = marketData.drop(columns=['GSPC_volume','IXIC_volume','NYA_volume','NYA_close','IXIC_close','GSPC_close',
                                          'NYA_2dAvg','IXIC_2dAvg','GSPC_2dAvg','NYA_1dReturn','IXIC_1dReturn','GSPC_1dReturn'])

    #join ticker and market data for complete training_data
    data = data.join(marketData, how="left")

    #calculate 30 day, 60 day, and 90 day returns of the ticker targets
    data['2week_targetReturn'] = (data['2day_pastAvg'].shift(-10) / data['2day_pastAvg']) - 1
    data['4week_targetReturn'] = (data['2day_pastAvg'].shift(-20) / data['2day_pastAvg']) - 1
    data['8week_targetReturn'] = (data['2day_pastAvg'].shift(-40) / data['2day_pastAvg']) - 1

    #return 
    return data

def fetch_data_dframes():
    tickers = ['DD','HAL','NOC','PRU','TRV','KO','CVX','BLK','F','INTC']
    LLM_df = pd.read_csv("LLM_features.csv", header=0)
    
    list_of_dframes = {}
    for ticker in tickers:
        final_df = fetch_data_for_training(ticker)
        final_df.to_csv(os.path.expanduser(f'~/yfinance/data/{ticker}_data.csv'))
        list_of_dframes[ticker] = final_df

    return list_of_dframes

print(fetch_data_dframes())
