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
    data['1d_pstReturn'] = data['adjClose'].pct_change(1)
    data['3d_pstReturn'] = data['adjClose'].pct_change(3)
    data['5d_pstReturn'] = data['adjClose'].pct_change(5)
    data['10d_pstReturn'] = data['adjClose'].pct_change(10)
    data['15d_pstReturn'] = data['adjClose'].pct_change(15)

    #calculate feature returns (3 day smoothed, long term)
    data['3day_pstAvg'] = data['adjClose'].rolling(3).mean()

    #remove adj close
    data = data.drop(columns=['adjClose'])

    #calculate smoothed returns using 3 day average
    data['20day_pstReturn'] = data['3day_pstAvg'].pct_change(20)
    data['30day_pstReturn'] = data['3day_pstAvg'].pct_change(30)
    data['40day_pstReturn'] = data['3day_pstAvg'].pct_change(40)
    data['50day_pstReturn'] = data['3day_pstAvg'].pct_change(50)
    data['60day_pstReturn'] = data['3day_pstAvg'].pct_change(60)
    data['70day_pstReturn'] = data['3day_pstAvg'].pct_change(70)
    data['80day_pstReturn'] = data['3day_pstAvg'].pct_change(80)
    data['90day_pstReturn'] = data['3day_pstAvg'].pct_change(90)

    #volatility based on 1 day returns
    data['10day_volatility'] = data['1d_pstReturn'].rolling(10).std()
    data['20day_volatility'] = data['1d_pstReturn'].rolling(20).std()
    data['30day_volatility'] = data['1d_pstReturn'].rolling(30).std()
    data['50day_volatility'] = data['1d_pstReturn'].rolling(50).std()
    data['70day_volatility'] = data['1d_pstReturn'].rolling(70).std()
    data['90day_volatility'] = data['1d_pstReturn'].rolling(90).std()

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
    marketData['IXIC_rvol_5'] = marketData['IXIC_volume'] / marketData['IXIC_volume'].shift(1).rolling(5).mean()
    marketData['IXIC_rvol_10'] = marketData['IXIC_volume'] / marketData['IXIC_volume'].shift(1).rolling(10).mean()
    marketData['IXIC_rvol_20'] = marketData['IXIC_volume'] / marketData['IXIC_volume'].shift(1).rolling(20).mean()
    marketData['GSPC_rvol_5'] = marketData['GSPC_volume'] / marketData['GSPC_volume'].shift(1).rolling(5).mean()
    marketData['GSPC_rvol_10'] = marketData['GSPC_volume'] / marketData['GSPC_volume'].shift(1).rolling(10).mean()
    marketData['GSPC_rvol_20'] = marketData['GSPC_volume'] / marketData['GSPC_volume'].shift(1).rolling(20).mean()

    #market returns 1d
    marketData['NYA_1dReturn'] = marketData['NYA_close'].pct_change(1)
    marketData['IXIC_1dReturn'] = marketData['IXIC_close'].pct_change(1)
    marketData['GSPC_1dReturn'] = marketData['GSPC_close'].pct_change(1)

    #3 day avg for the long dist returns
    marketData['NYA_3dAvg'] = marketData['NYA_close'].rolling(3).mean()
    marketData['IXIC_3dAvg'] = marketData['IXIC_close'].rolling(3).mean()
    marketData['GSPC_3dAvg'] = marketData['GSPC_close'].rolling(3).mean()

    #returns 10d,30d,60d,90d
    marketData['NYA_10dReturn'] = marketData['NYA_close'].pct_change(10)
    marketData['NYA_30dReturn'] = marketData['NYA_3dAvg'].pct_change(30)
    marketData['NYA_60dReturn'] = marketData['NYA_3dAvg'].pct_change(60)
    marketData['NYA_90dReturn'] = marketData['NYA_3dAvg'].pct_change(90)
    marketData['IXIC_10dReturn'] = marketData['IXIC_close'].pct_change(10)
    marketData['IXIC_30dReturn'] = marketData['IXIC_3dAvg'].pct_change(30)
    marketData['IXIC_60dReturn'] = marketData['IXIC_3dAvg'].pct_change(60)
    marketData['IXIC_90dReturn'] = marketData['IXIC_3dAvg'].pct_change(90)
    marketData['GSPC_10dReturn'] = marketData['GSPC_close'].pct_change(10)
    marketData['GSPC_30dReturn'] = marketData['GSPC_3dAvg'].pct_change(30)
    marketData['GSPC_60dReturn'] = marketData['GSPC_3dAvg'].pct_change(60)
    marketData['GSPC_90dReturn'] = marketData['GSPC_3dAvg'].pct_change(90)

    #market volatility 10,30,50 day
    marketData['NYA_10dVol'] = marketData['NYA_1dReturn'].rolling(10).std()
    marketData['NYA_30dVol'] = marketData['NYA_1dReturn'].rolling(30).std()
    marketData['NYA_50dVol'] = marketData['NYA_1dReturn'].rolling(50).std()
    marketData['ICIX_10dVol'] = marketData['IXIC_1dReturn'].rolling(10).std()
    marketData['ICIX_30dVol'] = marketData['IXIC_1dReturn'].rolling(30).std()
    marketData['ICIX_50dVol'] = marketData['IXIC_1dReturn'].rolling(50).std()
    marketData['GSPC_10dVol'] = marketData['GSPC_1dReturn'].rolling(10).std()
    marketData['GSPC_30dVol'] = marketData['GSPC_1dReturn'].rolling(30).std()
    marketData['GSPC_50dVol'] = marketData['GSPC_1dReturn'].rolling(50).std()

    marketData = marketData.drop(columns=['GSPC_volume','IXIC_volume','NYA_volume','NYA_close','IXIC_close','GSPC_close',
                                          'NYA_3dAvg','IXIC_3dAvg','GSPC_3dAvg','NYA_1dReturn','IXIC_1dReturn','GSPC_1dReturn'])

    #join ticker and market data for complete training_data
    data = data.join(marketData, how="left")

    #calculate 30 day, 60 day, and 90 day returns of the ticker targets
    data['30day_targetReturn'] = (data['3day_pstAvg'].shift(-30) / data['3day_pstAvg']) - 1
    data['60day_targetReturn'] = (data['3day_pstAvg'].shift(-60) / data['3day_pstAvg']) - 1
    data['90day_targetReturn'] = (data['3day_pstAvg'].shift(-90) / data['3day_pstAvg']) - 1

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