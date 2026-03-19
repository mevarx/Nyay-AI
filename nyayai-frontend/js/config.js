// js/config.js
// All configuration constants. Change values here only, never in other files.

const CONFIG = {
  // Backend API
  API_BASE_URL: "http://localhost:5000",  // Change to Railway URL before submission

  // Gemini API Note: Key is now securely stored in backend .env
  GEMINI_MODEL: "gemini-1.5-flash",
  GEMINI_MAX_TOKENS: 2048,

  // Upload limits
  MAX_FILE_SIZE_MB: 50,
  ACCEPTED_FILE_TYPES: [".csv"],

  // Cache keys
  CACHE_KEYS: {
    UPLOAD_RESULT: "nyayai_upload_",      // append session_id
    REPORT_NARRATIVE: "nyayai_narrative_", // append audit_id
    LAST_AUDIT_ID: "nyayai_last_audit"
  }
};
