pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

let pdfDocument = null;
let currentContainer = null;
let fieldLayer = null;

function renderPDF() {
    if (!pdfDocument || !currentContainer) return;
    
    // Xóa tất cả canvas cũ
    currentContainer.innerHTML = '';
    
    // Lấy kích thước viewport (toàn màn hình)
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Để lại một chút margin
    const availableWidth = viewportWidth - 40;
    const availableHeight = viewportHeight - 40;
    
    // Render từng trang
    for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
        pdfDocument.getPage(pageNum).then(function (page) {
            // Lấy kích thước gốc của trang
            const originalViewport = page.getViewport({ scale: 1 });
            const pageWidth = originalViewport.width;
            const pageHeight = originalViewport.height;
            
            // Tính scale để fit với màn hình
            const scaleByWidth = availableWidth / pageWidth;
            const scaleByHeight = availableHeight / pageHeight;
            const scale = Math.min(scaleByWidth, scaleByHeight);
            
            const viewport = page.getViewport({ scale });
            
            // Tạo wrapper cho mỗi trang
            const pageWrapper = document.createElement("div");
            pageWrapper.className = "page-wrapper";
            pageWrapper.style.width = "100vw";
            pageWrapper.style.height = "100vh";
            pageWrapper.style.display = "flex";
            pageWrapper.style.justifyContent = "center";
            pageWrapper.style.alignItems = "center";
            pageWrapper.style.position = "relative";
            pageWrapper.style.backgroundColor = "#f5f5f5";
            pageWrapper.setAttribute("data-page", pageNum);
            
            // Tạo container cho PDF và fields
            const pdfContainer = document.createElement("div");
            pdfContainer.style.position = "relative";
            pdfContainer.style.display = "inline-block";
            
            // Tạo canvas
            const canvas = document.createElement("canvas");
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            canvas.style.display = "block";
            canvas.style.boxShadow = "0 4px 20px rgba(0,0,0,0.15)";
            canvas.style.backgroundColor = "white";
            
            // Tạo layer cho fields (overlay trên PDF)
            const pageFieldLayer = document.createElement("div");
            pageFieldLayer.className = "field-layer";
            pageFieldLayer.style.position = "absolute";
            pageFieldLayer.style.top = "0";
            pageFieldLayer.style.left = "0";
            pageFieldLayer.style.width = viewport.width + "px";
            pageFieldLayer.style.height = viewport.height + "px";
            pageFieldLayer.style.pointerEvents = "none"; // Allow clicking through when not dragging
            pageFieldLayer.setAttribute("data-page", pageNum);
            
            // Page indicator
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
            
            // Render PDF
            const ctx = canvas.getContext("2d");
            page.render({ canvasContext: ctx, viewport: viewport });
            
            // Assemble the page
            pdfContainer.appendChild(canvas);
            pdfContainer.appendChild(pageFieldLayer);
            pageWrapper.appendChild(pdfContainer);
            pageWrapper.appendChild(pageIndicator);
            currentContainer.appendChild(pageWrapper);
            
            // Set field layer reference for first page (or current active page)
            if (pageNum === 1 && !fieldLayer) {
                fieldLayer = pageFieldLayer;
            }
        });
    }
    
    // Recreate toolbar after rendering
    createToolbar();
}

function createToolbar() {
    // Remove existing toolbar
    const existingToolbar = document.getElementById("pdf-toolbar");
    if (existingToolbar) {
        existingToolbar.remove();
    }
    
    // Create toolbar
    const toolbar = document.createElement("div");
    toolbar.id = "pdf-toolbar";
    toolbar.style.position = "fixed";
    toolbar.style.top = "20px";
    toolbar.style.right = "20px";
    toolbar.style.backgroundColor = "white";
    toolbar.style.padding = "15px";
    toolbar.style.borderRadius = "8px";
    toolbar.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
    toolbar.style.zIndex = "1000";
    toolbar.style.display = "flex";
    toolbar.style.flexDirection = "column";
    toolbar.style.gap = "10px";
    toolbar.style.minWidth = "200px";
    
    // Field type selector
    const fieldTypeLabel = document.createElement("label");
    fieldTypeLabel.textContent = "Field Type:";
    fieldTypeLabel.style.fontWeight = "bold";
    fieldTypeLabel.style.fontSize = "12px";
    
    const fieldTypeSelect = document.createElement("select");
    fieldTypeSelect.id = "field-type";
    fieldTypeSelect.style.padding = "5px";
    fieldTypeSelect.style.border = "1px solid #ccc";
    fieldTypeSelect.style.borderRadius = "4px";
    
    const fieldTypes = ["signature", "text", "date", "checkbox"];
    fieldTypes.forEach(type => {
        const option = document.createElement("option");
        option.value = type;
        option.textContent = type.charAt(0).toUpperCase() + type.slice(1);
        fieldTypeSelect.appendChild(option);
    });
    
    // Role selector
    const roleLabel = document.createElement("label");
    roleLabel.textContent = "Role:";
    roleLabel.style.fontWeight = "bold";
    roleLabel.style.fontSize = "12px";
    
    const roleSelect = document.createElement("select");
    roleSelect.id = "role-selector";
    roleSelect.style.padding = "5px";
    roleSelect.style.border = "1px solid #ccc";
    roleSelect.style.borderRadius = "4px";
    
    const roles = ["signer1", "signer2", "witness"];
    roles.forEach(role => {
        const option = document.createElement("option");
        option.value = role;
        option.textContent = role.charAt(0).toUpperCase() + role.slice(1);
        roleSelect.appendChild(option);
    });
    
    // Add field button
    const addFieldBtn = document.createElement("button");
    addFieldBtn.id = "add-field";
    addFieldBtn.textContent = "Add Field";
    addFieldBtn.style.padding = "8px 16px";
    addFieldBtn.style.backgroundColor = "#007bff";
    addFieldBtn.style.color = "white";
    addFieldBtn.style.border = "none";
    addFieldBtn.style.borderRadius = "4px";
    addFieldBtn.style.cursor = "pointer";
    addFieldBtn.style.fontSize = "14px";
    
    addFieldBtn.onmouseover = () => addFieldBtn.style.backgroundColor = "#0056b3";
    addFieldBtn.onmouseout = () => addFieldBtn.style.backgroundColor = "#007bff";
    
    // Page selector
    const pageLabel = document.createElement("label");
    pageLabel.textContent = "Current Page:";
    pageLabel.style.fontWeight = "bold";
    pageLabel.style.fontSize = "12px";
    
    const pageSelect = document.createElement("select");
    pageSelect.id = "page-selector";
    pageSelect.style.padding = "5px";
    pageSelect.style.border = "1px solid #ccc";
    pageSelect.style.borderRadius = "4px";
    
    // Populate page options
    if (pdfDocument) {
        for (let i = 1; i <= pdfDocument.numPages; i++) {
            const option = document.createElement("option");
            option.value = i;
            option.textContent = `Page ${i}`;
            pageSelect.appendChild(option);
        }
    }
    
    // Assemble toolbar
    toolbar.appendChild(fieldTypeLabel);
    toolbar.appendChild(fieldTypeSelect);
    toolbar.appendChild(roleLabel);
    toolbar.appendChild(roleSelect);
    toolbar.appendChild(pageLabel);
    toolbar.appendChild(pageSelect);
    toolbar.appendChild(addFieldBtn);
    
    document.body.appendChild(toolbar);
    
    // Add event listeners
    addFieldBtn.addEventListener("click", addField);
    pageSelect.addEventListener("change", changeActivePage);
}

function addField() {
    const type = document.getElementById("field-type").value;
    const roleId = document.getElementById("role-selector").value;
    const pageNum = parseInt(document.getElementById("page-selector").value);
    
    // Get the field layer for the selected page
    const targetFieldLayer = document.querySelector(`.field-layer[data-page="${pageNum}"]`);
    if (!targetFieldLayer) return;
    
    const field = document.createElement("div");
    field.className = "field-box";
    field.textContent = type.toUpperCase();
    field.style.position = "absolute";
    field.style.top = "50px";
    field.style.left = "50px";
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
    field.setAttribute("data-role-id", roleId);
    field.setAttribute("data-type", type);
    field.setAttribute("data-page", pageNum);
    
    // Add delete button
    const deleteBtn = document.createElement("span");
    deleteBtn.textContent = "×";
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
        field.remove();
    };
    
    field.appendChild(deleteBtn);
    
    makeDraggable(field);
    targetFieldLayer.appendChild(field);
    
    // Scroll to the page if not visible
    const pageWrapper = document.querySelector(`.page-wrapper[data-page="${pageNum}"]`);
    if (pageWrapper) {
        pageWrapper.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

function makeDraggable(el) {
    el.onmousedown = function (e) {
        if (e.target !== el && e.target.textContent !== "×") return; // Don't drag when clicking delete button
        
        e.preventDefault();
        let offsetX = e.offsetX || e.layerX;
        let offsetY = e.offsetY || e.layerY;

        function moveAt(e) {
            const rect = el.parentElement.getBoundingClientRect();
            const x = e.clientX - rect.left - offsetX;
            const y = e.clientY - rect.top - offsetY;
            
            // Constrain within parent bounds
            const maxX = el.parentElement.offsetWidth - el.offsetWidth;
            const maxY = el.parentElement.offsetHeight - el.offsetHeight;
            
            el.style.left = Math.max(0, Math.min(maxX, x)) + 'px';
            el.style.top = Math.max(0, Math.min(maxY, y)) + 'px';
        }

        document.addEventListener('mousemove', moveAt);

        document.onmouseup = function () {
            document.removeEventListener('mousemove', moveAt);
            document.onmouseup = null;
        };
    };
}

function changeActivePage() {
    const pageNum = parseInt(document.getElementById("page-selector").value);
    const pageWrapper = document.querySelector(`.page-wrapper[data-page="${pageNum}"]`);
    if (pageWrapper) {
        pageWrapper.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

// Debounce function
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

document.addEventListener("DOMContentLoaded", function () {
    const container = document.getElementById("pdf-container");
    if (!container) {
        alert("Không tìm thấy container PDF");
        return;
    }
    
    // Set container style
    container.style.margin = "0";
    container.style.padding = "0";
    container.style.width = "100%";
    
    currentContainer = container;
    const templateId = window.location.pathname.split("/").pop();
    const url = `/sign_custom/template/pdf/${templateId}`;
    
    // Load PDF
    pdfjsLib.getDocument(url).promise.then(function (pdfDoc) {
        pdfDocument = pdfDoc;
        renderPDF();
        
        // Add resize listener
        const debouncedResize = debounce(renderPDF, 300);
        window.addEventListener('resize', debouncedResize);
        
        // Keyboard navigation
        document.addEventListener('keydown', function(e) {
            if (e.key === 'ArrowDown' || e.key === 'PageDown') {
                e.preventDefault();
                window.scrollBy({
                    top: window.innerHeight,
                    behavior: 'smooth'
                });
            } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
                e.preventDefault();
                window.scrollBy({
                    top: -window.innerHeight,
                    behavior: 'smooth'
                });
            }
        });
        
    }).catch(function (error) {
        console.error("Lỗi khi load PDF:", error);
        alert("Không thể hiển thị file PDF.");
    });
});

// Set body style
document.addEventListener("DOMContentLoaded", function() {
    document.body.style.margin = "0";
    document.body.style.padding = "0";
    document.body.style.overflow = "auto";
});