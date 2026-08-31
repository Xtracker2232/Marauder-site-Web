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
// GRAPHE - Module autonome
// ========================================

// Initialisation des variables globales
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

// ========================================
// INITIALISATION
// ========================================
function initGrapheModule() {
    grapheCanvas = document.getElementById('grapheCanvas');
    if (!grapheCanvas) {
        console.warn('Canvas du graphe non trouve, reessai...');
        setTimeout(initGrapheModule, 500);
        return;
    }
    
    grapheCtx = grapheCanvas.getContext('2d');
    resizeGraphe();
    
    // Événements souris
    grapheCanvas.addEventListener('mousedown', onGrapheMouseDown);
    grapheCanvas.addEventListener('mousemove', onGrapheMouseMove);
    grapheCanvas.addEventListener('mouseup', onGrapheMouseUp);
    grapheCanvas.addEventListener('mouseleave', onGrapheMouseUp);
    grapheCanvas.addEventListener('wheel', onGrapheWheel, { passive: false });
    grapheCanvas.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        const pos = getGraphePos(e);
        const node = getGrapheNode(pos.x, pos.y);
        if (node) {
            window.grapheContextNode = node;
            showGrapheContextMenu(e.clientX, e.clientY);
        }
    });
    
    window.addEventListener('resize', resizeGraphe);
    
    // Recharger depuis localStorage
    loadGrapheFromLocal();
    
    window.grapheIsInitialized = true;
    renderGraphe();
    console.log('✅ Graphe initialise avec', window.grapheNodes.length, 'noeuds');
}

// ========================================
// CHARGEMENT LOCAL
// ========================================
function loadGrapheFromLocal() {
    try {
        const saved = localStorage.getItem('marauder_graphe');
        if (saved) {
            const data = JSON.parse(saved);
            if (data.nodes && data.nodes.length > 0) {
                window.grapheNodes = data.nodes;
                window.grapheEdges = data.edges || [];
                console.log('📂 Graphe charge depuis localStorage:', window.grapheNodes.length, 'noeuds');
            }
        }
    } catch (e) {
        console.warn('Erreur chargement graphe local:', e);
    }
}

// ========================================
// RESIZE
// ========================================
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
        grapheCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
}

// ========================================
// RENDU
// ========================================
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
    
    // Noeuds
    window.grapheNodes.forEach(node => {
        const r = node.radius || 24;
        const isSelected = window.grapheLinkMode && window.grapheLinkFrom === node.id;
        const isHover = node._hover;
        const color = node.color || '#ffffff';
        
        // Ombre
        grapheCtx.shadowColor = 'rgba(255,255,255,0.05)';
        grapheCtx.shadowBlur = 20;
        
        // Cercle extérieur
        grapheCtx.beginPath();
        grapheCtx.arc(node.x, node.y, r + 2, 0, Math.PI * 2);
        grapheCtx.fillStyle = isSelected ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.03)';
        grapheCtx.fill();
        
        // Cercle principal
        grapheCtx.shadowBlur = 0;
        grapheCtx.beginPath();
        grapheCtx.arc(node.x, node.y, r, 0, Math.PI * 2);
        grapheCtx.fillStyle = isSelected ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)';
        grapheCtx.fill();
        grapheCtx.strokeStyle = isSelected ? '#ffffff' : (isHover ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.15)');
        grapheCtx.lineWidth = isSelected ? 3 / window.grapheZoom : 1.5 / window.grapheZoom;
        grapheCtx.stroke();
        
        // Petit point de couleur
        grapheCtx.beginPath();
        grapheCtx.arc(node.x, node.y, 4 / window.grapheZoom, 0, Math.PI * 2);
        grapheCtx.fillStyle = color;
        grapheCtx.fill();
        
        // Label
        grapheCtx.shadowBlur = 0;
        grapheCtx.fillStyle = '#ffffff';
        grapheCtx.font = `${12 / window.grapheZoom}px Inter, Arial, sans-serif`;
        grapheCtx.textAlign = 'center';
        grapheCtx.textBaseline = 'top';
        let label = node.label || 'Personne';
        if (label.length > 18) label = label.slice(0, 16) + '...';
        grapheCtx.fillText(label, node.x, node.y + r + 6 / window.grapheZoom);
        
        // Role
        if (node.role) {
            grapheCtx.fillStyle = 'rgba(255,255,255,0.35)';
            grapheCtx.font = `${10 / window.grapheZoom}px Inter, Arial, sans-serif`;
            grapheCtx.fillText(node.role, node.x, node.y + r + 22 / window.grapheZoom);
        }
    });
    
    grapheCtx.restore();
    
    // Texte vide
    if (window.grapheNodes.length === 0) {
        grapheCtx.fillStyle = 'rgba(255,255,255,0.15)';
        grapheCtx.font = '16px Inter, Arial, sans-serif';
        grapheCtx.textAlign = 'center';
        grapheCtx.textBaseline = 'middle';
        grapheCtx.fillText('Ajoutez des personnes', W/2, H/2 - 10);
        grapheCtx.fillStyle = 'rgba(255,255,255,0.08)';
        grapheCtx.font = '13px Inter, Arial, sans-serif';
        grapheCtx.fillText('Cliquez sur "Ajouter une personne"', W/2, H/2 + 20);
    }
    
    grapheAnimationId = requestAnimationFrame(renderGraphe);
}

// ========================================
// UTILITAIRES
// ========================================
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

// ========================================
// ÉVÉNEMENTS SOURIS
// ========================================
function onGrapheMouseDown(e) {
    const pos = getGraphePos(e);
    const node = getGrapheNode(pos.x, pos.y);
    
    // Clic droit capturé par contextmenu
    if (e.button === 2) return;
    
    // Mode lien
    if (window.grapheLinkMode && node) {
        if (window.grapheLinkFrom === null) {
            window.grapheLinkFrom = node.id;
            showToast('✅ Selectionnez la destination', 'info');
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
            showToast('🔗 Personnes attachees !', 'success');
            renderGraphe();
        }
        return;
    }
    
    // Drag node
    if (node) {
        window.grapheDraggingNode = node;
        const wx = (pos.x - window.graphePanX) / window.grapheZoom;
        const wy = (pos.y - window.graphePanY) / window.grapheZoom;
        window.grapheDragOffsetX = wx - node.x;
        window.grapheDragOffsetY = wy - node.y;
        grapheCanvas.style.cursor = 'grabbing';
        return;
    }
    
    // Pan
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

// ========================================
// MENU CONTEXTUEL
// ========================================
function showGrapheContextMenu(x, y) {
    const menu = document.getElementById('grapheContextMenu');
    if (!menu) {
        console.warn('Menu contextuel non trouve, creation...');
        createContextMenu();
        return;
    }
    // Ajuster pour ne pas sortir de l'écran
    x = Math.min(x, window.innerWidth - 220);
    y = Math.min(y, window.innerHeight - 300);
    menu.style.display = 'block';
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
}

function hideGrapheContextMenu() {
    const menu = document.getElementById('grapheContextMenu');
    if (menu) menu.style.display = 'none';
}

function createContextMenu() {
    const menu = document.createElement('div');
    menu.id = 'grapheContextMenu';
    menu.className = 'graphe-context-menu';
    menu.innerHTML = `
        <div class="menu-item" data-action="edit">✏️ Modifier</div>
        <div class="menu-item" data-action="color">🎨 Changer couleur</div>
        <div class="menu-item" data-action="role">👤 Changer fonction</div>
        <div class="menu-divider"></div>
        <div class="menu-item" data-action="link">🔗 Attacher/Lier</div>
        <div class="menu-item" data-action="detach">🔓 Détacher</div>
        <div class="menu-divider"></div>
        <div class="menu-item" data-action="fiche">📋 Voir la fiche</div>
        <div class="menu-item danger" data-action="delete">🗑️ Supprimer</div>
    `;
    document.body.appendChild(menu);
    
    // Événements du menu
    menu.querySelectorAll('.menu-item').forEach(item => {
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
                        <div class="form-group"><label>Role</label><input type="text" id="editNodeRole" value="${node.role || ''}" class="search-input"></div>
                    `, 'Sauvegarder', () => {
                        node.label = document.getElementById('editNodeName').value.trim() || 'Personne';
                        node.role = document.getElementById('editNodeRole').value.trim();
                        renderGraphe();
                        showToast('✅ Modifie !', 'success');
                    });
                    break;
                case 'color':
                    const colors = ['#ffffff', '#ef4444', '#f59e0b', '#22c55e', '#06b6d4', '#ec4899', '#8b5cf6', '#f97316'];
                    const colorHtml = colors.map(c => `
                        <button onclick="changeGrapheColor(${node.id}, '${c}')" style="width:30px;height:30px;border-radius:50%;border:2px solid ${c === node.color ? '#fff' : 'transparent'};background:${c};cursor:pointer;margin:3px;"></button>
                    `).join('');
                    showModal('Choisir une couleur', `<div style="display:flex;flex-wrap:wrap;gap:4px;justify-content:center;padding:8px 0;">${colorHtml}</div>`, 'Fermer', closeModal);
                    break;
                case 'role':
                    showModal('Fonction', `
                        <div class="form-group"><label>Fonction</label><input type="text" id="editRoleInput" value="${node.role || ''}" class="search-input"></div>
                    `, 'Appliquer', () => {
                        node.role = document.getElementById('editRoleInput').value.trim();
                        renderGraphe();
                        showToast('✅ Fonction mise a jour !', 'success');
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
                    showToast('🔗 Cliquez sur une personne pour l attacher', 'info');
                    break;
                case 'detach':
                    const toRemove = window.grapheEdges.filter(e => e.from === node.id || e.to === node.id);
                    toRemove.forEach(e => { window.grapheEdges = window.grapheEdges.filter(ed => ed.id !== e.id); });
                    renderGraphe();
                    showToast('🔓 Personne detachee', 'info');
                    break;
                case 'delete':
                    showModal('Confirmation', `<p style="color:var(--text-secondary);">Supprimer "<strong style="color:#fff;">${node.label}</strong>" du graphe ?</p>`, 'Supprimer', () => {
                        window.grapheNodes = window.grapheNodes.filter(n => n.id !== node.id);
                        window.grapheEdges = window.grapheEdges.filter(e => e.from !== node.id && e.to !== node.id);
                        renderGraphe();
                        showToast('🗑️ Personne supprimee', 'info');
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
    
    // Fermer le menu en cliquant ailleurs
    document.addEventListener('click', hideGrapheContextMenu);
}

function changeGrapheColor(nodeId, color) {
    const node = window.grapheNodes.find(n => n.id === nodeId);
    if (node) { 
        node.color = color; 
        closeModal();
        renderGraphe();
        showToast('🎨 Couleur changee !', 'success');
    }
}

// ========================================
// AJOUTER UNE PERSONNE AVEC SA FAMILLE
// ========================================
function addPersonToGrapheWithFamily(personData) {
    if (!personData) {
        showToast('❌ Personne introuvable', 'error');
        return;
    }
    
    const name = `${personData.prenom || ''} ${personData.nom_famille || 'Inconnu'}`.trim();
    const container = document.getElementById('grapheContainer');
    const rect = container.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    
    // Noeud principal
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
    
    window.grapheNodes.push(mainNode);
    
    // Famille
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
                color: GRAPHE_COLORS[(index + 1) % GRAPHE_COLORS.length],
                isMain: false
            };
            
            window.grapheNodes.push(memberNode);
            window.grapheEdges.push({
                id: Date.now() + index + 100,
                from: mainNode.id,
                to: memberNode.id,
                label: member.lien || 'Famille'
            });
        });
    }
    
    // Sauvegarde auto
    saveGrapheToLocal();
    renderGraphe();
    
    showToast(`✅ "${name}" et sa famille ajoutes au graphe !`, 'success');
}

// ========================================
// SAUVEGARDE
// ========================================
function saveGrapheToLocal() {
    try {
        localStorage.setItem('marauder_graphe', JSON.stringify({
            nodes: window.grapheNodes,
            edges: window.grapheEdges
        }));
    } catch (e) {
        console.warn('Erreur sauvegarde locale:', e);
    }
}

// ========================================
// TOAST (fallback si pas dans dashboard)
// ========================================
function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toastContainer');
    if (!container) {
        console.log('📢', message);
        return;
    }
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        ${message}
        <button class="toast-close" onclick="this.parentElement.remove()">×</button>
    `;
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
// MODAL (fallback)
// ========================================
function showModal(title, bodyHtml, confirmText, onConfirm) {
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
    const overlay = document.getElementById('modalOverlay');
    if (overlay) overlay.classList.remove('active');
}

// ========================================
// EXPOSER
// ========================================
window.initGrapheModule = initGrapheModule;
window.renderGraphe = renderGraphe;
window.resizeGraphe = resizeGraphe;
window.addPersonToGrapheWithFamily = addPersonToGrapheWithFamily;
window.changeGrapheColor = changeGrapheColor;
window.saveGrapheToLocal = saveGrapheToLocal;
window.loadGrapheFromLocal = loadGrapheFromLocal;
window.showToast = showToast;

console.log('✅ Module graphe charge');