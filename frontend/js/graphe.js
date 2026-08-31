// ========================================
// GRAPHE - Fichier séparé et autonome
// ========================================

let grapheNodes = [];
let grapheEdges = [];
let grapheZoom = 1;
let graphePanX = 0;
let graphePanY = 0;
let grapheIsPanning = false;
let graphePanStartX = 0;
let graphePanStartY = 0;
let graphePanStartPanX = 0;
let graphePanStartPanY = 0;
let grapheDraggingNode = null;
let grapheDragOffsetX = 0;
let grapheDragOffsetY = 0;
let grapheContextNode = null;
let grapheLinkMode = false;
let grapheLinkFrom = null;
let grapheCanvas = null;
let grapheCtx = null;
let grapheAnimationId = null;
let grapheIsInitialized = false;

const GRAPHE_COLORS = ['#ffffff', '#ef4444', '#f59e0b', '#22c55e', '#06b6d4', '#ec4899', '#8b5cf6', '#f97316'];

// ============ INITIALISATION ============
function initGraphe() {
    grapheCanvas = document.getElementById('grapheCanvas');
    if (!grapheCanvas) {
        console.error('❌ Canvas non trouvé');
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
    
    window.onresize = resizeGraphe;
    
    grapheIsInitialized = true;
    renderGraphe();
    console.log('✅ Graphe initialisé avec', grapheNodes.length, 'nœuds');
}

function resizeGraphe() {
    const container = document.getElementById('grapheContainer');
    if (!container || !grapheCanvas) return;
    const rect = container.getBoundingClientRect();
    grapheCanvas.width = rect.width;
    grapheCanvas.height = rect.height;
    grapheCanvas.style.width = rect.width + 'px';
    grapheCanvas.style.height = rect.height + 'px';
}

// ============ RENDU ============
function renderGraphe() {
    if (!grapheCtx || !grapheCanvas) return;
    
    const W = grapheCanvas.width;
    const H = grapheCanvas.height;
    
    grapheCtx.clearRect(0, 0, W, H);
    
    // Grille
    const step = 40;
    const ox = ((graphePanX % step) + step) % step;
    const oy = ((graphePanY % step) + step) % step;
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
    grapheCtx.translate(graphePanX, graphePanY);
    grapheCtx.scale(grapheZoom, grapheZoom);
    
    // Arêtes
    grapheEdges.forEach(edge => {
        const from = grapheNodes.find(n => n.id === edge.from);
        const to = grapheNodes.find(n => n.id === edge.to);
        if (!from || !to) return;
        grapheCtx.beginPath();
        grapheCtx.moveTo(from.x, from.y);
        grapheCtx.lineTo(to.x, to.y);
        grapheCtx.strokeStyle = 'rgba(255,255,255,0.25)';
        grapheCtx.lineWidth = 2 / grapheZoom;
        grapheCtx.stroke();
    });
    
    // Nœuds
    grapheNodes.forEach(node => {
        const r = node.radius || 24;
        const isSelected = grapheLinkMode && grapheLinkFrom === node.id;
        const isHover = node._hover;
        
        // Cercle
        grapheCtx.beginPath();
        grapheCtx.arc(node.x, node.y, r, 0, Math.PI * 2);
        grapheCtx.fillStyle = isSelected ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.06)';
        grapheCtx.fill();
        grapheCtx.strokeStyle = isSelected ? '#ffffff' : (isHover ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.2)');
        grapheCtx.lineWidth = isSelected ? 3 / grapheZoom : 1.5 / grapheZoom;
        grapheCtx.stroke();
        
        // Label
        grapheCtx.fillStyle = '#ffffff';
        grapheCtx.font = `${12 / grapheZoom}px Inter`;
        grapheCtx.textAlign = 'center';
        grapheCtx.textBaseline = 'top';
        let label = node.label || 'Personne';
        if (label.length > 18) label = label.slice(0, 16) + '…';
        grapheCtx.fillText(label, node.x, node.y + r + 6 / grapheZoom);
        
        // Rôle
        if (node.role) {
            grapheCtx.fillStyle = 'rgba(255,255,255,0.35)';
            grapheCtx.font = `${10 / grapheZoom}px Inter`;
            grapheCtx.fillText(node.role, node.x, node.y + r + 22 / grapheZoom);
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
    const wx = (x - graphePanX) / grapheZoom;
    const wy = (y - graphePanY) / grapheZoom;
    for (let i = grapheNodes.length - 1; i >= 0; i--) {
        const node = grapheNodes[i];
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
            grapheContextNode = node;
            showGrapheContextMenu(e.clientX, e.clientY);
        }
        return;
    }
    
    if (grapheLinkMode && node) {
        if (grapheLinkFrom === null) {
            grapheLinkFrom = node.id;
            showToast('Sélectionnez la destination', 'info');
            return;
        }
        if (grapheLinkFrom !== node.id) {
            grapheEdges.push({ id: Date.now(), from: grapheLinkFrom, to: node.id });
            grapheLinkFrom = null;
            grapheLinkMode = false;
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
        grapheDraggingNode = node;
        const wx = (pos.x - graphePanX) / grapheZoom;
        const wy = (pos.y - graphePanY) / grapheZoom;
        grapheDragOffsetX = wx - node.x;
        grapheDragOffsetY = wy - node.y;
        grapheCanvas.style.cursor = 'grabbing';
        return;
    }
    
    grapheIsPanning = true;
    graphePanStartX = pos.x;
    graphePanStartY = pos.y;
    graphePanStartPanX = graphePanX;
    graphePanStartPanY = graphePanY;
    grapheCanvas.style.cursor = 'grabbing';
}

function onGrapheMouseMove(e) {
    const pos = getGraphePos(e);
    const node = getGrapheNode(pos.x, pos.y);
    grapheNodes.forEach(n => n._hover = false);
    if (node) node._hover = true;
    
    if (grapheDraggingNode) {
        const wx = (pos.x - graphePanX) / grapheZoom;
        const wy = (pos.y - graphePanY) / grapheZoom;
        grapheDraggingNode.x = wx - grapheDragOffsetX;
        grapheDraggingNode.y = wy - grapheDragOffsetY;
        return;
    }
    
    if (grapheIsPanning) {
        graphePanX = graphePanStartPanX + (pos.x - graphePanStartX);
        graphePanY = graphePanStartPanY + (pos.y - graphePanStartY);
    }
}

function onGrapheMouseUp() {
    grapheDraggingNode = null;
    grapheIsPanning = false;
    grapheCanvas.style.cursor = 'grab';
}

function onGrapheWheel(e) {
    e.preventDefault();
    const pos = getGraphePos(e);
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.3, Math.min(3, grapheZoom * delta));
    const wx = (pos.x - graphePanX) / grapheZoom;
    const wy = (pos.y - graphePanY) / grapheZoom;
    grapheZoom = newZoom;
    graphePanX = pos.x - wx * grapheZoom;
    graphePanY = pos.y - wy * grapheZoom;
}

// ============ AJOUTER UNE PERSONNE ============
function addPersonToGraphe(person) {
    if (!person) {
        showToast('Personne introuvable', 'error');
        return;
    }
    
    const name = `${person.prenom || ''} ${person.nom_famille || 'Inconnu'}`.trim();
    const container = document.getElementById('grapheContainer');
    const cx = container ? container.offsetWidth / 2 : 400;
    const cy = container ? container.offsetHeight / 2 : 300;
    
    const newNode = {
        id: Date.now(),
        label: name,
        prenom: person.prenom || '',
        nom_famille: person.nom_famille || '',
        role: '',
        x: cx + (Math.random() - 0.5) * 100,
        y: cy + (Math.random() - 0.5) * 100,
        radius: 24,
        color: GRAPHE_COLORS[Math.floor(Math.random() * GRAPHE_COLORS.length)]
    };
    
    grapheNodes.push(newNode);
    
    if (grapheLinkMode && grapheLinkFrom !== null) {
        grapheEdges.push({ id: Date.now() + 1, from: grapheLinkFrom, to: newNode.id });
        grapheLinkMode = false;
        grapheLinkFrom = null;
        const btn = document.getElementById('grapheAttacher');
        if (btn) {
            btn.style.background = 'rgba(255,255,255,0.05)';
            btn.style.borderColor = 'var(--border-color)';
            btn.style.color = 'var(--text-secondary)';
        }
        showToast('Personnes attachées !', 'success');
    }
    
    // Forcer le rendu
    if (grapheIsInitialized) {
        renderGraphe();
    } else {
        initGraphe();
    }
    
    showToast(`"${name}" ajouté au graphe !`, 'success');
    return newNode;
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
        const nodeId = grapheContextNode?.id;
        if (!nodeId) return;
        const node = grapheNodes.find(n => n.id === nodeId);
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
                grapheLinkMode = true;
                grapheLinkFrom = node.id;
                const btn = document.getElementById('grapheAttacher');
                if (btn) {
                    btn.style.background = 'rgba(255,255,255,0.15)';
                    btn.style.borderColor = '#ffffff';
                    btn.style.color = '#ffffff';
                }
                showToast('Cliquez sur une personne pour l\'attacher', 'info');
                break;
            case 'detach':
                const toRemove = grapheEdges.filter(e => e.from === node.id || e.to === node.id);
                toRemove.forEach(e => { grapheEdges = grapheEdges.filter(ed => ed.id !== e.id); });
                showToast('Personne détachée', 'info');
                break;
            case 'delete':
                showModal('Confirmation', `<p style="color:var(--text-secondary);">Supprimer "${node.label}" du graphe ?</p>`, 'Supprimer', () => {
                    grapheNodes = grapheNodes.filter(n => n.id !== node.id);
                    grapheEdges = grapheEdges.filter(e => e.from !== node.id && e.to !== node.id);
                    showToast('Personne supprimée', 'info');
                });
                break;
        }
    });
});

function changeGrapheColor(nodeId, color) {
    const node = grapheNodes.find(n => n.id === nodeId);
    if (node) { node.color = color; closeModal(); }
}

// ============ EXPOSER AU GLOBAL ============
window.initGraphe = initGraphe;
window.addPersonToGraphe = addPersonToGraphe;
window.grapheNodes = grapheNodes;
window.grapheEdges = grapheEdges;

console.log('📦 Module graphe chargé');