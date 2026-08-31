// ========================================
// FORMAT PHONE
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
// GRAPHE
// ========================================
const Graphe = {
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
    canvas: null,
    ctx: null,
    colors: ['#ffffff', '#ef4444', '#f59e0b', '#22c55e', '#06b6d4', '#ec4899', '#8b5cf6', '#f97316']
};

// EXPOSER DANS WINDOW
window.grapheNodes = Graphe.nodes;
window.grapheEdges = Graphe.edges;
window.grapheZoom = Graphe.zoom;
window.graphePanX = Graphe.panX;
window.graphePanY = Graphe.panY;
window.grapheLinkMode = Graphe.linkMode;
window.grapheLinkFrom = Graphe.linkFrom;

function initGrapheModule() {
    const canvas = document.getElementById('grapheCanvas');
    if (!canvas) { setTimeout(initGrapheModule, 300); return; }
    Graphe.canvas = canvas;
    Graphe.ctx = canvas.getContext('2d');
    resizeGraphe();
    canvas.onmousedown = onGrapheMouseDown;
    canvas.onmousemove = onGrapheMouseMove;
    canvas.onmouseup = onGrapheMouseUp;
    canvas.onmouseleave = onGrapheMouseUp;
    canvas.onwheel = onGrapheWheel;
    canvas.oncontextmenu = e => e.preventDefault();
    window.addEventListener('resize', resizeGraphe);
    renderGraphe();
}

function resizeGraphe() {
    const container = document.getElementById('grapheContainer');
    if (!container || !Graphe.canvas) return;
    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    Graphe.canvas.width = rect.width * dpr;
    Graphe.canvas.height = rect.height * dpr;
    Graphe.canvas.style.width = rect.width + 'px';
    Graphe.canvas.style.height = rect.height + 'px';
    if (Graphe.ctx) Graphe.ctx.scale(dpr, dpr);
}

function renderGraphe() {
    if (!Graphe.ctx || !Graphe.canvas) return;
    const rect = Graphe.canvas.getBoundingClientRect();
    const W = rect.width, H = rect.height;
    Graphe.ctx.clearRect(0, 0, W, H);
    const step = 40;
    const ox = ((Graphe.panX % step) + step) % step;
    const oy = ((Graphe.panY % step) + step) % step;
    Graphe.ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    Graphe.ctx.lineWidth = 1;
    for (let x = -step + ox; x < W + step; x += step) {
        Graphe.ctx.beginPath();
        Graphe.ctx.moveTo(x, 0);
        Graphe.ctx.lineTo(x, H);
        Graphe.ctx.stroke();
    }
    for (let y = -step + oy; y < H + step; y += step) {
        Graphe.ctx.beginPath();
        Graphe.ctx.moveTo(0, y);
        Graphe.ctx.lineTo(W, y);
        Graphe.ctx.stroke();
    }
    Graphe.ctx.save();
    Graphe.ctx.translate(Graphe.panX, Graphe.panY);
    Graphe.ctx.scale(Graphe.zoom, Graphe.zoom);
    Graphe.edges.forEach(edge => {
        const from = Graphe.nodes.find(n => n.id === edge.from);
        const to = Graphe.nodes.find(n => n.id === edge.to);
        if (!from || !to) return;
        Graphe.ctx.beginPath();
        Graphe.ctx.moveTo(from.x, from.y);
        Graphe.ctx.lineTo(to.x, to.y);
        Graphe.ctx.strokeStyle = 'rgba(255,255,255,0.25)';
        Graphe.ctx.lineWidth = 2 / Graphe.zoom;
        Graphe.ctx.stroke();
    });
    Graphe.nodes.forEach(node => {
        const r = node.radius || 24;
        const isSelected = Graphe.linkMode && Graphe.linkFrom === node.id;
        Graphe.ctx.beginPath();
        Graphe.ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
        Graphe.ctx.fillStyle = isSelected ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.06)';
        Graphe.ctx.fill();
        Graphe.ctx.strokeStyle = isSelected ? '#ffffff' : 'rgba(255,255,255,0.2)';
        Graphe.ctx.lineWidth = isSelected ? 3 / Graphe.zoom : 1.5 / Graphe.zoom;
        Graphe.ctx.stroke();
        Graphe.ctx.fillStyle = '#ffffff';
        Graphe.ctx.font = `${12 / Graphe.zoom}px Inter`;
        Graphe.ctx.textAlign = 'center';
        Graphe.ctx.textBaseline = 'top';
        let label = node.label || 'Personne';
        if (label.length > 18) label = label.slice(0, 16) + '...';
        Graphe.ctx.fillText(label, node.x, node.y + r + 6 / Graphe.zoom);
        if (node.role) {
            Graphe.ctx.fillStyle = 'rgba(255,255,255,0.35)';
            Graphe.ctx.font = `${10 / Graphe.zoom}px Inter`;
            Graphe.ctx.fillText(node.role, node.x, node.y + r + 22 / Graphe.zoom);
        }
    });
    Graphe.ctx.restore();
    requestAnimationFrame(renderGraphe);
}

function getGraphePos(e) {
    const rect = Graphe.canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

function getGrapheNode(x, y) {
    const wx = (x - Graphe.panX) / Graphe.zoom;
    const wy = (y - Graphe.panY) / Graphe.zoom;
    for (let i = Graphe.nodes.length - 1; i >= 0; i--) {
        const node = Graphe.nodes[i];
        const dx = wx - node.x, dy = wy - node.y;
        const r = node.radius || 24;
        if (dx * dx + dy * dy < r * r) return node;
    }
    return null;
}

function onGrapheMouseDown(e) {
    const pos = getGraphePos(e);
    const node = getGrapheNode(pos.x, pos.y);
    if (e.button === 2) {
        if (node) { Graphe.contextNode = node; showGrapheContextMenu(e.clientX, e.clientY); }
        return;
    }
    if (Graphe.linkMode && node) {
        if (Graphe.linkFrom === null) {
            Graphe.linkFrom = node.id;
            window.grapheLinkFrom = node.id;
            if (typeof showToast === 'function') showToast('Selectionnez la destination', 'info');
            return;
        }
        if (Graphe.linkFrom !== node.id) {
            Graphe.edges.push({ id: Date.now(), from: Graphe.linkFrom, to: node.id });
            window.grapheEdges = Graphe.edges;
            Graphe.linkFrom = null;
            window.grapheLinkFrom = null;
            Graphe.linkMode = false;
            window.grapheLinkMode = false;
            const btn = document.getElementById('grapheAttacher');
            if (btn) {
                btn.style.background = 'rgba(255,255,255,0.05)';
                btn.style.borderColor = 'var(--border-color)';
                btn.style.color = 'var(--text-secondary)';
            }
            if (typeof showToast === 'function') showToast('Personnes attachees !', 'success');
        }
        return;
    }
    if (node) {
        Graphe.draggingNode = node;
        const wx = (pos.x - Graphe.panX) / Graphe.zoom;
        const wy = (pos.y - Graphe.panY) / Graphe.zoom;
        Graphe.dragOffsetX = wx - node.x;
        Graphe.dragOffsetY = wy - node.y;
        Graphe.canvas.style.cursor = 'grabbing';
        return;
    }
    Graphe.isPanning = true;
    Graphe.panStartX = pos.x;
    Graphe.panStartY = pos.y;
    Graphe.panStartPanX = Graphe.panX;
    Graphe.panStartPanY = Graphe.panY;
    Graphe.canvas.style.cursor = 'grabbing';
}

function onGrapheMouseMove(e) {
    const pos = getGraphePos(e);
    if (Graphe.draggingNode) {
        const wx = (pos.x - Graphe.panX) / Graphe.zoom;
        const wy = (pos.y - Graphe.panY) / Graphe.zoom;
        Graphe.draggingNode.x = wx - Graphe.dragOffsetX;
        Graphe.draggingNode.y = wy - Graphe.dragOffsetY;
        return;
    }
    if (Graphe.isPanning) {
        Graphe.panX = Graphe.panStartPanX + (pos.x - Graphe.panStartX);
        Graphe.panY = Graphe.panStartPanY + (pos.y - Graphe.panStartY);
        window.graphePanX = Graphe.panX;
        window.graphePanY = Graphe.panY;
    }
}

function onGrapheMouseUp() {
    Graphe.draggingNode = null;
    Graphe.isPanning = false;
    Graphe.canvas.style.cursor = 'grab';
}

function onGrapheWheel(e) {
    e.preventDefault();
    const pos = getGraphePos(e);
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.3, Math.min(3, Graphe.zoom * delta));
    const wx = (pos.x - Graphe.panX) / Graphe.zoom;
    const wy = (pos.y - Graphe.panY) / Graphe.zoom;
    Graphe.zoom = newZoom;
    window.grapheZoom = newZoom;
    Graphe.panX = pos.x - wx * Graphe.zoom;
    Graphe.panY = pos.y - wy * Graphe.zoom;
    window.graphePanX = Graphe.panX;
    window.graphePanY = Graphe.panY;
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

// MENU ACTIONS
document.querySelectorAll('#grapheContextMenu .menu-item').forEach(item => {
    item.addEventListener('click', function(e) {
        e.stopPropagation();
        const action = this.dataset.action;
        const nodeId = Graphe.contextNode?.id;
        if (!nodeId) return;
        const node = Graphe.nodes.find(n => n.id === nodeId);
        if (!node) return;
        hideGrapheContextMenu();
        switch(action) {
            case 'edit':
                if (typeof showModal === 'function') {
                    showModal('Modifier', `
                        <div class="form-group"><label>Nom</label><input type="text" id="editNodeName" value="${node.label || ''}" class="search-input"></div>
                        <div class="form-group"><label>Role</label><input type="text" id="editNodeRole" value="${node.role || ''}" class="search-input"></div>
                    `, 'Sauvegarder', () => {
                        node.label = document.getElementById('editNodeName').value.trim() || 'Personne';
                        node.role = document.getElementById('editNodeRole').value.trim();
                    });
                }
                break;
            case 'color':
                if (typeof showModal === 'function') {
                    const colors = ['#ffffff', '#ef4444', '#f59e0b', '#22c55e', '#06b6d4', '#ec4899', '#8b5cf6', '#f97316'];
                    const colorHtml = colors.map(c => `
                        <button onclick="changeGrapheColor(${node.id}, '${c}')" style="width:30px;height:30px;border-radius:50%;border:2px solid ${c === node.color ? '#fff' : 'transparent'};background:${c};cursor:pointer;margin:3px;"></button>
                    `).join('');
                    showModal('Couleur', `<div style="display:flex;flex-wrap:wrap;gap:4px;justify-content:center;padding:8px 0;">${colorHtml}</div>`, 'Fermer', function() { if (typeof closeModal === 'function') closeModal(); });
                }
                break;
            case 'role':
                if (typeof showModal === 'function') {
                    showModal('Fonction', `
                        <div class="form-group"><label>Fonction</label><input type="text" id="editRoleInput" value="${node.role || ''}" class="search-input"></div>
                    `, 'Appliquer', () => {
                        node.role = document.getElementById('editRoleInput').value.trim();
                    });
                }
                break;
            case 'link':
                Graphe.linkMode = true;
                window.grapheLinkMode = true;
                Graphe.linkFrom = node.id;
                window.grapheLinkFrom = node.id;
                const btn = document.getElementById('grapheAttacher');
                if (btn) {
                    btn.style.background = 'rgba(255,255,255,0.15)';
                    btn.style.borderColor = '#ffffff';
                    btn.style.color = '#ffffff';
                }
                if (typeof showToast === 'function') showToast('Cliquez sur une personne pour l attacher', 'info');
                break;
            case 'detach':
                const toRemove = Graphe.edges.filter(e => e.from === node.id || e.to === node.id);
                toRemove.forEach(e => { Graphe.edges = Graphe.edges.filter(ed => ed.id !== e.id); });
                window.grapheEdges = Graphe.edges;
                if (typeof showToast === 'function') showToast('Personne detachee', 'info');
                break;
            case 'delete':
                if (typeof showModal === 'function') {
                    showModal('Confirmation', `<p style="color:var(--text-secondary);">Supprimer "${node.label}" du graphe ?</p>`, 'Supprimer', () => {
                        Graphe.nodes = Graphe.nodes.filter(n => n.id !== node.id);
                        window.grapheNodes = Graphe.nodes;
                        Graphe.edges = Graphe.edges.filter(e => e.from !== node.id && e.to !== node.id);
                        window.grapheEdges = Graphe.edges;
                        if (typeof showToast === 'function') showToast('Personne supprimee', 'info');
                    });
                }
                break;
            case 'fiche':
                if (typeof showModal === 'function') {
                    showModal('Fiche de ' + node.label, `
                        <div style="font-size:13px;color:var(--text-secondary);">
                            ${node.prenom ? `<div><strong>Prenom</strong> ${node.prenom}</div>` : ''}
                            ${node.nom_famille ? `<div><strong>Nom</strong> ${node.nom_famille}</div>` : ''}
                            ${node.role ? `<div><strong>Role</strong> ${node.role}</div>` : ''}
                            ${node.email ? `<div><strong>Email</strong> ${node.email}</div>` : ''}
                            ${node.telephone ? `<div><strong>Telephone</strong> ${formatPhone(node.telephone)}</div>` : ''}
                            ${node.adresse ? `<div><strong>Adresse</strong> ${node.adresse}</div>` : ''}
                        </div>
                    `, 'Fermer', function() { if (typeof closeModal === 'function') closeModal(); });
                }
                break;
        }
    });
});

function changeGrapheColor(nodeId, color) {
    const node = Graphe.nodes.find(n => n.id === nodeId);
    if (node) { node.color = color; if (typeof closeModal === 'function') closeModal(); }
}

function addPersonToGrapheWithFamily(personData) {
    if (!personData) { 
        if (typeof showToast === 'function') showToast('Personne introuvable', 'error');
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
        color: '#ffffff'
    };
    Graphe.nodes.push(mainNode);
    window.grapheNodes = Graphe.nodes;
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
                color: Graphe.colors[(index + 1) % Graphe.colors.length]
            };
            Graphe.nodes.push(memberNode);
            window.grapheNodes = Graphe.nodes;
            Graphe.edges.push({
                id: Date.now() + index + 100,
                from: mainNode.id,
                to: memberNode.id,
                label: member.lien || 'Famille'
            });
            window.grapheEdges = Graphe.edges;
        });
    }
    const grapheLi = document.querySelector('[data-page="graphe"]');
    if (grapheLi) grapheLi.click();
    initGrapheModule();
    if (typeof showToast === 'function') showToast(`"${name}" et sa famille ajoutes au graphe !`, 'success');
}

// EXPOSER
window.initGrapheModule = initGrapheModule;
window.renderGraphe = renderGraphe;
window.resizeGraphe = resizeGraphe;
window.addPersonToGrapheWithFamily = addPersonToGrapheWithFamily;
window.changeGrapheColor = changeGrapheColor;

console.log('Module graphe charge');