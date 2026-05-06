import pandas as pd
import matplotlib.pyplot as plt
import numpy as np

# 1. Load the CSV (Pandas automatically uses the first row as a header)
df = pd.read_csv('LLM_features.csv')

# 2. Flatten all values in the dataframe into a 1D array
flat_data = df.values.flatten()

# 3. Create the histogram
# We use bins from -2.5 to 2.5 to center the bars over -2, -1, 0, 1, 2
plt.hist(flat_data, bins=np.arange(-2.5, 3.5, 1), rwidth=0.8, edgecolor='black', color='skyblue')

# 4. Clean up the labels
plt.xticks(range(-2, 3))
plt.xlabel('Values (-2 to 2)')
plt.ylabel('Frequency')
plt.title('Distribution of Matrix Values')
plt.grid(axis='y', alpha=0.3)

plt.savefig('histogram.png')
