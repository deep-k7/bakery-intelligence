# 🥐 Crumb & Co. Bakery Intelligence

Bakery sales prediction, revenue estimation, and product basket analysis powered by Machine Learning and FastAPI + React (Vite).

---

## 🚀 Quick Deployment to Vercel

This repository is configured for zero-configuration, full-stack deployment on [Vercel](https://vercel.com). Both the React frontend and the Python FastAPI ML backend deploy together in a unified serverless architecture.

### Option 1: Full-Stack Deployment (Recommended)

1. Push your repository to **GitHub / GitLab / Bitbucket**.
2. Go to your **[Vercel Dashboard](https://vercel.com/dashboard)** and click **Add New Project**.
3. Import the `bakery-intelligence` repository.
4. Keep the **Root Directory** as `.` (repository root). Vercel will automatically detect `vercel.json` and build both the frontend and the Python serverless API.
5. Click **Deploy**.

> **Note on Function Limits**: The scikit-learn model and datasets run on Python 3.13 serverless functions. `vercel.json` automatically allocates 1024MB memory and 30s timeout for smooth ML model execution.

---

### Option 2: Separate Deployments (Alternative)

If you prefer deploying the Frontend and Backend as two independent Vercel projects:

#### 1. Backend Project
- Import repository into Vercel.
- Set **Root Directory** to `backend`.
- Framework Preset: **Other**.
- Deploy. Vercel will provide your backend URL (e.g. `https://bakery-api.vercel.app`).

#### 2. Frontend Project
- Import repository into Vercel.
- Set **Root Directory** to `frontend`.
- Framework Preset: **Vite**.
- Add Environment Variable:
  - `VITE_API_URL`: `https://bakery-api.vercel.app` (your backend URL).
- Deploy.

---

## ⚙️ Environment Variables

| Variable | Scope | Default | Description |
|---|---|---|---|
| `VITE_API_URL` | Frontend | `""` (in prod) / `http://127.0.0.1:8000` (in dev) | Backend API base URL. Leave unset on unified Vercel deployment. |
| `ALLOWED_ORIGINS` | Backend | `*` | Comma-separated list of allowed CORS origins (e.g. `https://mybakery.vercel.app`). |

---

## 💻 Local Development

### Prerequisites
- Python 3.11+ (Python 3.13 recommended) with Conda or virtual environment
- Node.js 18+ and npm

### 1. Backend Setup
```bash
# Activate your environment
conda activate modeltrainenv

# Install dependencies
pip install -r requirements.txt

# Start FastAPI server
uvicorn backend.main:app --reload
# Or from inside backend/:
# cd backend && uvicorn main:app --reload
```
API runs at [http://127.0.0.1:8000](http://127.0.0.1:8000). Interactive docs at [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs).

### 2. Frontend Setup
```bash
# From project root:
npm --prefix frontend install
npm --prefix frontend run dev

# Or from inside frontend/:
# cd frontend
# npm install
# npm run dev
```
Frontend runs at [http://localhost:5173](http://localhost:5173).

---

## 📁 Project Structure

```
bakery-intelligence/
├── api/
│   ├── index.py              # Vercel serverless function entrypoint
│   └── requirements.txt      # API dependencies for Vercel
├── backend/
│   ├── main.py               # FastAPI application & ML inference endpoints
│   ├── sales_model.pkl       # Trained RandomForestRegressor pipeline
│   ├── item_prices.pkl       # Serialized item pricing lookup
│   ├── bakery_ml_ready.csv   # Aggregated historical sales data
│   ├── train_model.py        # Model training script
│   ├── prepare_data.py       # Data cleaning and aggregation script
│   ├── requirements.txt      # Python dependencies
│   └── vercel.json           # Standalone backend Vercel config
├── frontend/
│   ├── src/
│   │   ├── pages/Dashboard.jsx      # Analytics and sales prediction UI
│   │   ├── components/BasketAnalysis.jsx # Association rules network graph
│   │   └── services/api.js          # API client with auto-environment detection
│   ├── package.json
│   ├── vite.config.js
│   └── vercel.json           # Standalone frontend Vercel config
├── package.json              # Monorepo build and development scripts
├── requirements.txt          # Root Python dependencies
├── vercel.json               # Root unified full-stack Vercel configuration
├── .python-version           # Pins Python 3.13 for Vercel
└── .gitignore                # Excludes bytecode, node_modules, and build output
```

---

## 🧪 Testing the Build

To test production build locally from the root folder:
```bash
npm run build
```
This installs dependencies and compiles the Vite application into `frontend/dist`.
