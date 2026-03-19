// js/gemini.js
// ONE function. ONE call. All narrative generation happens here.
// Always check cache before calling. Never call in a loop.

const Gemini = {

  async generateReportNarrative(auditData) {
    // STEP 1: Check cache first
    const cacheKey = CONFIG.CACHE_KEYS.REPORT_NARRATIVE + auditData.audit_id;
    const cached = Cache.load(cacheKey);
    if (cached) {
      console.log("Gemini: loaded from cache, no API call made");
      return cached;
    }

    // STEP 2: Call the backend endpoint instead of Google directly
    try {
      const narrative = await API.generateNarrative(auditData.audit_id);
      
      // STEP 3: Save to cache
      Cache.save(cacheKey, narrative);
      return narrative;

    } catch (error) {
      console.error("Backend narrative generation failed:", error);
      return {
        executive_summary: "Narrative generation unavailable. Please review the bias scores below.",
        story: "",
        card_explanations: {},
        fix_narratives: {}
      };
    }
  }
};
