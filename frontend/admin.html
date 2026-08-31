const API_URL = window.location.origin;
const token = localStorage.getItem('token');

if (!token) {
    window.location.href = '/login';
}

// ============ TOAST ============
function showToast(message, type = 'info', duration = 3000) {
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

// ============ MODAL ============
function showModal(title, bodyHtml) {
    const overlay = document.getElementById('modalOverlay');
    const content = document.getElementById('modalContent');
    if (!overlay || !content) return;
    content.innerHTML = `
        <h3>${title}</h3>
        ${bodyHtml}
    `;
    overlay.style.display = 'flex';
}

function closeModal() {
    const overlay = document.getElementById('modalOverlay');
    if (overlay) overlay.style.display = 'none';
}

// ============ VÉRIFICATION ADMIN ============
async function checkAdmin() {
    try {
        const response = await fetch(`${API_URL}/api/admin/check`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) {
            showToast('Accès refusé - Admin requis', 'error');
            window.location.href = '/dashboard.html';
            return false;
        }
        const data = await response.json();
        if (!data.isAdmin) {
            showToast('Accès refusé - Admin requis', 'error');
            window.location.href = '/dashboard.html';
            return false;
        }
        return true;
    } catch (error) {
        showToast('Erreur de vérification', 'error');
        window.location.href = '/dashboard.html';
        return false;
    }
}

// ============ TABS ============
document.querySelectorAll('.admin-tab').forEach(tab => {
    tab.addEventListener('click', function() {
        document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
        this.classList.add('active');
        const tabId = this.dataset.tab;
        document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.remove('active'));
        const target = document.getElementById(`tab-${tabId}`);
        if (target) target.classList.add('active');
        if (tabId === 'dashboard') loadStats();
        if (tabId === 'users') loadUsers();
        if (tabId === 'searches') loadSearches();
        if (tabId === 'blocklist') loadBlocklist();
        if (tabId === 'tickets') loadTickets();
    });
});

// Filtres tickets
document.querySelectorAll('[data-filter]').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('[data-filter]').forEach(b => b.style.borderColor = 'var(--border-color)');
        this.style.borderColor = '#ffffff';
        loadTickets(this.dataset.filter);
    });
});

// ============ STATS ============
async function loadStats() {
    try {
        const response = await fetch(`${API_URL}/api/admin/stats`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Erreur');
        const data = await response.json();
        document.getElementById('statUsers').textContent = data.total_users || 0;
        document.getElementById('statSearches').textContent = data.total_searches || 0;
        document.getElementById('statFiches').textContent = data.total_fiches || 0;
        document.getElementById('statGraphes').textContent = data.total_graphes || 0;
        document.getElementById('statBanned').textContent = data.banned_users || 0;
        document.getElementById('statTodaySearches').textContent = data.searches_today || 0;
        document.getElementById('statTodayUsers').textContent = data.users_today || 0;
    } catch (error) {
        showToast('Erreur chargement stats', 'error');
    }
}

// ============ USERS ============
let usersPage = 1;
let usersTotal = 0;
let usersSearch = '';

async function loadUsers(page = 1, search = '') {
    usersPage = page;
    usersSearch = search;
    const tbody = document.getElementById('usersTableBody');
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:30px;">Chargement...</td></tr>';
    try {
        const url = `${API_URL}/api/admin/users?page=${page}&limit=20&search=${encodeURIComponent(search)}`;
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Erreur');
        const data = await response.json();
        usersTotal = data.total || 0;
        if (data.users && data.users.length > 0) {
            tbody.innerHTML = data.users.map(u => {
                const isAdmin = u.role === 'admin';
                const statusClass = u.banned ? 'banned' : 'active';
                const statusText = u.banned ? 'Banni' : 'Actif';
                return `
                    <tr>
                        <td><span class="clickable" onclick="viewUser(${u.id})">${u.username}</span></td>
                        <td><span class="badge-role ${u.role}">${u.role}</span></td>
                        <td><span class="badge-status ${statusClass}">${statusText}</span></td>
                        <td>${u.search_count || 0}</td>
                        <td>${u.fiche_count || 0}</td>
                        <td>${u.reg_ip || '-'}</td>
                        <td>
                            <div class="admin-actions">
                                ${!isAdmin ? `
                                    <button class="primary" onclick="viewUser(${u.id})">Voir</button>
                                    <button class="${u.banned ? 'success' : 'danger'}" onclick="toggleBan(${u.id}, ${!u.banned})">
                                        ${u.banned ? 'Débannir' : 'Bannir'}
                                    </button>
                                    <button class="danger" onclick="deleteUser(${u.id})">Supprimer</button>
                                ` : `
                                    <span style="color:var(--text-muted);font-size:11px;">🔒 Protégé</span>
                                `}
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:30px;">Aucun utilisateur trouvé</td></tr>';
        }
        updatePagination('users', page, usersTotal);
    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--danger);padding:30px;">Erreur de chargement</td></tr>';
    }
}

document.getElementById('userSearchBtn')?.addEventListener('click', () => {
    const search = document.getElementById('userSearch').value.trim();
    loadUsers(1, search);
});

document.getElementById('userSearch')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        const search = document.getElementById('userSearch').value.trim();
        loadUsers(1, search);
    }
});

document.getElementById('usersPrevPage')?.addEventListener('click', () => {
    if (usersPage > 1) loadUsers(usersPage - 1, usersSearch);
});

document.getElementById('usersNextPage')?.addEventListener('click', () => {
    if (usersPage * 20 < usersTotal) loadUsers(usersPage + 1, usersSearch);
});

function updatePagination(type, page, total) {
    const totalPages = Math.ceil(total / 20) || 1;
    const info = document.getElementById(`${type}PaginationInfo`);
    const prev = document.getElementById(`${type}PrevPage`);
    const next = document.getElementById(`${type}NextPage`);
    if (info) info.textContent = `Page ${page} / ${totalPages}`;
    if (prev) prev.disabled = page <= 1;
    if (next) next.disabled = page >= totalPages;
}

// ============ VIEW USER ============
async function viewUser(userId) {
    try {
        const response = await fetch(`${API_URL}/api/admin/users/${userId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Erreur');
        const data = await response.json();
        const user = data.user;
        const ips = data.ips || [];
        const searches = data.recent_searches || [];
        const isProtected = user.username === 'Admin';
        showModal('Détails utilisateur', `
            <div class="user-detail-modal">
                <div class="info-grid">
                    <div class="info-item"><span class="label">Nom d'utilisateur</span><span class="value highlight">${user.username}</span></div>
                    <div class="info-item"><span class="label">Rôle</span><span class="value">${user.role}</span></div>
                    <div class="info-item"><span class="label">Status</span><span class="value ${user.banned ? 'style=color:var(--danger);' : ''}">${user.banned ? 'Banni' : 'Actif'}</span></div>
                    <div class="info-item"><span class="label">IP d'inscription</span><span class="value">${user.reg_ip || '-'}</span></div>
                    <div class="info-item"><span class="label">Nombre de recherches</span><span class="value">${user.search_count || 0}</span></div>
                    <div class="info-item"><span class="label">Nombre de fiches</span><span class="value">${user.fiche_count || 0}</span></div>
                    <div class="info-item"><span class="label">Membre depuis</span><span class="value">${new Date(user.created_at).toLocaleDateString()}</span></div>
                    <div class="info-item"><span class="label">Dernière connexion</span><span class="value">${user.last_login ? new Date(user.last_login).toLocaleString() : 'Jamais'}</span></div>
                </div>
                ${ips.length > 0 ? `
                    <div style="margin-top:12px;border-top:1px solid var(--border-color);padding-top:12px;">
                        <div style="font-weight:600;color:#ffffff;margin-bottom:6px;">IPs liées (${ips.length})</div>
                        ${ips.map(ip => `
                            <div style="display:flex;justify-content:space-between;font-size:13px;color:var(--text-secondary);padding:3px 0;border-bottom:1px solid rgba(255,255,255,0.03);">
                                <span>${ip.ip}</span>
                                <span style="font-size:11px;color:var(--text-muted);">${new Date(ip.created_at).toLocaleDateString()}</span>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
                ${searches.length > 0 ? `
                    <div style="margin-top:12px;border-top:1px solid var(--border-color);padding-top:12px;">
                        <div style="font-weight:600;color:#ffffff;margin-bottom:6px;">Dernières recherches</div>
                        ${searches.map(s => `
                            <div style="font-size:13px;color:var(--text-secondary);padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.03);">
                                <span>${Object.entries(s.query || {}).filter(([k]) => !['flexible','per_page','page'].includes(k)).map(([k,v]) => `${k}: ${v}`).join(' · ') || 'Recherche'}</span>
                                <span style="font-size:11px;color:var(--text-muted);float:right;">${new Date(s.created_at).toLocaleString()}</span>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
                ${isProtected ? `<div style="margin-top:12px;padding:10px;background:rgba(255,255,255,0.05);border-radius:6px;color:var(--warning);font-size:13px;text-align:center;">🔒 Ce compte admin est protégé</div>` : ''}
                <div class="modal-actions" style="margin-top:16px;">
                    ${!isProtected ? `
                        <button class="btn-primary" onclick="closeModal();toggleBan(${user.id}, ${!user.banned})">${user.banned ? 'Débannir' : 'Bannir'}</button>
                        <button class="btn-secondary" style="color:var(--danger);border-color:rgba(239,68,68,0.3);" onclick="closeModal();deleteUser(${user.id})">Supprimer</button>
                    ` : ''}
                    <button class="btn-secondary" onclick="closeModal()">Fermer</button>
                </div>
            </div>
        `);
    } catch (error) {
        showToast('Erreur chargement utilisateur', 'error');
    }
}

// ============ TOGGLE BAN ============
async function toggleBan(userId, banned) {
    if (!confirm(`Confirmer le ${banned ? 'bannissement' : 'débannissement'} ?`)) return;
    try {
        const response = await fetch(`${API_URL}/api/admin/users/${userId}/ban`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ banned })
        });
        if (response.ok) {
            showToast(`Utilisateur ${banned ? 'banni' : 'débanni'} !`, 'success');
            loadUsers(usersPage, usersSearch);
        } else {
            showToast('Erreur', 'error');
        }
    } catch (error) {
        showToast('Erreur réseau', 'error');
    }
}

// ============ DELETE USER ============
async function deleteUser(userId) {
    if (!confirm('Confirmer la suppression de cet utilisateur ? (Cette action est irréversible)')) return;
    try {
        const response = await fetch(`${API_URL}/api/admin/users/${userId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            showToast('Utilisateur supprimé !', 'success');
            loadUsers(usersPage, usersSearch);
        } else {
            const data = await response.json();
            showToast(data.error || 'Erreur', 'error');
        }
    } catch (error) {
        showToast('Erreur réseau', 'error');
    }
}

// ============ SEARCHES ============
let searchesPage = 1;
let searchesTotal = 0;

async function loadSearches(page = 1) {
    searchesPage = page;
    const tbody = document.getElementById('searchesTableBody');
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:30px;">Chargement...</td></tr>';
    try {
        const response = await fetch(`${API_URL}/api/admin/searches?page=${page}&limit=50`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Erreur');
        const data = await response.json();
        searchesTotal = data.total || 0;
        if (data.searches && data.searches.length > 0) {
            tbody.innerHTML = data.searches.map(s => {
                const query = s.query || {};
                const criteria = Object.entries(query).filter(([k]) => !['flexible','per_page','page'].includes(k));
                return `
                    <tr>
                        <td><span class="clickable" onclick="viewUser(${s.user_id})">${s.username || 'Inconnu'}</span></td>
                        <td style="font-size:12px;">${criteria.map(([k,v]) => `${k}: ${v}`).join(' · ') || '-'}</td>
                        <td>${s.results_count || 0}</td>
                        <td style="font-size:12px;color:var(--text-muted);">${new Date(s.created_at).toLocaleString()}</td>
                    </tr>
                `;
            }).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:30px;">Aucune recherche</td></tr>';
        }
        updatePagination('searches', page, searchesTotal);
    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--danger);padding:30px;">Erreur de chargement</td></tr>';
    }
}

document.getElementById('searchesPrevPage')?.addEventListener('click', () => {
    if (searchesPage > 1) loadSearches(searchesPage - 1);
});

document.getElementById('searchesNextPage')?.addEventListener('click', () => {
    if (searchesPage * 50 < searchesTotal) loadSearches(searchesPage + 1);
});

// ============ BLOCKLIST ============
async function loadBlocklist() {
    const tbody = document.getElementById('blocklistTableBody');
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:30px;">Chargement...</td></tr>';
    try {
        const response = await fetch(`${API_URL}/api/admin/blocklist`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Erreur');
        const data = await response.json();
        if (data.blocklist && data.blocklist.length > 0) {
            tbody.innerHTML = data.blocklist.map(b => `
                <tr>
                    <td>${b.type}</td>
                    <td><span style="color:#ffffff;">${b.value}</span></td>
                    <td>${b.reason || '-'}</td>
                    <td style="font-size:12px;color:var(--text-muted);">${new Date(b.created_at).toLocaleDateString()}</td>
                    <td><button class="danger" onclick="deleteBlocklistItem(${b.id})">Supprimer</button></td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:30px;">Aucune entrée dans la blocklist</td></tr>';
        }
    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--danger);padding:30px;">Erreur de chargement</td></tr>';
    }
}

document.getElementById('blocklistAddBtn')?.addEventListener('click', async () => {
    const type = document.getElementById('blocklistType').value;
    const value = document.getElementById('blocklistValue').value.trim();
    const reason = document.getElementById('blocklistReason').value.trim();
    if (!value) {
        showToast('Veuillez entrer une valeur', 'warning');
        return;
    }
    try {
        const response = await fetch(`${API_URL}/api/admin/blocklist`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ type, value, reason })
        });
        if (response.ok) {
            showToast('Ajouté à la blocklist !', 'success');
            document.getElementById('blocklistValue').value = '';
            document.getElementById('blocklistReason').value = '';
            loadBlocklist();
        } else {
            showToast('Erreur', 'error');
        }
    } catch (error) {
        showToast('Erreur réseau', 'error');
    }
});

async function deleteBlocklistItem(id) {
    if (!confirm('Supprimer cette entrée ?')) return;
    try {
        const response = await fetch(`${API_URL}/api/admin/blocklist/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            showToast('Supprimé !', 'success');
            loadBlocklist();
        }
    } catch (error) {
        showToast('Erreur', 'error');
    }
}

// ============ TICKETS ============
let ticketsFilter = 'all';

async function loadTickets(filter = 'all') {
    ticketsFilter = filter;
    const container = document.getElementById('ticketsList');
    container.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:30px;">Chargement...</div>';
    try {
        const url = filter === 'all' ? `${API_URL}/api/admin/tickets` : `${API_URL}/api/admin/tickets?status=${filter}`;
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Erreur');
        const data = await response.json();
        if (data.tickets && data.tickets.length > 0) {
            container.innerHTML = data.tickets.map(t => `
                <div class="ticket-item" data-id="${t.id}">
                    <div class="ticket-header">
                        <div>
                            <span class="ticket-subject">${t.subject}</span>
                            <span style="font-size:12px;color:var(--text-muted);margin-left:12px;">par ${t.user_name || 'Inconnu'}</span>
                        </div>
                        <div style="display:flex;align-items:center;gap:12px;">
                            <span class="ticket-status ${t.status}">${t.status === 'open' ? 'Ouvert' : t.status === 'in_progress' ? 'En cours' : 'Fermé'}</span>
                            <span class="ticket-meta">${new Date(t.created_at).toLocaleDateString()}</span>
                        </div>
                    </div>
                    <div style="font-size:13px;color:var(--text-secondary);margin-top:4px;">${t.message.substring(0, 150)}${t.message.length > 150 ? '...' : ''}</div>
                    <div class="ticket-detail" id="ticketDetail-${t.id}">
                        <div id="ticketMessages-${t.id}"></div>
                        <div class="ticket-reply">
                            <input type="text" id="ticketReplyInput-${t.id}" placeholder="Répondre..." />
                            <button onclick="replyTicket(${t.id})">Envoyer</button>
                        </div>
                        <div style="margin-top:8px;display:flex;gap:8px;">
                            <button onclick="changeTicketStatus(${t.id}, 'open')" style="padding:4px 12px;background:transparent;border:1px solid var(--border-color);border-radius:4px;color:var(--text-secondary);cursor:pointer;font-size:12px;font-family:'Inter',sans-serif;">Ouvrir</button>
                            <button onclick="changeTicketStatus(${t.id}, 'in_progress')" style="padding:4px 12px;background:transparent;border:1px solid var(--border-color);border-radius:4px;color:var(--text-secondary);cursor:pointer;font-size:12px;font-family:'Inter',sans-serif;">En cours</button>
                            <button onclick="changeTicketStatus(${t.id}, 'closed')" style="padding:4px 12px;background:transparent;border:1px solid var(--border-color);border-radius:4px;color:var(--text-secondary);cursor:pointer;font-size:12px;font-family:'Inter',sans-serif;">Fermer</button>
                        </div>
                    </div>
                </div>
            `).join('');
            document.querySelectorAll('.ticket-item').forEach(el => {
                el.addEventListener('click', function(e) {
                    if (e.target.closest('button') || e.target.closest('input')) return;
                    const id = this.dataset.id;
                    const detail = document.getElementById(`ticketDetail-${id}`);
                    if (detail) {
                        detail.classList.toggle('open');
                        if (detail.classList.contains('open')) {
                            loadTicketMessages(id);
                        }
                    }
                });
            });
        } else {
            container.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:30px;">Aucun ticket</div>';
        }
    } catch (error) {
        container.innerHTML = '<div style="text-align:center;color:var(--danger);padding:30px;">Erreur de chargement</div>';
    }
}

async function loadTicketMessages(ticketId) {
    const container = document.getElementById(`ticketMessages-${ticketId}`);
    if (!container) return;
    container.innerHTML = 'Chargement...';
    try {
        const response = await fetch(`${API_URL}/api/admin/tickets/${ticketId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Erreur');
        const data = await response.json();
        const messages = data.messages || [];
        if (messages.length > 0) {
            container.innerHTML = messages.map(m => `
                <div class="ticket-message ${m.is_admin ? 'admin' : ''}">
                    <div class="msg-meta">${m.username || 'Inconnu'} · ${new Date(m.created_at).toLocaleString()}${m.is_admin ? ' · Admin' : ''}</div>
                    ${m.message}
                </div>
            `).join('');
        } else {
            container.innerHTML = '<div style="color:var(--text-muted);font-size:13px;">Aucun message</div>';
        }
    } catch (error) {
        container.innerHTML = '<div style="color:var(--danger);font-size:13px;">Erreur</div>';
    }
}

async function replyTicket(ticketId) {
    const input = document.getElementById(`ticketReplyInput-${ticketId}`);
    if (!input) return;
    const message = input.value.trim();
    if (!message) {
        showToast('Veuillez entrer un message', 'warning');
        return;
    }
    try {
        const response = await fetch(`${API_URL}/api/admin/tickets/${ticketId}/reply`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ message })
        });
        if (response.ok) {
            input.value = '';
            showToast('Réponse envoyée !', 'success');
            loadTicketMessages(ticketId);
            loadTickets(ticketsFilter);
        } else {
            showToast('Erreur', 'error');
        }
    } catch (error) {
        showToast('Erreur réseau', 'error');
    }
}

async function changeTicketStatus(ticketId, status) {
    try {
        const response = await fetch(`${API_URL}/api/admin/tickets/${ticketId}/status`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ status })
        });
        if (response.ok) {
            showToast(`Status mis à jour : ${status}`, 'success');
            loadTickets(ticketsFilter);
        }
    } catch (error) {
        showToast('Erreur', 'error');
    }
}

// ============ INIT ============
async function init() {
    const isAdmin = await checkAdmin();
    if (!isAdmin) return;
    loadStats();
}

init();