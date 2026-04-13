export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_URL || "http://localhost:3000",
} as const;

export const API_ENDPOINTS = {
  // Root endpoint
  ROOT: "/",

  // User endpoints
  USERS: {
    BASE: "/User",
    CREATE: "/User",
    GET_BY_ID: "/User/getUserById",
    GET_LIST: "/User/getUserList",
    UPDATE: "/User/update",
    UPDATE_PROFILE: "/User/profile",
    UPLOAD_PROFILE_IMAGE: "/User/upload-profile-image",
    DELETE: (id: string) => `/User/${id}`,
  },

  // Authentication endpoints
  AUTH: {
    LOGIN: "/auth/login",
    REGISTER: "/auth/register",
  },

  // CSRF protection endpoint
  CSRF: {
    TOKEN: "/csrf/token",
  },

  // Items endpoints
  ITEMS: {
    BASE: "/items",
    GET_ALL: "/items/all",
    GET_BY_ID: (id: string) => `/items/${id}`,
    UPDATE: (id: string) => `/items/${id}`,
    DELETE: (id: string) => `/items/${id}`,
    GET_BY_NAME: (name: string) => `/items/name/${name}`,
    GET_SUB_ITEMS: (id: string) => `/items/${id}/sub-items`,
  },

  // Stocks endpoints
  STOCKS: {
    BASE: "/stocks",
    GET_ALL: "/stocks/all",
    GET_LOW: "/stocks/low",
    GET_BY_ID: (id: string) => `/stocks/${id}`,
    UPDATE: (id: string) => `/stocks/${id}`,
    DELETE: (id: string) => `/stocks/${id}`,
    GET_BY_ITEM_ID: (itemId: string) => `/stocks/item/${itemId}`,
  },

  // Customers endpoints
  CUSTOMERS: {
    BASE: "/customers",
    CREATE: "/customers",
    GET_ALL: "/customers",
    GET_ALL_NO_PAGINATION: "/customers/all",
    GET_WITH_DEBTS: "/customers/with-debts",
    GET_DELETED: "/customers/deleted",
    GET_BY_ID: (id: string) => `/customers/${id}`,
    UPDATE: (id: string) => `/customers/${id}`,
    DELETE: (id: string) => `/customers/${id}`,
    RESTORE: (id: string) => `/customers/${id}/restore`,
    GET_BY_EMAIL: (email: string) => `/customers/email/${email}`,
    GET_BY_PHONE: (phone: string) => `/customers/phone/${phone}`,
  },

  // Transactions endpoints
  TRANSACTIONS: {
    BASE: "/transactions",
    GET_ALL: "/transactions/all",
    GET_SALES_REPORT: "/transactions/reports/sales",
    GET_PURCHASES_REPORT: "/transactions/reports/purchases",
    GET_BY_CUSTOMER: (customerId: string) =>
      `/transactions/customer/${customerId}`,
    GET_BY_SUPPLIER: (supplierId: string) =>
      `/transactions/supplier/${supplierId}`,
    GET_BY_ID: (id: string) => `/transactions/${id}`,
    UPDATE: (id: string) => `/transactions/${id}`,
    DELETE: (id: string) => `/transactions/${id}`,
  },

  // Suppliers endpoints
  SUPPLIERS: {
    BASE: "/suppliers",
    CREATE: "/suppliers",
    GET_ALL: "/suppliers",
    GET_ALL_NO_PAGINATION: "/suppliers/all",
    GET_WITH_DEBTS: "/suppliers/with-debts",
    GET_DELETED: "/suppliers/deleted",
    GET_BY_EMAIL: (email: string) => `/suppliers/email/${email}`,
    GET_BY_PHONE: (phone: string) => `/suppliers/phone/${phone}`,
    GET_BY_ID: (id: string) => `/suppliers/${id}`,
    UPDATE: (id: string) => `/suppliers/${id}`,
    DELETE: (id: string) => `/suppliers/${id}`,
    RESTORE: (id: string) => `/suppliers/${id}/restore`,
  },

  // Supplier Debts endpoints
  SUPPLIER_DEBTS: {
    BASE: "/supplier-debts",
    GET_ALL: "/supplier-debts/all",
    GET_OVERDUE: "/supplier-debts/overdue",
    GET_BY_SUPPLIER: (supplierId: string) =>
      `/supplier-debts/supplier/${supplierId}`,
    GET_BY_SUPPLIER_NAME: (supplierName: string) =>
      `/supplier-debts/supplier/${supplierName}`,
    GET_BY_TRANSACTION: (transactionId: string) =>
      `/supplier-debts/transaction/${transactionId}`,
    GET_BY_ID: (id: string) => `/supplier-debts/${id}`,
    UPDATE: (id: string) => `/supplier-debts/${id}`,
    DELETE: (id: string) => `/supplier-debts/${id}`,
    SETTLE: (id: string) => `/supplier-debts/${id}/settle`,
    MARK_ALERT_SENT: (id: string) => `/supplier-debts/${id}/alert-sent`,
  },

  // Debts endpoints (Customer Debts)
  DEBTS: {
    BASE: "/debts",
    GET_ALL: "/debts/all",
    GET_OVERDUE: "/debts/overdue",
    GET_BY_CUSTOMER: (customerId: string) => `/debts/customer/${customerId}`,
    GET_BY_CUSTOMER_NAME: (customerName: string) =>
      `/debts/customer-name/${customerName}`,
    GET_BY_TRANSACTION: (transactionId: string) =>
      `/debts/transaction/${transactionId}`,
    GET_BY_ID: (id: string) => `/debts/${id}`,
    UPDATE: (id: string) => `/debts/${id}`,
    DELETE: (id: string) => `/debts/${id}`,
    SETTLE: (id: string) => `/debts/${id}/settle`,
    MARK_ALERT_SENT: (id: string) => `/debts/${id}/mark-alert-sent`,
    GET_PURCHASE_DEBTS: "/debts/by-type/purchase-debts",
    GET_CREDIT_BALANCES: "/debts/by-type/credit-balances",
    GET_EXCHANGE_DEBTS: "/debts/by-type/exchange-debts",
    GET_REFUND_ADJUSTMENTS: "/debts/by-type/refund-adjustments",
    GET_SUMMARY_BY_CUSTOMER: (customerId: string) =>
      `/debts/summary/by-customer/${customerId}`,
  },

  // Debt Alerts endpoints
  DEBT_ALERTS: {
    BASE: "/debt-alerts",
    GET_ALL: "/debt-alerts/all",
    GET_ACTIVE: "/debt-alerts/active",
    GET_BY_TYPE: (type: string) => `/debt-alerts/type/${type}`,
    GET_BY_ALERT_TYPE: (alertType: string) =>
      `/debt-alerts/alert-type/${alertType}`,
    MARK_READ: (id: string) => `/debt-alerts/${id}/mark-read`,
    MARK_ALL_READ: "/debt-alerts/mark-all-read",
    GET_COUNTERS: "/debt-alerts/counters",
  },
} as const;

// HTTP Methods constants
export const HTTP_METHODS = {
  GET: "GET",
  POST: "POST",
  PUT: "PUT",
  DELETE: "DELETE",
  PATCH: "PATCH",
} as const;

// Export types for better TypeScript support
export type ApiEndpoint = typeof API_ENDPOINTS;
export type HttpMethod = (typeof HTTP_METHODS)[keyof typeof HTTP_METHODS];
