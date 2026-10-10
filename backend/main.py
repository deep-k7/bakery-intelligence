import os
import sys
from datetime import date
from pathlib import Path

import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, Field

# --------------------------------------------------
# 1. Application setup
# --------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent

app = FastAPI(
    title="Crumb & Co. Bakery Intelligence API",
    description="Bakery sales and revenue prediction service",
    version="1.0.0",
    docs_url="/docs",
    openapi_url="/openapi.json",
)

# Robust CORS configuration:
# Allows any origin in production or custom origins via ALLOWED_ORIGINS env var
allowed_origins_env = os.getenv("ALLOWED_ORIGINS")
if allowed_origins_env:
    allowed_origins = [o.strip() for o in allowed_origins_env.split(",") if o.strip()]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )


# --------------------------------------------------
# 2. Helper to find model & data files across environments
# --------------------------------------------------

def find_data_file(filename: str) -> Path:
    candidates = [
        BASE_DIR / filename,
        Path.cwd() / "backend" / filename,
        Path.cwd() / filename,
        BASE_DIR.parent / "backend" / filename,
    ]
    for path in candidates:
        if path.exists():
            return path
    raise FileNotFoundError(
        f"Required file '{filename}' was not found in: {[str(p) for p in candidates]}"
    )


# --------------------------------------------------
# 3. Load trained model, prices and dataset
# --------------------------------------------------

model = None
prices = {}
data = pd.DataFrame()
ITEMS = []
PERIODS = []
load_error = None

try:
    model_path = find_data_file("sales_model.pkl")
    prices_path = find_data_file("item_prices.pkl")
    data_path = find_data_file("bakery_ml_ready.csv")

    model = joblib.load(model_path)
    prices = joblib.load(prices_path)
    data = pd.read_csv(data_path)

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
    PERIODS = sorted(data["period_day"].dropna().unique().tolist())

except Exception as exc:
    load_error = str(exc)
    print(f"Warning: Model/Data initialization failed: {exc}", file=sys.stderr)


# --------------------------------------------------
# 4. Request validation
# --------------------------------------------------

class PredictionRequest(BaseModel):
    item: str = Field(min_length=1)
    selected_date: date
    period: str = Field(min_length=1)


# --------------------------------------------------
# 5. Health & root endpoints
# --------------------------------------------------

@app.get("/")
def home():
    return {
        "message": "Crumb & Co. Bakery Intelligence API",
        "docs": "/docs",
        "status": "running" if model is not None else "degraded",
        "model_loaded": model is not None,
    }


@app.get("/api/health")
@app.get("/health")
def health():
    return {
        "status": "ok" if model is not None else "degraded",
        "service": "Crumb & Co.",
        "model_loaded": model is not None,
        "error": load_error,
    }


# --------------------------------------------------
# 6. Return available items and periods to frontend
# --------------------------------------------------

@app.get("/api/options")
@app.get("/options")
def get_options():
    if not prices:
        raise HTTPException(
            status_code=503,
            detail=f"Bakery items data is not loaded. Error: {load_error}",
        )
    return {
        "items": ITEMS,
        "periods": PERIODS,
    }


# --------------------------------------------------
# 7. Predict sales and revenue
# --------------------------------------------------

@app.post("/api/predict")
@app.post("/predict")
def predict_sales(request: PredictionRequest):
    if model is None:
        raise HTTPException(
            status_code=503,
            detail=f"Prediction model is not loaded. Error: {load_error}",
        )

    if request.item not in prices:
        raise HTTPException(
            status_code=400,
            detail="Selected bakery item is not available.",
        )

    if request.period not in PERIODS:
        raise HTTPException(
            status_code=400,
            detail="Selected period is not available.",
        )

    selected_date = request.selected_date
    day_of_week = selected_date.weekday()
    day_type = "weekend" if day_of_week >= 5 else "weekday"

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

        predicted_quantity = max(0, round(raw_prediction))
        item_price = float(prices[request.item])

        if not pd.notna(item_price) or item_price < 0:
            raise ValueError("Invalid item price.")

        predicted_revenue = round(predicted_quantity * item_price, 2)

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
# 8. Basic dataset summary for the dashboard
# --------------------------------------------------

@app.get("/api/summary")
@app.get("/summary")
def get_summary():
    if data.empty:
        raise HTTPException(
            status_code=503,
            detail=f"Summary data is not loaded. Error: {load_error}",
        )

    valid_data = data.dropna(
        subset=["sale_date", "items_sold", "price"]
    )

    total_records = len(valid_data)
    total_items = int(valid_data["items_sold"].sum())

    historical_revenue = float(
        (valid_data["items_sold"] * valid_data["price"]).sum()
    )

    return {
        "total_records": total_records,
        "total_items_sold": total_items,
        "historical_revenue": round(historical_revenue, 2),
        "items_available": len(ITEMS),
        "number_of_items": len(ITEMS),
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
