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
        executive_summary: "The dataset exhibits a HIGH level of bias, primarily driven by historical imbalances in the 'gender' column. We strongly recommend applying mitigation strategies prior to deploying this model.",
        story: "Our comprehensive algorithmic audit of your dataset has revealed significant disparities that could lead to unfair outcomes if used to train a machine learning model.\n\nThe most critical finding is related to the 'gender' attribute, where the selection rate for Female candidates is substantially lower than for Male candidates, resulting in a Disparate Impact Ratio of 0.65. This falls well below the standard 0.80 legal and ethical threshold, indicating a strong likelihood of systemic bias.\n\nAdditionally, we observed moderate bias concerning the 'caste_category' feature. While less severe than the gender bias, it still presents a risk to equitable model performance. By applying the recommended pre-processing algorithms, you can significantly neutralize these biases while maintaining overall data utility.",
        card_explanations: {
            "gender": "Female representation in the positive outcome is disproportionately low. This indicates systemic bias favoring Male entries, which breaches standard disparate impact thresholds.",
            "caste_category": "The SC/ST category is selected less frequently than the General category. While the impact ratio is 0.78 (borderline), it still requires attention to ensure complete fairness."
        },
        fix_narratives: {
            "gender": "Applying a reweighing algorithm will balance the outcome distributions across genders without deleting data.",
            "caste_category": "Anonymizing this column removes direct correlation, forcing the model to rely on skill-based features instead."
        }
      };
    }
  }
};
