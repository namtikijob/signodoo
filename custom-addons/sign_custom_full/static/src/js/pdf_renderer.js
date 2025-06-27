pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

let pdfDocument = null;
let currentContainer = null;
let fieldLayer = null;
let activeField = null;

function renderPDF() {
    if (!pdfDocument || !currentContainer) return;

    currentContainer.innerHTML = '';
    currentContainer.style.display = 'block';
    currentContainer.style.minHeight = '100vh';
    currentContainer.style.marginLeft = '250px';

    const viewportWidth = window.innerWidth - 250;
    const viewportHeight = window.innerHeight - 50;
    const availableWidth = viewportWidth - 40;
    const availableHeight = viewportHeight - 40;

    for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
        pdfDocument.getPage(pageNum).then(function (page) {
            const originalViewport = page.getViewport({ scale: 1 });
            const pageWidth = originalViewport.width;
            const pageHeight = originalViewport.height;

            const scaleByWidth = availableWidth / pageWidth;
            const scaleByHeight = availableHeight / pageHeight;
            const scale = Math.min(scaleByWidth, scaleByHeight);
            const viewport = page.getViewport({ scale });

            const pageWrapper = document.createElement("div");
            pageWrapper.className = "page-wrapper";
            pageWrapper.style.width = viewportWidth + "px";
            pageWrapper.style.minHeight = viewportHeight + "px";
            pageWrapper.style.position = "relative";
            pageWrapper.style.backgroundColor = "#f5f5f5";
            pageWrapper.setAttribute("data-page", pageNum);

            const pdfContainer = document.createElement("div");
            pdfContainer.style.position = "relative";
            pdfContainer.style.display = "inline-block";

            const canvas = document.createElement("canvas");
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            canvas.style.display = "block";
            canvas.style.boxShadow = "0 4px 20px rgba(0,0,0,0.15)";
            canvas.style.backgroundColor = "white";

            const pageFieldLayer = document.createElement("div");
            pageFieldLayer.className = "field-layer";
            pageFieldLayer.style.position = "absolute";
            pageFieldLayer.style.top = "0";
            pageFieldLayer.style.left = "0";
            pageFieldLayer.style.width = viewport.width + "px";
            pageFieldLayer.style.height = viewport.height + "px";
            pageFieldLayer.style.pointerEvents = "auto";
            pageFieldLayer.setAttribute("data-page", pageNum);

            const pageIndicator = document.createElement("div");
            pageIndicator.textContent = `${pageNum} / ${pdfDocument.numPages}`;
            pageIndicator.style.position = "absolute";
            pageIndicator.style.bottom = "20px";
            pageIndicator.style.left = "50%";
            pageIndicator.style.transform = "translateX(-50%)";
            pageIndicator.style.backgroundColor = "rgba(0,0,0,0.7)";
            pageIndicator.style.color = "white";
            pageIndicator.style.padding = "8px 16px";
            pageIndicator.style.borderRadius = "20px";
            pageIndicator.style.fontSize = "14px";
            pageIndicator.style.zIndex = "10";

            const ctx = canvas.getContext("2d");
            page.render({ canvasContext: ctx, viewport: viewport });

            pdfContainer.appendChild(canvas);
            pdfContainer.appendChild(pageFieldLayer);
            pageWrapper.appendChild(pdfContainer);
            pageWrapper.appendChild(pageIndicator);
            currentContainer.appendChild(pageWrapper);

            if (pageNum === 1 && !fieldLayer) {
                fieldLayer = pageFieldLayer;
            }
        });
    }

    setupDragAndDrop();
}

function setupDragAndDrop() {
    const fields = document.querySelectorAll('.draggable-field');
    fields.forEach(field => {
        field.addEventListener('dragstart', function(e) {
            e.dataTransfer.setData('text/plain', this.getAttribute('data-type'));
        });
    });

    currentContainer.addEventListener('dragover', function(e) {
        e.preventDefault();
    });

    currentContainer.addEventListener('drop', function(e) {
        e.preventDefault();
        const type = e.dataTransfer.getData('text/plain');
        const pageNum = parseInt(document.querySelector('.page-wrapper')?.getAttribute('data-page')) || 1;
        const targetFieldLayer = document.querySelector(`.field-layer[data-page="${pageNum}"]`);
        if (targetFieldLayer) {
            const rect = targetFieldLayer.getBoundingClientRect();
            const x = e.clientX - rect.left - 75;
            const y = e.clientY - rect.top - 20;
            addFieldFromDrag(type, pageNum, x, y, targetFieldLayer);
        }
    });
}

function addFieldFromDrag(type, pageNum, x, y, targetFieldLayer) {
    const field = document.createElement("div");
    field.className = "field-box";
    field.textContent = type.toUpperCase();
    field.style.position = "absolute";
    field.style.top = y + "px";
    field.style.left = x + "px";
    field.style.backgroundColor = "#ffc";
    field.style.border = "2px dashed #333";
    field.style.padding = "6px 12px";
    field.style.cursor = "move";
    field.style.fontSize = "12px";
    field.style.fontWeight = "bold";
    field.style.borderRadius = "4px";
    field.style.pointerEvents = "auto";
    field.style.userSelect = "none";
    field.style.zIndex = "100";
    field.style.width = "150px";
    field.style.height = "40px";
    field.setAttribute("data-type", type);
    field.setAttribute("data-role-id", "customer"); // Vai trò mặc định
    field.setAttribute("data-page", pageNum);

    const deleteBtn = document.createElement("span");
    deleteBtn.textContent = "×";
    deleteBtn.className = "delete-field-btn";
    deleteBtn.style.position = "absolute";
    deleteBtn.style.top = "-8px";
    deleteBtn.style.right = "-8px";
    deleteBtn.style.backgroundColor = "red";
    deleteBtn.style.color = "white";
    deleteBtn.style.borderRadius = "50%";
    deleteBtn.style.width = "16px";
    deleteBtn.style.height = "16px";
    deleteBtn.style.display = "flex";
    deleteBtn.style.alignItems = "center";
    deleteBtn.style.justifyContent = "center";
    deleteBtn.style.fontSize = "12px";
    deleteBtn.style.cursor = "pointer";
    deleteBtn.onclick = (e) => {
        e.stopPropagation();
        if (confirm("Are you sure you want to delete this field?")) {
            field.remove();
            saveFieldToBackend(field, true);
        }
    };

    const resizeHandle = document.createElement("div");
    resizeHandle.className = "resize-handle";

    field.appendChild(deleteBtn);
    field.appendChild(resizeHandle);

    makeDraggable(field);
    makeResizable(field, resizeHandle);
    targetFieldLayer.appendChild(field);

    setActiveField(field);
    showEditPopup(field); // Hiển thị popup ngay sau khi thả
}

function setActiveField(field) {
    if (activeField) {
        activeField.classList.remove("active");
    }
    activeField = field;
    if (field) {
        field.classList.add("active");
    }
}

function makeDraggable(el) {
    let isDragging = false;
    let startX, startY, startLeft, startTop;

    el.onmousedown = function(e) {
        if (e.target.classList.contains('resize-handle') || e.target.classList.contains('delete-field-btn')) {
            return;
        }

        e.preventDefault();
        e.stopPropagation();

        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        startLeft = parseInt(el.style.left) || 0;
        startTop = parseInt(el.style.top) || 0;

        setActiveField(el);

        function moveAt(e) {
            if (!isDragging) return;
            
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            
            const newLeft = startLeft + dx;
            const newTop = startTop + dy;

            const parentRect = el.parentElement.getBoundingClientRect();
            const maxX = parentRect.width - el.offsetWidth;
            const maxY = parentRect.height - el.offsetHeight;

            el.style.left = Math.max(0, Math.min(maxX, newLeft)) + 'px';
            el.style.top = Math.max(0, Math.min(maxY, newTop)) + 'px';
        }

        document.addEventListener('mousemove', moveAt);

        document.onmouseup = function() {
            isDragging = false;
            document.removeEventListener('mousemove', moveAt);
            document.onmouseup = null;
            
            saveFieldToBackend(el);
        };
    };

    el.onclick = function(e) {
        if (e.target.classList.contains('resize-handle') || e.target.classList.contains('delete-field-btn')) {
            return;
        }
        e.stopPropagation();
        setActiveField(el);
        showEditPopup(el); // Hiển thị popup khi click
    };
}

function makeResizable(field, handle) {
    let isResizing = false;
    let startX, startY, startWidth, startHeight;

    handle.onmousedown = function(e) {
        e.preventDefault();
        e.stopPropagation();

        isResizing = true;
        startX = e.clientX;
        startY = e.clientY;
        startWidth = parseInt(field.style.width, 10);
        startHeight = parseInt(field.style.height, 10);

        setActiveField(field);

        function doResize(e) {
            if (!isResizing) return;
            
            const width = startWidth + (e.clientX - startX);
            const height = startHeight + (e.clientY - startY);
            
            const minWidth = 50;
            const minHeight = 30;
            
            field.style.width = Math.max(minWidth, width) + 'px';
            field.style.height = Math.max(minHeight, height) + 'px';
        }

        document.addEventListener('mousemove', doResize);

        document.onmouseup = function() {
            isResizing = false;
            document.removeEventListener('mousemove', doResize);
            document.onmouseup = null;
            
            saveFieldToBackend(field);
        };
    };
}

function showEditPopup(field) {
    let popup = document.getElementById("field-edit-popup");
    if (!popup) {
        popup = document.createElement("div");
        popup.id = "field-edit-popup";
        popup.innerHTML = `
            <div>
                <h3>Edit Field <span class="close-popup">×</span></h3>
                <hr>
                <label>Field Type</label>
                <input type="text" id="field-type-edit" readonly>
                <label>Field Name</label>
                <input type="text" id="field-name">
                <label>Filled By</label>
                <select id="field-filled-by">
                    <option value="customer">Customer</option>
                    <option value="signer1">Signer 1</option>
                    <option value="signer2">Signer 2</option>
                    <option value="witness">Witness</option>
                </select>
                <label><input type="checkbox" id="field-required"> Required</label>
                <label>Placeholder</label>
                <input type="text" id="field-placeholder">
                <div class="form-footer">
                    <button class="save-btn">Save</button>
                    <button class="delete-btn">Delete</button>
                    <button class="cancel-btn">Cancel</button>
                </div>
            </div>
        `;
        document.body.appendChild(popup);

        popup.querySelector('.close-popup').onclick = () => popup.remove();
        popup.querySelector('.cancel-btn').onclick = () => popup.remove();
        popup.querySelector('.delete-btn').onclick = function() {
            if (confirm("Are you sure you want to delete this field?")) {
                field.remove();
                saveFieldToBackend(field, true);
                popup.remove();
            }
        };
        popup.querySelector('.save-btn').onclick = function() {
            field.setAttribute("data-name", document.getElementById("field-name").value);
            field.setAttribute("data-role-id", document.getElementById("field-filled-by").value);
            field.setAttribute("data-required", document.getElementById("field-required").checked);
            field.setAttribute("data-placeholder", document.getElementById("field-placeholder").value);
            
            if (field.getAttribute("data-name")) {
                field.textContent = field.getAttribute("data-name");
            }
            
            saveFieldToBackend(field);
            popup.remove();
        };
    }

    document.getElementById("field-type-edit").value = field.getAttribute("data-type");
    document.getElementById("field-name").value = field.getAttribute("data-name") || "";
    document.getElementById("field-filled-by").value = field.getAttribute("data-role-id") || "customer";
    document.getElementById("field-required").checked = field.getAttribute("data-required") === "true";
    document.getElementById("field-placeholder").value = field.getAttribute("data-placeholder") || "";
}

function saveFieldToBackend(field, isDelete = false) {
    if (!field) return;
    
    const fieldData = {
        id: field.getAttribute("data-id") || generateUUID(),
        type: field.getAttribute("data-type"),
        name: field.getAttribute("data-name"),
        role_id: field.getAttribute("data-role-id"),
        required: field.getAttribute("data-required"),
        placeholder: field.getAttribute("data-placeholder"),
        page: field.getAttribute("data-page"),
        x: parseFloat(field.style.left) || 0,
        y: parseFloat(field.style.top) || 0,
        width: parseFloat(field.style.width) || 120,
        height: parseFloat(field.style.height) || 40,
        is_deleted: isDelete
    };
    
    fetch('/sign_custom/save_field', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken()
        },
        body: JSON.stringify(fieldData)
    }).then(response => {
        if (!response.ok) {
            console.error("Error saving field");
        }
        return response.json();
    }).then(data => {
        if (data.success && !field.getAttribute("data-id")) {
            field.setAttribute("data-id", data.field_id);
        }
    }).catch(error => {
        console.error("Error:", error);
    });
}

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function getCSRFToken() {
    const csrfToken = document.querySelector('input[name="csrf_token"]');
    return csrfToken ? csrfToken.value : '';
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

document.addEventListener("DOMContentLoaded", function() {
    const container = document.getElementById("pdf-container");
    if (!container) {
        console.error("PDF container not found");
        return;
    }

    currentContainer = container;
    const templateId = window.location.pathname.split("/").pop();
    const url = `/sign_custom/template/pdf/${templateId}`;

    pdfjsLib.getDocument(url).promise.then(function(pdfDoc) {
        pdfDocument = pdfDoc;
        renderPDF();

        window.addEventListener('resize', debounce(renderPDF, 300));

        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && activeField) {
                setActiveField(null);
            }
        });
    }).catch(function(error) {
        console.error("Error loading PDF:", error);
        alert("Could not load PDF document.");
    });
});