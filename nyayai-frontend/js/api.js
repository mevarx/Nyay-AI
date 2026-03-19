// js/api.js
// All fetch() calls to the Flask backend. One function per endpoint.
// Never write fetch() calls in other JS files — always use these functions.

const API = {

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
    const formData = new FormData();
    formData.append("file", file);
    return this._fetchJSON("/upload", {
      method: "POST",
      body: formData
    });
  },

  async analyzeDataset(sessionId, sensitiveColumns, outcomeColumn, depth = "full") {
    return this._fetchJSON("/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: sessionId,
        sensitive_columns: sensitiveColumns,
        outcome_column: outcomeColumn,
        analysis_depth: depth
      })
    });
  },

  async fixDataset(sessionId, auditId, fixActions) {
    return this._fetchJSON("/fix", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: sessionId,
        audit_id: auditId,
        fix_actions: fixActions
      })
    });
  },

  async getReport(auditId) {
    return this._fetchJSON(`/report/${auditId}`);
  },

  getDebiasedDownloadURL(auditId) {
    return `${CONFIG.API_BASE_URL}/report/${auditId}/download/debiased`;
  },

  async generateNarrative(auditId) {
    return this._fetchJSON(`/report/${auditId}/narrative`, {
      method: "POST"
    });
  }
};
