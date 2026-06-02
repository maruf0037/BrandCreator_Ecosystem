import { api } from './api';

export const commissionApi = {
  // Admin Commission Rate Management
  getCommissionRates: () => api.get('/api/admin/commission/rates'),
  setCommissionRate: (payload) => api.post('/api/admin/commission/rates', payload),
  deactivateCommissionRate: (rateId) => api.delete(`/api/admin/commission/rates/${rateId}`),

  // Admin Global Default Commission
  getGlobalDefault: () => api.get('/api/admin/commission/global-default'),
  updateGlobalDefault: (commissionRate) => api.put('/api/admin/commission/global-default', { commissionRate }),

  // Admin Commission Ledger
  getCommissionLedger: (params = {}) => {
    const cleanParams = {};
    Object.keys(params).forEach(k => {
      if (params[k] !== undefined && params[k] !== null && params[k] !== '') {
        cleanParams[k] = params[k];
      }
    });
    const query = new URLSearchParams(cleanParams).toString();
    return api.get(`/api/admin/commission/ledger?${query}`);
  },
  markCommissionPaid: (entryId) => api.post(`/api/admin/commission/ledger/${entryId}/mark-paid`),
  updateSupplierTrustAndHold: (userId, payload) => api.put(`/api/admin/supplier/${userId}/trust`, payload),

  // Supplier Commission Summary
  getSupplierCommissionSummary: () => api.get('/api/supplier/commission/summary'),

  // Admin Revenue Analytics
  getRevenueSummary: () => api.get('/api/admin/revenue/summary'),
  getRevenueByProduct: (ownershipType) => {
    const query = ownershipType ? `?ownershipType=${ownershipType}` : '';
    return api.get(`/api/admin/revenue/by-product${query}`);
  },
  getRevenueBySupplier: () => api.get('/api/admin/revenue/by-supplier'),
  getRevenueTimeline: (period = 'daily', days = 30) => api.get(`/api/admin/revenue/timeline?period=${period}&days=${days}`),
  getCampaignRoiStats: () => api.get('/api/admin/revenue/campaign-roi'),
};

