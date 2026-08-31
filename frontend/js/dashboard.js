const API_URL = window.location.origin;
const token = localStorage.getItem('token');

if (!token) {
    window.location.href = '/login';
}

console.log('✅ Dashboard charge');

// ============ TOAST ============
function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `${message} <button class="toast-close" onclick="this.parentElement.remove()">×</button>`;
    container.appendChild(toast);
    setTimeout(() => {
        if (toast.parentElement) {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(40px)';
            toast.style.transition = 'all 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }
    }, duration);
}

// ============ MODAL ============
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

// ============ FORMAT PHONE ============
function formatPhone(phone) {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
        return cleaned.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5');
    }
    return phone;
}

// ============ LOADING ============
function showSearchLoading() {
    const overlay = document.getElementById('searchOverlay');
    if (overlay) overlay.classList.add('active');
}

function hideSearchLoading() {
    const overlay = document.getElementById('searchOverlay');
    if (overlay) overlay.classList.remove('active');
}

// ============ VERIFY TOKEN ============
async function verifyToken() {
    try {
        const response = await fetch(`${API_URL}/api/verify`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) {
            localStorage.removeItem('token');
            window.location.href = '/login';
            return null;
        }
        const data = await response.json();
        const display = document.getElementById('usernameDisplay');
        if (display) display.textContent = data.user.username;
        return data;
    } catch (error) {
        localStorage.removeItem('token');
        window.location.href = '/login';
        return null;
    }
}

// ============ LOGOUT ============
document.getElementById('logoutBtn')?.addEventListener('click', function() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
});

// ============ SECTIONS TOGGLE ============
document.querySelectorAll('.section-header').forEach(header => {
    header.addEventListener('click', function() {
        const body = this.nextElementSibling;
        const icon = this.querySelector('.toggle-icon');
        if (body) body.classList.toggle('open');
        if (icon) icon.classList.toggle('open');
    });
});

// ============ TABS ============
document.querySelectorAll('.search-tab').forEach(tab => {
    tab.addEventListener('click', function() {
        document.querySelectorAll('.search-tab').forEach(t => t.classList.remove('active'));
        this.classList.add('active');
        document.querySelectorAll('.search-tab-content').forEach(c => c.classList.remove('active'));
        const tabId = this.dataset.tab;
        const target = document.getElementById(`tab-${tabId}`);
        if (target) target.classList.add('active');
    });
});

// ============ CLEAR FORM ============
document.getElementById('clearBtn')?.addEventListener('click', function() {
    document.querySelectorAll('#tab-french input, #tab-french select').forEach(el => el.value = '');
    const results = document.getElementById('searchResults');
    if (results) results.innerHTML = '';
});

document.getElementById('clearBtnPro')?.addEventListener('click', function() {
    document.querySelectorAll('#tab-pro input, #tab-pro select').forEach(el => el.value = '');
    const results = document.getElementById('searchResults');
    if (results) results.innerHTML = '';
});

// ============ SEARCH - VERSION SIMPLE ============
document.getElementById('searchBtn')?.addEventListener('click', function() {
    console.log('🔵 Recherche cliquee');
    
    // Récupérer les valeurs
    const nom = document.getElementById('searchNom')?.value || '';
    const prenom = document.getElementById('searchPrenom')?.value || '';
    const email = document.getElementById('searchEmail')?.value || '';
    const phone = document.getElementById('searchPhone')?.value || '';
    
    if (!nom && !prenom && !email && !phone) {
        showToast('Veuillez remplir au moins un critere', 'warning');
        return;
    }
    
    const container = document.getElementById('searchResults');
    if (container) {
        container.innerHTML = `<div class="empty-state">Recherche en cours pour ${nom || prenom || email || phone}...</div>`;
    }
    
    showToast('Recherche lancee !', 'success');
});

// ============ SEARCH PRO ============
document.getElementById('searchBtnPro')?.addEventListener('click', function() {
    console.log('🔵 Recherche Pro cliquee');
    showToast('Recherche Pro lancee !', 'success');
});

// ============ LOOKUP ============
document.getElementById('lookupBtn')?.addEventListener('click', function() {
    console.log('🔵 Lookup cliquee');
    showToast('Lookup lance !', 'success');
});

// ============ FICHES ============
document.getElementById('createFicheBtn')?.addEventListener('click', function() {
    console.log('🔵 Creer fiche');
    showModal('Creer une fiche', `
        <div class="form-group">
            <label>Nom de la fiche</label>
            <input type="text" id="ficheNameInput" placeholder="Ex: Enquete Dupont" style="width:100%;padding:10px;background:#1e1e1e;border:1px solid #2a2a2a;border-radius:8px;color:#fff;">
        </div>
    `, 'Creer', function() {
        const name = document.getElementById('ficheNameInput')?.value?.trim();
        if (!name) {
            showToast('Veuillez donner un nom', 'warning');
            return;
        }
        showToast('Fiche creee !', 'success');
        closeModal();
    });
});

// ============ TICKETS ============
function openCreateTicket() {
    console.log('🔵 openCreateTicket');
    showModal('Nouveau ticket', `
        <div class="form-group">
            <label>Sujet</label>
            <input type="text" id="ticketSubject" placeholder="Resume de votre probleme" style="width:100%;padding:10px;background:#1e1e1e;border:1px solid #2a2a2a;border-radius:8px;color:#fff;font-size:14px;">
        </div>
        <div class="form-group">
            <label>Message</label>
            <textarea id="ticketMessage" rows="5" placeholder="Decrivez votre probleme..." style="width:100%;padding:10px;background:#1e1e1e;border:1px solid #2a2a2a;border-radius:8px;color:#fff;font-family:Arial;font-size:14px;resize:vertical;"></textarea>
        </div>
    `, 'Envoyer', function() {
        const subject = document.getElementById('ticketSubject')?.value?.trim();
        const message = document.getElementById('ticketMessage')?.value?.trim();
        if (!subject || !message) {
            showToast('Veuillez remplir tous les champs', 'warning');
            return;
        }
        showToast('Ticket cree !', 'success');
        closeModal();
    });
}

document.getElementById('openTicketBtn')?.addEventListener('click', function(e) {
    e.preventDefault();
    console.log('🔵 Nouveau ticket cliquee');
    openCreateTicket();
});

// ============ GRAPHE ============
window.grapheNodes = [];
window.grapheEdges = [];
let grapheCanvas = null;
let grapheCtx = null;

function initGraphe() {
    grapheCanvas = document.getElementById('grapheCanvas');
    if (!grapheCanvas) {
        setTimeout(initGraphe, 300);
        return;
    }
    grapheCtx = grapheCanvas.getContext('2d');
    renderGraphe();
    console.log('✅ Graphe initialise');
}

function renderGraphe() {
    if (!grapheCtx || !grapheCanvas) return;
    const rect = grapheCanvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    grapheCanvas.width = rect.width * dpr;
    grapheCanvas.height = rect.height * dpr;
    grapheCanvas.style.width = rect.width + 'px';
    grapheCanvas.style.height = rect.height + 'px';
    if (grapheCtx) grapheCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    
    const W = rect.width, H = rect.height;
    grapheCtx.clearRect(0, 0, W, H);
    grapheCtx.fillStyle = '#111111';
    grapheCtx.fillRect(0, 0, W, H);
    
    if (window.grapheNodes.length === 0) {
        grapheCtx.fillStyle = 'rgba(255,255,255,0.15)';
        grapheCtx.font = '16px Arial';
        grapheCtx.textAlign = 'center';
        grapheCtx.textBaseline = 'middle';
        grapheCtx.fillText('Ajoutez des personnes', W/2, H/2 - 10);
        grapheCtx.fillStyle = 'rgba(255,255,255,0.08)';
        grapheCtx.font = '13px Arial';
        grapheCtx.fillText('Cliquez sur "Ajouter une personne"', W/2, H/2 + 20);
        return;
    }
    
    window.grapheNodes.forEach(node => {
        grapheCtx.beginPath();
        grapheCtx.arc(node.x, node.y, 24, 0, Math.PI * 2);
        grapheCtx.fillStyle = 'rgba(255,255,255,0.05)';
        grapheCtx.fill();
        grapheCtx.strokeStyle = 'rgba(255,255,255,0.2)';
        grapheCtx.lineWidth = 1.5;
        grapheCtx.stroke();
        grapheCtx.fillStyle = '#ffffff';
        grapheCtx.font = '12px Arial';
        grapheCtx.textAlign = 'center';
        grapheCtx.textBaseline = 'middle';
        const label = node.label || 'Personne';
        grapheCtx.fillText(label.length > 15 ? label.slice(0, 13) + '...' : label, node.x, node.y);
    });
}

document.getElementById('grapheAddPersonne')?.addEventListener('click', function() {
    const container = document.getElementById('grapheContainer');
    const rect = container.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    window.grapheNodes.push({
        id: Date.now(),
        label: 'Personne ' + (window.grapheNodes.length + 1),
        x: cx + (Math.random() - 0.5) * 100,
        y: cy + (Math.random() - 0.5) * 100
    });
    renderGraphe();
    showToast('Personne ajoutee !', 'success');
});

document.getElementById('grapheEffacer')?.addEventListener('click', function() {
    if (window.grapheNodes.length === 0) {
        showToast('Deja vide', 'info');
        return;
    }
    showModal('Confirmation', '<p style="color:var(--text-secondary);">Effacer tout le graphe ?</p>', 'Effacer', function() {
        window.grapheNodes = [];
        window.grapheEdges = [];
        renderGraphe();
        showToast('Graphe efface', 'info');
        closeModal();
    });
});

document.getElementById('grapheSauvegarder')?.addEventListener('click', function() {
    localStorage.setItem('marauder_graphe', JSON.stringify({
        nodes: window.grapheNodes,
        edges: window.grapheEdges
    }));
    showToast('Graphe sauvegarde', 'success');
});

document.getElementById('grapheMesGraphes')?.addEventListener('click', function() {
    const saved = localStorage.getItem('marauder_graphe');
    if (!saved) {
        showToast('Aucun graphe sauvegarde', 'warning');
        return;
    }
    try {
        const data = JSON.parse(saved);
        window.grapheNodes = data.nodes || [];
        window.grapheEdges = data.edges || [];
        renderGraphe();
        showToast('Graphe charge !', 'success');
    } catch (e) {
        showToast('Erreur de chargement', 'error');
    }
});

document.getElementById('grapheAttacher')?.addEventListener('click', function() {
    if (window.grapheNodes.length < 2) {
        showToast('Ajoutez au moins 2 personnes', 'warning');
        return;
    }
    const from = window.grapheNodes[window.grapheNodes.length - 2];
    const to = window.grapheNodes[window.grapheNodes.length - 1];
    window.grapheEdges.push({ id: Date.now(), from: from.id, to: to.id });
    renderGraphe();
    showToast('Personnes attachees !', 'success');
});

// ============ SUPPORT TOGGLE ============
document.addEventListener('DOMContentLoaded', function() {
    const supportToggle = document.getElementById('supportToggle');
    const supportSubmenu = document.getElementById('supportSubmenu');
    const supportArrow = supportToggle ? supportToggle.querySelector('.support-arrow') : null;
    
    if (supportToggle && supportSubmenu) {
        supportToggle.addEventListener('click', function(e) {
            e.stopPropagation();
            e.preventDefault();
            const isOpen = supportSubmenu.style.display === 'block';
            supportSubmenu.style.display = isOpen ? 'none' : 'block';
            if (supportArrow) {
                supportArrow.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
            }
        });
    }
    
    document.addEventListener('click', function(e) {
        if (supportToggle && supportSubmenu) {
            if (!supportToggle.contains(e.target) && !supportSubmenu.contains(e.target)) {
                supportSubmenu.style.display = 'none';
                if (supportArrow) {
                    supportArrow.style.transform = 'rotate(0deg)';
                }
            }
        }
    });
});

// ============ MOBILE MENU ============
document.addEventListener('DOMContentLoaded', function() {
    const mobileBtn = document.getElementById('mobileMenuBtn');
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebarBackdrop');
    
    if (mobileBtn && sidebar) {
        mobileBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            sidebar.classList.toggle('open');
            if (backdrop) backdrop.classList.toggle('active');
        });
    }
    
    if (backdrop) {
        backdrop.addEventListener('click', function() {
            sidebar.classList.remove('open');
            this.classList.remove('active');
        });
    }
});

// ============ NAVIGATION ============
document.querySelectorAll('.sidebar-nav li[data-page]').forEach(item => {
    item.addEventListener('click', function() {
        const page = this.dataset.page;
        console.log('Navigation vers:', page);
        
        if (page === 'discord') {
            window.open('https://discord.gg/ton-invite', '_blank');
            return;
        }
        
        document.querySelectorAll('.sidebar-nav li[data-page]').forEach(li => li.classList.remove('active'));
        this.classList.add('active');
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        const target = document.getElementById('page-' + page);
        if (target) target.classList.add('active');
    });
});

// Support submenu items
document.querySelectorAll('.support-submenu li[data-page]').forEach(item => {
    item.addEventListener('click', function(e) {
        e.stopPropagation();
        const page = this.dataset.page;
        console.log('Support submenu:', page);
        
        if (page === 'discord') {
            window.open('https://discord.gg/ton-invite', '_blank');
            return;
        }
        
        document.querySelectorAll('.sidebar-nav li[data-page]').forEach(li => li.classList.remove('active'));
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        const target = document.getElementById('page-' + page);
        if (target) target.classList.add('active');
        
        const submenu = document.getElementById('supportSubmenu');
        const arrow = document.querySelector('.support-arrow');
        if (submenu) submenu.style.display = 'none';
        if (arrow) arrow.style.transform = 'rotate(0deg)';
    });
});

// ============ INIT ============
verifyToken();
setTimeout(initGraphe, 500);

console.log('✅ Dashboard charge');