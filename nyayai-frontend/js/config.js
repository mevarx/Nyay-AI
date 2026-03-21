// js/config.js
// All configuration constants. Change values here only, never in other files.

const CONFIG = {
  // Backend API
  API_BASE_URL: "https://nyayai-backend.leapcell.app",  // Change to Railway URL before submission

  // React Auth UI (change to production URL before deployment)
  AUTH_LOGIN_URL: "https://nyayai-0906.web.app/login.html",
  AUTH_SIGNUP_URL: "https://nyayai-0906.web.app/signup.html",

  // Supabase Auth
  SUPABASE_URL: "https://nghutgwnwqcokguznjjd.supabase.co",        // e.g. https://xxxxx.supabase.co
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5naHV0Z3dud3Fjb2tndXpuampkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMDQ4MzgsImV4cCI6MjA4OTU4MDgzOH0.Ll1H4GcuO7LQ6CaDOWu3GyDBanq1v6WyHRltFJG4pA0",

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
