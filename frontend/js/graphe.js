// ========================================
// FORMAT PHONE (pour le module graphe)
// ========================================
function formatPhone(phone) {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
        return cleaned.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5');
    }
    return phone;
}

// ========================================
// GRAPHE - Module autonome
// ========================================

// Utilisation d'un objet pour éviter les conflits de variables
const GrapheModule = {
    nodes: [],
    edges: [],
    zoom: 1,
    panX: 0,
    panY: 0,
    isPanning: false,
    panStartX: 0,
    panStartY: 0,
    panStartPanX: 0,
    panStartPanY: 0,
    draggingNode: null,
    dragOffsetX: 0,
    dragOffsetY: 0,
    contextNode: null,
    linkMode: false,
    linkFrom: null,
    isInitialized: false,
    canvas: null,
    ctx: null,
    animationId: null,
    colors: ['#ffffff', '#ef4444', '#f59e0b', '#22c55e', '#06b6d4', '#ec4899', '#8b5cf6', '#f97316']
};

// Exposer les données dans window pour compatibilité
window.grapheNodes = GrapheModule.nodes;
window.grapheEdges = GrapheModule.edges;
window.grapheZoom = GrapheModule.zoom;
window.graphePanX = GrapheModule.panX;
window.graphePanY = GrapheModule.panY;
window.grapheIsPanning = GrapheModule.isPanning;
window.graphePanStartX = GrapheModule.panStartX;
window.graphePanStartY = GrapheModule.panStartY;
window.graphePanStartPanX = GrapheModule.panStartPanX;
window.graphePanStartPanY = GrapheModule.panStartPanY;
window.grapheDraggingNode = GrapheModule.draggingNode;
window.grapheDragOffsetX = GrapheModule.dragOffsetX;
window.grapheDragOffsetY = GrapheModule.dragOffsetY;
window.grapheContextNode = GrapheModule.contextNode;
window.grapheLinkMode = GrapheModule.linkMode;
window.grapheLinkFrom = GrapheModule.linkFrom;
window.grapheIsInitialized = GrapheModule.isInitialized;

function initGrapheModule() {
    const canvas = document.getElementById('grapheCanvas');
    if (!canvas) {
        console.error('Canvas du graphe non trouve');
        setTimeout(initGrapheModule, 300);
        return;
    }
    GrapheModule.canvas = canvas;
    GrapheModule.ctx = canvas.getContext('2d');
    resizeGraphe();
    canvas.onmousedown = onGrapheMouseDown;
    canvas.onmousemove = onGrapheMouseMove;
    canvas.onmouseup = onGrapheMouseUp;
    canvas.onmouseleave = onGrapheMouseUp;
    canvas.onwheel = onGrapheWheel;
    canvas.oncontextmenu = (e) => e.preventDefault();
    window.addEventListener('resize', resizeGraphe);
    GrapheModule.isInitialized = true;
    window.grapheIsInitialized = true;
    renderGraphe();
    console.log('Graphe initialise avec', GrapheModule.nodes.length, 'noeuds');
}

function resizeGraphe() {
    const container = document.getElementById('grapheContainer');
    if (!container || !GrapheModule.canvas) return;
    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    GrapheModule.canvas.width = rect.width * dpr;
    GrapheModule.canvas.height = rect.height * dpr;
    GrapheModule.canvas.style.width = rect.width + 'px';
    GrapheModule.canvas.style.height = rect.height + 'px';
    if (GrapheModule.ctx) {
        GrapheModule.ctx.scale(dpr, dpr);
    }
}

function renderGraphe() {
    if (!GrapheModule.ctx || !GrapheModule.canvas) return;
    const rect = GrapheModule.canvas.getBoundingClientRect();
    const W = rect.width;
    const H = rect.height;
    GrapheModule.ctx.clearRect(0, 0, W, H);
    const step = 40;
    const ox = ((GrapheModule.panX % step) + step) % step;
    const oy = ((GrapheModule.panY % step) + step) % step;
    GrapheModule.ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    GrapheModule.ctx.lineWidth = 1;
    for (let x = -step + ox; x < W + step; x += step) {
        GrapheModule.ctx.beginPath();
        GrapheModule.ctx.moveTo(x, 0);
        GrapheModule.ctx.lineTo(x, H);
        GrapheModule.ctx.stroke();
    }
    for (let y = -step + oy; y < H + step; y += step) {
        GrapheModule.ctx.beginPath();
        GrapheModule.ctx.moveTo(0, y);
        GrapheModule.ctx.lineTo(W, y);
        GrapheModule.ctx.stroke();
    }
    GrapheModule.ctx.save();
    GrapheModule.ctx.translate(GrapheModule.panX, GrapheModule.panY);
    GrapheModule.ctx.scale(GrapheModule.zoom, GrapheModule.zoom);
    GrapheModule.edges.forEach(edge => {
        const from = GrapheModule.nodes.find(n => n.id === edge.from);
        const to = GrapheModule.nodes.find(n => n.id === edge.to);
        if (!from || !to) return;
        GrapheModule.ctx.beginPath();
        GrapheModule.ctx.moveTo(from.x, from.y);
        GrapheModule.ctx.lineTo(to.x, to.y);
        GrapheModule.ctx.strokeStyle = 'rgba(255,255,255,0.25)';
        GrapheModule.ctx.lineWidth = 2 / GrapheModule.zoom;
        GrapheModule.ctx.stroke();
    });
    GrapheModule.nodes.forEach(node => {
        const r = node.radius || 24;
        const isSelected = GrapheModule.linkMode && GrapheModule.linkFrom === node.id;
        const isHover = node._hover;
        GrapheModule.ctx.beginPath();
        GrapheModule.ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
        GrapheModule.ctx.fillStyle = isSelected ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.06)';
        GrapheModule.ctx.fill();
        GrapheModule.ctx.strokeStyle = isSelected ? '#ffffff' : (isHover ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.2)');
        GrapheModule.ctx.lineWidth = isSelected ? 3 / GrapheModule.zoom : 1.5 / GrapheModule.zoom;
        GrapheModule.ctx.stroke();
        GrapheModule.ctx.fillStyle = '#ffffff';
        GrapheModule.ctx.font = `${12 / GrapheModule.zoom}px Inter`;
        GrapheModule.ctx.textAlign = 'center';
        GrapheModule.ctx.textBaseline = 'top';
        let label = node.label || 'Personne';
        if (label.length > 18) label = label.slice(0, 16) + '...';
        GrapheModule.ctx.fillText(label, node.x, node.y + r + 6 / GrapheModule.zoom);
        if (node.role) {
            GrapheModule.ctx.fillStyle = 'rgba(255,255,255,0.35)';
            GrapheModule.ctx.font = `${10 / GrapheModule.zoom}px Inter`;
            GrapheModule.ctx.fillText(node.role, node.x, node.y + r + 22 / GrapheModule.zoom);
        }
    });
    GrapheModule.ctx.restore();
    GrapheModule.animationId = requestAnimationFrame(renderGraphe);
}

function getGraphePos(e) {
    const rect = GrapheModule.canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

function getGrapheNode(x, y) {
    const wx = (x - GrapheModule.panX) / GrapheModule.zoom;
    const wy = (y - GrapheModule.panY) / GrapheModule.zoom;
    for (let i = GrapheModule.nodes.length - 1; i >= 0; i--) {
        const node = GrapheModule.nodes[i];
        const dx = wx - node.x;
        const dy = wy - node.y;
        const r = node.radius || 24;
        if (dx * dx + dy * dy < r * r) {
            return node;
        }
    }
    return null;
}

function onGrapheMouseDown(e) {
    const pos = getGraphePos(e);
    const node = getGrapheNode(pos.x, pos.y);
    if (e.button === 2) {
        if (node) {
            GrapheModule.contextNode = node;
            window.grapheContextNode = node;
            showGrapheContextMenu(e.clientX, e.clientY);
        }
        return;
    }
    if (GrapheModule.linkMode && node) {
        if (GrapheModule.linkFrom === null) {
            GrapheModule.linkFrom = node.id;
            window.grapheLinkFrom = node.id;
            showToast('Selectionnez la destination', 'info');
            return;
        }
        if (GrapheModule.linkFrom !== node.id) {
            GrapheModule.edges.push({ id: Date.now(), from: GrapheModule.linkFrom, to: node.id });
            window.grapheEdges = GrapheModule.edges;
            GrapheModule.linkFrom = null;
            window.grapheLinkFrom = null;
            GrapheModule.linkMode = false;
            window.grapheLinkMode = false;
            const btn = document.getElementById('grapheAttacher');
            if (btn) {
                btn.style.background = 'rgba(255,255,255,0.05)';
                btn.style.borderColor = 'var(--border-color)';
                btn.style.color = 'var(--text-secondary)';
            }
            showToast('Personnes attachees !', 'success');
        }
        return;
    }
    if (node) {
        GrapheModule.draggingNode = node;
        window.grapheDraggingNode = node;
        const wx = (pos.x - GrapheModule.panX) / GrapheModule.zoom;
        const wy = (pos.y - GrapheModule.panY) / GrapheModule.zoom;
        GrapheModule.dragOffsetX = wx - node.x;
        GrapheModule.dragOffsetY = wy - node.y;
        window.grapheDragOffsetX = GrapheModule.dragOffsetX;
        window.grapheDragOffsetY = GrapheModule.dragOffsetY;
        GrapheModule.canvas.style.cursor = 'grabbing';
        return;
    }
    GrapheModule.isPanning = true;
    window.grapheIsPanning = true;
    GrapheModule.panStartX = pos.x;
    GrapheModule.panStartY = pos.y;
    GrapheModule.panStartPanX = GrapheModule.panX;
    GrapheModule.panStartPanY = GrapheModule.panY;
    window.graphePanStartX = pos.x;
    window.graphePanStartY = pos.y;
    window.graphePanStartPanX = GrapheModule.panX;
    window.graphePanStartPanY = GrapheModule.panY;
    GrapheModule.canvas.style.cursor = 'grabbing';
}

function onGrapheMouseMove(e) {
    const pos = getGraphePos(e);
    const node = getGrapheNode(pos.x, pos.y);
    GrapheModule.nodes.forEach(n => n._hover = false);
    if (node) node._hover = true;
    if (GrapheModule.draggingNode) {
        const wx = (pos.x - GrapheModule.panX) / GrapheModule.zoom;
        const wy = (pos.y - GrapheModule.panY) / GrapheModule.zoom;
        GrapheModule.draggingNode.x = wx - GrapheModule.dragOffsetX;
        GrapheModule.draggingNode.y = wy - GrapheModule.dragOffsetY;
        return;
    }
    if (GrapheModule.isPanning) {
        GrapheModule.panX = GrapheModule.panStartPanX + (pos.x - GrapheModule.panStartX);
        GrapheModule.panY = GrapheModule.panStartPanY + (pos.y - GrapheModule.panStartY);
        window.graphePanX = GrapheModule.panX;
        window.graphePanY = GrapheModule.panY;
    }
}

function onGrapheMouseUp() {
    GrapheModule.draggingNode = null;
    window.grapheDraggingNode = null;
    GrapheModule.isPanning = false;
    window.grapheIsPanning = false;
    GrapheModule.canvas.style.cursor = 'grab';
}

function onGrapheWheel(e) {
    e.preventDefault();
    const pos = getGraphePos(e);
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.3, Math.min(3, GrapheModule.zoom * delta));
    const wx = (pos.x - GrapheModule.panX) / GrapheModule.zoom;
    const wy = (pos.y - GrapheModule.panY) / GrapheModule.zoom;
    GrapheModule.zoom = newZoom;
    window.grapheZoom = newZoom;
    GrapheModule.panX = pos.x - wx * GrapheModule.zoom;
    GrapheModule.panY = pos.y - wy * GrapheModule.zoom;
    window.graphePanX = GrapheModule.panX;
    window.graphePanY = GrapheModule.panY;
}

function showGrapheContextMenu(x, y) {
    const menu = document.getElementById('grapheContextMenu');
    if (!menu) return;
    menu.style.display = 'block';
    menu.style.left = Math.min(x, window.innerWidth - 220) + 'px';
    menu.style.top = Math.min(y, window.innerHeight - 300) + 'px';
}

function hideGrapheContextMenu() {
    const menu = document.getElementById('grapheContextMenu');
    if (menu) menu.style.display = 'none';
}

document.addEventListener('click', hideGrapheContextMenu);

// ========================================
// TOAST (utilise celui du dashboard)
// ========================================
function showToast(message, type = 'info', duration = 3000) {
    if (typeof window.showToast === 'function') {
        window.showToast(message, type, duration);
        return;
    }
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `${message}<button class="toast-close" onclick="this.parentElement.remove()">×</button>`;
    container.appendChild(toast);
    if (duration > 0) {
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(40px)';
            toast.style.transition = 'all 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }
}

// ========================================
// MODAL (utilise celui du dashboard)
// ========================================
function showModal(title, bodyHtml, confirmText, onConfirm) {
    if (typeof window.showModal === 'function') {
        window.showModal(title, bodyHtml, confirmText, onConfirm);
        return;
    }
    const overlay = document.getElementById('modalOverlay');
    const titleEl = document.getElementById('modalTitle');
    const bodyEl = document.getElementById('modalBody');
    if (!overlay || !titleEl || !bodyEl) return;
    titleEl.textContent = title;
    bodyEl.innerHTML = bodyHtml;
    overlay.classList.add('active');
    const confirmBtn = document.getElementById('modalConfirm');
    if (confirmBtn) {
        confirmBtn.textContent = confirmText || 'Confirmer';
        const newConfirm = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirm, confirmBtn);
        newConfirm.addEventListener('click', function() {
            if (onConfirm) onConfirm();
            closeModal();
        });
    }
    const cancelBtn = document.getElementById('modalCancel');
    if (cancelBtn) {
        const newCancel = cancelBtn.cloneNode(true);
        cancelBtn.parentNode.replaceChild(newCancel, cancelBtn);
        newCancel.addEventListener('click', closeModal);
    }
}

function closeModal() {
    if (typeof window.closeModal === 'function') {
        window.closeModal();
        return;
    }
    const overlay = document.getElementById('modalOverlay');
    if (overlay) overlay.classList.remove('active');
}

// ========================================
// ACTIONS DU MENU
// ========================================
document.querySelectorAll('#grapheContextMenu .menu-item').forEach(item => {
    item.addEventListener('click', function(e) {
        e.stopPropagation();
        const action = this.dataset.action;
        const nodeId = GrapheModule.contextNode?.id || window.grapheContextNode?.id;
        if (!nodeId) return;
        const node = GrapheModule.nodes.find(n => n.id === nodeId);
        if (!node) return;
        hideGrapheContextMenu();
        switch(action) {
            case 'edit':
                showModal('Modifier', `
                    <div class="form-group"><label>Nom</label><input type="text" id="editNodeName" value="${node.label || ''}" class="search-input"></div>
                    <div class="form-group"><label>Role</label><input type="text" id="editNodeRole" value="${node.role || ''}" class="search-input"></div>
                `, 'Sauvegarder', () => {
                    node.label = document.getElementById('editNodeName').value.trim() || 'Personne';
                    node.role = document.getElementById('editNodeRole').value.trim();
                });
                break;
            case 'color':
                const colors = ['#ffffff', '#ef4444', '#f59e0b', '#22c55e', '#06b6d4', '#ec4899', '#8b5cf6', '#f97316'];
                const colorHtml = colors.map(c => `
                    <button onclick="changeGrapheColor(${node.id}, '${c}')" style="width:30px;height:30px;border-radius:50%;border:2px solid ${c === node.color ? '#fff' : 'transparent'};background:${c};cursor:pointer;margin:3px;"></button>
                `).join('');
                showModal('Couleur', `<div style="display:flex;flex-wrap:wrap;gap:4px;justify-content:center;padding:8px 0;">${colorHtml}</div>`, 'Fermer', closeModal);
                break;
            case 'role':
                showModal('Fonction', `
                    <div class="form-group"><label>Fonction</label><input type="text" id="editRoleInput" value="${node.role || ''}" class="search-input"></div>
                `, 'Appliquer', () => {
                    node.role = document.getElementById('editRoleInput').value.trim();
                });
                break;
            case 'link':
                GrapheModule.linkMode = true;
                window.grapheLinkMode = true;
                GrapheModule.linkFrom = node.id;
                window.grapheLinkFrom = node.id;
                const btn = document.getElementById('grapheAttacher');
                if (btn) {
                    btn.style.background = 'rgba(255,255,255,0.15)';
                    btn.style.borderColor = '#ffffff';
                    btn.style.color = '#ffffff';
                }
                showToast('Cliquez sur une personne pour l attacher', 'info');
                break;
            case 'detach':
                const toRemove = GrapheModule.edges.filter(e => e.from === node.id || e.to === node.id);
                toRemove.forEach(e => { GrapheModule.edges = GrapheModule.edges.filter(ed => ed.id !== e.id); });
                window.grapheEdges = GrapheModule.edges;
                showToast('Personne detachee', 'info');
                break;
            case 'delete':
                showModal('Confirmation', `<p style="color:var(--text-secondary);">Supprimer "${node.label}" du graphe ?</p>`, 'Supprimer', () => {
                    GrapheModule.nodes = GrapheModule.nodes.filter(n => n.id !== node.id);
                    window.grapheNodes = GrapheModule.nodes;
                    GrapheModule.edges = GrapheModule.edges.filter(e => e.from !== node.id && e.to !== node.id);
                    window.grapheEdges = GrapheModule.edges;
                    showToast('Personne supprimee', 'info');
                });
                break;
            case 'fiche':
                showModal('Fiche de ' + node.label, `
                    <div style="font-size:13px;color:var(--text-secondary);">
                        ${node.prenom ? `<div><strong>Prenom</strong> ${node.prenom}</div>` : ''}
                        ${node.nom_famille ? `<div><strong>Nom</strong> ${node.nom_famille}</div>` : ''}
                        ${node.role ? `<div><strong>Role</strong> ${node.role}</div>` : ''}
                        ${node.email ? `<div><strong>Email</strong> ${node.email}</div>` : ''}
                        ${node.telephone ? `<div><strong>Telephone</strong> ${formatPhone(node.telephone)}</div>` : ''}
                        ${node.adresse ? `<div><strong>Adresse</strong> ${node.adresse}</div>` : ''}
                    </div>
                `, 'Fermer', closeModal);
                break;
        }
    });
});

function changeGrapheColor(nodeId, color) {
    const node = GrapheModule.nodes.find(n => n.id === nodeId);
    if (node) {
        node.color = color;
        closeModal();
        renderGraphe();
    }
}

// ========================================
// AJOUTER UNE PERSONNE AVEC SA FAMILLE
// ========================================
function addPersonToGrapheWithFamily(personData) {
    if (!personData) {
        showToast('Personne introuvable', 'error');
        return;
    }
    const name = `${personData.prenom || ''} ${personData.nom_famille || 'Inconnu'}`.trim();
    const container = document.getElementById('grapheContainer');
    const cx = container ? container.offsetWidth / 2 : 400;
    const cy = container ? container.offsetHeight / 2 : 300;
    const mainNode = {
        id: Date.now(),
        label: name,
        prenom: personData.prenom || '',
        nom_famille: personData.nom_famille || '',
        role: '',
        email: personData.email || '',
        telephone: personData.telephone || '',
        adresse: personData.adresse || '',
        x: cx + (Math.random() - 0.5) * 50,
        y: cy + (Math.random() - 0.5) * 50,
        radius: 28,
        color: '#ffffff',
        isMain: true
    };
    GrapheModule.nodes.push(mainNode);
    window.grapheNodes = GrapheModule.nodes;
    const famille = personData.famille || [];
    if (famille.length > 0) {
        const angleStep = (Math.PI * 2) / famille.length;
        famille.forEach((member, index) => {
            const angle = index * angleStep - Math.PI / 2;
            const radius = 180 + Math.random() * 40;
            const memberName = `${member.prenom || ''} ${member.nom_famille || 'Inconnu'}`.trim();
            const memberNode = {
                id: Date.now() + index + 1,
                label: memberName,
                prenom: member.prenom || '',
                nom_famille: member.nom_famille || '',
                role: member.lien || 'Famille',
                email: member.email || '',
                telephone: member.telephone || '',
                adresse: member.adresse || '',
                x: mainNode.x + Math.cos(angle) * radius,
                y: mainNode.y + Math.sin(angle) * radius,
                radius: 24,
                color: GrapheModule.colors[(index + 1) % GrapheModule.colors.length],
                isMain: false
            };
            GrapheModule.nodes.push(memberNode);
            window.grapheNodes = GrapheModule.nodes;
            GrapheModule.edges.push({
                id: Date.now() + index + 100,
                from: mainNode.id,
                to: memberNode.id,
                label: member.lien || 'Famille'
            });
            window.grapheEdges = GrapheModule.edges;
        });
    }
    const grapheLi = document.querySelector('[data-page="graphe"]');
    if (grapheLi) grapheLi.click();
    if (typeof initGrapheModule === 'function') {
        if (!GrapheModule.isInitialized) initGrapheModule();
    }
    showToast(`"${name}" et sa famille ajoutes au graphe !`, 'success');
}

// ========================================
// EXPOSER
// ========================================
window.initGrapheModule = initGrapheModule;
window.renderGraphe = renderGraphe;
window.resizeGraphe = resizeGraphe;
window.addPersonToGrapheWithFamily = addPersonToGrapheWithFamily;
window.changeGrapheColor = changeGrapheColor;

console.log('Module graphe charge');