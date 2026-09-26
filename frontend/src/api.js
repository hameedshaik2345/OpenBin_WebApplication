const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export async function apiFetch(path, { token, method = "GET", body, headers = {}, formData } = {}) {
  const reqHeaders = { ...headers };
  if (token) reqHeaders.Authorization = `Bearer ${token}`;
  if (body && !formData) reqHeaders["Content-Type"] = "application/json";

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: reqHeaders,
    body: formData || (body ? JSON.stringify(body) : undefined),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

export async function syncUser(token, displayName) {
  return apiFetch("/api/auth/sync", {
    token,
    method: "POST",
    body: displayName ? { displayName, fullName: displayName } : undefined,
  });
}

export async function fetchMe(token) {
  return apiFetch("/api/auth/me", { token });
}

export const api = {
  users: (token, q) => apiFetch(`/api/auth/users${q ? `?q=${encodeURIComponent(q)}` : ""}`, { token }),
  updateUserStatus: (token, userId, status) =>
    apiFetch(`/api/auth/users/${userId}/status`, { token, method: "PATCH", body: { status } }),
  updateUserRole: (token, userId, role) =>
    apiFetch(`/api/auth/users/${userId}/role`, { token, method: "PATCH", body: { role } }),

  rvms: (token) => apiFetch("/api/rvms", { token }),
  rvm: (token, id) => apiFetch(`/api/rvms/${id}`, { token }),
  createRvm: (token, body) => apiFetch("/api/rvms", { token, method: "POST", body }),
  updateRvm: (token, id, body) => apiFetch(`/api/rvms/${id}`, { token, method: "PATCH", body }),
  liveState: (token) => apiFetch("/api/rvms/live", { token }),

  setProcessing: (rvmId, body, { token, serial } = {}) =>
    apiFetch(`/api/rvms/${rvmId}/processing`, {
      token,
      method: "POST",
      body,
      headers: serial ? { "X-RVM-Simulator": serial } : {},
    }),

  createDeviceTransaction: (body, { token, serial } = {}) =>
    apiFetch("/api/rvm/transactions", {
      token,
      method: "POST",
      body,
      headers: serial ? { "X-RVM-Simulator": serial } : {},
    }),

  transactions: (token, params = "") =>
    apiFetch(`/api/transactions${params ? `?${params}` : ""}`, { token }),
  claimTransaction: (token, body) =>
    apiFetch("/api/transactions/claim", { token, method: "POST", body }),

  myAccount: (token) => apiFetch("/api/accounts/me", { token }),
  withdraw: (token, body) => apiFetch("/api/accounts/withdraw", { token, method: "POST", body }),
  donate: (token, body) => apiFetch("/api/accounts/donate", { token, method: "POST", body }),
  accounts: (token) => apiFetch("/api/accounts", { token }),
  charity: (token) => apiFetch("/api/accounts/charity", { token }),
  withdrawals: (token) => apiFetch("/api/accounts/withdrawals/all", { token }),
  donations: (token) => apiFetch("/api/accounts/donations/all", { token }),

  materials: (token) => apiFetch("/api/catalog/materials", { token }),
  createMaterial: (token, body) => apiFetch("/api/catalog/materials", { token, method: "POST", body }),
  companies: (token) => apiFetch("/api/catalog/companies", { token }),
  createCompany: (token, body) => apiFetch("/api/catalog/companies", { token, method: "POST", body }),
  brands: (token) => apiFetch("/api/catalog/brands", { token }),
  createBrand: (token, body) => apiFetch("/api/catalog/brands", { token, method: "POST", body }),
  products: (token) => apiFetch("/api/catalog/products", { token }),
  createProduct: (token, body) => apiFetch("/api/catalog/products", { token, method: "POST", body }),
  prices: (token) => apiFetch("/api/catalog/prices", { token }),
  setPrice: (token, body) => apiFetch("/api/catalog/prices", { token, method: "POST", body }),

  collections: (token) => apiFetch("/api/catalog/collections", { token }),
  createCollection: (token, body) => apiFetch("/api/catalog/collections", { token, method: "POST", body }),
  recyclers: (token) => apiFetch("/api/catalog/recyclers", { token }),
  createRecycler: (token, body) => apiFetch("/api/catalog/recyclers", { token, method: "POST", body }),
  receipts: (token) => apiFetch("/api/catalog/receipts", { token }),
  createReceipt: (token, body) => apiFetch("/api/catalog/receipts", { token, method: "POST", body }),
  reconciliations: (token) => apiFetch("/api/catalog/reconciliations", { token }),
  createReconciliation: (token, body) =>
    apiFetch("/api/catalog/reconciliations", { token, method: "POST", body }),
  eprReports: (token) => apiFetch("/api/catalog/epr-reports", { token }),
  createEprReport: (token, body) => apiFetch("/api/catalog/epr-reports", { token, method: "POST", body }),
  audit: (token) => apiFetch("/api/catalog/audit", { token }),

  uploadRvmMedia: (token, rvmId, formData) =>
    apiFetch(`/api/rvms/${rvmId}/media`, { token, method: "POST", formData }),
};
