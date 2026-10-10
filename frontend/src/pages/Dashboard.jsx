import { useEffect, useState } from "react";
import {
  getPredictionOptions,
  predictSales,
  getDashboardSummary,
} from "../services/api";
import BasketAnalysis from "../components/BasketAnalysis";
import "./Dashboard.css";

const QUICK_ITEMS = ["Coffee", "Bread", "Tea", "Pastry", "Medialuna"];

const PERIOD_CONFIG = [
  { id: "morning", label: "Morning", icon: "🌅" },
  { id: "afternoon", label: "Afternoon", icon: "☀️" },
  { id: "evening", label: "Evening", icon: "🌆" },
  { id: "night", label: "Night", icon: "🌙" },
];

const getInitialDate = () => {
  const now = new Date();
  return {
    iso: now.toISOString().split("T")[0],
    formatted: now.toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    }),
  };
};

const INITIAL_DATE = getInitialDate();

export default function Dashboard() {
  const [options, setOptions] = useState({
    items: [],
    periods: [],
  });
  const [summary, setSummary] = useState(null);
  const [item, setItem] = useState("");
  const [selectedDate, setSelectedDate] = useState(INITIAL_DATE.iso);
  const [period, setPeriod] = useState("");
  const [prediction, setPrediction] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");
  const [apiOnline, setApiOnline] = useState(null);
  const [activeSection, setActiveSection] = useState("dashboard");

  const refreshDashboard = async () => {
    setFetching(true);
    setError("");
    try {
      const [optionData, summaryData] = await Promise.all([
        getPredictionOptions(),
        getDashboardSummary(),
      ]);

      setOptions(optionData);
      setSummary(summaryData);
      setApiOnline(true);
      if (optionData.items?.length) {
        setItem((prev) => prev || optionData.items[0]);
      }
      if (optionData.periods?.length) {
        setPeriod((prev) => prev || optionData.periods[0]);
      }
    } catch (err) {
      setApiOnline(false);
      setError(
        err.response?.data?.detail ||
          "Could not connect to the backend. Check that FastAPI is running.",
      );
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    let ignore = false;

    async function init() {
      setFetching(true);
      setError("");
      try {
        const [optionData, summaryData] = await Promise.all([
          getPredictionOptions(),
          getDashboardSummary(),
        ]);

        if (!ignore) {
          setOptions(optionData);
          setSummary(summaryData);
          setApiOnline(true);
          if (optionData.items?.length) {
            setItem((prev) => prev || optionData.items[0]);
          }
          if (optionData.periods?.length) {
            setPeriod((prev) => prev || optionData.periods[0]);
          }
        }
      } catch (err) {
        if (!ignore) {
          setApiOnline(false);
          setError(
            err.response?.data?.detail ||
              "Could not connect to the backend. Check that FastAPI is running.",
          );
        }
      } finally {
        if (!ignore) {
          setFetching(false);
        }
      }
    }

    init();

    return () => {
      ignore = true;
    };
  }, []);

  async function handlePredict(event) {
    if (event) event.preventDefault();
    if (!item || !period) return;

    setLoading(true);
    setError("");

    try {
      const result = await predictSales({
        item,
        selected_date: selectedDate,
        period,
      });

      setPrediction(result);
      setHistory((prev) => {
        const withoutCurrent = prev.filter(
          (h) =>
            !(
              h.item === result.item &&
              h.period === result.period &&
              h.date === result.date
            ),
        );
        return [result, ...withoutCurrent].slice(0, 4);
      });
    } catch (err) {
      setError(err.response?.data?.detail || "Sales prediction failed.");
    } finally {
      setLoading(false);
    }
  }

  const setQuickDate = (type) => {
    const d = new Date();
    if (type === "today") {
      // today
    } else if (type === "tomorrow") {
      d.setDate(d.getDate() + 1);
    } else if (type === "saturday") {
      const day = d.getDay();
      let diff = 6 - day;
      if (diff <= 0) diff += 7;
      d.setDate(d.getDate() + diff);
    } else if (type === "sunday") {
      const day = d.getDay();
      let diff = (7 - day) % 7;
      if (diff === 0) diff = 7;
      d.setDate(d.getDate() + diff);
    }
    setSelectedDate(d.toISOString().split("T")[0]);
  };

  const scrollTo = (id) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  const money = (value) =>
    new Intl.NumberFormat("en-IN", {
      maximumFractionDigits: 2,
    }).format(Number(value || 0));

  const getDemandBadge = (quantity) => {
    if (quantity >= 20) {
      return {
        label: "High Demand",
        icon: "🔥",
        className: "demand-badge demand-high",
      };
    }
    if (quantity >= 10) {
      return {
        label: "Moderate Demand",
        icon: "✨",
        className: "demand-badge demand-medium",
      };
    }
    return {
      label: "Steady Demand",
      icon: "🌱",
      className: "demand-badge demand-low",
    };
  };

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
          <button
            type="button"
            className={`nav-link ${activeSection === "dashboard" ? "active" : ""}`}
            onClick={() => scrollTo("dashboard")}
          >
            <span>▦</span> Dashboard
          </button>
          <button
            type="button"
            className={`nav-link ${activeSection === "prediction" ? "active" : ""}`}
            onClick={() => scrollTo("prediction")}
          >
            <span>↗</span> Sales Prediction
          </button>
          <button
            type="button"
            className={`nav-link ${activeSection === "basket-analysis" ? "active" : ""}`}
            onClick={() => scrollTo("basket-analysis")}
          >
            <span>◎</span> Basket Analysis
          </button>
        </nav>

        <div className="sidebar-footer">
          <span
            className="status-dot"
            style={{
              background: apiOnline === false ? "#e0584b" : "#8dc9a0",
            }}
          />
          {apiOnline === false ? "Backend Offline" : "Bakery Analytics Online"}
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

          <div className="header-status-wrap">
            <span
              className={`status-pill ${
                apiOnline === true ? "online" : apiOnline === false ? "offline" : ""
              }`}
            >
              ● {apiOnline === true ? "API Connected" : apiOnline === false ? "API Disconnected" : "Connecting..."}
            </span>
            <button
              type="button"
              className="refresh-btn"
              onClick={refreshDashboard}
              title="Refresh dashboard data"
              disabled={fetching}
            >
              ↻ Refresh
            </button>
            <div className="today-label">
              <span>Today</span>
              <strong>{INITIAL_DATE.formatted}</strong>
            </div>
          </div>
        </header>

        {error && (
          <div className="error-banner">
            <span>{error}</span>
            <button
              type="button"
              className="dismiss-btn"
              onClick={() => setError("")}
              aria-label="Dismiss error"
            >
              ×
            </button>
          </div>
        )}

        <section className="stats-grid">
          <article className="stat-card">
            <span className="stat-icon">▤</span>
            <p>Historical Records</p>
            <h2>{summary?.total_records ?? "—"}</h2>
            <span className="stat-note">
              {summary?.data_start && summary?.data_end
                ? `${summary.data_start} to ${summary.data_end}`
                : "Records in dataset"}
            </span>
          </article>

          <article className="stat-card">
            <span className="stat-icon">🥖</span>
            <p>Total Items Sold</p>
            <h2>{summary ? money(summary.total_items_sold) : "—"}</h2>
            <span className="stat-note">Historical units across all orders</span>
          </article>

          <article className="stat-card">
            <span className="stat-icon">₹</span>
            <p>Historical Revenue</p>
            <h2>{summary ? `₹${money(summary.historical_revenue)}` : "—"}</h2>
            <span className="stat-note">Calculated from recorded transactions</span>
          </article>

          <article className="stat-card">
            <span className="stat-icon">✦</span>
            <p>Bakery Products</p>
            <h2>
              {summary?.number_of_items ??
                summary?.items_available ??
                options.items?.length ??
                "—"}
            </h2>
            <span className="stat-note">Distinct catalog items</span>
          </article>
        </section>

        <section className="prediction-section" id="prediction">
          <div className="section-heading">
            <div>
              <p className="eyebrow">MACHINE LEARNING</p>
              <h2>Predict Bakery Sales</h2>
              <p>Choose a product, date, and selling period for AI-driven demand forecast.</p>
            </div>
            <span className="model-tag">Random Forest Regressor</span>
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

              <div className="quick-chips">
                {QUICK_ITEMS.map((quickName) => (
                  <button
                    type="button"
                    key={quickName}
                    className={`chip ${item === quickName ? "active" : ""}`}
                    onClick={() => setItem(quickName)}
                  >
                    {quickName}
                  </button>
                ))}
              </div>
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

              <div className="quick-chips">
                <button
                  type="button"
                  className={`chip ${selectedDate === INITIAL_DATE.iso ? "active" : ""}`}
                  onClick={() => setQuickDate("today")}
                >
                  Today
                </button>
                <button
                  type="button"
                  className="chip"
                  onClick={() => setQuickDate("tomorrow")}
                >
                  Tomorrow
                </button>
                <button
                  type="button"
                  className="chip"
                  onClick={() => setQuickDate("saturday")}
                >
                  Sat
                </button>
                <button
                  type="button"
                  className="chip"
                  onClick={() => setQuickDate("sunday")}
                >
                  Sun
                </button>
              </div>
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
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </option>
                ))}
              </select>

              <div className="period-pill-group">
                {PERIOD_CONFIG.map((p) => (
                  <button
                    type="button"
                    key={p.id}
                    className={`period-pill ${period === p.id ? "active" : ""}`}
                    onClick={() => setPeriod(p.id)}
                  >
                    {p.icon} {p.label}
                  </button>
                ))}
              </div>
            </label>

            <button
              className="predict-button"
              type="submit"
              disabled={loading || !item || !period}
            >
              {loading ? "Calculating Forecast..." : "Generate Prediction →"}
            </button>
          </form>

          {prediction && (
            <div className="prediction-result">
              <div className="result-heading">
                <div>
                  <span className="result-label">PREDICTION RESULT</span>
                  <h3>{prediction.item}</h3>
                  <p>
                    {prediction.day_name} ({prediction.day_type}) ·{" "}
                    {prediction.period.toUpperCase()} · {prediction.date}
                  </p>
                  <span className={getDemandBadge(prediction.predicted_quantity).className}>
                    {getDemandBadge(prediction.predicted_quantity).icon}{" "}
                    {getDemandBadge(prediction.predicted_quantity).label}
                  </span>
                </div>
                <span className="result-check">✓</span>
              </div>

              <div className="result-grid">
                <div className="result-metric">
                  <span>Predicted Quantity</span>
                  <strong>
                    {money(prediction.predicted_quantity)} <small>units</small>
                  </strong>
                </div>
                <div className="result-metric">
                  <span>Price per Item</span>
                  <strong>₹{money(prediction.price_per_item)}</strong>
                </div>
                <div className="result-metric revenue-result">
                  <span>Estimated Revenue</span>
                  <strong>₹{money(prediction.predicted_revenue)}</strong>
                </div>
              </div>

              <p className="result-disclaimer">
                Model estimate generated by Random Forest based on historical sales patterns,
                day-of-week trends, and selling period.
              </p>
            </div>
          )}

          {history.length > 0 && (
            <div className="recent-history-section">
              <div className="recent-history-heading">
                <span>RECENT PREDICTIONS COMPARISON</span>
                <small>{history.length} saved</small>
              </div>
              <div className="history-cards-grid">
                {history.map((h, idx) => (
                  <button
                    type="button"
                    key={`${h.item}-${h.period}-${h.date}-${idx}`}
                    className="history-card"
                    onClick={() => {
                      setItem(h.item);
                      setSelectedDate(h.date);
                      setPeriod(h.period);
                      setPrediction(h);
                    }}
                    title="Click to view details"
                  >
                    <div className="history-card-header">
                      <span className="history-card-title">{h.item}</span>
                      <span className="history-card-meta">{h.period}</span>
                    </div>
                    <span className="history-card-meta">{h.day_name} · {h.date}</span>
                    <div className="history-card-values">
                      <span>{money(h.predicted_quantity)} units</span>
                      <strong>₹{money(h.predicted_revenue)}</strong>
                    </div>
                  </button>
                ))}
              </div>
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
          Crumb & Co. · Bakery Intelligence Platform · Powered by Scikit-Learn & FastAPI
        </footer>
      </main>
    </div>
  );
}
