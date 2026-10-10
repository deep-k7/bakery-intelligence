import { useEffect, useState } from "react";
import {
  getPredictionOptions,
  predictSales,
  getDashboardSummary,
} from "../services/api";
import BasketAnalysis from "../components/BasketAnalysis";
import "./Dashboard.css";

export default function Dashboard() {
  const today = new Date().toISOString().split("T")[0];

  const [options, setOptions] = useState({
    items: [],
    periods: [],
  });
  const [summary, setSummary] = useState(null);
  const [item, setItem] = useState("");
  const [selectedDate, setSelectedDate] = useState(today);
  const [period, setPeriod] = useState("");
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [optionData, summaryData] = await Promise.all([
          getPredictionOptions(),
          getDashboardSummary(),
        ]);

        setOptions(optionData);
        setSummary(summaryData);
        setItem(optionData.items?.[0] || "");
        setPeriod(optionData.periods?.[0] || "");
      } catch (err) {
        setError(
          err.response?.data?.detail ||
            "Could not connect to the backend. Check that FastAPI is running.",
        );
      }
    }

    loadDashboard();
  }, []);

  async function handlePredict(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setPrediction(null);

    try {
      const result = await predictSales({
        item,
        selected_date: selectedDate,
        period,
      });

      setPrediction(result);
    } catch (err) {
      setError(err.response?.data?.detail || "Sales prediction failed.");
    } finally {
      setLoading(false);
    }
  }

  const money = (value) =>
    new Intl.NumberFormat("en-IN", {
      maximumFractionDigits: 2,
    }).format(Number(value || 0));

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-icon">🥐</span>
          <div>
            <h2>Crumb & Co.</h2>
            <p>Bakery Intelligence</p>
          </div>
        </div>

        <nav className="navigation">
          <a className="nav-link active" href="#dashboard">
            <span>▦</span> Dashboard
          </a>
          <a className="nav-link" href="#prediction">
            <span>↗</span> Sales Prediction
          </a>
          <a className="nav-link" href="#basket-analysis">
            <span>◎</span> Basket Analysis
          </a>
        </nav>

        <div className="sidebar-footer">
          <span className="status-dot" />
          Bakery Sales Analytics
        </div>
      </aside>

      <main className="main-content" id="dashboard">
        <header className="page-header">
          <div>
            <p className="eyebrow">BAKERY ANALYTICS</p>
            <h1>Sales Dashboard</h1>
            <p className="subtitle">
              Understand historical sales and predict demand for your bakery.
            </p>
          </div>
          <div className="today-label">
            <span>Today</span>
            <strong>{new Date().toLocaleDateString("en-IN")}</strong>
          </div>
        </header>

        {error && <div className="error-message">{error}</div>}

        <section className="stats-grid">
          <article className="stat-card">
            <span className="stat-icon">▤</span>
            <p>Historical Records</p>
            <h2>{summary?.total_records ?? "—"}</h2>
            <span className="stat-note">Records in the dataset</span>
          </article>

          <article className="stat-card">
            <span className="stat-icon">🥖</span>
            <p>Total Items Sold</p>
            <h2>{summary ? money(summary.total_items_sold) : "—"}</h2>
            <span className="stat-note">Historical quantity</span>
          </article>

          <article className="stat-card">
            <span className="stat-icon">₹</span>
            <p>Historical Revenue</p>
            <h2>{summary ? `₹${money(summary.historical_revenue)}` : "—"}</h2>
            <span className="stat-note">Calculated from recorded sales</span>
          </article>

          <article className="stat-card">
            <span className="stat-icon">✦</span>
            <p>Bakery Products</p>
            <h2>{summary?.number_of_items ?? summary?.items_available ?? "—"}</h2>
            <span className="stat-note">Distinct products</span>
          </article>
        </section>

        <section className="prediction-section" id="prediction">
          <div className="section-heading">
            <div>
              <p className="eyebrow">MACHINE LEARNING</p>
              <h2>Predict Bakery Sales</h2>
              <p>Choose a product, date, and selling period.</p>
            </div>
            <span className="model-tag">Random Forest</span>
          </div>

          <form className="prediction-form" onSubmit={handlePredict}>
            <label>
              Bakery Product
              <select
                value={item}
                onChange={(e) => setItem(e.target.value)}
                required
              >
                {options.items.map((product) => (
                  <option key={product} value={product}>
                    {product}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Prediction Date
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                onClick={(e) => {
                  if (e.currentTarget.showPicker) {
                    e.currentTarget.showPicker();
                  }
                }}
                required
              />
            </label>

            <label>
              Selling Period
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                required
              >
                {options.periods.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>

            <button
              className="predict-button"
              type="submit"
              disabled={loading || !item || !period}
            >
              {loading ? "Predicting..." : "Generate Prediction →"}
            </button>
          </form>

          {prediction && (
            <div className="prediction-result">
              <div className="result-heading">
                <div>
                  <span className="result-label">PREDICTION RESULT</span>
                  <h3>{prediction.item}</h3>
                  <p>
                    {prediction.day_name} · {prediction.day_type} ·{" "}
                    {prediction.period}
                  </p>
                </div>
                <span className="result-check">✓</span>
              </div>

              <div className="result-grid">
                <div className="result-metric">
                  <span>Predicted Quantity</span>
                  <strong>
                    {money(prediction.predicted_quantity)} <small>items</small>
                  </strong>
                </div>
                <div className="result-metric">
                  <span>Price per Item</span>
                  <strong>{money(prediction.price_per_item)}</strong>
                </div>
                <div className="result-metric revenue-result">
                  <span>Estimated Revenue</span>
                  <strong>{money(prediction.predicted_revenue)}</strong>
                </div>
              </div>

              <p className="result-disclaimer">
                This is a model estimate, not a guaranteed sales outcome.
                Revenue is calculated using the stored item price.
              </p>
            </div>
          )}
        </section>

        <section className="basket-section" id="basket-analysis">
          <div className="section-heading">
            <div>
              <p className="eyebrow">PRODUCT RELATIONSHIPS</p>
              <h2>Basket Analysis</h2>
              <p>Explore products that appear together in customer baskets.</p>
            </div>
          </div>
          <BasketAnalysis />
        </section>

        <footer className="page-footer">
          Crumb & Co. · Bakery Sales Prediction · Powered by Machine Learning
        </footer>
      </main>
    </div>
  );
}
