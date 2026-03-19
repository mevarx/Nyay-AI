// js/api.js
// All fetch() calls to the Flask backend. One function per endpoint.
// Never write fetch() calls in other JS files — always use these functions.

const API = {

  // Helper — gets Supabase session token and builds auth headers
  async _getAuthHeaders(includeContentType = true) {
    let token = null;
    if (typeof getSessionToken === 'function') {
      token = await getSessionToken();
    }
    const headers = {};
    if (includeContentType) headers["Content-Type"] = "application/json";
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return headers;
  },

  async _fetchJSON(endpoint, options = {}) {
    const response = await fetch(`${CONFIG.API_BASE_URL}${endpoint}`, options);
    const text = await response.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch(e) {
      throw new Error(`Server returned non-JSON response: ${response.status}`);
    }
    if (!response.ok || json.status === "error") {
      throw new Error(json.message || `HTTP error ${response.status}`);
    }
    return json;
  },

  async uploadFile(file) {
    const headers = await this._getAuthHeaders(false); // No Content-Type for FormData
    const formData = new FormData();
    formData.append("file", file);
    return this._fetchJSON("/upload", {
      method: "POST",
      headers,
      body: formData
    });
  },

  async analyzeDataset(sessionId, sensitiveColumns, outcomeColumn, depth = "full", fileName = "dataset.csv") {
    const headers = await this._getAuthHeaders();
    return this._fetchJSON("/analyze", {
      method: "POST",
      headers,
      body: JSON.stringify({
        session_id: sessionId,
        sensitive_columns: sensitiveColumns,
        outcome_column: outcomeColumn,
        analysis_depth: depth,
        file_name: fileName
      })
    });
  },

  async fixDataset(sessionId, auditId, fixActions) {
    const headers = await this._getAuthHeaders();
    return this._fetchJSON("/fix", {
      method: "POST",
      headers,
      body: JSON.stringify({
        session_id: sessionId,
        audit_id: auditId,
        fix_actions: fixActions
      })
    });
  },

  async getReport(auditId) {
    const headers = await this._getAuthHeaders();
    return this._fetchJSON(`/report/${auditId}`, { headers });
  },

  getDebiasedDownloadURL(auditId) {
    return `${CONFIG.API_BASE_URL}/report/${auditId}/download/debiased`;
  },

  async generateNarrative(auditId) {
    const headers = await this._getAuthHeaders();
    return this._fetchJSON(`/report/${auditId}/narrative`, {
      method: "POST",
      headers
    });
  },

  // New — fetch user's audit history
  async getHistory() {
    const headers = await this._getAuthHeaders();
    return this._fetchJSON("/history", { headers });
  }
};
