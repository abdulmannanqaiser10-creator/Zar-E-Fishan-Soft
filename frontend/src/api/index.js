import api from './axios';

export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  pinLogin: (data) => api.post('/auth/pin-login', data),
  changePin: (data) => api.put('/auth/change-pin', data),
  me: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  changePassword: (data) => api.put('/auth/password', data),
  users: () => api.get('/auth/users'),
  updateUser: (id, data) => api.put(`/auth/users/${id}`, data),
  register: (data) => api.post('/auth/register', data),
};

export const dashboardAPI = {
  get: () => api.get('/dashboard'),
};

export const clientsAPI = {
  list: (params) => api.get('/clients', { params }),
  get: (id) => api.get(`/clients/${id}`),
  create: (data) => api.post('/clients', data),
  update: (id, data) => api.put(`/clients/${id}`, data),
  remove: (id) => api.delete(`/clients/${id}`),
};

export const projectsAPI = {
  list: (params) => api.get('/projects', { params }),
  get: (id) => api.get(`/projects/${id}`),
  create: (data) => api.post('/projects', data),
  update: (id, data) => api.put(`/projects/${id}`, data),
  remove: (id) => api.delete(`/projects/${id}`),
  addTask: (id, data) => api.post(`/projects/${id}/tasks`, data),
  updateTask: (id, taskId, data) => api.put(`/projects/${id}/tasks/${taskId}`, data),
  deleteTask: (id, taskId) => api.delete(`/projects/${id}/tasks/${taskId}`),
};

export const financeAPI = {
  summary: (params) => api.get('/finance/summary', { params }),
  transactions: (params) => api.get('/finance/transactions', { params }),
  createTransaction: (data) => api.post('/finance/transactions', data),
  updateTransaction: (id, data) => api.put(`/finance/transactions/${id}`, data),
  deleteTransaction: (id) => api.delete(`/finance/transactions/${id}`),
  invoices: (params) => api.get('/finance/invoices', { params }),
  getInvoice: (id) => api.get(`/finance/invoices/${id}`),
  createInvoice: (data) => api.post('/finance/invoices', data),
  updateInvoice: (id, data) => api.put(`/finance/invoices/${id}`, data),
  deleteInvoice: (id) => api.delete(`/finance/invoices/${id}`),
  recordPayment: (id, data) => api.post(`/finance/invoices/${id}/payments`, data),
  receivables: () => api.get('/finance/receivables'),
};

export const inventoryAPI = {
  list: (params) => api.get('/inventory/materials', { params }),
  get: (id) => api.get(`/inventory/materials/${id}`),
  create: (data) => api.post('/inventory/materials', data),
  update: (id, data) => api.put(`/inventory/materials/${id}`, data),
  remove: (id) => api.delete(`/inventory/materials/${id}`),
  stockIn: (id, data) => api.post(`/inventory/materials/${id}/stock-in`, data),
  stockOut: (id, data) => api.post(`/inventory/materials/${id}/stock-out`, data),
  movements: (params) => api.get('/inventory/movements', { params }),
  categories: () => api.get('/inventory/categories'),
};

export const vendorsAPI = {
  list: (params) => api.get('/vendors', { params }),
  get: (id) => api.get(`/vendors/${id}`),
  create: (data) => api.post('/vendors', data),
  update: (id, data) => api.put(`/vendors/${id}`, data),
  remove: (id) => api.delete(`/vendors/${id}`),
};

export const procurementAPI = {
  requests: (params) => api.get('/procurement/requests', { params }),
  createRequest: (data) => api.post('/procurement/requests', data),
  updateRequest: (id, data) => api.put(`/procurement/requests/${id}`, data),
  deleteRequest: (id) => api.delete(`/procurement/requests/${id}`),
  orders: (params) => api.get('/procurement/orders', { params }),
  getOrder: (id) => api.get(`/procurement/orders/${id}`),
  createOrder: (data) => api.post('/procurement/orders', data),
  updateOrder: (id, data) => api.put(`/procurement/orders/${id}`, data),
  receiveOrder: (id) => api.post(`/procurement/orders/${id}/receive`),
  payOrder: (id, data) => api.post(`/procurement/orders/${id}/payments`, data),
  payables: () => api.get('/procurement/payables'),
};

export const reportsAPI = {
  projects: (params) => api.get('/reports/projects', { params }),
  clients: (params) => api.get('/reports/clients', { params }),
  finance: (params) => api.get('/reports/finance', { params }),
  profitLoss: (params) => api.get('/reports/profit-loss', { params }),
  inventory: (params) => api.get('/reports/inventory', { params }),
  procurement: (params) => api.get('/reports/procurement', { params }),
  vendors: (params) => api.get('/reports/vendors', { params }),
  invoices: (params) => api.get('/reports/invoices', { params }),
};

export const settingsAPI = {
  get: () => api.get('/settings'),
  update: (data) => api.put('/settings', data),
};

export const erpAPI = {
  accounts: () => api.get('/erp/accounts'),
  createAccount: (d) => api.post('/erp/accounts', d),
  updateAccount: (id, d) => api.put(`/erp/accounts/${id}`, d),
  quotations: (p) => api.get('/erp/quotations', { params: p }),
  createQuotation: (d) => api.post('/erp/quotations', d),
  updateQuotation: (id, d) => api.put(`/erp/quotations/${id}`, d),
  convertQuotation: (id) => api.post(`/erp/quotations/${id}/convert`),
  expenses: (p) => api.get('/erp/expenses', { params: p }),
  createExpense: (d) => api.post('/erp/expenses', d),
  deleteExpense: (id) => api.delete(`/erp/expenses/${id}`),
  ledger: (p) => api.get('/erp/ledger', { params: p }),
  salesReturns: () => api.get('/erp/sales-returns'),
  createSalesReturn: (d) => api.post('/erp/sales-returns', d),
  addFollowUp: (id, d) => api.post(`/erp/clients/${id}/follow-ups`, d),
  addProjectMedia: (id, formData) =>
    api.post(`/erp/projects/${id}/media`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  deleteProjectMedia: (id, mediaId) => api.delete(`/erp/projects/${id}/media/${mediaId}`),
  addProjectExpense: (id, d) => api.post(`/erp/projects/${id}/expenses`, d),
  pendingPayments: () => api.get('/erp/pending-payments'),
  cashFlow: (p) => api.get('/erp/reports/cash-flow', { params: p }),
  balanceSheet: () => api.get('/erp/reports/balance-sheet'),
  blogs: () => api.get('/erp/website/blogs'),
  saveBlog: (d, id) => (id ? api.put(`/erp/website/blogs/${id}`, d) : api.post('/erp/website/blogs', d)),
  deleteBlog: (id) => api.delete(`/erp/website/blogs/${id}`),
  websiteBudgets: () => api.get('/erp/website/budgets'),
  saveWebsiteBudget: (d, id) =>
    id ? api.put(`/erp/website/budgets/${id}`, d) : api.post('/erp/website/budgets', d),
  deleteWebsiteBudget: (id) => api.delete(`/erp/website/budgets/${id}`),
  websiteProjects: () => api.get('/erp/website/projects'),
  saveWebsiteProject: (d, id) =>
    id ? api.put(`/erp/website/projects/${id}`, d) : api.post('/erp/website/projects', d),
  deleteWebsiteProject: (id) => api.delete(`/erp/website/projects/${id}`),
  updateFonts: (d) => api.put('/erp/website/fonts', d),
};
