import { useState } from 'react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Download, FileSpreadsheet } from 'lucide-react';
import { reportsAPI, erpAPI } from '../api';
import PageHeader from '../components/common/PageHeader';
import LoadingSpinner from '../components/common/LoadingSpinner';
import DataTable from '../components/common/DataTable';
import StatCard from '../components/common/StatCard';
import StatusBadge from '../components/common/StatusBadge';
import { formatCurrency, formatDate } from '../utils/format';

const TYPES = [
  { value: 'projects', label: 'Projects' },
  { value: 'clients', label: 'Clients' },
  { value: 'finance', label: 'Income & Expense' },
  { value: 'profitLoss', label: 'Profit & Loss' },
  { value: 'inventory', label: 'Inventory' },
  { value: 'procurement', label: 'Procurement' },
  { value: 'vendors', label: 'Vendors' },
  { value: 'cashFlow', label: 'Cash flow' },
  { value: 'balanceSheet', label: 'Balance sheet' },
];

export default function Reports() {
  const [type, setType] = useState('finance');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const run = async () => {
    setLoading(true);
    try {
      const params = { startDate: startDate || undefined, endDate: endDate || undefined };
      let res;
      switch (type) {
        case 'projects': res = await reportsAPI.projects(params); break;
        case 'clients': res = await reportsAPI.clients(params); break;
        case 'finance': res = await reportsAPI.finance(params); break;
        case 'profitLoss': res = await reportsAPI.profitLoss(params); break;
        case 'inventory': res = await reportsAPI.inventory(params); break;
        case 'procurement': res = await reportsAPI.procurement(params); break;
        case 'vendors': res = await reportsAPI.vendors(params); break;
        case 'cashFlow': res = await erpAPI.cashFlow(params); break;
        case 'balanceSheet': res = await erpAPI.balanceSheet(); break;
        default: res = await reportsAPI.finance(params);
      }
      setResult({ type, ...res.data });
      toast.success('Report generated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Report failed');
    } finally {
      setLoading(false);
    }
  };

  const exportExcel = () => {
    if (!result?.data) return toast.error('Generate a report first');
    const rows = Array.isArray(result.data) ? result.data : [];
    const flat = rows.map((r) => {
      if (type === 'finance') {
        return {
          ID: r.transactionId, Type: r.type, Category: r.category,
          Amount: r.amount, Date: formatDate(r.date), Description: r.description,
        };
      }
      if (type === 'projects') {
        return {
          ID: r.projectId, Name: r.name, Client: r.client?.name, Budget: r.budget,
          Revenue: r.totalRevenue, Expenses: r.totalExpenses, Status: r.status,
        };
      }
      if (type === 'clients') {
        return {
          Name: r.name, Phone: r.phone, Value: r.totalProjectValue,
          Paid: r.totalPaid, Pending: r.totalPending,
        };
      }
      if (type === 'inventory') {
        return {
          SKU: r.sku, Name: r.name, Category: r.category,
          Qty: r.quantity, Cost: r.costPrice, Value: (r.quantity || 0) * (r.costPrice || 0),
        };
      }
      if (type === 'procurement') {
        return {
          PO: r.poNumber, Vendor: r.vendor?.name, Total: r.total,
          Paid: r.paidAmount, Balance: r.remainingBalance, Status: r.status,
        };
      }
      if (type === 'vendors') {
        return {
          Name: r.name, Purchases: r.totalPurchases, Paid: r.totalPaid, Outstanding: r.totalOutstanding,
        };
      }
      return r;
    });
    const sheet = XLSX.utils.json_to_sheet(flat);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, 'Report');
    XLSX.writeFile(book, `Zar-E-Fishan-${type}-report.xlsx`);
  };

  const exportPDF = () => {
    if (!result) return toast.error('Generate a report first');
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Zar-E-Fishan Report', 14, 18);
    doc.setFontSize(10);
    doc.text(`${TYPES.find((t) => t.value === type)?.label || type} · ${startDate || 'All'} to ${endDate || 'All'}`, 14, 26);

    const rows = Array.isArray(result.data) ? result.data.slice(0, 40) : [];
    let head = [];
    let body = [];
    if (type === 'finance') {
      head = [['ID', 'Type', 'Category', 'Amount', 'Date']];
      body = rows.map((r) => [r.transactionId, r.type, r.category, String(r.amount), formatDate(r.date)]);
    } else if (type === 'projects') {
      head = [['ID', 'Name', 'Budget', 'Status']];
      body = rows.map((r) => [r.projectId, r.name, String(r.budget), r.status]);
    } else if (type === 'profitLoss') {
      head = [['Type', 'Category', 'Total']];
      body = [
        ...(result.data.incomeItems || []).map((i) => ['Income', i._id.category, String(i.total)]),
        ...(result.data.expenseItems || []).map((i) => ['Expense', i._id.category, String(i.total)]),
      ];
    } else {
      head = [['Name', 'Value']];
      body = rows.map((r) => [r.name || r.poNumber || r.sku || '—', String(r.total || r.totalPurchases || r.quantity || '')]);
    }

    autoTable(doc, { startY: 32, head, body });
    doc.save(`Zar-E-Fishan-${type}-report.pdf`);
  };

  const renderSummary = () => {
    if (!result) return null;
    const s = result.summary || result.data;
    if (type === 'finance' && result.summary) {
      return (
        <div className="stat-grid">
          <StatCard label="Income" value={formatCurrency(result.summary.income)} />
          <StatCard label="Expenses" value={formatCurrency(result.summary.expenses)} />
          <StatCard label="Profit" value={formatCurrency(result.summary.profit)} />
        </div>
      );
    }
    if (type === 'profitLoss' && result.data) {
      return (
        <div className="stat-grid">
          <StatCard label="Income" value={formatCurrency(result.data.income)} />
          <StatCard label="Expenses" value={formatCurrency(result.data.expenses)} />
          <StatCard label="Net Profit" value={formatCurrency(result.data.profit)} />
        </div>
      );
    }
    if (type === 'cashFlow') {
      return (
        <div className="stat-grid">
          <StatCard label="Cash on Hand" value={formatCurrency(result.cashOnHand)} />
          <StatCard label="Bank Balance" value={formatCurrency(result.bankBalance)} />
          <StatCard
            label="Total Liquidity"
            value={formatCurrency((result.cashOnHand || 0) + (result.bankBalance || 0))}
          />
        </div>
      );
    }
    if (type === 'balanceSheet' && result.data) {
      const d = result.data;
      return (
        <div className="stat-grid">
          <StatCard label="Total Assets" value={formatCurrency(d.assets?.total)} />
          <StatCard label="Total Liabilities" value={formatCurrency(d.liabilities?.total)} />
          <StatCard label="Equity" value={formatCurrency(d.equity?.total)} />
        </div>
      );
    }
    if (type === 'inventory' && result.summary) {
      return (
        <div className="stat-grid">
          <StatCard label="Items" value={result.summary.count} />
          <StatCard label="Valuation" value={formatCurrency(result.summary.valuation)} />
          <StatCard label="Low Stock" value={result.summary.lowStockCount} />
        </div>
      );
    }
    if (s && typeof s === 'object' && !Array.isArray(s)) {
      return (
        <div className="stat-grid">
          {Object.entries(s).filter(([, v]) => typeof v === 'number').slice(0, 4).map(([k, v]) => (
            <StatCard key={k} label={k} value={k.toLowerCase().includes('count') ? v : formatCurrency(v)} />
          ))}
        </div>
      );
    }
    return null;
  };

  const tableForType = () => {
    if (!result) return null;
    if (type === 'cashFlow') {
      const rows = (result.data || []).map((r) => ({
        label: `${r._id?.year}-${String(r._id?.month).padStart(2, '0')}`,
        kind: r._id?.type,
        total: r.total,
      }));
      return (
        <DataTable
          columns={[
            { key: 'label', label: 'Period' },
            { key: 'kind', label: 'Type', render: (r) => <StatusBadge status={r.kind} /> },
            { key: 'total', label: 'Total', render: (r) => formatCurrency(r.total) },
          ]}
          rows={rows}
          emptyTitle="No cash flow data"
        />
      );
    }
    if (type === 'balanceSheet' && result.data) {
      const d = result.data;
      const rows = [
        { section: 'Assets', item: 'Cash & Bank', amount: d.assets?.cashBank },
        { section: 'Assets', item: 'Accounts Receivable', amount: d.assets?.accountsReceivable },
        { section: 'Assets', item: 'Inventory', amount: d.assets?.inventory },
        { section: 'Assets', item: 'Total Assets', amount: d.assets?.total, bold: true },
        { section: 'Liabilities', item: 'Accounts Payable', amount: d.liabilities?.accountsPayable },
        { section: 'Liabilities', item: 'Total Liabilities', amount: d.liabilities?.total, bold: true },
        { section: 'Equity', item: 'Owner Equity', amount: d.equity?.total, bold: true },
      ];
      return (
        <DataTable
          columns={[
            { key: 'section', label: 'Section' },
            {
              key: 'item',
              label: 'Item',
              render: (r) => (r.bold ? <strong>{r.item}</strong> : r.item),
            },
            {
              key: 'amount',
              label: 'Amount',
              render: (r) =>
                r.bold ? <strong>{formatCurrency(r.amount)}</strong> : formatCurrency(r.amount),
            },
          ]}
          rows={rows}
          emptyTitle="No balance sheet data"
        />
      );
    }
    if (type === 'profitLoss') {
      const rows = [
        ...(result.data.incomeItems || []).map((i) => ({ ...i, kind: 'income' })),
        ...(result.data.expenseItems || []).map((i) => ({ ...i, kind: 'expense' })),
      ];
      return (
        <DataTable
          columns={[
            { key: 'kind', label: 'Type', render: (r) => <StatusBadge status={r.kind} /> },
            { key: 'cat', label: 'Category', render: (r) => r._id.category },
            { key: 'total', label: 'Total', render: (r) => formatCurrency(r.total) },
          ]}
          rows={rows}
          emptyTitle="No P&L data"
        />
      );
    }
    const data = Array.isArray(result.data) ? result.data : [];
    if (type === 'finance') {
      return (
        <DataTable
          columns={[
            { key: 'transactionId', label: 'ID' },
            { key: 'type', label: 'Type', render: (r) => <StatusBadge status={r.type} /> },
            { key: 'category', label: 'Category' },
            { key: 'amount', label: 'Amount', render: (r) => formatCurrency(r.amount) },
            { key: 'date', label: 'Date', render: (r) => formatDate(r.date) },
          ]}
          rows={data}
          emptyTitle="No transactions"
        />
      );
    }
    if (type === 'projects') {
      return (
        <DataTable
          columns={[
            { key: 'projectId', label: 'ID' },
            { key: 'name', label: 'Name' },
            { key: 'client', label: 'Client', render: (r) => r.client?.name },
            { key: 'budget', label: 'Budget', render: (r) => formatCurrency(r.budget) },
            { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
          ]}
          rows={data}
          emptyTitle="No projects"
        />
      );
    }
    return (
      <DataTable
        columns={[
          { key: 'name', label: 'Name', render: (r) => r.name || r.poNumber || r.sku },
          { key: 'value', label: 'Value', render: (r) => formatCurrency(r.total || r.totalProjectValue || r.totalPurchases || ((r.quantity || 0) * (r.costPrice || 0))) },
        ]}
        rows={data}
        emptyTitle="No data"
      />
    );
  };

  return (
    <div>
      <PageHeader title="Reports" subtitle="Business intelligence with export options"
        actions={
          <div className="toolbar-right">
            <button type="button" className="btn btn-outline" onClick={exportExcel}><FileSpreadsheet size={16} /> Excel</button>
            <button type="button" className="btn btn-outline" onClick={exportPDF}><Download size={16} /> PDF</button>
            <button type="button" className="btn btn-primary" onClick={run}>Generate</button>
          </div>
        }
      />
      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <div className="form-grid">
          <div className="form-group"><label>Report Type</label>
            <select value={type} onChange={(e) => setType(e.target.value)}>
              {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className="form-group"><label>Start Date</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="form-group"><label>End Date</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>
      </div>

      {loading && <LoadingSpinner label="Generating report..." />}
      {!loading && result && (
        <>
          {renderSummary()}
          {result.monthlyChart && (
            <div className="card" style={{ marginBottom: '1.25rem' }}>
              <h3 className="section-title">Monthly Financial Trend</h3>
              <div style={{ width: '100%', height: 280 }}>
                <ResponsiveContainer>
                  <BarChart data={result.monthlyChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e4dcc8" />
                    <XAxis dataKey="label" />
                    <YAxis />
                    <Tooltip formatter={(v) => formatCurrency(v)} />
                    <Legend />
                    <Bar dataKey="revenue" name="Revenue" fill="#3F4932" />
                    <Bar dataKey="expenses" name="Expenses" fill="#C5A675" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
          <div className="card">{tableForType()}</div>
        </>
      )}
    </div>
  );
}
