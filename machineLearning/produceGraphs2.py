import pandas as pd

# Example: replace these with your real DataFrames
df1 = pd.read_csv('best_models2.csv')

df2 = pd.read_csv('best_models.csv')

# -----------------------------
# STEP 1: set proper index
# -----------------------------
df1_idx = df1.set_index(["DataFrame", "Model"])
df2_idx = df2.set_index(["DataFrame", "Model"])

# -----------------------------
# STEP 2: align safely (important if anything is missing/misaligned)
# -----------------------------
df1_idx, df2_idx = df1_idx.align(df2_idx)

# -----------------------------
# STEP 3: compute differences
# -----------------------------
diff = df1_idx - df2_idx

# -----------------------------
# STEP 4: make it readable again
# -----------------------------
diff = diff.reset_index()

# optional: rename columns so it's obvious these are differences
diff = diff.rename(columns={
    "RMSE": "RMSE_diff",
    "R2": "R2_diff"
})

print(diff)