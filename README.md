# Zar-E-Fishan – Interior Design Management ERP

Premium full-stack ERP for interior design businesses: projects, clients, finance, inventory, procurement, vendors, reports, and settings.

## Tech Stack

- **Frontend:** React (Vite), React Router, Axios, Recharts, Lucide React, react-hot-toast
- **Backend:** Node.js, Express.js, MongoDB, Mongoose, JWT
- **Theme:** Dark Olive `#3F4932`, Golden Beige `#C5A675`, Cream White `#F8F5ED`

## Prerequisites

- Node.js 18+
- MongoDB running locally (default: `mongodb://127.0.0.1:27017/zar-e-fishan`)

## Setup

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env   # Windows: copy .env.example .env
npm run seed           # optional sample data
npm run dev            # http://localhost:5001
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev            # http://localhost:5173 (or next free port)
```

> Note: Default API port is **5001** to avoid clashing with other local apps on 5000. Change `PORT` in `backend/.env` and `VITE_API_URL` in `frontend/.env` if needed.

## Demo Login (after seed)

- **Email:** `admin@zarefishan.com`
- **Password:** `admin123`

Manager account: `manager@zarefishan.com` / `manager123`

## Environment Variables (`backend/.env`)

| Variable       | Description                          |
|----------------|--------------------------------------|
| `PORT`         | API port (default `5001`)            |
| `MONGODB_URI`  | MongoDB connection string           |
| `JWT_SECRET`   | Secret for JWT signing               |
| `JWT_EXPIRE`   | Token expiry (e.g. `7d`)             |
| `CLIENT_URL`   | Frontend origin for CORS             |

Frontend: `frontend/.env` → `VITE_API_URL=http://localhost:5001/api`

## Modules

1. **Dashboard** – live stats, charts, recent activity, low-stock alerts  
2. **Projects** – CRUD, tasks, progress, finance linkage  
3. **Clients** – CRUD, balances, project & payment history  
4. **Finance** – transactions, invoices, payments, AR/AP  
5. **Inventory** – materials, stock in/out, valuation, movements  
6. **Procurement** – PRs, POs, receive (idempotent stock update), vendor payments  
7. **Vendors** – CRUD, purchase & payment history  
8. **Reports** – filtered reports with Excel/PDF export  
9. **Settings** – company, tax, invoice prefixes, profile, password, users  

## API Overview

Base URL: `http://localhost:5001/api`

- `POST /auth/login` – authenticate  
- `GET /dashboard` – dashboard aggregates  
- `CRUD /clients`, `/projects`, `/vendors`  
- `/finance/transactions`, `/finance/invoices`, `/finance/receivables`  
- `/inventory/materials`, stock-in/out, `/inventory/movements`  
- `/procurement/requests`, `/procurement/orders`, receive & payments  
- `/reports/*`, `/settings`  

Protected routes require `Authorization: Bearer <token>`.

## Scripts

| Location | Command        | Purpose                |
|----------|----------------|------------------------|
| backend  | `npm run dev`  | Start API with nodemon |
| backend  | `npm start`    | Start API              |
| backend  | `npm run seed` | Load sample data       |
| frontend | `npm run dev`  | Vite dev server        |
| frontend | `npm run build`| Production build       |

## Notes

- Financial totals are calculated on the **server** (`backend/src/utils/calculations.js`).
- Receiving a purchase order updates inventory **once** (idempotent via `inventoryUpdated` + unique movement keys).
- Duplicate invoice/PO payment transactions are blocked with unique keys.
