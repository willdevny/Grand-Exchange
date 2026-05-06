import pandas as pd

def main():
    file_path = "best_models.csv"  # change this

    # Load CSV
    df = pd.read_csv(file_path)

    # Increase spacing between columns
    pd.set_option('display.colheader_justify', 'center')
    pd.set_option('display.width', None)
    pd.set_option('display.max_columns', None)

    # Convert to string with extra spacing
    table_str = df.to_string(index=False, col_space=15)

    print("\n=== FULL TABLE ===\n")
    print(table_str)

if __name__ == "__main__":
    main()