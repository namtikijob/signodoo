pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
let pdfDocument = null;
let currentContainer = null;
let existingFieldsData = []; // Cache for field data across renders

function renderPDF() {
    if (!pdfDocument || !currentContainer) return;
    
    // Backup existing field data before clearing container
    backupExistingFields();
    
    currentContainer.innerHTML = '';
    currentContainer.classList.add('pdf-container');
    
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const availableWidth = viewportWidth - 40;
    const availableHeight = viewportHeight - 40;
    
    const pagePromises = [];
    
    for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
        const pagePromise = pdfDocument.getPage(pageNum).then(function (page) {
            const originalViewport = page.getViewport({ scale: 1 });
            const pageWidth = originalViewport.width;
            const pageHeight = originalViewport.height;
            const scaleByWidth = availableWidth / pageWidth;
            const scaleByHeight = availableHeight / pageHeight;
            const scale = Math.min(scaleByWidth, scaleByHeight);
            const viewport = page.getViewport({ scale });
            
            const pageWrapper = document.createElement("div");
            pageWrapper.className = "page-wrapper";
            pageWrapper.setAttribute("data-page", pageNum);
            
            const pdfContainer = document.createElement("div");
            pdfContainer.className = "pdf-canvas-container";
            
            const canvas = document.createElement("canvas");
            canvas.className = "pdf-canvas";
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            
            const pageIndicator = document.createElement("div");
            pageIndicator.className = "page-indicator";
            pageIndicator.textContent = `${pageNum} / ${pdfDocument.numPages}`;
            
            const ctx = canvas.getContext("2d");
            page.render({ canvasContext: ctx, viewport: viewport });
            
            pdfContainer.appendChild(canvas);
            pageWrapper.appendChild(pdfContainer);
            pageWrapper.appendChild(pageIndicator);
            currentContainer.appendChild(pageWrapper);
            
            setTimeout(() => {
                setupDropEvents(pageWrapper);
                console.log('Drop events setup for page:', pageNum);
            }, 100);
            
            return pageWrapper;
        });
        
        pagePromises.push(pagePromise);
    }
    
    Promise.all(pagePromises).then(() => {
        console.log('All pages rendered and drop events setup complete');
        
        setTimeout(() => {
            // Restore fields from backup first, then load from server if needed
            if (existingFieldsData.length > 0) {
                restoreFieldsFromBackup();
            } else {
                loadExistingFields();
            }
        }, 200);
    });
}

// Backup field data before re-rendering
function backupExistingFields() {
    existingFieldsData = [];
    document.querySelectorAll('.pdf-field').forEach(field => {
        if (field.dataset.originalPosX && field.dataset.originalPosY) {
            existingFieldsData.push({
                id: field.dataset.fieldId,
                type: field.dataset.type,
                name: field.querySelector('span') ? field.querySelector('span').textContent : 'Field',
                posX: parseFloat(field.dataset.originalPosX),
                posY: parseFloat(field.dataset.originalPosY),
                page: parseInt(field.closest('[data-page]').dataset.page)
            });
        }
    });
    console.log('Backed up', existingFieldsData.length, 'fields');
}

// Restore fields from backup
function restoreFieldsFromBackup() {
    existingFieldsData.forEach(fieldData => {
        const pageWrapper = document.querySelector(`[data-page="${fieldData.page}"]`);
        if (pageWrapper) {
            createFieldElement(pageWrapper, fieldData);
        }
    });
    console.log('Restored', existingFieldsData.length, 'fields from backup');
}

function loadAvailableFields() {
    fetch('/sign_custom/template/available_fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}) 
    })
    .then(res => res.json())
    .then(data => {
        const fields = data.result || [];
        const fieldList = document.getElementById("field-list");
        
        if (!fieldList) {
            console.error('Field list element not found');
            return;
        }
        
        fieldList.innerHTML = ''; // Clear existing fields
        
        fields.forEach(field => {
            const li = document.createElement("li");
            li.textContent = `${field.name} (${field.type})`;
            li.className = "draggable-field";
            li.dataset.type = field.type;
            li.dataset.fieldId = field.id;
            
            setupDragEvents(li);
            fieldList.appendChild(li);
        });
    })
    .catch(err => {
        console.error("Failed to load fields:", err);
    });
}

function setupDragEvents(field) {
    field.setAttribute('draggable', true);
    
    field.addEventListener('dragstart', function(e) {
        console.log('Drag started for field:', field.textContent || field.dataset.fieldId);
        field.classList.add('dragging');
        
        const dragData = {
            field_id: field.dataset.fieldId,
            type: field.dataset.type,
            name: field.textContent || 'Field',
            isExisting: !!field.classList.contains('pdf-field') // Check if it's an existing field
        };
        
        e.dataTransfer.setData('text/plain', JSON.stringify(dragData));
        e.dataTransfer.effectAllowed = 'move';
        
        console.log('Drag data set:', dragData);
    });
    
    field.addEventListener('dragend', function(e) {
        console.log('Drag ended for field:', field.textContent || field.dataset.fieldId);
        field.classList.remove('dragging');
    });
}

function loadExistingFields() {
    const templateId = window.location.pathname.split('/').pop();
    
    fetch('/sign_custom/template/get_fields', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ 
            params: { template_id: templateId }
        })
    })
    .then(res => {
        if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        return res.json();
    })
    .then(data => {
        console.log('Existing fields response:', data);
        
        const fields = data.result?.fields || data.fields || [];
        
        if (Array.isArray(fields) && fields.length > 0) {
            // Cache field data and render
            existingFieldsData = fields;
            
            fields.forEach(field => {
                const pageWrapper = document.querySelector(`[data-page="${field.page}"]`);
                if (pageWrapper) {
                    createFieldElement(pageWrapper, field);
                }
            });
            console.log('Loaded and rendered', fields.length, 'existing fields');
        } else {
            console.log('No existing fields found');
        }
    })
    .catch(err => {
        console.error('Error loading existing fields:', err);
    });
}

// Enhanced field creation with proper positioning and drag support
function createFieldElement(pageWrapper, fieldData) {
    console.log('Creating field element:', fieldData);
    
    const fieldElement = document.createElement('div');
    fieldElement.className = 'pdf-field';
    fieldElement.dataset.fieldId = fieldData.id;
    fieldElement.dataset.type = fieldData.type;
    
    // Store original positions for resize handling
    fieldElement.dataset.originalPosX = fieldData.posX;
    fieldElement.dataset.originalPosY = fieldData.posY;
    
    // Calculate position based on current canvas size
    const canvas = pageWrapper.querySelector('canvas');
    if (canvas) {
        const canvasRect = canvas.getBoundingClientRect();
        const wrapperRect = pageWrapper.getBoundingClientRect();
        
        const canvasLeft = canvasRect.left - wrapperRect.left;
        const canvasTop = canvasRect.top - wrapperRect.top;
        
        const fieldX = canvasLeft + (fieldData.posX * canvas.offsetWidth);
        const fieldY = canvasTop + (fieldData.posY * canvas.offsetHeight);
        
        fieldElement.style.position = 'absolute';
        fieldElement.style.left = fieldX + 'px';
        fieldElement.style.top = fieldY + 'px';
        fieldElement.style.transform = 'translate(-50%, -50%)';
    }
    
    // Display field name/type
    const displayName = fieldData.name || `${fieldData.type} Field`;
    fieldElement.innerHTML = `<span>${displayName}</span>`;
    
    // Make field draggable
    setupDragEvents(fieldElement);
    
    // Click handler for field management
    fieldElement.addEventListener('click', function(e) {
        e.stopPropagation();
        console.log('Field clicked:', fieldData);
        
        const shouldDelete = confirm(`Delete field "${displayName}"?`);
        if (shouldDelete) {
            deleteField(fieldElement, fieldData);
        }
    });
    
    // Add to page wrapper with validation
    if (pageWrapper && typeof pageWrapper.appendChild === 'function') {
        pageWrapper.appendChild(fieldElement);
        console.log('Field element created and added to page');
    } else {
        console.error('Invalid page wrapper:', pageWrapper);
    }
}

// Delete field functionality
function deleteField(fieldElement, fieldData) {
    const templateId = window.location.pathname.split('/').pop();
    
    fetch('/sign_custom/template/delete_field', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            params: {
                template_id: templateId,
                field_id: fieldData.id
            }
        })
    })
    .then(res => res.json())
    .then(response => {
        if (response.result?.success || response.success) {
            fieldElement.remove();
            
            // Remove from cache
            existingFieldsData = existingFieldsData.filter(f => f.id !== fieldData.id);
            
            console.log('Field deleted successfully');
        } else {
            alert('Failed to delete field');
        }
    })
    .catch(err => {
        console.error('Error deleting field:', err);
        alert('Error deleting field');
    });
}

function setupDropEvents(wrapper) {
    console.log('Setting up drop events for page:', wrapper.dataset.page);
    
    wrapper.addEventListener('dragover', function(e) {
        e.preventDefault();
        e.stopPropagation();
        wrapper.classList.add('drop-active');
    });
    
    wrapper.addEventListener('dragleave', function(e) {
        e.preventDefault();
        if (!wrapper.contains(e.relatedTarget)) {
            wrapper.classList.remove('drop-active');
        }
    });
    
    wrapper.addEventListener('drop', function(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log('Drop event triggered on page:', wrapper.dataset.page);
        
        wrapper.classList.remove('drop-active');
        
        try {
            const dropData = JSON.parse(e.dataTransfer.getData('text/plain'));
            console.log('Drop data:', dropData);
            
            const page = parseInt(wrapper.dataset.page);
            
            const canvas = wrapper.querySelector('canvas');
            if (!canvas) {
                console.error('Canvas not found in wrapper');
                return;
            }
            
            const canvasRect = canvas.getBoundingClientRect();
            
            if (e.clientX < canvasRect.left || e.clientX > canvasRect.right ||
                e.clientY < canvasRect.top || e.clientY > canvasRect.bottom) {
                console.log('Drop outside canvas bounds');
                return;
            }
            
            const posX = (e.clientX - canvasRect.left) / canvas.offsetWidth;
            const posY = (e.clientY - canvasRect.top) / canvas.offsetHeight;
            
            const clampedPosX = Math.max(0, Math.min(1, posX));
            const clampedPosY = Math.max(0, Math.min(1, posY));
            
            console.log('Calculated position:', { 
                posX: clampedPosX, 
                posY: clampedPosY, 
                page,
                canvasSize: { width: canvas.offsetWidth, height: canvas.offsetHeight }
            });
            
            const templateId = window.location.pathname.split('/').pop();
            
            if (dropData.isExisting) {
                // Update existing field position
                fetch('/sign_custom/template/update_field_position', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({
                        params: {
                            template_id: templateId,
                            field_id: dropData.field_id,
                            posX: clampedPosX,
                            posY: clampedPosY,
                            page: page
                        }
                    })
                })
                .then(res => {
                    if (!res.ok) {
                        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
                    }
                    return res.json();
                })
                .then(response => {
                    console.log('Field update response:', response);
                    if (response.success) {
                        // Update cache
                        const fieldIndex = existingFieldsData.findIndex(f => f.id == dropData.field_id);
                        if (fieldIndex !== -1) {
                            existingFieldsData[fieldIndex].posX = clampedPosX;
                            existingFieldsData[fieldIndex].posY = clampedPosY;
                            existingFieldsData[fieldIndex].page = page;
                        }
                        // Re-render field
                        const fieldElement = document.querySelector(`.pdf-field[data-field-id="${dropData.field_id}"]`);
                        if (fieldElement) {
                            fieldElement.remove();
                        }
                        createFieldElement(wrapper, {
                            id: dropData.field_id,
                            name: dropData.name,
                            type: dropData.type,
                            posX: clampedPosX,
                            posY: clampedPosY,
                            page: page
                        });
                        console.log('Field position updated and re-rendered');
                    } else {
                        alert('Failed to update field position: ' + (response.error || 'Unknown error'));
                    }
                })
                .catch(err => {
                    console.error('Error updating field position:', err);
                    alert('Error updating field position: ' + err.message);
                });
            } else {
                // Add new field
                fetch('/sign_custom/template/add_field', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({
                        params: {
                            template_id: templateId,
                            field_id: dropData.field_id,
                            posX: clampedPosX,
                            posY: clampedPosY,
                            page: page
                        }
                    })
                })
                .then(res => {
                    if (!res.ok) {
                        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
                    }
                    return res.json();
                })
                .then(response => {
                    console.log('Field add response:', response);
                    if (response.result?.success || response.success) {
                        const newFieldData = {
                            id: response.result?.field_id || response.field_id || Date.now(),
                            name: dropData.name,
                            type: dropData.type,
                            posX: clampedPosX,
                            posY: clampedPosY,
                            page: page
                        };
                        existingFieldsData.push(newFieldData);
                        createFieldElement(wrapper, newFieldData);
                        console.log('Field successfully added and rendered');
                    } else {
                        alert('Failed to add field: ' + (response.error || 'Unknown error'));
                    }
                })
                .catch(err => {
                    console.error('Error adding field:', err);
                    alert('Error adding field: ' + err.message);
                });
            }
        } catch (error) {
            console.error('Error parsing drop data:', error);
        }
    });
}

// Handle window resize
function handleResize() {
    if (pdfDocument) {
        console.log('Window resized, re-rendering PDF...');
        renderPDF();
    }
}

// Debounced resize handler
let resizeTimeout;
function debouncedResize() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(handleResize, 300);
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
    
    console.log('Loading PDF from:', url);
    
    // Load available fields first
    loadAvailableFields();
    
    // Load PDF document
    pdfjsLib.getDocument(url).promise.then(function(pdfDoc) {
        pdfDocument = pdfDoc;
        console.log('PDF loaded successfully, pages:', pdfDoc.numPages);
        renderPDF();
        
        // Add resize listener with debouncing
        window.addEventListener('resize', debouncedResize);
    }).catch(function(error) {
        console.error("Error loading PDF:", error);
        alert("Could not load PDF document: " + error.message);
    });
});