import numpy as np
import pandas as pd
import joblib
import os
from sklearn.svm import SVR
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.neural_network import MLPRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import TimeSeriesSplit, cross_validate
from sklearn.pipeline import Pipeline
from sklearn.metrics import make_scorer, mean_squared_error, r2_score
import warnings
warnings.filterwarnings("ignore")

#change getData import in processDataForTesting.py for different ranges.
import processDataForTesting

tickers  = ['DD', 'HAL', 'NOC', 'PRU', 'TRV', 'KO', 'CVX', 'BLK', 'F', 'INTC']
full_features = processDataForTesting.returnBestFeatures()

# ── 1. Model definitions ──────────────────────────────────────────────────────

def build_models() -> dict:
    return {

        # ─────────────────────────────
        # SVR (RBF) + gamma tuning
        # ─────────────────────────────
        "Srbf_C1_e01_gscale":  Pipeline([("sc", StandardScaler()), ("m", SVR(kernel="rbf", C=1,   epsilon=0.01, gamma="scale"))]),
        "Srbf_C1_e01_g001":    Pipeline([("sc", StandardScaler()), ("m", SVR(kernel="rbf", C=1,   epsilon=0.01, gamma=0.001))]),
        "Srbf_C1_e01_g01":     Pipeline([("sc", StandardScaler()), ("m", SVR(kernel="rbf", C=1,   epsilon=0.01, gamma=0.01))]),
        "Srbf_C1_e05_gscale":  Pipeline([("sc", StandardScaler()), ("m", SVR(kernel="rbf", C=1,   epsilon=0.05, gamma="scale"))]),
        "Srbf_C1_e05_g001":    Pipeline([("sc", StandardScaler()), ("m", SVR(kernel="rbf", C=1,   epsilon=0.05, gamma=0.001))]),
        "Srbf_C1_e05_g01":     Pipeline([("sc", StandardScaler()), ("m", SVR(kernel="rbf", C=1,   epsilon=0.05, gamma=0.01))]),

        "Srbf_C10_e01_gscale": Pipeline([("sc", StandardScaler()), ("m", SVR(kernel="rbf", C=10,  epsilon=0.01, gamma="scale"))]),
        "Srbf_C10_e01_g001":   Pipeline([("sc", StandardScaler()), ("m", SVR(kernel="rbf", C=10,  epsilon=0.01, gamma=0.001))]),
        "Srbf_C10_e01_g01":    Pipeline([("sc", StandardScaler()), ("m", SVR(kernel="rbf", C=10,  epsilon=0.01, gamma=0.01))]),
        "Srbf_C10_e05_gscale": Pipeline([("sc", StandardScaler()), ("m", SVR(kernel="rbf", C=10,  epsilon=0.05, gamma="scale"))]),
        "Srbf_C10_e05_g001":   Pipeline([("sc", StandardScaler()), ("m", SVR(kernel="rbf", C=10,  epsilon=0.05, gamma=0.001))]),
        "Srbf_C10_e05_g01":    Pipeline([("sc", StandardScaler()), ("m", SVR(kernel="rbf", C=10,  epsilon=0.05, gamma=0.01))]),

        "Srbf_C100_e01_gscale": Pipeline([("sc", StandardScaler()), ("m", SVR(kernel="rbf", C=100, epsilon=0.01, gamma="scale"))]),
        "Srbf_C100_e01_g001":   Pipeline([("sc", StandardScaler()), ("m", SVR(kernel="rbf", C=100, epsilon=0.01, gamma=0.001))]),
        "Srbf_C100_e01_g01":    Pipeline([("sc", StandardScaler()), ("m", SVR(kernel="rbf", C=100, epsilon=0.01, gamma=0.01))]),
        "Srbf_C100_e05_gscale": Pipeline([("sc", StandardScaler()), ("m", SVR(kernel="rbf", C=100, epsilon=0.05, gamma="scale"))]),
        "Srbf_C100_e05_g001":   Pipeline([("sc", StandardScaler()), ("m", SVR(kernel="rbf", C=100, epsilon=0.05, gamma=0.001))]),
        "Srbf_C100_e05_g01":    Pipeline([("sc", StandardScaler()), ("m", SVR(kernel="rbf", C=100, epsilon=0.05, gamma=0.01))]),


        # ─────────────────────────────
        # SVR Linear
        # ─────────────────────────────
        "Slin_C01": Pipeline([("sc", StandardScaler()), ("m", SVR(kernel="linear", C=0.1, epsilon=0.01))]),
        "Slin_C1":  Pipeline([("sc", StandardScaler()), ("m", SVR(kernel="linear", C=1,   epsilon=0.01))]),
        "Slin_C10": Pipeline([("sc", StandardScaler()), ("m", SVR(kernel="linear", C=10,  epsilon=0.01))]),


        # ─────────────────────────────
        # SVR Poly + gamma
        # ─────────────────────────────
        "Spoly2_C1_gscale":  Pipeline([("sc", StandardScaler()), ("m", SVR(kernel="poly", degree=2, C=1,  epsilon=0.01, gamma="scale", coef0=1))]),
        "Spoly2_C1_g001":    Pipeline([("sc", StandardScaler()), ("m", SVR(kernel="poly", degree=2, C=1,  epsilon=0.01, gamma=0.001, coef0=1))]),
        "Spoly2_C10_gscale": Pipeline([("sc", StandardScaler()), ("m", SVR(kernel="poly", degree=2, C=10, epsilon=0.01, gamma="scale", coef0=1))]),
        "Spoly2_C10_g001":   Pipeline([("sc", StandardScaler()), ("m", SVR(kernel="poly", degree=2, C=10, epsilon=0.01, gamma=0.001, coef0=1))]),

        "Spoly3_C1_gscale":  Pipeline([("sc", StandardScaler()), ("m", SVR(kernel="poly", degree=3, C=1,  epsilon=0.01, gamma="scale", coef0=1))]),
        "Spoly3_C1_g001":    Pipeline([("sc", StandardScaler()), ("m", SVR(kernel="poly", degree=3, C=1,  epsilon=0.01, gamma=0.001, coef0=1))]),


        # ─────────────────────────────
        # GBRT (standardized complexity)
        # ─────────────────────────────
        "GBRT_d3_lr001": Pipeline([("sc", StandardScaler()),
            ("m", GradientBoostingRegressor(n_estimators=300, max_depth=3, learning_rate=0.01,
                                            subsample=0.7, min_samples_leaf=5, random_state=42))]),

        "GBRT_d3_lr005": Pipeline([("sc", StandardScaler()),
            ("m", GradientBoostingRegressor(n_estimators=300, max_depth=3, learning_rate=0.05,
                                            subsample=0.7, min_samples_leaf=5, random_state=42))]),

        "GBRT_d4_lr001": Pipeline([("sc", StandardScaler()),
            ("m", GradientBoostingRegressor(n_estimators=300, max_depth=4, learning_rate=0.01,
                                            subsample=0.7, min_samples_leaf=5, random_state=42))]),

        "GBRT_d4_lr005": Pipeline([("sc", StandardScaler()),
            ("m", GradientBoostingRegressor(n_estimators=300, max_depth=4, learning_rate=0.05,
                                            subsample=0.7, min_samples_leaf=5, random_state=42))]),

        "GBRT_d5_lr001": Pipeline([("sc", StandardScaler()),
            ("m", GradientBoostingRegressor(n_estimators=300, max_depth=5, learning_rate=0.01,
                                            subsample=0.7, min_samples_leaf=5, random_state=42))]),

        "GBRT_d5_lr005": Pipeline([("sc", StandardScaler()),
            ("m", GradientBoostingRegressor(n_estimators=300, max_depth=5, learning_rate=0.05,
                                            subsample=0.7, min_samples_leaf=5, random_state=42))]),


        # ─────────────────────────────
        # MLP (learning rate grid added)
        # ─────────────────────────────
        "MLP_64_relu_lr0005":  Pipeline([("sc", StandardScaler()),
            ("m", MLPRegressor(hidden_layer_sizes=(64,), activation="relu",
                               solver="adam", learning_rate_init=0.0005,
                               max_iter=1000, early_stopping=True,
                               validation_fraction=0.1, random_state=42))]),

        "MLP_64_relu_lr001":   Pipeline([("sc", StandardScaler()),
            ("m", MLPRegressor(hidden_layer_sizes=(64,), activation="relu",
                               solver="adam", learning_rate_init=0.001,
                               max_iter=1000, early_stopping=True,
                               validation_fraction=0.1, random_state=42))]),

        "MLP_64_relu_lr005":   Pipeline([("sc", StandardScaler()),
            ("m", MLPRegressor(hidden_layer_sizes=(64,), activation="relu",
                               solver="adam", learning_rate_init=0.005,
                               max_iter=1000, early_stopping=True,
                               validation_fraction=0.1, random_state=42))]),

        "MLP_64_relu_lr01":    Pipeline([("sc", StandardScaler()),
            ("m", MLPRegressor(hidden_layer_sizes=(64,), activation="relu",
                               solver="adam", learning_rate_init=0.01,
                               max_iter=1000, early_stopping=True,
                               validation_fraction=0.1, random_state=42))])
    }

# ── 2. Scoring ────────────────────────────────────────────────────────────────

def rmse(y_true, y_pred):
    return np.sqrt(mean_squared_error(y_true, y_pred))

scorers = {
    "RMSE": make_scorer(rmse,      greater_is_better=False),
    "R2":   make_scorer(r2_score,  greater_is_better=True),
}

CV = TimeSeriesSplit(n_splits=5)

# ── 3. Main loop ──────────────────────────────────────────────────────────────

records = []

for i, (key, df) in enumerate(full_features.items()):
    df = df.dropna()
    X  = df.iloc[:, :-1].values   # all columns except last = features
    y  = df.iloc[:,  -1].values   # last column = target

    print(f"[{i+1}/{len(full_features)}]  {key}  rows={len(df)}  features={X.shape[1]}")

    for model_name, pipeline in build_models().items():
        cv_results = cross_validate(
            pipeline, X, y,
            cv=CV,
            scoring=scorers,
            return_train_score=False,
            n_jobs=-1,
        )

        records.append({
            "DataFrame": key,
            "Model":     model_name,
            "RMSE":      round(-cv_results["test_RMSE"].mean(), 6),
            "R2":        round( cv_results["test_R2"].mean(),   6),
        })

# ── 4. Results matrix ─────────────────────────────────────────────────────────
# Rows = DataFrame key (e.g. "DD_30"), Columns = (Model, Metric)

results_df = pd.DataFrame(records)

matrix = results_df.pivot_table(
    index="DataFrame",
    columns="Model",
    values=["RMSE", "R2"],
    aggfunc="first",
)
matrix = matrix.swaplevel(axis=1).sort_index(axis=1)
matrix = matrix.reindex(list(full_features.keys()))   # preserve original dict order

print("\n" + "="*80)
print("  RESULTS MATRIX  (CV mean across 5 folds)")
print("="*80)
with pd.option_context("display.max_columns", None, "display.width", 200):
    print(matrix.to_string())

# ── 5. Best model per DataFrame ───────────────────────────────────────────────

best = (
    results_df
    .sort_values("RMSE")
    .groupby("DataFrame", as_index=False)
    .first()
    [["DataFrame", "Model", "RMSE", "R2"]]
)
best = best.set_index("DataFrame").reindex(list(full_features.keys())).reset_index()

print("\n" + "="*80)
print("  BEST MODEL PER DATAFRAME  (lowest RMSE)")
print("="*80)
print(best.to_string(index=False))

# ── 6. Save CSVs ──────────────────────────────────────────────────────────────

matrix.to_csv("results_matrix.csv")
best.to_csv("best_models.csv", index=False)
results_df.to_csv("all_results.csv", index=False)

# ── 7. Save best models as .joblib ───────────────────────────────────────────

os.makedirs("saved_models", exist_ok=True)

for _, row in best.iterrows():
    key        = row["DataFrame"]
    model_name = row["Model"]

    df = full_features[key].dropna()
    X  = df.iloc[:, :-1].values
    y  = df.iloc[:,  -1].values

    # Rebuild a fresh pipeline and fit on the full dataset
    pipeline = build_models()[model_name]
    pipeline.fit(X, y)

    # Sanitize key for use as a filename (e.g. "DD_30")
    safe_key = key.replace("/", "_").replace(" ", "_")
    filename = f"saved_models/{safe_key}__{model_name}.joblib"
    joblib.dump(pipeline, filename)
    print(f"  💾  Saved: {filename}")

print("\n✅  Saved: results_matrix.csv | best_models.csv | all_results.csv | saved_models/")