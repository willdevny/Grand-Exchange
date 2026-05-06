import yfinance as yf
import numpy as np
import pandas as pd
import seaborn as sns
import matplotlib.pyplot as plt
import os
from collections import Counter

import getData

tickers = ['DD','HAL','NOC','PRU','TRV','KO','CVX','BLK','F','INTC']
data = getData.fetch_data_dframes()


def remove_highly_redundant_features(x: pd.DataFrame, y: pd.Series, threshold=0.9):
    corr_matrix = x.corr().abs()
    target_corr = x.corrwith(y).abs()

    to_drop = {}
    upper_tri = corr_matrix.where(np.triu(np.ones(corr_matrix.shape), k=1).astype(bool))

    for col in upper_tri.columns:
        for row in upper_tri.index:
            if upper_tri.loc[row, col] > threshold:
                if target_corr[row] < target_corr[col]:
                    to_drop[row] = col
                else:
                    to_drop[col] = row

    return list(to_drop.keys())


def returnNonRedundantAndSplitFeatureDictionary():
    full_30_60_90_data = {}
    redundancy_drops = {}

    for ticker in tickers:
        features = data[ticker].iloc[:, 1:-3]
        target30 = data[ticker].iloc[:, -3]
        target60 = data[ticker].iloc[:, -2]
        target90 = data[ticker].iloc[:, -1]

        # TARGET 30
        key30 = f'{ticker}_target30'
        drop30 = remove_highly_redundant_features(features, target30)
        redundancy_drops[key30] = drop30

        df30 = features.drop(columns=drop30).copy()
        df30['target'] = target30
        full_30_60_90_data[key30] = df30

        # TARGET 60
        key60 = f'{ticker}_target60'
        drop60 = remove_highly_redundant_features(features, target60)
        redundancy_drops[key60] = drop60

        df60 = features.drop(columns=drop60).copy()
        df60['target'] = target60
        full_30_60_90_data[key60] = df60

        # TARGET 90
        key90 = f'{ticker}_target90'
        drop90 = remove_highly_redundant_features(features, target90)
        redundancy_drops[key90] = drop90

        df90 = features.drop(columns=drop90).copy()
        df90['target'] = target90
        full_30_60_90_data[key90] = df90

    return full_30_60_90_data, redundancy_drops


def returnBestFeatures(threshold=0.05):
    filtered_data = {}
    low_corr_drops = {}

    full_data, redundancy_drops = returnNonRedundantAndSplitFeatureDictionary()

    for key, df in full_data.items():
        features = df.drop(columns=['target'])
        target = df['target']

        feature_corr = features.corrwith(target).abs()
        low_corr_cols = feature_corr[feature_corr < threshold].index.tolist()

        low_corr_drops[key] = low_corr_cols
        filtered_data[key] = df.drop(columns=low_corr_cols).copy()

    # ===== GLOBAL UNIQUE FEATURE DROP COUNTS =====
    unique_counter = Counter()

    for key in full_data.keys():
        combined = set(redundancy_drops.get(key, [])).union(low_corr_drops.get(key, []))
        unique_counter.update(combined)

    print("=" * 70)
    print("FINAL SUMMARY: FEATURE DROP COUNTS")
    print("=" * 70)

    for feature, count in sorted(unique_counter.items()):
        print(f"{feature}_dropped: {count}")

    return filtered_data


# ===== RUN =====
filtered_data = returnBestFeatures(threshold=0.05)

print(filtered_data)
