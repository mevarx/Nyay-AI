// js/upload.js

let selectedFile = null;
let uploadSessionId = null;
let allColumns = [];
let sensitiveColumns = [];

document.addEventListener("DOMContentLoaded", () => {
  const uploadZone = document.getElementById("uploadZone");
  const fileInput = document.getElementById("fileInput");
  const removeFileBtn = document.getElementById("removeFileBtn");

  // Drag and drop events
  uploadZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    uploadZone.classList.add("dragover");
  });

  uploadZone.addEventListener("dragleave", (e) => {
    e.preventDefault();
    uploadZone.classList.remove("dragover");
  });

  uploadZone.addEventListener("drop", (e) => {
    e.preventDefault();
    uploadZone.classList.remove("dragover");
    if (e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  });

  // Click to upload
  uploadZone.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", (e) => {
    if (e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  });

  removeFileBtn.addEventListener("click", () => {
    selectedFile = null;
    document.getElementById("uploadZone").style.display = "block";
    document.getElementById("file-selected").style.display = "none";
    document.getElementById("continueBtn").disabled = true;
    fileInput.value = ""; // Reset input
  });
});

function handleFile(file) {
  const errorBanner = document.getElementById("error-banner");
  errorBanner.style.display = "none";

  // Validate extension
  if (!file.name.endsWith(".csv")) {
    errorBanner.textContent = "Only .csv files are supported.";
    errorBanner.style.display = "block";
    return;
  }

  // Validate size
  const sizeMB = file.size / (1024 * 1024);
  if (sizeMB > CONFIG.MAX_FILE_SIZE_MB) {
    errorBanner.textContent = `File size (${sizeMB.toFixed(1)}MB) exceeds limit of ${CONFIG.MAX_FILE_SIZE_MB}MB.`;
    errorBanner.style.display = "block";
    return;
  }

  selectedFile = file;
  
  // Show selected state
  document.getElementById("uploadZone").style.display = "none";
  document.getElementById("file-selected").style.display = "flex";
  document.getElementById("file-name").textContent = file.name;
  document.getElementById("file-size").textContent = sizeMB < 1 ? '< 1 MB' : `${sizeMB.toFixed(1)} MB`;
  
  document.getElementById("continueBtn").disabled = false;
}

async function goToStep2() {
  const btn = document.getElementById("continueBtn");
  btn.textContent = "Uploading...";
  btn.disabled = true;

  try {
    // Attempt real API call, or fallback to mock data if backend not active
    let response;
    try {
        response = await API.uploadFile(selectedFile);
    } catch (e) {
        console.warn("Backend not available. Using mock response.");
        response = {
            status: "success",
            session_id: "mock_session_123",
            dataset_info: {
                rows: 3,
                columns: 6,
                column_names: ["employee_id", "gender", "department", "caste_category", "performance_score", "promoted"]
            },
            preview: [
                {employee_id: "E001", gender: "Female", department: "IT", caste_category: "General", performance_score: 4.5, promoted: 1},
                {employee_id: "E002", gender: "Male", department: "Sales", caste_category: "OBC", performance_score: 3.8, promoted: 0},
                {employee_id: "E003", gender: "Female", department: "Sales", caste_category: "SC", performance_score: 4.2, promoted: 0}
            ],
            column_classifications: {
                sensitive: ["gender", "caste_category"],
                outcome: "promoted",
                features: ["employee_id", "department", "performance_score"],
                reasoning: {}
            }
        };
    }

    // Normalize response into what the UI needs
    uploadSessionId = response.session_id;
    allColumns = response.dataset_info
        ? response.dataset_info.column_names
        : (response.columns || []);
    sensitiveColumns = response.column_classifications
        ? response.column_classifications.sensitive
        : (response.detected_sensitive || []);

    // Build a normalized data object for the render function
    const normalizedData = {
        columns: allColumns,
        preview_rows: response.preview || [],
        outcome: response.column_classifications
            ? response.column_classifications.outcome
            : null,
        reasoning: response.column_classifications
            ? response.column_classifications.reasoning
            : {}
    };

    renderConfigurePanel(normalizedData);

    // Switch panels
    document.getElementById("step-1-panel").style.display = "none";
    document.getElementById("step-2-panel").style.display = "block";
    document.getElementById("step-indicator-1").classList.remove("active");
    document.getElementById("step-indicator-2").classList.add("active");

  } catch (err) {
    const errorBanner = document.getElementById("error-banner");
    errorBanner.textContent = "Upload failed. Please try again.";
    errorBanner.style.display = "block";
    btn.textContent = "Continue to Configure →";
    btn.disabled = false;
  }
}

function renderConfigurePanel(data) {
  // Render Table Preview using preview_rows (list of objects from backend)
  const tableContainer = document.getElementById("preview-table-container");
  let tableHtml = `<table class="table-preview"><thead><tr>`;
  
  data.columns.forEach(col => {
    tableHtml += `<th>${col}</th>`;
  });
  tableHtml += `</tr></thead><tbody>`;
  
  // preview_rows is an array of objects [{col1: val1, ...}, ...]
  const rows = data.preview_rows || [];
  rows.slice(0, 10).forEach(row => {
    tableHtml += `<tr>`;
    data.columns.forEach(col => {
      const val = row[col] !== null && row[col] !== undefined ? row[col] : "";
      tableHtml += `<td>${val}</td>`;
    });
    tableHtml += `</tr>`;
  });
  tableHtml += `</tbody></table>`;
  tableContainer.innerHTML = tableHtml;

  // Render Sensitive Column Toggles
  renderSensitiveToggles();

  // Render Outcome Dropdown
  const outcomeSelect = document.getElementById("outcome-column-select");
  outcomeSelect.innerHTML = "";
  data.columns.forEach(col => {
    if (!sensitiveColumns.includes(col)) {
        const option = document.createElement("option");
        option.value = col;
        option.textContent = col;
        // Auto-select the outcome detected by the backend, or likely candidates
        if (data.outcome && col === data.outcome) {
            option.selected = true;
        } else if (col.toLowerCase().includes("promote") || col.toLowerCase().includes("status") || col.toLowerCase().includes("loan")) {
            option.selected = true;
        }
        outcomeSelect.appendChild(option);
    }
  });

  updateAddColumnDropdown();
}

function renderSensitiveToggles() {
    const list = document.getElementById("sensitive-columns-list");
    list.innerHTML = "";
    sensitiveColumns.forEach(col => {
        list.innerHTML += `
        <div class="toggle-item" id="toggle-${col}">
            <span>${col}</span>
            <label class="toggle-switch">
                <input type="checkbox" checked onchange="toggleSensitive('${col}', this.checked)">
                <span class="slider"></span>
            </label>
        </div>
        `;
    });
}

function updateAddColumnDropdown() {
    const dropdown = document.getElementById("add-column-dropdown");
    dropdown.innerHTML = "";
    allColumns.forEach(col => {
        if (!sensitiveColumns.includes(col)) {
            const opt = document.createElement("option");
            opt.value = col;
            opt.textContent = col;
            dropdown.appendChild(opt);
        }
    });
}

function toggleSensitive(col, isChecked) {
    if (!isChecked) {
        sensitiveColumns = sensitiveColumns.filter(c => c !== col);
    } else if (!sensitiveColumns.includes(col)) {
        sensitiveColumns.push(col);
    }
    updateAddColumnDropdown();
}

function addColumn() {
    const dropdown = document.getElementById("add-column-dropdown");
    const col = dropdown.value;
    if (col && !sensitiveColumns.includes(col)) {
        sensitiveColumns.push(col);
        renderSensitiveToggles();
        updateAddColumnDropdown();
    }
}

async function runAudit() {
  const btn = document.getElementById("runAuditBtn");
  btn.textContent = "Analyzing... (This may take a minute)";
  btn.disabled = true;
  document.getElementById("step-indicator-2").classList.remove("active");
  document.getElementById("step-indicator-3").classList.add("active");

  const outcomeColumn = document.getElementById("outcome-column-select").value;
  const depth = document.querySelector('input[name="depth"]:checked').value;

  try {
    let response;
    try {
        response = await API.analyzeDataset(uploadSessionId, sensitiveColumns, outcomeColumn, depth);
    } catch (e) {
        console.warn("Backend not available. Using mock audit response.");
        // Simulate waiting
        await new Promise(r => setTimeout(r, 1500));
        response = {
            audit_id: "demo_audit_" + Math.floor(Math.random() * 1000)
        };
    }

    // Redirect to report view
    window.location.href = `report.html?audit_id=${response.audit_id}`;

  } catch (err) {
    console.error(err);
    alert("Audit failed. Please try again.");
    btn.textContent = "🔍 Run Bias Audit";
    btn.disabled = false;
    document.getElementById("step-indicator-3").classList.remove("active");
    document.getElementById("step-indicator-2").classList.add("active");
  }
}
