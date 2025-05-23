// Người code: HIEPLD

// Khởi tạo khi DOM được tải hoàn toàn
document.addEventListener('DOMContentLoaded', () => {
    // --- Biến trạng thái toàn cục ---
    let nodes = []; // Mảng lưu trữ các node trong luồng công việc
    let connections = []; // Mảng lưu trữ các kết nối giữa các node
    let templates = []; // Mảng lưu trữ các template
    let selectedNode = null; // Node đang được chọn
    let selectedConnection = null; // Kết nối đang được chọn
    let selectedTemplate = null; // Template đang được chọn
    let isDragging = false; // Trạng thái kéo node
    let isConnecting = false; // Trạng thái kéo kết nối
    let startHandle = null; // Handle bắt đầu kéo kết nối
    let tempConnection = null; // Đường kết nối tạm thời
    let tempConnectionLabel = null; // Nhãn kết nối tạm thời
    let scale = 1; // Tỷ lệ thu phóng
    let offsetX = 0; // Độ lệch X của canvas
    let offsetY = 0; // Độ lệch Y của canvas
    let nodeCounter = 1; // Đếm node để tạo ID
    let startX, startY, startMouseX, startMouseY; // Tọa độ khi kéo
    let nodePreview = null; // Xem trước node khi kéo
    let draggedOutput = null; // Output đang được kéo
    let targetHandle = null; // Handle đích khi kéo kết nối

    // --- Lấy các phần tử DOM ---
    const workflowContainer = document.getElementById('workflow-container');
    const connectionsSvg = document.getElementById('connections-svg');
    const nodePalette = document.getElementById('node-palette');
    const templatePalette = document.getElementById('template-palette');
    const templateList = document.getElementById('template-list');
    const zoomInBtn = document.getElementById('zoom-in');
    const zoomOutBtn = document.getElementById('zoom-out');
    const centerViewBtn = document.getElementById('center-view');
    const deleteSelectedBtn = document.getElementById('delete-selected');
    const saveBtn = document.getElementById('save-btn');
    const runBtn = document.getElementById('run-btn');
    const saveTemplateBtn = document.getElementById('save-template-btn');
    const outputModal = document.getElementById('output-modal');
    const closeModalBtn = document.getElementById('close-modal');
    const modalOutput = document.getElementById('modal-output');
    const saveTemplateModal = document.getElementById('save-template-modal');
    const closeTemplateModalBtn = document.getElementById('close-template-modal');
    const templateNameInput = document.getElementById('template-name');
    const templateDescriptionInput = document.getElementById('template-description');
    const confirmSaveTemplateBtn = document.getElementById('confirm-save-template');

    // --- Hàm tiện ích ---

    // Giới hạn tần suất gọi hàm để tối ưu hiệu suất
    function throttle(fn, wait) {
        let lastCall = 0;
        return function (...args) {
            const now = performance.now();
            if (now - lastCall >= wait) {
                lastCall = now;
                fn(...args);
            }
        };
    }

    // Tạo UUID cho template
    function generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    // --- Hàm lưu trữ ---

    // Lưu trạng thái luồng công việc vào localStorage
    // @returns {boolean} True nếu lưu thành công, False nếu có lỗi
    function saveWorkflowState() {
        try {
            const workflow = {
                nodes: nodes.map(n => ({
                    id: n.id,
                    type: n.type,
                    x: n.x,
                    y: n.y,
                    output: n.output,
                    config: n.config
                })),
                connections: connections.map(c => ({
                    id: c.id,
                    sourceNode: c.sourceNode,
                    targetNode: c.targetNode,
                    sourceType: c.sourceType,
                    targetType: c.targetType,
                    label: c.label
                }))
            };
            localStorage.setItem('workflowState', JSON.stringify(workflow));
            console.log('Lưu trạng thái luồng công việc thành công:', workflow);
            return true;
        } catch (error) {
            console.error('Lỗi khi lưu trạng thái luồng:', error);
            alert('Lỗi khi lưu trạng thái: ' + error.message);
            return false;
        }
    }

    // Tải file JSON của luồng công việc
    function downloadWorkflowAsJson() {
        try {
            const workflow = {
                nodes: nodes.map(n => ({
                    id: n.id,
                    type: n.type,
                    x: n.x,
                    y: n.y,
                    output: n.output,
                    config: n.config
                })),
                connections: connections.map(c => ({
                    id: c.id,
                    sourceNode: c.sourceNode,
                    targetNode: c.targetNode,
                    sourceType: c.sourceType,
                    targetType: c.targetType,
                    label: c.label
                }))
            };
            const jsonString = JSON.stringify(workflow, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `workflow-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            console.log('Tải file JSON thành công!');
        } catch (error) {
            console.error('Lỗi khi tải JSON:', error);
            alert('Lỗi khi tải file JSON: ' + error.message);
        }
    }

    // Lưu template vào localStorage
    // @param {string} name - Tên template
    // @param {string} description - Mô tả template
    // @returns {boolean} True nếu lưu thành công
    function saveTemplate(name, description) {
        try {
            const template = {
                id: generateUUID(),
                name,
                description,
                workflow: {
                    nodes: nodes.map(n => ({
                        id: n.id,
                        type: n.type,
                        x: n.x,
                        y: n.y,
                        config: n.config
                    })),
                    connections: connections.map(c => ({
                        id: c.id,
                        sourceNode: c.sourceNode,
                        targetNode: c.targetNode,
                        sourceType: c.sourceType,
                        targetType: c.targetType,
                        label: c.label
                    }))
                }
            };
            templates.push(template);
            localStorage.setItem('templates', JSON.stringify(templates));
            updateTemplateList();
            console.log('Lưu template thành công:', template);
            return true;
        } catch (error) {
            console.error('Lỗi khi lưu template:', error);
            alert('Lỗi khi lưu template: ' + error.message);
            return false;
        }
    }

    // Tải danh sách template từ localStorage
    function loadTemplates() {
        try {
            const savedTemplates = localStorage.getItem('templates');
            if (savedTemplates) {
                templates = JSON.parse(savedTemplates);
                updateTemplateList();
                console.log('Tải templates thành công:', templates);
            }
        } catch (error) {
            console.error('Lỗi khi tải templates:', error);
        }
    }

    // Tải trạng thái luồng công việc từ localStorage
    function loadWorkflowState() {
        try {
            const savedState = localStorage.getItem('workflowState');
            if (!savedState) return;
            const workflow = JSON.parse(savedState);
            nodes = [];
            connections = [];
            workflow.nodes.forEach(nodeData => {
                const nodeElement = createNode(nodeData.type, nodeData.x, nodeData.y);
                const node = nodes.find(n => n.element === nodeElement);
                node.output = nodeData.output || '';
                node.config = nodeData.config || {};
                if (node.output) {
                    const outputArea = nodeElement.querySelector('.node-output-area');
                    outputArea.style.display = 'block';
                    if (node.type === 'ai' || node.type === 'output') {
                        outputArea.querySelector('.output-content').innerHTML = marked.parse(JSON.parse(node.output).response || '');
                    } else {
                        outputArea.querySelector('.output-content').textContent = JSON.stringify(JSON.parse(node.output || '{}'), null, 2);
                    }
                    updateDraggableOutput(nodeElement, node.output);
                }
                updateNodeConfigUI(nodeElement, node.config);
            });
            workflow.connections.forEach(connData => {
                createConnection(connData.sourceNode, connData.targetNode, connData.sourceType, connData.targetType, connData.sourceBranch);
                const connection = connections.find(c => c.id === connData.id);
                if (connection) {
                    connection.label = connData.label;
                    updateConnection(connection);
                }
            });
            console.log('Tải trạng thái luồng công việc thành công:', workflow);
        } catch (error) {
            console.error('Lỗi khi tải trạng thái:', error);
            alert('Lỗi khi tải trạng thái: ' + error.message);
        }
    }

    // Áp dụng template vào canvas
    // @param {Object} template - Template cần áp dụng
    function applyTemplate(template) {
        try {
            // Kiểm tra xem template và template.workflow có tồn tại không
            if (!template || !template.workflow || !template.workflow.nodes || !template.workflow.connections) {
                throw new Error('Template không hợp lệ hoặc thiếu dữ liệu.');
            }

            nodes = [];
            connections = [];
            workflowContainer.innerHTML = '';
            connectionsSvg.innerHTML = connectionsSvg.innerHTML; // Giữ lại arrowDefs
            nodeCounter = 1;

            // Áp dụng các node từ template
            template.workflow.nodes.forEach((nodeData, index) => {
                // Kiểm tra nodeData có hợp lệ không
                if (!nodeData || !nodeData.type) {
                    console.warn(`Bỏ qua node tại vị trí ${index}: Dữ liệu node không hợp lệ hoặc thiếu type.`, nodeData);
                    return;
                }

                // Tạo node nếu dữ liệu hợp lệ
                const nodeElement = createNode(nodeData.type, nodeData.x || 0, nodeData.y || 0);
                const node = nodes.find(n => n.element === nodeElement);
                if (node) {
                    node.config = nodeData.config || {};
                    updateNodeConfigUI(nodeElement, node.config);
                } else {
                    console.warn(`Không tìm thấy node vừa tạo tại vị trí ${index}:`, nodeData);
                }
            });

            // Áp dụng các kết nối từ template
            template.workflow.connections.forEach((connData, index) => {
                // Kiểm tra connData có hợp lệ không
                if (!connData || !connData.sourceNode || !connData.targetNode) {
                    console.warn(`Bỏ qua kết nối tại vị trí ${index}: Dữ liệu kết nối không hợp lệ.`, connData);
                    return;
                }

                createConnection(
                    connData.sourceNode,
                    connData.targetNode,
                    connData.sourceType || 'output',
                    connData.targetType || 'input',
                    connData.sourceBranch || null
                );
                const connection = connections.find(c => c.id === connData.id);
                if (connection) {
                    connection.label = connData.label || '';
                    updateConnection(connection);
                } else {
                    console.warn(`Không tìm thấy kết nối vừa tạo tại vị trí ${index}:`, connData);
                }
            });

            saveWorkflowState();
            console.log('Áp dụng template thành công:', template.name);
        } catch (error) {
            console.error('Lỗi khi áp dụng template:', error);
            alert('Lỗi khi áp dụng template: ' + error.message);
        }
    }

    // Xóa template
    // @param {Object} template - Template cần xóa
    function deleteTemplate(template) {
        try {
            templates = templates.filter(t => t.id !== template.id);
            localStorage.setItem('templates', JSON.stringify(templates));
            updateTemplateList();
            if (selectedTemplate === template) {
                selectedTemplate = null;
                deleteSelectedBtn.classList.add('hidden');
            }
            console.log('Xóa template thành công:', template.name);
        } catch (error) {
            console.error('Lỗi khi xóa template:', error);
            alert('Lỗi khi xóa template: ' + error.message);
        }
    }

    // Cập nhật danh sách template trong giao diện
    function updateTemplateList() {
        templateList.innerHTML = '';
        templates.forEach(template => {
            const templateItem = document.createElement('div');
            templateItem.className = 'template-item';
            templateItem.innerHTML = `
                <h3>${template.name}</h3>
                <p>${template.description || 'Không có mô tả'}</p>
            `;
            templateItem.addEventListener('click', e => {
                e.stopPropagation();
                // Bỏ chọn template hiện tại
                if (selectedTemplate) {
                    const prevSelected = templateList.querySelector('.template-item.selected');
                    if (prevSelected) prevSelected.classList.remove('selected');
                }
                // Chọn template mới
                selectedTemplate = template;
                templateItem.classList.add('selected');
                deleteSelectedBtn.classList.remove('hidden');
                applyTemplate(template);
                console.log('Chọn template:', template.name);
            });
            templateList.appendChild(templateItem);
        });
    }

    // Khởi tạo trạng thái ban đầu
    loadTemplates();
    loadWorkflowState();

    // --- Xử lý kéo thả node palette ---
    // Đảm bảo các node-item có thể kéo được
    nodePalette.querySelectorAll('.node-item').forEach(item => {
        item.setAttribute('draggable', 'true'); // Đảm bảo thuộc tính draggable
        item.addEventListener('dragstart', e => {
            console.log('Dragstart node:', item.dataset.type);
            e.dataTransfer.setData('text/plain', item.dataset.type);
            e.dataTransfer.effectAllowed = 'copy';
            nodePreview = document.createElement('div');
            nodePreview.className = 'node-preview';
            nodePreview.textContent = item.textContent.trim();
            document.body.appendChild(nodePreview);
        });

        item.addEventListener('dragend', () => {
            console.log('Dragend node');
            if (nodePreview) {
                nodePreview.remove();
                nodePreview = null;
            }
        });
    });

    // Xử lý kéo thả node vào canvas
    workflowContainer.addEventListener('dragover', e => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        if (nodePreview) {
            const rect = workflowContainer.getBoundingClientRect();
            nodePreview.style.left = `${e.clientX - rect.left - 150}px`;
            nodePreview.style.top = `${e.clientY - rect.top - 20}px`;
        }
    });

    workflowContainer.addEventListener('drop', e => {
        e.preventDefault();
        e.stopPropagation();
        const type = e.dataTransfer.getData('text/plain');
        console.log('Drop node type:', type);
        if (!type) return;

        const rect = workflowContainer.getBoundingClientRect();
        const x = (e.clientX - rect.left) / scale - 150;
        const y = (e.clientY - rect.top) / scale - 50;
        createNode(type, x, y);
        if (nodePreview) {
            nodePreview.remove();
            nodePreview = null;
        }
    });

    // --- Hàm tạo node ---
    // @param {string} type - Loại node (trigger, http, ai, output, condition)
    // @param {number} x - Tọa độ X
    // @param {number} y - Tọa độ Y
    // @returns {HTMLElement} Phần tử node được tạo
    function createNode(type, x, y) {
        const nodeId = `node-${nodeCounter++}`;
        const nodeConfig = {
            trigger: { color: 'bg-indigo-50', icon: 'fa-bolt', title: 'Khối Kích Hoạt', class: 'node-trigger', handleClass: 'trigger' },
            http: { color: 'bg-blue-50', icon: 'fa-globe', title: 'Khối Lấy Dữ Liệu', class: 'node-http', handleClass: 'http' },
            ai: { color: 'bg-orange-50', icon: 'fa-robot', title: 'Khối Phân Tích Dữ Liệu', class: 'node-ai', handleClass: 'ai' },
            output: { color: 'bg-green-50', icon: 'fa-file-export', title: 'Khối Kết Quả Đầu Ra', class: 'node-output', handleClass: 'output' },
            condition: { color: 'bg-purple-50', icon: 'fa-code-branch', title: 'Khối Điều Kiện', class: 'node-condition', handleClass: 'condition' }
        };

        const config = nodeConfig[type] || nodeConfig.trigger;
        const nodeHtml = `
            <div id="${nodeId}" class="node ${config.color} ${config.class}" style="left: ${x}px; top: ${y}px;">
                <div class="connection-handles">
                    <div class="connection-handle input ${config.handleClass}" data-node="${nodeId}" data-type="input"></div>
                    <div class="connection-handle output ${config.handleClass}" data-node="${nodeId}" data-type="output"></div>
                    ${type === 'condition' ? `<div class="connection-handle output ${config.handleClass}" data-node="${nodeId}" data-type="output" data-branch="true"></div>` : ''}
                    ${type === 'condition' ? `<div class="connection-handle output ${config.handleClass}" data-node="${nodeId}" data-type="output" data-branch="false"></div>` : ''}
                </div>
                <div class="node-header">
                    <i class="fas ${config.icon} mr-2 text-gray-600"></i>
                    <span>${config.title}</span>
                    <button class="node-delete text-gray-400 hover:text-red-500 ml-auto">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="node-body">
                    <div class="text-xs text-gray-500 mb-2">${getNodeDescription(type)}</div>
                    <div class="node-config">${getNodeConfigFields(type)}</div>
                    <div class="node-output-area" style="display: none;">
                        <div class="output-content markdown-content"></div>
                        <span class="node-output-details">Xem chi tiết</span>
                        <div class="node-output-area draggable" draggable="true" data-node="${nodeId}">
                            <div class="output-content"></div>
                            <div class="output-drag-handle"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        workflowContainer.insertAdjacentHTML('beforeend', nodeHtml);
        const nodeElement = document.getElementById(nodeId);
        nodes.push({
            id: nodeId,
            element: nodeElement,
            x,
            y,
            type,
            output: '',
            config: {}
        });
        setupNodeEvents(nodeElement);
        console.log('Node được tạo:', nodeId);
        return nodeElement;
    }

    // --- Hàm lấy mô tả node ---
    // @param {string} type - Loại node
    // @returns {string} Mô tả của node
    function getNodeDescription(type) {
        const descriptions = {
            trigger: 'Kích hoạt luồng công việc với các sự kiện như Webhook, lịch trình hoặc thủ công.',
            http: 'Gửi yêu cầu HTTP đến API hoặc dịch vụ web với các phương thức GET, POST, v.v.',
            ai: 'Xử lý dữ liệu bằng AI với câu lệnh đơn giản, ví dụ: viết bài, phân tích dữ liệu.',
            output: 'Xuất kết quả ra file (Word, PDF), API, hoặc console.',
            condition: 'Kiểm tra điều kiện để phân nhánh luồng công việc (hỗ trợ JavaScript, Python).'
        };
        return descriptions[type] || 'Node';
    }

    // --- Hàm tạo trường cấu hình node ---
    // @param {string} type - Loại node
    // @returns {string} HTML của các trường cấu hình
    function getNodeConfigFields(type) {
        switch (type) {
            case 'trigger':
                // Giao diện cấu hình Trigger giống n8n với các tab
                return `
                    <div class="node-config-tabs">
                        <div class="node-config-tab active" data-tab="webhook">Webhook</div>
                        <div class="node-config-tab" data-tab="schedule">Schedule</div>
                        <div class="node-config-tab" data-tab="manual">Manual</div>
                    </div>
                    <div class="node-config-content active" data-tab="webhook">
                        <div class="node-config-field">
                            <label>URL Webhook <span title="Địa chỉ để nhận sự kiện từ bên ngoài"><i class="fas fa-question-circle"></i></span></label>
                            <input type="text" name="webhookUrl" placeholder="Ví dụ: https://webhook.example.com" class="w-full p-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500" />
                        </div>
                        <div class="node-config-field">
                            <label>Phương Thức</label>
                            <select name="webhookMethod" class="w-full p-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500">
                                <option value="POST">POST</option>
                                <option value="GET">GET</option>
                            </select>
                        </div>
                    </div>
                    <div class="node-config-content" data-tab="schedule">
                        <div class="node-config-field">
                            <label>Khoảng Thời Gian (phút) <span title="Thời gian lặp lại để chạy luồng"><i class="fas fa-question-circle"></i></span></label>
                            <input type="number" name="interval" placeholder="Ví dụ: 60" min="1" class="w-full p-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500" />
                        </div>
                        <div class="node-config-field flex items-center justify-center space-x-2">
                            <input type="checkbox" name="scheduleEnabled" class="h-5 w-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" />
                        </div>
                    </div>
                    <div class="node-config-content" data-tab="manual">
                        <div class="node-config-field">
                            <label>Ghi Chú <span title="Mô tả mục đích của trigger thủ công"><i class="fas fa-question-circle"></i></span></label>
                            <textarea name="manualNote" placeholder="Ghi chú cho trigger thủ công" class="w-full p-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"></textarea>
                        </div>
                    </div>
                `;
            case 'http':
                return `
                    <div class="node-config-field">
                        <label>Phương Thức <span title="Loại yêu cầu HTTP (GET, POST, v.v.)"><i class="fas fa-question-circle"></i></span></label>
                        <select name="method" class="w-full p-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500">
                            <option value="GET">GET</option>
                            <option value="POST">POST</option>
                            <option value="PUT">PUT</option>
                            <option value="DELETE">DELETE</option>
                        </select>
                    </div>
                    <div class="node-config-field">
                        <label>URL <span title="Địa chỉ API để gửi yêu cầu"><i class="fas fa-question-circle"></i></span></label>
                        <input type="text" name="url" placeholder="Nhập URL API, ví dụ: https://api.example.com" class="w-full p-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500" />
                    </div>
                    <div class="node-config-field">
                        <label>Header (JSON) <span title="Thông tin bổ sung cho yêu cầu, định dạng JSON"><i class="fas fa-question-circle"></i></span></label>
                        <textarea name="headers" placeholder='Ví dụ: {"Content-Type": "application/json"}' class="w-full p-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"></textarea>
                    </div>
                `;
            case 'ai':
                // Giao diện đơn giản, thân thiện cho người dùng
                return `
                    <div class="node-config-field">
                        <label>Mô Hình AI <span title="Chọn mô hình AI để xử lý dữ liệu"><i class="fas fa-question-circle"></i></span></label>
                        <select name="model" class="w-full p-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500">
                            <option value="gpt-4">Model 1</option>
                            <option value="gemini">Model 2</option>
                            <option value="llama">Model 3</option>
                            <option value="custom">Tùy Chỉnh</option>
                        </select>
                    </div>
                    <div class="node-config-field">
                        <label>Tên Mô Hình Tùy Chỉnh <span title="Nhập tên mô hình nếu chọn Tùy chỉnh"><i class="fas fa-question-circle"></i></span></label>
                        <input type="text" name="customModel" placeholder="Nhập tên mô hình, ví dụ: MyModel" class="w-full p-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500" />
                    </div>
                    <div class="node-config-field">
                        <label>Câu Lệnh (Prompt) <span title="Câu lệnh hướng dẫn AI, ví dụ: Viết bài quảng cáo ngắn"><i class="fas fa-question-circle"></i></span></label>
                        <textarea name="prompt" rows="5" placeholder="Nhập câu lệnh, ví dụ: Viết bài quảng cáo ngắn cho sản phẩm mới" class="w-full p-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"></textarea>
                    </div>
                    <div class="node-config-field">
                        <label>Độ Dài Tối Đa <span title="Số từ tối đa mà AI sẽ tạo ra"><i class="fas fa-question-circle"></i></span></label>
                        <input type="number" name="maxLength" placeholder="Ví dụ: 500" min="1" value="500" class="w-full p-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500" />
                    </div>
                `;
            case 'output':
                return `
                    <div class="node-config-field">
                        <label>Định Dạng Đầu Ra <span title="Chọn định dạng cho kết quả: JSON, Word, hoặc PDF"><i class="fas fa-question-circle"></i></span></label>
                        <select name="format" class="w-full p-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500">
                            <option value="json">JSON</option>
                            <option value="word">Word</option>
                            <option value="pdf">PDF</option>
                        </select>
                    </div>
                    <div class="node-config-field">
                        <label>Đích Xuất <span title="Nơi lưu kết quả: console, file, hoặc API"><i class="fas fa-question-circle"></i></span></label>
                        <select name="destination" class="w-full p-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500">
                            <option value="console">Console</option>
                            <option value="file">File</option>
                            <option value="api">API</option>
                        </select>
                    </div>
                    <div class="node-config-field">
                        <label>Đường Dẫn/URL <span title="Đường dẫn file hoặc URL API để lưu kết quả"><i class="fas fa-question-circle"></i></span></label>
                        <input type="text" name="path" placeholder="Nhập đường dẫn hoặc URL" class="w-full p-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500" />
                    </div>
                    <div class="node-config-field">
                        <label>Nội Dung (Markdown) <span title="Nội dung cho Word/PDF, hỗ trợ định dạng Markdown"><i class="fas fa-question-circle"></i></span></label>
                        <textarea name="content" rows="5" placeholder="Nhập nội dung Markdown cho Word/PDF" class="w-full p-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"></textarea>
                    </div>
                `;
            case 'condition':
                return `
                    <div class="node-config-field">
                        <label>Điều Kiện <span title="Biểu thức điều kiện, ví dụ: data.value > 100"><i class="fas fa-question-circle"></i></span></label>
                        <input type="text" name="condition" placeholder="Ví dụ: data.value > 100" class="w-full p-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500" />
                    </div>
                    <div class="node-config-field">
                        <label>Ngôn Ngữ Biểu Thức <span title="Ngôn ngữ để đánh giá điều kiện: JavaScript hoặc Python"><i class="fas fa-question-circle"></i></span></label>
                        <select name="expressionLanguage" class="w-full p-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500">
                            <option value="javascript">JavaScript</option>
                            <option value="python">Python</option>
                        </select>
                    </div>
                `;
            default:
                return '';
        }
    }

    // --- Hàm cập nhật giao diện cấu hình ---
    // @param {HTMLElement} nodeElement - Phần tử node
    // @param {Object} config - Cấu hình của node
    function updateNodeConfigUI(nodeElement, config) {
        const inputs = nodeElement.querySelectorAll('.node-config-field input, .node-config-field select, .node-config-field textarea, .node-config-field input[type="checkbox"]');
        inputs.forEach(input => {
            if (input.type === 'checkbox') {
                input.checked = config[input.name] || false;
            } else {
                input.value = config[input.name] || '';
            }
        });

        // Cập nhật tab active cho Trigger
        if (config.triggerType) {
            const tabs = nodeElement.querySelectorAll('.node-config-tab');
            const contents = nodeElement.querySelectorAll('.node-config-content');
            tabs.forEach(tab => tab.classList.remove('active'));
            contents.forEach(content => content.classList.remove('active'));
            const activeTab = nodeElement.querySelector(`.node-config-tab[data-tab="${config.triggerType}"]`);
            const activeContent = nodeElement.querySelector(`.node-config-content[data-tab="${config.triggerType}"]`);
            if (activeTab && activeContent) {
                activeTab.classList.add('active');
                activeContent.classList.add('active');
            }
        }
    }

    // --- Hàm cập nhật output kéo được ---
    // @param {HTMLElement} nodeElement - Phần tử node
    // @param {string} output - Dữ liệu output
    function updateDraggableOutput(nodeElement, output) {
        const draggableOutput = nodeElement.querySelector('.node-output-area.draggable');
        if (!output) {
            draggableOutput.style.display = 'none';
            return;
        }
        draggableOutput.style.display = 'flex';
        try {
            const parsedOutput = JSON.parse(output);
            if (parsedOutput.response) {
                draggableOutput.querySelector('.output-content').textContent = parsedOutput.response.substring(0, 50) + (parsedOutput.response.length > 50 ? '...' : '');
            } else {
                draggableOutput.querySelector('.output-content').textContent = JSON.stringify(parsedOutput, null, 2).substring(0, 50) + '...';
            }
        } catch {
            draggableOutput.querySelector('.output-content').textContent = output.substring(0, 50) + (output.length > 50 ? '...' : '');
        }
    }

    // --- Hàm thiết lập sự kiện cho node ---
    // @param {HTMLElement} nodeElement - Phần tử node
    function setupNodeEvents(nodeElement) {
        const node = nodes.find(n => n.element === nodeElement);

        // Xử lý nút xóa node
        nodeElement.querySelector('.node-delete').addEventListener('click', e => {
            e.stopPropagation();
            deleteNode(nodeElement);
        });

        // Xử lý kéo kết nối từ handle
        nodeElement.querySelectorAll('.connection-handle').forEach(handle => {
            handle.addEventListener('mousedown', e => {
                e.stopPropagation();
                if (handle.dataset.type === 'output') {
                    startConnection(handle);
                }
            });
        });

        // Xử lý kéo output
        const draggableOutput = nodeElement.querySelector('.node-output-area.draggable');
        if (draggableOutput) {
            draggableOutput.addEventListener('dragstart', e => {
                e.dataTransfer.setData('text/plain', node.id);
                e.dataTransfer.effectAllowed = 'copy';
                draggedOutput = draggableOutput;
                console.log('Dragstart output:', node.id);
            });

            draggableOutput.addEventListener('dragend', () => {
                console.log('Dragend output');
                draggedOutput = null;
            });
        }

        // Xử lý thả output vào node
        nodeElement.addEventListener('dragover', e => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
        });

        nodeElement.addEventListener('drop', e => {
            e.preventDefault();
            e.stopPropagation();
            if (!draggedOutput) return;

            const sourceNodeId = draggedOutput.dataset.node;
            const targetNodeId = nodeElement.id;
            if (sourceNodeId === targetNodeId) return;

            createConnection(sourceNodeId, targetNodeId, 'output', 'input');
            console.log('Tạo kết nối từ output:', sourceNodeId, 'đến input:', targetNodeId);
        });

        // Xử lý kéo node
        nodeElement.addEventListener('mousedown', e => {
            if (e.target.classList.contains('connection-handle') || 
                e.target.closest('.node-delete') || 
                e.target.closest('.node-output-area') || 
                e.target.closest('.node-config-field') || 
                e.target.closest('.node-config-tab')) return;
            selectNode(nodeElement);
            isDragging = true;
            startX = parseInt(nodeElement.style.left);
            startY = parseInt(nodeElement.style.top);
            startMouseX = e.clientX;
            startMouseY = e.clientY;
            e.preventDefault();
            console.log('Bắt đầu kéo node:', nodeElement.id);
        });

        // Xử lý xem chi tiết output
        const detailsButton = nodeElement.querySelector('.node-output-details');
        if (detailsButton) {
            detailsButton.addEventListener('click', () => {
                if (node.type === 'ai' || node.type === 'output') {
                    modalOutput.innerHTML = marked.parse(JSON.parse(node.output).response || '');
                } else {
                    modalOutput.textContent = JSON.stringify(JSON.parse(node.output || '{}'), null, 2);
                }
                outputModal.classList.remove('hidden');
                console.log('Xem chi tiết output:', node.id);
            });
        }

        // Xử lý chuyển tab cấu hình (dành cho Trigger)
        const tabs = nodeElement.querySelectorAll('.node-config-tab');
        if (tabs.length > 0) {
            tabs.forEach(tab => {
                tab.addEventListener('click', () => {
                    tabs.forEach(t => t.classList.remove('active'));
                    nodeElement.querySelectorAll('.node-config-content').forEach(content => content.classList.remove('active'));
                    tab.classList.add('active');
                    nodeElement.querySelector(`.node-config-content[data-tab="${tab.dataset.tab}"]`).classList.add('active');
                    node.config.triggerType = tab.dataset.tab;
                    saveWorkflowState();
                    console.log('Chuyển tab Trigger:', tab.dataset.tab);
                });
            });
        }

        // Lưu cấu hình khi thay đổi
        const inputs = nodeElement.querySelectorAll('.node-config-field input, .node-config-field select, .node-config-field textarea, .node-config-field input[type="checkbox"]');
        inputs.forEach(input => {
            input.addEventListener('change', () => {
                if (input.type === 'checkbox') {
                    node.config[input.name] = input.checked;
                } else {
                    node.config[input.name] = input.value;
                }
                saveWorkflowState();
                console.log('Cập nhật cấu hình:', input.name, node.config[input.name]);
            });
        });
    }

    // --- Hàm chọn node ---
    // @param {HTMLElement} nodeElement - Phần tử node
    function selectNode(nodeElement) {
        if (selectedNode) selectedNode.classList.remove('selected');
        if (selectedConnection) {
            selectedConnection.pathElement.classList.remove('selected');
            selectedConnection = null;
        }
        if (selectedTemplate) {
            const prevSelected = templateList.querySelector('.template-item.selected');
            if (prevSelected) prevSelected.classList.remove('selected');
            selectedTemplate = null;
        }
        selectedNode = nodeElement;
        nodeElement.classList.add('selected');
        deleteSelectedBtn.classList.remove('hidden');
        console.log('Chọn node:', nodeElement.id);
    }

    // --- Hàm chọn kết nối ---
    // @param {Object} connection - Đối tượng kết nối
    function selectConnection(connection) {
        if (selectedNode) {
            selectedNode.classList.remove('selected');
            selectedNode = null;
        }
        if (selectedConnection) {
            selectedConnection.pathElement.classList.remove('selected');
        }
        if (selectedTemplate) {
            const prevSelected = templateList.querySelector('.template-item.selected');
            if (prevSelected) prevSelected.classList.remove('selected');
            selectedTemplate = null;
        }
        selectedConnection = connection;
        connection.pathElement.classList.add('selected');
        deleteSelectedBtn.classList.remove('hidden');
        console.log('Chọn kết nối:', connection.id);
    }

    // --- Hàm bắt đầu tạo kết nối ---
    // @param {HTMLElement} handle - Handle output
    function startConnection(handle) {
        if (handle.dataset.type !== 'output') return;
        isConnecting = true;
        startHandle = handle;
        const nodeId = handle.dataset.node;
        const node = nodes.find(n => n.id === nodeId);
        const handleRect = handle.getBoundingClientRect();
        const containerRect = workflowContainer.getBoundingClientRect();
        const x = (handleRect.left + handleRect.width / 2 - containerRect.left - offsetX) / scale;
        const y = (handleRect.top + handleRect.height / 2 - containerRect.top - offsetY) / scale;

        tempConnection = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        tempConnection.classList.add('connection-path');
        tempConnection.setAttribute('marker-end', `url(#arrowhead-${getHandleColor(node.type)})`);
        tempConnection.style.stroke = getConnectionColor(node.type);
        connectionsSvg.appendChild(tempConnection);

        tempConnectionLabel = document.createElement('div');
        tempConnectionLabel.classList.add('connection-label');
        tempConnectionLabel.style.position = 'absolute';
        workflowContainer.appendChild(tempConnectionLabel);

        document.addEventListener('mousemove', updateTempConnection);
        document.addEventListener('mouseup', endConnection);
        console.log('Bắt đầu tạo kết nối từ:', nodeId);
    }

    // --- Hàm tìm handle gần nhất ---
    // @param {number} x - Tọa độ X
    // @param {number} y - Tọa độ Y
    // @returns {HTMLElement|null} Handle gần nhất hoặc null
    function findNearestHandle(x, y) {
        const containerRect = workflowContainer.getBoundingClientRect();
        let nearestHandle = null;
        let minDistance = 30 / scale;

        nodes.forEach(node => {
            const handle = node.element.querySelector('.connection-handle.input');
            if (handle && handle !== startHandle) {
                const rect = handle.getBoundingClientRect();
                const hx = (rect.left + rect.width / 2 - containerRect.left - offsetX) / scale;
                const hy = (rect.top + rect.height / 2 - containerRect.top - offsetY) / scale;
                const distance = Math.sqrt((x - hx) ** 2 + (y - hy) ** 2);
                if (distance < minDistance) {
                    minDistance = distance;
                    nearestHandle = handle;
                }
            }
        });

        document.querySelectorAll('.connection-handle.input').forEach(h => h.classList.remove('valid-target'));
        if (nearestHandle) {
            nearestHandle.classList.add('valid-target');
        }

        return nearestHandle;
    }

    // --- Hàm cập nhật đường kết nối tạm thời ---
    const updateTempConnection = throttle(e => {
        if (!isConnecting || !tempConnection) return;
        const containerRect = workflowContainer.getBoundingClientRect();
        const startRect = startHandle.getBoundingClientRect();
        const startX = (startRect.left + startRect.width / 2 - containerRect.left - offsetX) / scale;
        const startY = (startRect.top + startRect.height / 2 - containerRect.top - offsetY) / scale;
        let endX = (e.clientX - containerRect.left - offsetX) / scale;
        let endY = (e.clientY - containerRect.top - offsetY) / scale;

        targetHandle = findNearestHandle(endX, endY);
        if (targetHandle) {
            const targetRect = targetHandle.getBoundingClientRect();
            endX = (targetRect.left + targetRect.width / 2 - containerRect.left - offsetX) / scale;
            endY = (targetRect.top + targetRect.height / 2 - containerRect.top - offsetY) / scale;
        }

        const path = getBezierPath(startX, startY, endX, endY);
        tempConnection.setAttribute('d', path);

        const midX = (startX + endX) / 2;
        const midY = (startY + endY) / 2;
        tempConnectionLabel.style.left = `${midX * scale + offsetX}px`;
        tempConnectionLabel.style.top = `${(midY - 15) * scale + offsetY}px`;
        tempConnectionLabel.textContent = startHandle.dataset.branch || '';
        console.log('Cập nhật kết nối tạm thời:', startX, startY, endX, endY);
    }, 16);

    // --- Hàm kết thúc tạo kết nối ---
    function endConnection() {
        if (!isConnecting) return;
        isConnecting = false;
        document.removeEventListener('mousemove', updateTempConnection);
        document.removeEventListener('mouseup', endConnection);

        if (tempConnection) {
            connectionsSvg.removeChild(tempConnection);
            tempConnection = null;
        }
        if (tempConnectionLabel) {
            workflowContainer.removeChild(tempConnectionLabel);
            tempConnectionLabel = null;
        }

        document.querySelectorAll('.connection-handle.input').forEach(h => h.classList.remove('valid-target'));

        if (!targetHandle) {
            console.log('Hủy kết nối: Không tìm thấy handle đích');
            return;
        }

        const sourceNode = startHandle.dataset.node;
        const targetNode = targetHandle.dataset.node;
        if (sourceNode === targetNode) {
            console.log('Hủy kết nối: Không thể kết nối node với chính nó');
            return;
        }

        const sourceBranch = startHandle.dataset.branch || null;
        createConnection(sourceNode, targetNode, 'output', 'input', sourceBranch);
        targetHandle = null;
    }

    // --- Hàm tạo kết nối ---
    // @param {string} sourceNode - ID node nguồn
    // @param {string} targetNode - ID node đích
    // @param {string} sourceType - Loại handle nguồn
    // @param {string} targetType - Loại handle đích
    // @param {string|null} sourceBranch - Nhánh (true/false cho condition)
    function createConnection(sourceNode, targetNode, sourceType, targetType, sourceBranch = null) {
        const connection = {
            id: `conn-${sourceNode}-${targetNode}-${sourceBranch || 'main'}`,
            sourceNode,
            targetNode,
            sourceType,
            targetType,
            label: sourceBranch || '',
            pathElement: document.createElementNS('http://www.w3.org/2000/svg', 'path'),
            labelElement: document.createElement('div')
        };

        const sourceNodeData = nodes.find(n => n.id === sourceNode);
        connection.pathElement.classList.add('connection-path');
        connection.pathElement.setAttribute('marker-end', `url(#arrowhead-${getHandleColor(sourceNodeData.type)})`);
        connection.pathElement.style.stroke = getConnectionColor(sourceNodeData.type);
        connection.pathElement.addEventListener('click', e => {
            e.stopPropagation();
            selectConnection(connection);
        });

        connection.labelElement.classList.add('connection-label');
        connection.labelElement.style.position = 'absolute';

        connectionsSvg.appendChild(connection.pathElement);
        workflowContainer.appendChild(connection.labelElement);
        connections.push(connection);
        updateConnection(connection);
        console.log('Tạo kết nối:', connection.id);
    }

    // --- Hàm cập nhật kết nối ---
    // @param {Object} connection - Đối tượng kết nối
    function updateConnection(connection) {
        const sourceNode = nodes.find(n => n.id === connection.sourceNode);
        const targetNode = nodes.find(n => n.id === connection.targetNode);
        if (!sourceNode || !targetNode) return;

        const sourceHandle = sourceNode.element.querySelector(`.connection-handle.${connection.sourceType}${connection.label ? `[data-branch="${connection.label}"]` : ''}`);
        const targetHandle = targetNode.element.querySelector(`.connection-handle.${connection.targetType}`);
        if (!sourceHandle || !targetHandle) return;

        const containerRect = workflowContainer.getBoundingClientRect();
        const sourceRect = sourceHandle.getBoundingClientRect();
        const targetRect = targetHandle.getBoundingClientRect();

        const startX = (sourceRect.left + sourceRect.width / 2 - containerRect.left - offsetX) / scale;
        const startY = (sourceRect.top + sourceRect.height / 2 - containerRect.top - offsetY) / scale;
        const endX = (targetRect.left + targetRect.width / 2 - containerRect.left - offsetX) / scale;
        const endY = (targetRect.top + targetRect.height / 2 - containerRect.top - offsetY) / scale;

        const path = getBezierPath(startX, startY, endX, endY);
        connection.pathElement.setAttribute('d', path);

        const midX = (startX + endX) / 2;
        const midY = (startY + endY) / 2;
        connection.labelElement.style.left = `${midX * scale + offsetX}px`;
        connection.labelElement.style.top = `${(midY - 15) * scale + offsetY}px`;
        connection.labelElement.textContent = connection.label;
    }

    // --- Hàm tạo đường cong Bezier ---
    // @param {number} startX - Tọa độ X bắt đầu
    // @param {number} startY - Tọa độ Y bắt đầu
    // @param {number} endX - Tọa độ X kết thúc
    // @param {number} endY - Tọa độ Y kết thúc
    // @returns {string} Đường dẫn SVG
    function getBezierPath(startX, startY, endX, endY) {
        const distX = endX - startX;
        const cx1 = startX + distX * 0.5;
        const cy1 = startY;
        const cx2 = endX - distX * 0.5;
        const cy2 = endY;
        return `M${startX},${startY} C${cx1},${cy1} ${cx2},${cy2} ${endX},${endY}`;
    }

    // --- Hàm lấy màu handle ---
    // @param {string} type - Loại node
    // @returns {string} Màu handle
    function getHandleColor(type) {
        const colors = {
            trigger: 'trigger',
            http: 'blue',
            ai: 'orange',
            output: 'green',
            condition: 'condition'
        };
        return colors[type] || '';
    }

    // --- Hàm lấy màu đường kết nối ---
    // @param {string} type - Loại node
    // @returns {string} Màu đường kết nối
    function getConnectionColor(type) {
        const colors = {
            trigger: '#4f46e5',
            http: '#3b82f6',
            ai: '#f59e0b',
            output: '#10b981',
            condition: '#9333ea'
        };
        return colors[type] || '#6b7280';
    }

    // --- Hàm xóa node ---
    // @param {HTMLElement} nodeElement - Phần tử node
    function deleteNode(nodeElement) {
        const nodeId = nodeElement.id;
        connections = connections.filter(c => {
            if (c.sourceNode === nodeId || c.targetNode === nodeId) {
                if (c.pathElement && c.pathElement.parentNode) c.pathElement.parentNode.removeChild(c.pathElement);
                if (c.labelElement && c.labelElement.parentNode) c.labelElement.parentNode.removeChild(c.labelElement);
                return false;
            }
            return true;
        });

        nodes = nodes.filter(n => n.id !== nodeId);
        if (nodeElement.parentNode) {
            nodeElement.parentNode.removeChild(nodeElement);
        }

        if (selectedNode === nodeElement) {
            selectedNode = null;
            deleteSelectedBtn.classList.add('hidden');
        }

        saveWorkflowState();
        console.log('Xóa node:', nodeId);
    }

    // --- Xử lý sự kiện ---

    // Xử lý xóa node, kết nối hoặc template
    deleteSelectedBtn.addEventListener('click', () => {
        if (selectedNode) {
            deleteNode(selectedNode);
        } else if (selectedConnection) {
            connections = connections.filter(c => c !== selectedConnection);
            if (selectedConnection.pathElement && selectedConnection.pathElement.parentNode) {
                selectedConnection.pathElement.parentNode.removeChild(selectedConnection.pathElement);
            }
            if (selectedConnection.labelElement && selectedConnection.labelElement.parentNode) {
                selectedConnection.labelElement.parentNode.removeChild(selectedConnection.labelElement);
            }
            selectedConnection = null;
            deleteSelectedBtn.classList.add('hidden');
            saveWorkflowState();
            console.log('Xóa kết nối:', selectedConnection.id);
        } else if (selectedTemplate) {
            deleteTemplate(selectedTemplate);
            console.log('Xóa template:', selectedTemplate.name);
        }
    });

    // Xử lý phím Delete
    document.addEventListener('keydown', e => {
        if (e.key === 'Delete' && (selectedNode || selectedConnection || selectedTemplate)) {
            deleteSelectedBtn.click();
            console.log('Nhấn phím Delete');
        }
    });

    // Xử lý phóng to/thu nhỏ
    zoomInBtn.addEventListener('click', () => {
        scale = Math.min(scale + 0.1, 2);
        updateTransform();
        console.log('Phóng to, scale:', scale);
    });

    zoomOutBtn.addEventListener('click', () => {
        scale = Math.max(scale - 0.1, 0.5);
        updateTransform();
        console.log('Thu nhỏ, scale:', scale);
    });

    // Xử lý căn giữa
    centerViewBtn.addEventListener('click', () => {
        offsetX = 0;
        offsetY = 0;
        scale = 1;
        updateTransform();
        console.log('Căn giữa canvas');
    });

    // Cập nhật biến đổi canvas
    function updateTransform() {
        workflowContainer.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
        requestAnimationFrame(() => connections.forEach(updateConnection));
    }

    // Xử lý lưu luồng công việc
    saveBtn.addEventListener('click', () => {
        try {
            if (nodes.length === 0) throw new Error('Không có node nào để lưu');
            if (saveWorkflowState()) {
                downloadWorkflowAsJson();
                alert('Lưu luồng công việc thành công!');
            }
        } catch (error) {
            console.error('Lỗi khi lưu:', error);
            alert('Lỗi khi lưu: ' + error.message);
        }
    });

    // Xử lý lưu template
    saveTemplateBtn.addEventListener('click', () => {
        if (nodes.length === 0) {
            alert('Không có node nào để lưu thành template!');
            return;
        }
        saveTemplateModal.classList.remove('hidden');
        console.log('Mở modal lưu template');
    });

    confirmSaveTemplateBtn.addEventListener('click', () => {
        const name = templateNameInput.value.trim();
        const description = templateDescriptionInput.value.trim();
        if (!name) {
            alert('Vui lòng nhập tên template!');
            return;
        }
        if (saveTemplate(name, description)) {
            saveTemplateModal.classList.add('hidden');
            templateNameInput.value = '';
            templateDescriptionInput.value = '';
            alert('Lưu template thành công!');
            console.log('Lưu template:', name);
        }
    });

    closeTemplateModalBtn.addEventListener('click', () => {
        saveTemplateModal.classList.add('hidden');
        console.log('Đóng modal lưu template');
    });

    // --- Hàm chạy node ---
    // @param {Object} node - Đối tượng node
    // @returns {Promise} Promise hoàn thành khi node chạy xong
    async function runNode(node) {
        const incomingConnections = connections.filter(c => c.targetNode === node.id);
       
        incomingConnections.forEach(conn => {
            if (conn.pathElement) conn.pathElement.classList.add('loading-incoming');
        });

        node.element.classList.add('loading');
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Lấy dữ liệu đầu vào từ node trước đó (nếu có)
        let inputData = null;
        if (incomingConnections.length > 0) {
            // Lấy node nguồn đầu tiên (có thể mở rộng để xử lý nhiều nguồn)
            const sourceNodeId = incomingConnections[0].sourceNode;
            const sourceNode = nodes.find(n => n.id === sourceNodeId);
            
            if (sourceNode && sourceNode.output) {
                try {
                    // Phân tích dữ liệu từ node trước
                    inputData = JSON.parse(sourceNode.output);
                    console.log(`Truyền dữ liệu từ ${sourceNode.id} sang ${node.id}:`, inputData);
                } catch (e) {
                    console.warn('Không thể phân tích dữ liệu đầu vào:', e);
                }
            }
        }
        let output = {};
        try {
            if (node.type === 'trigger') {
                output = {
                    timestamp: new Date().toISOString(),
                    triggerType: node.config.triggerType || 'webhook',
                    webhookUrl: node.config.webhookUrl || '',
                    webhookMethod: node.config.webhookMethod || 'POST',
                    interval: node.config.interval || 60,
                    scheduleEnabled: node.config.scheduleEnabled || false,
                    manualNote: node.config.manualNote || ''
                };
                // TODO: Tích hợp API cho Trigger
                // - Nếu triggerType là "webhook": Gọi API webhook với URL từ config.webhookUrl, sử dụng phương thức từ config.webhookMethod.
                //   Ví dụ API: fetch(config.webhookUrl, { method: config.webhookMethod })
                //   Kết quả mong đợi: Trả về dữ liệu từ webhook (JSON hoặc text) để lưu vào output.
                // - Nếu triggerType là "schedule" và config.scheduleEnabled là true: Gọi API lập lịch (nếu có) để thiết lập lịch trình chạy luồng công việc với khoảng thời gian config.interval phút.
                //   Ví dụ API: Gọi API lập lịch như setInterval hoặc API của dịch vụ lập lịch (CronJob API).
                //   Kết quả mong đợi: Xác nhận lịch trình đã được thiết lập.
                // - Nếu triggerType là "manual": Gọi API ghi log (nếu có) để lưu config.manualNote vào hệ thống log.
                //   Ví dụ API: fetch('/api/log', { method: 'POST', body: JSON.stringify({ note: config.manualNote }) })
                //   Kết quả mong đợi: Xác nhận ghi log thành công.
            } else if (node.type === 'http') {
                try {
                    const response = await fetch('api/execute/http', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            config: node.config,
                            input: {}
                        })
                    });
                    if (response.ok) {
                        const data = await response.json();
                        output = data.output;
                        console.log('HTTP Node output:', JSON.stringify(output).substring(0, 200) + '...');

                    } else {
                        throw new Error('Lỗi khi gọi API HTTP');
                    }

                } catch (e) {
                    console.error('Lỗi khi gọi API HTTP:', e);
                    // Dữ liệu mặc định nếu không có server
                    output = {
                        status: 200,
                        data: {
                            message: `Đã gọi ${node.config.url || 'https://api.example.com'}`,
                            method: node.config.method || 'GET',
                            headers: JSON.parse(node.config.headers || '{}')
                        }
                    };
                }
            } else if (node.type === 'ai') {
                
                // Gọi API server
                try {
                    // Gọi API server cho AI node
                    console.log('Gửi dữ liệu đến AI node:', inputData);
                    
                    const response = await fetch('/api/execute/ai', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            config: node.config,
                            input: inputData // Truyền dữ liệu từ HTTP node
                        })
                    });
                    
                    if (response.ok) {
                        const result = await response.json();
                        output = result.output;
                        console.log('AI Node output received');
                    } else {
                        throw new Error('Lỗi server AI');
                    }
                } catch (e) {
                    console.warn('Không thể kết nối đến server AI, sử dụng dữ liệu giả lập:', e);
                    
                    // Dữ liệu mặc định khi không kết nối được server
                    const defaultPrompt = "Hãy phân tích dữ liệu sau đây";
                    const prompt = node.config.prompt || defaultPrompt;
                    
                    output = {
                        model: node.config.model || 'gemini',
                        prompt: prompt,
                        response: `# Phân tích dữ liệu (Mô phỏng)\n\nLưu ý: Đây là phản hồi giả lập do không kết nối được tới server. Trong môi trường thực tế, dữ liệu sẽ được phân tích dựa trên prompt: "${prompt}".`
                    };
                }
                // TODO: Tích hợp API cho AI Agent
                // - Gọi API AI với mô hình từ effectiveModel, prompt từ config.prompt, và độ dài tối đa từ config.maxLength.
                //   Ví dụ API: 
                //   - Nếu là GPT-4: Gọi API OpenAI (https://api.openai.com/v1/completions) với tham số { model: effectiveModel, prompt: config.prompt, max_tokens: config.maxLength }
                //   - Nếu là Gemini: Gọi API Google AI với tham số tương ứng.
                //   - Nếu là LLaMA hoặc custom: Gọi API tùy chỉnh với mô hình từ config.customModel.
                //   Kết quả mong đợi: Trả về kết quả AI dưới dạng text hoặc Markdown để lưu vào output.response.
                //   Xử lý lỗi: Nếu API thất bại, lưu thông báo lỗi vào output (ví dụ: output.error = 'Lỗi gọi API AI').
            } else if (node.type === 'output') {
                try {
                    // Lấy cấu hình
                    const format = node.config.format || 'json';
                    const destination = node.config.destination || 'console';
                    const path = node.config.path || '';
                    
                    // Lấy nội dung từ cấu hình hoặc từ node trước đó
                    let content = node.config.content || '';
                    
                    // Nếu có dữ liệu đầu vào từ node trước đó và đó là AI node
                    if (inputData && inputData.response) {
                        // Sử dụng response từ AI node (thường là Markdown)
                        content = inputData.response;
                        console.log('Output node: Sử dụng nội dung từ AI node');
                    } else if (inputData) {
                        // Nếu có dữ liệu đầu vào nhưng không phải từ AI node
                        content = JSON.stringify(inputData, null, 2);
                        console.log('Output node: Chuyển đổi dữ liệu đầu vào sang JSON');
                    }
                    
                    // Hiển thị thông báo xử lý
                    const outputArea = node.element.querySelector('.node-output-area');
                    if (outputArea) {
                        outputArea.style.display = 'block';
                        outputArea.querySelector('.output-content').innerHTML = '<div class="flex justify-center"><i class="fas fa-spinner fa-spin mr-2"></i> Đang xử lý...</div>';
                    }
                    
                    // Gửi dữ liệu đến server
                    try {
                        const response = await fetch('/api/execute/output', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                config: {
                                    format,
                                    destination,
                                    path,
                                    content // Chỉ sử dụng nếu không có dữ liệu từ AI node
                                },
                                input: inputData // Truyền dữ liệu từ node trước (ưu tiên)
                            })
                        });
                        
                        if (response.ok) {
                            const result = await response.json();
                            output = result.output;
                            console.log('Output Node hoàn thành:', output);
                            
                            // Hiển thị kết quả trong giao diện
                            if (outputArea) {
                                // Xử lý hiển thị tùy theo định dạng
                                let outputDisplay = '';
                                
                                if (format === 'json') {
                                    // Định dạng JSON
                                    if (output.data) {
                                        // Hiển thị dữ liệu
                                        outputDisplay = `<div class="p-2 bg-gray-50 rounded overflow-auto max-h-32">
                                            <pre class="text-xs">${JSON.stringify(output.data, null, 2)}</pre>
                                        </div>`;
                                    }
                                    
                                    // Thêm thông báo
                                    outputDisplay += `<div class="mt-2 text-green-600"><i class="fas fa-check-circle mr-2"></i>${output.response}</div>`;
                                    
                                    // Thêm nút tải xuống nếu có
                                    if (output.downloadUrl) {
                                        outputDisplay += `<div class="mt-2">
                                            <a href="${output.downloadUrl}" target="_blank" class="text-blue-500 hover:underline">
                                                <i class="fas fa-download mr-2"></i>Tải xuống file
                                            </a>
                                        </div>`;
                                    }
                                } else if (format === 'word' || format === 'pdf') {
                                    // Định dạng Word hoặc PDF
                                    outputDisplay = `<div class="bg-blue-50 border-l-4 border-blue-400 p-3 text-sm">
                                        <i class="fas fa-${format === 'word' ? 'file-word' : 'file-pdf'} mr-2 text-blue-500"></i>
                                        ${output.response}
                                    </div>`;
                                    
                                    // Thêm nút tải xuống nếu có
                                    if (output.downloadUrl) {
                                        outputDisplay += `<div class="mt-2">
                                            <a href="${output.downloadUrl}" target="_blank" class="text-blue-500 hover:underline">
                                                <i class="fas fa-download mr-2"></i>Tải xuống file ${format.toUpperCase()}
                                            </a>
                                        </div>`;
                                    }
                                }
                                
                                // Hiển thị
                                outputArea.querySelector('.output-content').innerHTML = outputDisplay;
                            }
                        } else {
                            // Hiển thị lỗi
                            const errorData = await response.json();
                            throw new Error(errorData.error || 'Lỗi server');
                        }
                    } catch (e) {
                        console.warn('Không thể kết nối đến server Output:', e);
                        
                        // Xử lý client-side (giả lập)
                        if (format === 'json') {
                            output = {
                                format: 'json',
                                destination: destination,
                                path: path,
                                response: `Đã xử lý dữ liệu JSON (giả lập)`,
                                timestamp: new Date().toISOString(),
                                error: e.message
                            };
                        } else if (format === 'word') {
                            output = {
                                format: 'word',
                                destination: destination,
                                path: path,
                                response: `Không thể tạo tài liệu Word: ${e.message}`,
                                timestamp: new Date().toISOString(),
                                error: e.message
                            };
                        } else if (format === 'pdf') {
                            output = {
                                format: 'pdf',
                                destination: destination,
                                path: path,
                                response: `Không thể tạo tài liệu PDF: ${e.message}`,
                                timestamp: new Date().toISOString(),
                                error: e.message
                            };
                        }
                        
                        // Hiển thị lỗi trong giao diện
                        if (outputArea) {
                            outputArea.querySelector('.output-content').innerHTML = `
                                <div class="bg-red-50 border-l-4 border-red-400 p-3 text-sm text-red-700">
                                    <i class="fas fa-exclamation-circle mr-2"></i>
                                    ${output.error}
                                </div>`;
                        }
                    }
                } catch (error) {
                    console.error('Lỗi Output node:', error);
                    output = {
                        error: true,
                        message: error.message
                    };
                    
                    // Hiển thị lỗi trong giao diện
                    const outputArea = node.element.querySelector('.node-output-area');
                    if (outputArea) {
                        outputArea.querySelector('.output-content').innerHTML = `
                            <div class="bg-red-50 border-l-4 border-red-400 p-3 text-sm text-red-700">
                                <i class="fas fa-exclamation-circle mr-2"></i>
                                ${error.message}
                            </div>`;
                    }
                }
                
                // TODO: Tích hợp API cho Output
                //   - Nếu config.format là "json":
                //   - Nếu config.destination là "console": In kết quả ra console (console.log).
                //   - Nếu config.destination là "file": Gọi API lưu file (nếu có) để lưu output.response vào file tại config.path.
                //     Ví dụ API: fetch('/api/save-file', { method: 'POST', body: JSON.stringify({ path: config.path, content: output.response }) })
                //     Kết quả mong đợi: Xác nhận lưu file thành công.
                //   - Nếu config.destination là "api": Gọi API để gửi output.response đến config.path.
                //     Ví dụ API: fetch(config.path, { method: 'POST', body: JSON.stringify(output.response) })
                //     Kết quả mong đợi: Xác nhận gửi API thành công.
                //   - Nếu config.format là "word":
                //   - Chuyển Markdown (config.content) thành HTML, sau đó gọi API tạo file DOCX (ví dụ: sử dụng API của Docxtemplater hoặc dịch vụ tạo Word).
                //     Ví dụ API: fetch('/api/generate-word', { method: 'POST', body: JSON.stringify({ content: marked.parse(config.content) }) })
                //     Kết quả mong đợi: Trả về file Word hoặc đường dẫn file đã tạo.
                //   - Nếu config.format là "pdf":
                //   - Chuyển Markdown (config.content) thành LaTeX (đã có sẵn), sau đó gọi API tạo PDF (ví dụ: sử dụng API của pdfLaTeX hoặc dịch vụ tạo PDF).
                //     Ví dụ API: fetch('/api/generate-pdf', { method: 'POST', body: JSON.stringify({ content: contentOutput }) })
                //     Kết quả mong đợi: Trả về file PDF hoặc đường dẫn file đã tạo.
            } else if (node.type === 'condition') {
                // Xử lý condition node
                output = {
                    condition: node.config.condition || 'data.value > 100',
                    expressionLanguage: node.config.expressionLanguage || 'javascript',
                    result: Math.random() > 0.5 ? 'true' : 'false'
                };
            }
        } catch (error) {
            console.error(`Lỗi khi xử lý node ${node.type}:`, error);
            output = {
                error: true,
                message: error.message
            };
        }
        // Lưu output vào node
        node.output = JSON.stringify(output, null, 2);
        const outputArea = node.element.querySelector('.node-output-area');
        outputArea.style.display = 'block';
        if (node.type === 'ai' || node.type === 'output') {
            outputArea.querySelector('.output-content').innerHTML = marked.parse(output.response || '');
        } else {
            outputArea.querySelector('.output-content').textContent = JSON.stringify(output, null, 2);
        }
        updateDraggableOutput(node.element, node.output);
        node.element.classList.remove('loading');

        incomingConnections.forEach(conn => {
            if (conn.pathElement) conn.pathElement.classList.remove('loading-incoming');
        });

        // Cập nhật kết nối sau khi chạy node
        connections.forEach(updateConnection);
        console.log('Chạy node thành công:', node.id);
        return output;
    }

    // --- Sự kiện chạy luồng công việc ---
    runBtn.addEventListener('click', async () => {
        try {
            if (nodes.length === 0) throw new Error('Không có node nào để chạy');
            if (!nodes.some(n => n.type === 'trigger')) throw new Error('Cần ít nhất một node Trigger');

            for (const node of nodes) {
                await runNode(node);
            }

            console.log('Chạy luồng công việc thành công');
            alert('Chạy luồng công việc thành công!');
            saveWorkflowState();
        } catch (error) {
            console.error('Lỗi khi chạy:', error);
            alert('Lỗi khi chạy: ' + error.message);
            nodes.forEach(node => {
                node.element.classList.remove('loading');
                const incomingConnections = connections.filter(c => c.targetNode === node.id);
                incomingConnections.forEach(conn => {
                    if (conn.pathElement) conn.pathElement.classList.remove('loading-incoming');
                });
            });
        }
    });

    // --- Sự kiện đóng modal ---
    closeModalBtn.addEventListener('click', () => {
        outputModal.classList.add('hidden');
        console.log('Đóng modal output');
    });

    // --- Xử lý di chuyển chuột ---
    document.addEventListener('mousemove', throttle(e => {
        if (isDragging && selectedNode) {
            const deltaX = (e.clientX - startMouseX) / scale;
            const deltaY = (e.clientY - startMouseY) / scale;
            const newX = Math.round((startX + deltaX) / 20) * 20;
            const newY = Math.round((startY + deltaY) / 20) * 20;
            selectedNode.style.left = `${newX}px`;
            selectedNode.style.top = `${newY}px`;
            const node = nodes.find(n => n.element === selectedNode);
            node.x = newX;
            node.y = newY;
            requestAnimationFrame(() => {
                connections
                    .filter(c => c.sourceNode === node.id || c.targetNode === node.id)
                    .forEach(updateConnection);
            });
            console.log('Di chuyển node:', node.id, 'đến:', newX, newY);
        }
    }, 16));

    // --- Xử lý thả chuột ---
    document.addEventListener('mouseup', () => {
        if (isDragging) {
            console.log('Kết thúc kéo node');
        }
        isDragging = false;
    });

    // --- Định nghĩa mũi tên cho SVG ---
    const arrowDefs = `
        <defs>
            <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill="#6b7280"/>
            </marker>
            <marker id="arrowhead-green" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill="#10b981"/>
            </marker>
            <marker id="arrowhead-orange" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill="#f59e0b"/>
            </marker>
            <marker id="arrowhead-blue" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill="#3b82f6"/>
            </marker>
            <marker id="arrowhead-condition" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill="#9333ea"/>
            </marker>
            <marker id="arrowhead-trigger" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill="#4f46e5"/>
            </marker>
        </defs>
    `;
    connectionsSvg.innerHTML = arrowDefs;
});