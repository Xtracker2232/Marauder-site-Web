// ========================================
// GRAPHE - Module autonome
// ========================================

// Variables globales exposées
window.grapheNodes = window.grapheNodes || [];
window.grapheEdges = window.grapheEdges || [];
window.grapheZoom = 1;
window.graphePanX = 0;
window.graphePanY = 0;
window.grapheIsPanning = false;
window.graphePanStartX = 0;
window.graphePanStartY = 0;
window.graphePanStartPanX = 0;
window.graphePanStartPanY = 0;
window.grapheDraggingNode = null;
window.grapheDragOffsetX = 0;
window.grapheDragOffsetY = 0;
window.grapheContextNode = null;
window.grapheLinkMode = false;
window.grapheLinkFrom = null;
window.grapheIsInitialized = false;

let grapheCanvas = null;
let grapheCtx = null;
let grapheAnimationId = null;

const GRAPHE_COLORS = ['#ffffff', '#ef4444', '#f59e0b', '#22c55e', '#06b6d4', '#ec4899', '#8b5cf6', '#f97316'];

// ============ INITIALISATION ============
function initGrapheModule() {
    grapheCanvas = document.getElementById('grapheCanvas');
    if (!grapheCanvas) {
        console.error('❌ Canvas du graphe non trouvé');
        setTimeout(initGrapheModule, 300);
        return;
    }
    
    grapheCtx = grapheCanvas.getContext('2d');
    resizeGraphe();
    
    // Événements
    grapheCanvas.onmousedown = onGrapheMouseDown;
    grapheCanvas.onmousemove = onGrapheMouseMove;
    grapheCanvas.onmouseup = onGrapheMouseUp;
    grapheCanvas.onmouseleave = onGrapheMouseUp;
    grapheCanvas.onwheel = onGrapheWheel;
    grapheCanvas.oncontextmenu = (e) => e.preventDefault();
    
    window.addEventListener('resize', resizeGraphe);
    
    window.grapheIsInitialized = true;
    renderGraphe();
    console.log('✅ Graphe initialisé avec', window.grapheNodes.length, 'nœuds');
}

// ============ REDIMENSIONNEMENT ============
function resizeGraphe() {
    const container = document.getElementById('grapheContainer');
    if (!container || !grapheCanvas) return;
    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    grapheCanvas.width = rect.width * dpr;
    grapheCanvas.height = rect.height * dpr;
    grapheCanvas.style.width = rect.width + 'px';
    grapheCanvas.style.height = rect.height + 'px';
    if (grapheCtx) {
        grapheCtx.scale(dpr, dpr);
    }
}

// ============ RENDU ============
function renderGraphe() {
    if (!grapheCtx || !grapheCanvas) return;
    
    const rect = grapheCanvas.getBoundingClientRect();
    const W = rect.width;
    const H = rect.height;
    
    grapheCtx.clearRect(0, 0, W, H);
    
    // Grille
    const step = 40;
    const ox = ((window.graphePanX % step) + step) % step;
    const oy = ((window.graphePanY % step) + step) % step;
    grapheCtx.strokeStyle = 'rgba(255,255,255,0.03)';
    grapheCtx.lineWidth = 1;
    for (let x = -step + ox; x < W + step; x += step) {
        grapheCtx.beginPath();
        grapheCtx.moveTo(x, 0);
        grapheCtx.lineTo(x, H);
        grapheCtx.stroke();
    }
    for (let y = -step + oy; y < H + step; y += step) {
        grapheCtx.beginPath();
        grapheCtx.moveTo(0, y);
        grapheCtx.lineTo(W, y);
        grapheCtx.stroke();
    }
    
    grapheCtx.save();
    grapheCtx.translate(window.graphePanX, window.graphePanY);
    grapheCtx.scale(window.grapheZoom, window.grapheZoom);
    
    // Arêtes
    window.grapheEdges.forEach(edge => {
        const from = window.grapheNodes.find(n => n.id === edge.from);
        const to = window.grapheNodes.find(n => n.id === edge.to);
        if (!from || !to) return;
        grapheCtx.beginPath();
        grapheCtx.moveTo(from.x, from.y);
        grapheCtx.lineTo(to.x, to.y);
        grapheCtx.strokeStyle = 'rgba(255,255,255,0.25)';
        grapheCtx.lineWidth = 2 / window.grapheZoom;
        grapheCtx.stroke();
    });
    
    // Nœuds
    window.grapheNodes.forEach(node => {
        const r = node.radius || 24;
        const isSelected = window.grapheLinkMode && window.grapheLinkFrom === node.id;
        const isHover = node._hover;
        
        grapheCtx.beginPath();
        grapheCtx.arc(node.x, node.y, r, 0, Math.PI * 2);
        grapheCtx.fillStyle = isSelected ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.06)';
        grapheCtx.fill();
        grapheCtx.strokeStyle = isSelected ? '#ffffff' : (isHover ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.2)');
        grapheCtx.lineWidth = isSelected ? 3 / window.grapheZoom : 1.5 / window.grapheZoom;
        grapheCtx.stroke();
        
        grapheCtx.fillStyle = '#ffffff';
        grapheCtx.font = `${12 / window.grapheZoom}px Inter`;
        grapheCtx.textAlign = 'center';
        grapheCtx.textBaseline = 'top';
        let label = node.label || 'Personne';
        if (label.length > 18) label = label.slice(0, 16) + '…';
        grapheCtx.fillText(label, node.x, node.y + r + 6 / window.grapheZoom);
        
        if (node.role) {
            grapheCtx.fillStyle = 'rgba(255,255,255,0.35)';
            grapheCtx.font = `${10 / window.grapheZoom}px Inter`;
            grapheCtx.fillText(node.role, node.x, node.y + r + 22 / window.grapheZoom);
        }
    });
    
    grapheCtx.restore();
    
    grapheAnimationId = requestAnimationFrame(renderGraphe);
}

// ============ POSITION SOURIS ============
function getGraphePos(e) {
    const rect = grapheCanvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

function getGrapheNode(x, y) {
    const wx = (x - window.graphePanX) / window.grapheZoom;
    const wy = (y - window.graphePanY) / window.grapheZoom;
    for (let i = window.grapheNodes.length - 1; i >= 0; i--) {
        const node = window.grapheNodes[i];
        const dx = wx - node.x;
        const dy = wy - node.y;
        const r = node.radius || 24;
        if (dx * dx + dy * dy < r * r) {
            return node;
        }
    }
    return null;
}

// ============ ÉVÉNEMENTS SOURIS ============
function onGrapheMouseDown(e) {
    const pos = getGraphePos(e);
    const node = getGrapheNode(pos.x, pos.y);
    
    if (e.button === 2) {
        if (node) {
            window.grapheContextNode = node;
            showGrapheContextMenu(e.clientX, e.clientY);
        }
        return;
    }
    
    if (window.grapheLinkMode && node) {
        if (window.grapheLinkFrom === null) {
            window.grapheLinkFrom = node.id;
            showToast('Sélectionnez la destination', 'info');
            return;
        }
        if (window.grapheLinkFrom !== node.id) {
            window.grapheEdges.push({ id: Date.now(), from: window.grapheLinkFrom, to: node.id });
            window.grapheLinkFrom = null;
            window.grapheLinkMode = false;
            const btn = document.getElementById('grapheAttacher');
            if (btn) {
                btn.style.background = 'rgba(255,255,255,0.05)';
                btn.style.borderColor = 'var(--border-color)';
                btn.style.color = 'var(--text-secondary)';
            }
            showToast('Personnes attachées !', 'success');
        }
        return;
    }
    
    if (node) {
        window.grapheDraggingNode = node;
        const wx = (pos.x - window.graphePanX) / window.grapheZoom;
        const wy = (pos.y - window.graphePanY) / window.grapheZoom;
        window.grapheDragOffsetX = wx - node.x;
        window.grapheDragOffsetY = wy - node.y;
        grapheCanvas.style.cursor = 'grabbing';
        return;
    }
    
    window.grapheIsPanning = true;
    window.graphePanStartX = pos.x;
    window.graphePanStartY = pos.y;
    window.graphePanStartPanX = window.graphePanX;
    window.graphePanStartPanY = window.graphePanY;
    grapheCanvas.style.cursor = 'grabbing';
}

function onGrapheMouseMove(e) {
    const pos = getGraphePos(e);
    const node = getGrapheNode(pos.x, pos.y);
    window.grapheNodes.forEach(n => n._hover = false);
    if (node) node._hover = true;
    
    if (window.grapheDraggingNode) {
        const wx = (pos.x - window.graphePanX) / window.grapheZoom;
        const wy = (pos.y - window.graphePanY) / window.grapheZoom;
        window.grapheDraggingNode.x = wx - window.grapheDragOffsetX;
        window.grapheDraggingNode.y = wy - window.grapheDragOffsetY;
        return;
    }
    
    if (window.grapheIsPanning) {
        window.graphePanX = window.graphePanStartPanX + (pos.x - window.graphePanStartX);
        window.graphePanY = window.graphePanStartPanY + (pos.y - window.graphePanStartY);
    }
}

function onGrapheMouseUp() {
    window.grapheDraggingNode = null;
    window.grapheIsPanning = false;
    grapheCanvas.style.cursor = 'grab';
}

function onGrapheWheel(e) {
    e.preventDefault();
    const pos = getGraphePos(e);
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.3, Math.min(3, window.grapheZoom * delta));
    const wx = (pos.x - window.graphePanX) / window.grapheZoom;
    const wy = (pos.y - window.graphePanY) / window.grapheZoom;
    window.grapheZoom = newZoom;
    window.graphePanX = pos.x - wx * window.grapheZoom;
    window.graphePanY = pos.y - wy * window.grapheZoom;
}

// ============ MENU CONTEXTUEL ============
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

// ============ ACTIONS MENU ============
document.querySelectorAll('#grapheContextMenu .menu-item').forEach(item => {
    item.addEventListener('click', function(e) {
        e.stopPropagation();
        const action = this.dataset.action;
        const nodeId = window.grapheContextNode?.id;
        if (!nodeId) return;
        const node = window.grapheNodes.find(n => n.id === nodeId);
        if (!node) return;
        hideGrapheContextMenu();
        
        switch(action) {
            case 'edit':
                showModal('Modifier', `
                    <div class="form-group"><label>Nom</label><input type="text" id="editNodeName" value="${node.label || ''}" class="search-input"></div>
                    <div class="form-group"><label>Rôle</label><input type="text" id="editNodeRole" value="${node.role || ''}" class="search-input"></div>
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
                window.grapheLinkMode = true;
                window.grapheLinkFrom = node.id;
                const btn = document.getElementById('grapheAttacher');
                if (btn) {
                    btn.style.background = 'rgba(255,255,255,0.15)';
                    btn.style.borderColor = '#ffffff';
                    btn.style.color = '#ffffff';
                }
                showToast('Cliquez sur une personne pour l\'attacher', 'info');
                break;
            case 'detach':
                const toRemove = window.grapheEdges.filter(e => e.from === node.id || e.to === node.id);
                toRemove.forEach(e => { window.grapheEdges = window.grapheEdges.filter(ed => ed.id !== e.id); });
                showToast('Personne détachée', 'info');
                break;
            case 'delete':
                showModal('Confirmation', `<p style="color:var(--text-secondary);">Supprimer "${node.label}" du graphe ?</p>`, 'Supprimer', () => {
                    window.grapheNodes = window.grapheNodes.filter(n => n.id !== node.id);
                    window.grapheEdges = window.grapheEdges.filter(e => e.from !== node.id && e.to !== node.id);
                    showToast('Personne supprimée', 'info');
                });
                break;
        }
    });
});

function changeGrapheColor(nodeId, color) {
    const node = window.grapheNodes.find(n => n.id === nodeId);
    if (node) { node.color = color; closeModal(); }
}

// ============ EXPOSER AU GLOBAL ============
window.initGrapheModule = initGrapheModule;
window.renderGraphe = renderGraphe;
window.resizeGraphe = resizeGraphe;
window.addGrapheNode = function(node) {
    window.grapheNodes.push(node);
    renderGraphe();
};

console.log('📦 Module graphe chargé');