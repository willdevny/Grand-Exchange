import yfinance as yf
import numpy as np
import pandas as pd
import seaborn as sns
import matplotlib.pyplot as plt
import os

#CHANGE TO getDataShort.py or getDataShortShort.py using ctrl + h
import getDataShort

tickers = ['DD','HAL','NOC','PRU','TRV','KO','CVX','BLK','F','INTC']
data = getDataShort.fetch_data_dframes()

def remove_highly_redundant_features(x: pd.DataFrame, y: pd.Series, threshold = 0.9):
    corr_matrix = x.corr().abs()
    target_corr = x.corrwith(y).abs()

    to_drop = {}
    upper_tri = corr_matrix.where(np.triu(np.ones(corr_matrix.shape), k=1).astype(bool))

    for col in upper_tri.columns:
        for row in upper_tri.index:
            if upper_tri.loc[row, col] > threshold:
                if target_corr[row] < target_corr[col]:
                    if row not in to_drop:
                        to_drop[row] = col
                else:
                    if col not in to_drop:
                        to_drop[col] = row

    for dropped, reason in to_drop.items():
        print(f"Dropped '{dropped}' because of '{reason}'")

    return list(to_drop.keys())

#remove redundant features and split into 30,60,90 features
def returnNonRedundantAndSplitFeatureDictionary():
    full_30_60_90_data = {}
    for ticker in tickers:
        features = data[ticker].iloc[:,1:-3] #THIS IS WITHOUT LLM FEATURE RIGHT NOW
        target30 = data[ticker].iloc[:, -3]
        target60 = data[ticker].iloc[:, -2]
        target90 = data[ticker].iloc[:, -1]
        print(f'{ticker}_target30')
        drop30 = remove_highly_redundant_features(features, target30)
        full_30_60_90_data[f'{ticker}_target30'] = features.drop(columns=drop30)
        full_30_60_90_data[f'{ticker}_target30']['target'] = target30
        print(f'{ticker}_target60')
        drop60 = remove_highly_redundant_features(features, target60)
        full_30_60_90_data[f'{ticker}_target60'] = features.drop(columns=drop60)
        full_30_60_90_data[f'{ticker}_target60']['target'] = target60
        print(f'{ticker}_target90')
        drop90 = remove_highly_redundant_features(features, target90)
        full_30_60_90_data[f'{ticker}_target90'] = features.drop(columns=drop90)
        full_30_60_90_data[f'{ticker}_target90']['target'] = target90

    return full_30_60_90_data

def returnBestFeatures(threshold=0.05):
    filtered_data = {}

    full_data = returnNonRedundantAndSplitFeatureDictionary()

    for key, df in full_data.items():
        features = df.drop(columns=['target'])
        target = df['target']

        feature_corr = features.corrwith(target).abs()
        low_corr_cols = feature_corr[feature_corr < threshold].index.tolist()

        for col in low_corr_cols:
            print(f"[{key}] Dropped '{col}' (|corr| = {feature_corr[col]:.4f} < {threshold})")

        filtered_data[key] = df.drop(columns=low_corr_cols)

    return filtered_data


print(returnBestFeatures())
    




