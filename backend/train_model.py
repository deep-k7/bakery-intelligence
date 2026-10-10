
import pandas as pd
import numpy as np
import joblib

from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder
from sklearn.pipeline import Pipeline
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

# 1. Load processed data
df = pd.read_csv("bakery_ml_ready.csv")
df["sale_date"] = pd.to_datetime(df["sale_date"])

# 2. Create date features
df["day_of_month"] = df["sale_date"].dt.day
df["day_of_week"] = df["sale_date"].dt.dayofweek
df["month_number"] = df["sale_date"].dt.month

# 3. Define input features and target
features = [
    "item",
    "period_day",
    "weekday_weekend",
    "day_of_week",
    "day_of_month",
    "month_number"
]

target = "items_sold"

# 4. Split chronologically: last 2 days for testing
dates = sorted(df["sale_date"].unique())

if len(dates) < 3:
    raise ValueError("Need at least 3 different dates.")

split_date = dates[-2]

train = df[df["sale_date"] < split_date].copy()
test = df[df["sale_date"] >= split_date].copy()

X_train = train[features]
y_train = train[target]

X_test = test[features]
y_test = test[target]

# 5. Encode categorical features
categorical = ["item", "period_day", "weekday_weekend"]
numeric = ["day_of_week", "day_of_month", "month_number"]

preprocessor = ColumnTransformer([
    ("categories", OneHotEncoder(handle_unknown="ignore"), categorical),
    ("numbers", "passthrough", numeric)
])

# 6. Build model
model = Pipeline([
    ("preprocessing", preprocessor),
    ("regressor", RandomForestRegressor(
        n_estimators=200,
        random_state=42,
        min_samples_leaf=2
    ))
])

# 7. Train
model.fit(X_train, y_train)

# 8. Evaluate on later dates
predictions = np.maximum(0, model.predict(X_test))

mae = mean_absolute_error(y_test, predictions)
rmse = np.sqrt(mean_squared_error(y_test, predictions))

print("Training records:", len(train))
print("Testing records:", len(test))
print("Training through:", train["sale_date"].max().date())
print("Testing from:", test["sale_date"].min().date())

print(f"\nMAE: {mae:.3f}")
print(f"RMSE: {rmse:.3f}")

if len(y_test) > 1 and y_test.nunique() > 1:
    print(f"R2 Score: {r2_score(y_test, predictions):.3f}")
else:
    print("R2 Score: not meaningful for this test set")

# 9. Save model and item prices
joblib.dump(model, "sales_model.pkl")

prices = (
    df.groupby("item")["price"]
    .first()
    .to_dict()
)

joblib.dump(prices, "item_prices.pkl")

print("\nModel saved: sales_model.pkl")
print("Prices saved: item_prices.pkl")
