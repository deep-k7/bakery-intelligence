
import streamlit as st
import pandas as pd
import joblib

from datetime import date

st.set_page_config(
    page_title="Bakery Sales Predictor",
    page_icon="🥐",
    layout="wide"
)

# Load trained model and prices
@st.cache_resource
def load_files():
    model = joblib.load("sales_model.pkl")
    prices = joblib.load("item_prices.pkl")
    data = pd.read_csv("bakery_ml_ready.csv")
    return model, prices, data

try:
    model, prices, data = load_files()
except FileNotFoundError:
    st.error(
        "Model files not found. Run prepare_data.py "
        "and train_model.py first."
    )
    st.stop()

st.title("🥐 Bakery Sales & Revenue Predictor")
st.write(
    "Estimate item sales and revenue using product, "
    "date, weekday, and period of day."
)

st.info(
    "Prototype only: the training dataset covers just "
    "seven days. Predictions for future dates may be unreliable."
)

# Input form
col1, col2 = st.columns(2)

with col1:
    item = st.selectbox(
        "Select bakery item",
        options=sorted(prices.keys())
    )

    selected_date = st.date_input(
        "Select prediction date",
        value=date.today()
    )

with col2:
    period = st.selectbox(
        "Period of day",
        options=sorted(data["period_day"].dropna().unique())
    )

    day_type = (
        "weekend"
        if selected_date.weekday() >= 5
        else "weekday"
    )

st.caption(
    f"Selected day: {selected_date.strftime('%A')} "
    f"({day_type.title()})"
)

if st.button("Predict Sales & Revenue", type="primary"):
    input_data = pd.DataFrame([{
        "item": item,
        "period_day": period,
        "weekday_weekend": day_type,
        "day_of_week": selected_date.weekday(),
        "day_of_month": selected_date.day,
        "month_number": selected_date.month
    }])

    predicted_sales = max(
        0, float(model.predict(input_data)[0])
    )

    # Round quantity to a whole unit
    predicted_sales = round(predicted_sales)

    item_price = float(prices[item])
    predicted_revenue = predicted_sales * item_price

    st.subheader("Prediction Results")

    c1, c2 = st.columns(2)

    c1.metric("Expected Items Sold", f"{predicted_sales:,} units")
    c2.metric("Estimated Revenue", f"{predicted_revenue:,.2f}")

    st.write(f"**Item:** {item}")
    st.write(f"**Date:** {selected_date.strftime('%d %B %Y')}")
    st.write(f"**Period:** {period.title()}")
    st.write(f"**Price per item:** {item_price:,.2f}")

    st.caption(
        "Revenue uses the item prices in your dataset. "
        "Confirm the actual prices and currency before using "
        "these estimates for business decisions."
    )
