
import pandas as pd

# Load the original dataset
df = pd.read_csv("ml_data.csv")

# Clean column names and values
df.columns = df.columns.str.strip()
df["item"] = df["item"].str.strip()
df["period_day"] = df["period_day"].str.strip().str.lower()
df["sale_date"] = pd.to_datetime(df["sale_date"])

# Correct month spelling
df["month_name"] = df["month_name"].replace(
    {"Octomber": "October"}
)

# Aggregate transactions into daily item sales
ml_data = (
    df.groupby(
        ["sale_date", "item", "period_day"],
        as_index=False
    )
    .agg(
        items_sold=("item", "size"),
        price=("price", "first"),
        weekday_weekend=("weekday_weekend", "first"),
        weekday=("weekday", "first"),
        weekday_name=("weekday_name", "first"),
        month=("month", "first"),
        month_name=("month_name", "first")
    )
)

# Calculate revenue
ml_data["revenue"] = (
    ml_data["items_sold"] * ml_data["price"]
)

# Sort and save
ml_data = ml_data.sort_values(
    ["sale_date", "item", "period_day"]
)

ml_data.to_csv("bakery_ml_ready.csv", index=False)

print("Dataset preparation completed!")
print("Original rows:", len(df))
print("Prepared rows:", len(ml_data))
print("\nFirst five rows:")
print(ml_data.head())
print("\nMissing values:")
print(ml_data.isnull().sum())
print("\nSaved as bakery_ml_ready.csv")
