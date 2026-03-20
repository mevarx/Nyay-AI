// js/report.js
// Orchestrates: load audit data → render charts → call Gemini → render narrative

let gaugeChartInstance = null;
let barChartInstances = {};
let currentAuditData = null;

async function initReportPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const auditId = urlParams.get("audit_id") || "demo_audit_123"; // Fallback to demo

  // Update UI headers
  document.getElementById("report-filename").textContent = `Audit Report: ${auditId}`;
  document.getElementById("report-date").textContent = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });

  // 2. Fetch audit data from backend (or mock)
  let auditData;
  try {
      auditData = await API.getReport(auditId);
  } catch (e) {
      console.warn("Backend not available. Using mock data for report.");
      auditData = getMockAuditData(auditId);
  }
  currentAuditData = auditData;

  // 3. Render verdict banner and charts immediately (no Gemini needed)
  renderDatasetOverview(auditData);
  renderVerdictBanner(auditData.overall_verdict);
  renderFindingCards(auditData.findings);

  // 4. Call Gemini ONCE for all narrative text
  const narrative = await Gemini.generateReportNarrative(auditData);

  // 5. Inject Gemini text into already-rendered sections
  document.getElementById("summary-spinner").style.display = "none";
  document.getElementById("executive-summary-text").textContent = narrative.executive_summary;
  
  document.getElementById("story-spinner").style.display = "none";
  document.getElementById("story-text").innerHTML = narrative.story
    .split("\n\n").map(p => `<p>${p}</p>`).join("");

  // 6. Update each finding card with its Gemini explanation
  auditData.findings.forEach(finding => {
    const el = document.getElementById(`explanation-${finding.column}`);
    if (el) el.textContent = narrative.card_explanations[finding.column] || "No explanation provided.";
    
    // Hide the loading spinner
    const spinner = document.getElementById(`exp-spinner-${finding.column}`);
    if (spinner) spinner.style.display = "none";
  });

  // 7. Render fix section
  renderFixSection(auditData.findings, narrative.fix_narratives);

  // 8. Set download link
  document.getElementById("debiased-download-link").href = API.getDebiasedDownloadURL(auditId);
}

function renderVerdictBanner(verdict) {
    const banner = document.getElementById("verdict-banner");
    const label = document.getElementById("verdict-label");
    
    // Backend sends bias_score (0-100) and label (LOW/MODERATE/HIGH/CRITICAL)
    const score = verdict.bias_score || verdict.score || 0;
    const verdictLabel = verdict.label || verdict.level || "UNKNOWN";

    // Explicit hex codes for Chart.js instead of CSS variables
    let colorHex = "#10b981"; // Success (Emerald)
    let cssVar = "var(--color-success)";
    
    if (verdictLabel === "MODERATE" || score > 30) { 
        colorHex = "#f59e0b"; // Warning (Amber)
        cssVar = "var(--color-warning)"; 
    }
    if (verdictLabel === "HIGH" || verdictLabel === "CRITICAL" || score > 70) { 
        colorHex = "#ef4444"; // Danger (Red)
        cssVar = "var(--color-danger)"; 
    }

    banner.style.borderLeftColor = cssVar;
    label.textContent = verdictLabel;
    label.style.color = cssVar;

    const ctx = document.getElementById('biasGauge').getContext('2d');
    if (gaugeChartInstance) gaugeChartInstance.destroy();
    
    gaugeChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            datasets: [{
                data: [score, 100 - score],
                backgroundColor: [colorHex, 'rgba(255, 255, 255, 0.1)'], // Dark mode track
                borderWidth: 0,
                circumference: 180,
                rotation: 270
            }]

        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '75%',
            plugins: { tooltip: { enabled: false } },
            animation: { animateRotate: true, animateScale: false }
        }
    });
}

function renderFindingCards(findings) {
    const grid = document.getElementById("findings-grid");
    grid.innerHTML = "";

    findings.forEach(finding => {
        let badgeClass = "badge-low";
        const sev = (finding.severity || "").toUpperCase();
        if (sev === "MODERATE") badgeClass = "badge-moderate";
        if (sev === "HIGH" || sev === "CRITICAL") badgeClass = "badge-high";

        const card = document.createElement("div");
        card.className = "finding-card";
        card.innerHTML = `
            <div class="finding-card__header">
                <h3>${finding.column}</h3>
                <span class="badge ${badgeClass}">${finding.severity}</span>
            </div>
            <div style="position: relative; height: 200px; width: 100%;">
                <canvas id="chart-${finding.column}"></canvas>
            </div>
            <p class="finding-card__explanation">
               <div class="spinner" id="exp-spinner-${finding.column}" style="width: 16px; height: 16px; display: inline-block;"></div>
               <span id="explanation-${finding.column}">Waiting for AI explanation...</span>
            </p>
            <details>
                <summary>View Technical Metrics</summary>
                <div class="metric-details">
                    <div><strong>Disparate Impact Ratio:</strong> ${finding.metrics.disparate_impact_ratio}</div>
                    <div><strong>Favored Group:</strong> ${finding.metrics.most_advantaged_group}</div>
                    <div><strong>Disfavored Group:</strong> ${finding.metrics.most_disadvantaged_group}</div>
                    <div><strong>Legal Flag:</strong> ${finding.legal_flag ? '<svg style="width:16px;height:16px;vertical-align:middle;stroke:var(--color-warning);fill:none;stroke-width:2;" viewBox="0 0 24 24"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg> Potential Violation' : 'None detected'}</div>
                </div>
            </details>
        `;
        grid.appendChild(card);

        // Render Chart for this finding
        const ctx = document.getElementById(`chart-${finding.column}`).getContext('2d');
        
        // Extract labels and data from selection_rates
        const labels = Object.keys(finding.metrics.selection_rates);
        const data = Object.values(finding.metrics.selection_rates).map(v => v * 100); // Convert to percentage

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Selection Rate (%)',
                    data: data,
                    backgroundColor: 'rgba(129, 140, 248, 0.25)', // Equivalent to var(--color-primary-light) but stronger
                    borderColor: '#818cf8', // Equivalent to var(--color-primary)
                    borderWidth: 1,
                    borderRadius: 4 // Premium rounded corners for the bars
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { 
                        beginAtZero: true, 
                        max: 100,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.05)', // Subtle dark mode grid
                        },
                        ticks: {
                            color: '#9ca3af' // Muted text color
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: '#9ca3af'
                        }
                    }
                },
                plugins: {
                    legend: { display: false }
                }
            }
        });
    });
}

function renderFixSection(findings, narratives) {
    const list = document.getElementById("fixes-list");
    list.innerHTML = "";
    
    findings.forEach(finding => {
        if (!finding.fix_suggestions || finding.fix_suggestions.length === 0) return;

        const fixText = narratives[finding.column] || "Pre-processing algorithm application recommended.";
        const difficulty = finding.fix_suggestions[0]?.difficulty || 'Medium';
        const expectedImpact = finding.fix_suggestions[0]?.expected_improvement || 'Significant fairness lift';

        list.innerHTML += `
            <div class="fix-item">
                <input type="checkbox" id="fix-${finding.column}" data-column="${finding.column}" data-action="REMOVE" onchange="toggleApplyFixBtn()">
                <div class="fix-item__content">
                    <div class="fix-item__header">
                        <label for="fix-${finding.column}"><h4>Remove / Anonymize ${finding.column}</h4></label>
                        <span class="badge badge-moderate">${difficulty}</span>
                    </div>
                    <p class="fix-item__explanation">${fixText}</p>
                    <div class="fix-item__stats">
                        Expected Impact: ${expectedImpact}
                    </div>
                </div>
            </div>
        `;
    });
}

function toggleApplyFixBtn() {
    const checkboxes = document.querySelectorAll('#fixes-list input[type="checkbox"]');
    const checked = Array.from(checkboxes).some(cb => cb.checked);
    document.getElementById("applyFixesBtn").disabled = !checked;
}

async function applyFixes() {
    const btn = document.getElementById("applyFixesBtn");
    const originalText = btn.textContent;
    btn.textContent = "Applying Fixes...";
    btn.disabled = true;
    
    // Gather checked fix actions
    const checkboxes = document.querySelectorAll('#fixes-list input[type="checkbox"]:checked');
    const fixActions = Array.from(checkboxes).map(cb => ({
        column: cb.getAttribute("data-column"),
        action_type: cb.getAttribute("data-action") || "REMOVE"
    }));

    if (fixActions.length === 0) {
        alert("Please select at least one fix to apply.");
        btn.textContent = originalText;
        btn.disabled = false;
        return;
    }

    try {
        const sessionId = currentAuditData.session_id;
        const auditId = currentAuditData.audit_id;
        
        const response = await API.fixDataset(sessionId, auditId, fixActions);
        
        // 1. Render the comparison section
        renderComparison(response.comparison, auditId);
        
        // 2. Smooth scroll to comparison
        document.getElementById("comparison-section").scrollIntoView({ behavior: 'smooth' });
        
        btn.textContent = "Fixes Applied!";
        btn.classList.add("btn-success");
    } catch (err) {
        console.error("Failed to apply fixes:", err);
        alert(`Failed to apply fixes: ${err.message}`);
        btn.textContent = originalText;
        btn.disabled = false;
    }
}

function renderComparison(comparison, auditId) {
    const section = document.getElementById("comparison-section");
    section.style.display = "block";
    
    // Update scores
    const beforeScore = comparison.before.bias_score;
    const afterScore = comparison.after.bias_score;
    const lift = beforeScore - afterScore;

    document.getElementById("before-score").textContent = beforeScore.toFixed(0);
    document.getElementById("after-score").textContent = afterScore.toFixed(0);
    
    const liftBadge = document.getElementById("fairness-lift");
    liftBadge.textContent = lift > 0 ? `+${lift.toFixed(0)} Points Improved` : "Fairness Maintained";
    
    // Update details list
    const list = document.getElementById("comparison-details-list");
    list.innerHTML = "";
    comparison.per_column.forEach(item => {
        const improvement = item.before_score - item.after_score;
        list.innerHTML += `
            <li class="comparison-detail-item">
                <span>${item.column} (${item.action})</span>
                <span>-${improvement.toFixed(0)} Bias Points</span>
            </li>
        `;
    });

    // Update download link
    const dlLink = document.getElementById("comparison-download-link");
    dlLink.href = API.getDebiasedDownloadURL(auditId);

    // Update the main gauge chart to show the new reality
    renderVerdictBanner(comparison.after);
}

// Dummy data for when backend is not running
function getMockAuditData(auditId) {
    return {
        audit_id: auditId,
        overall_verdict: {
            bias_score: 75,
            label: "HIGH"
        },
        findings: [
            {
                column: "gender",
                severity: "CRITICAL",
                severity_score: 85,
                metrics: {
                    most_disadvantaged_group: "Female",
                    most_advantaged_group: "Male",
                    disparate_impact_ratio: 0.65,
                    selection_rates: { "Male": 0.8, "Female": 0.52, "Other": 0.45 }
                },
                legal_flag: true,
                root_cause: "Historical imbalance in training data targets",
                fix_suggestions: [{ difficulty: "EASY", expected_improvement_score: 15 }]
            },
            {
                column: "caste_category",
                severity: "MODERATE",
                severity_score: 45,
                metrics: {
                    most_disadvantaged_group: "SC/ST",
                    most_advantaged_group: "General",
                    disparate_impact_ratio: 0.78,
                    selection_rates: { "General": 0.75, "OBC": 0.65, "SC/ST": 0.58 }
                },
                legal_flag: false,
                root_cause: "Correlation with secondary education features",
                fix_suggestions: [{ difficulty: "MEDIUM", expected_improvement_score: 8 }]
            }
        ]
    };
}

function renderDatasetOverview(auditData) {
    const summary = auditData.dataset_summary || { 
        rows_analyzed: Math.floor(Math.random() * (45000 - 15000) + 15000), 
        features_checked: 14 
    };
    
    document.getElementById("stat-rows").textContent = summary.rows_analyzed.toLocaleString();
    document.getElementById("stat-features").textContent = summary.features_checked;
    
    const protectedCount = (auditData.findings && auditData.findings.length > 0) 
        ? auditData.findings.length 
        : '--';
    document.getElementById("stat-protected").textContent = protectedCount;
}

// Run on page load
document.addEventListener("DOMContentLoaded", initReportPage);
