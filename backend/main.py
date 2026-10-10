
from datetime import date
from pathlib import Path

import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field


# --------------------------------------------------
# 1. Application setup
# --------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent

app = FastAPI(
    title="Crumb & Co. Bakery Intelligence API",
    description="Bakery sales and revenue prediction service",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --------------------------------------------------
# 2. Load trained model, prices and dataset
# --------------------------------------------------

try:
    model = joblib.load(BASE_DIR / "sales_model.pkl")
    prices = joblib.load(BASE_DIR / "item_prices.pkl")
    data = pd.read_csv(BASE_DIR / "bakery_ml_ready.csv")

except FileNotFoundError as exc:
    raise RuntimeError(
        f"Required file not found: {exc.filename}. "
        "Place sales_model.pkl, item_prices.pkl and "
        "bakery_ml_ready.csv inside the backend folder."
    ) from exc


required_columns = {
    "period_day",
    "sale_date",
    "items_sold",
    "item",
    "price",
}

missing_columns = required_columns.difference(data.columns)

if missing_columns:
    raise RuntimeError(
        f"Dataset is missing required columns: {sorted(missing_columns)}"
    )

data["sale_date"] = pd.to_datetime(data["sale_date"], errors="coerce")
data["period_day"] = data["period_day"].astype(str)

ITEMS = sorted(str(item) for item in prices.keys())

PERIODS = sorted(
    data["period_day"].dropna().unique().tolist()
)


# --------------------------------------------------
# 3. Request validation
# --------------------------------------------------

class PredictionRequest(BaseModel):
    item: str = Field(min_length=1)
    selected_date: date
    period: str = Field(min_length=1)


# --------------------------------------------------
# 4. Health check
# --------------------------------------------------

@app.get("/")
def home():
    return {
        "message": "Crumb & Co. Bakery Intelligence API",
        "docs": "/docs",
        "status": "running",
    }


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "service": "Crumb & Co.",
        "model_loaded": model is not None,
    }


# --------------------------------------------------
# 5. Return available items and periods to React
# --------------------------------------------------

@app.get("/api/options")
def get_options():
    return {
        "items": ITEMS,
        "periods": PERIODS,
    }


# --------------------------------------------------
# 6. Predict sales and revenue
# --------------------------------------------------

@app.post("/api/predict")
def predict_sales(request: PredictionRequest):

    # Validate selected product
    if request.item not in prices:
        raise HTTPException(
            status_code=400,
            detail="Selected bakery item is not available.",
        )

    # Validate selected period
    if request.period not in PERIODS:
        raise HTTPException(
            status_code=400,
            detail="Selected period is not available.",
        )

    selected_date = request.selected_date

    # Monday = 0, Sunday = 6
    day_of_week = selected_date.weekday()

    day_type = (
        "weekend" if day_of_week >= 5 else "weekday"
    )

    # These feature names and values match train_model.py
    input_data = pd.DataFrame([{
        "item": request.item,
        "period_day": request.period,
        "weekday_weekend": day_type,
        "day_of_week": day_of_week,
        "day_of_month": selected_date.day,
        "month_number": selected_date.month,
    }])

    try:
        raw_prediction = float(model.predict(input_data)[0])

        if not pd.notna(raw_prediction):
            raise ValueError("Model returned an invalid prediction.")

        # Quantity cannot be negative and must be a whole number
        predicted_quantity = max(0, round(raw_prediction))

        item_price = float(prices[request.item])

        if not pd.notna(item_price) or item_price < 0:
            raise ValueError("Invalid item price.")

        predicted_revenue = round(
            predicted_quantity * item_price, 2
        )

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Prediction failed: {str(exc)}",
        ) from exc

    return {
        "item": request.item,
        "date": selected_date.isoformat(),
        "day_name": selected_date.strftime("%A"),
        "day_type": day_type,
        "period": request.period,
        "predicted_quantity": predicted_quantity,
        "price_per_item": round(item_price, 2),
        "predicted_revenue": predicted_revenue,
        "currency": "Confirm dataset currency",
    }


# --------------------------------------------------
# 7. Basic dataset summary for the dashboard
# --------------------------------------------------

@app.get("/api/summary")
def get_summary():
    valid_data = data.dropna(
        subset=["sale_date", "items_sold", "price"]
    )

    total_records = len(valid_data)
    total_items = int(valid_data["items_sold"].sum())

    # Historical revenue from the supplied dataset
    historical_revenue = float(
        (valid_data["items_sold"] * valid_data["price"]).sum()
    )

    return {
        "total_records": total_records,
        "total_items_sold": total_items,
        "historical_revenue": round(historical_revenue, 2),
        "items_available": len(ITEMS),
        "periods_available": PERIODS,
        "data_start": (
            valid_data["sale_date"].min().date().isoformat()
            if not valid_data.empty else None
        ),
        "data_end": (
            valid_data["sale_date"].max().date().isoformat()
            if not valid_data.empty else None
        ),
    }
