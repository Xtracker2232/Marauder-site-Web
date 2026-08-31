const API_URL = window.location.origin;
const token = localStorage.getItem('token');

if (!token) {
    window.location.href = '/login';
}

function showToast(message, type, duration) {
    type = type || 'info';
    duration = duration || 3000;
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast ' + type;
    toast.innerHTML = message + '<button class="toast-close" onclick="this.parentElement.remove()">×</button>';
    container.appendChild(toast);
    if (duration > 0) {
        setTimeout(function() {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(40px)';
            toast.style.transition = 'all 0.3s ease';
            setTimeout(function() { toast.remove(); }, 300);
        }, duration);
    }
}

function showModal(title, bodyHtml) {
    var overlay = document.getElementById('modalOverlay');
    var content = document.getElementById('modalContent');
    if (!overlay || !content) return;
    content.innerHTML = '<h3>' + title + '</h3>' + bodyHtml;
    overlay.style.display = 'flex';
}

function closeModal() {
    var overlay = document.getElementById('modalOverlay');
    if (overlay) overlay.style.display = 'none';
}

async function checkAdmin() {
    try {
        var response = await fetch(API_URL + '/api/admin/check', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (!response.ok) {
            showToast('Accès refusé - Admin requis', 'error');
            window.location.href = '/dashboard.html';
            return false;
        }
        var data = await response.json();
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

document.querySelectorAll('.admin-tab').forEach(function(tab) {
    tab.addEventListener('click', function() {
        document.querySelectorAll('.admin-tab').forEach(function(t) { t.classList.remove('active'); });
        this.classList.add('active');
        var tabId = this.dataset.tab;
        document.querySelectorAll('.admin-tab-content').forEach(function(c) { c.classList.remove('active'); });
        var target = document.getElementById('tab-' + tabId);
        if (target) target.classList.add('active');
        if (tabId === 'dashboard') loadStats();
        if (tabId === 'users') loadUsers();
        if (tabId === 'searches') loadSearches();
        if (tabId === 'blocklist') loadBlocklist();
        if (tabId === 'tickets') loadTickets();
    });
});

document.querySelectorAll('[data-filter]').forEach(function(btn) {
    btn.addEventListener('click', function() {
        document.querySelectorAll('[data-filter]').forEach(function(b) { b.style.borderColor = 'var(--border-color)'; });
        this.style.borderColor = '#ffffff';
        loadTickets(this.dataset.filter);
    });
});

async function loadStats() {
    try {
        var response = await fetch(API_URL + '/api/admin/stats', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (!response.ok) throw new Error('Erreur');
        var data = await response.json();
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

var usersPage = 1;
var usersTotal = 0;
var usersSearch = '';

async function loadUsers(page, search) {
    page = page || 1;
    search = search || '';
    usersPage = page;
    usersSearch = search;
    var tbody = document.getElementById('usersTableBody');
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:30px;">Chargement...</td></tr>';
    try {
        var url = API_URL + '/api/admin/users?page=' + page + '&limit=20&search=' + encodeURIComponent(search);
        var response = await fetch(url, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (!response.ok) throw new Error('Erreur');
        var data = await response.json();
        usersTotal = data.total || 0;
        if (data.users && data.users.length > 0) {
            var html = '';
            data.users.forEach(function(u) {
                var isAdmin = u.role === 'admin';
                var statusClass = u.banned ? 'banned' : 'active';
                var statusText = u.banned ? 'Banni' : 'Actif';
                html += '<tr>' +
                    '<td><span class="clickable" onclick="viewUser(' + u.id + ')">' + u.username + '</span></td>' +
                    '<td><span class="badge-role ' + u.role + '">' + u.role + '</span></td>' +
                    '<td><span class="badge-status ' + statusClass + '">' + statusText + '</span></td>' +
                    '<td>' + (u.search_count || 0) + '</td>' +
                    '<td>' + (u.fiche_count || 0) + '</td>' +
                    '<td>' + (u.reg_ip || '-') + '</td>' +
                    '<td><div class="admin-actions">';
                if (!isAdmin) {
                    html += '<button class="primary" onclick="viewUser(' + u.id + ')">Voir</button>';
                    html += '<button class="' + (u.banned ? 'success' : 'danger') + '" onclick="toggleBan(' + u.id + ', ' + (!u.banned) + ')">' + (u.banned ? 'Débannir' : 'Bannir') + '</button>';
                    html += '<button class="danger" onclick="deleteUser(' + u.id + ')">Supprimer</button>';
                } else {
                    html += '<span style="color:var(--text-muted);font-size:11px;">🔒 Protégé</span>';
                }
                html += '</div></td></tr>';
            });
            tbody.innerHTML = html;
        } else {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:30px;">Aucun utilisateur trouvé</td></tr>';
        }
        updatePagination('users', page, usersTotal);
    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--danger);padding:30px;">Erreur de chargement</td></tr>';
    }
}

document.getElementById('userSearchBtn').addEventListener('click', function() {
    var search = document.getElementById('userSearch').value.trim();
    loadUsers(1, search);
});

document.getElementById('userSearch').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        var search = document.getElementById('userSearch').value.trim();
        loadUsers(1, search);
    }
});

document.getElementById('usersPrevPage').addEventListener('click', function() {
    if (usersPage > 1) loadUsers(usersPage - 1, usersSearch);
});

document.getElementById('usersNextPage').addEventListener('click', function() {
    if (usersPage * 20 < usersTotal) loadUsers(usersPage + 1, usersSearch);
});

function updatePagination(type, page, total) {
    var totalPages = Math.ceil(total / 20) || 1;
    var info = document.getElementById(type + 'PaginationInfo');
    var prev = document.getElementById(type + 'PrevPage');
    var next = document.getElementById(type + 'NextPage');
    if (info) info.textContent = 'Page ' + page + ' / ' + totalPages;
    if (prev) prev.disabled = page <= 1;
    if (next) next.disabled = page >= totalPages;
}

async function viewUser(userId) {
    try {
        var response = await fetch(API_URL + '/api/admin/users/' + userId, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (!response.ok) throw new Error('Erreur');
        var data = await response.json();
        var user = data.user;
        var ips = data.ips || [];
        var searches = data.recent_searches || [];
        var isProtected = user.username === 'Admin';
        var html = '<div class="user-detail-modal"><div class="info-grid">' +
            '<div class="info-item"><span class="label">Nom d\'utilisateur</span><span class="value highlight">' + user.username + '</span></div>' +
            '<div class="info-item"><span class="label">Rôle</span><span class="value">' + user.role + '</span></div>' +
            '<div class="info-item"><span class="label">Status</span><span class="value' + (user.banned ? ' style=color:var(--danger);' : '') + '">' + (user.banned ? 'Banni' : 'Actif') + '</span></div>' +
            '<div class="info-item"><span class="label">IP d\'inscription</span><span class="value">' + (user.reg_ip || '-') + '</span></div>' +
            '<div class="info-item"><span class="label">Nombre de recherches</span><span class="value">' + (user.search_count || 0) + '</span></div>' +
            '<div class="info-item"><span class="label">Nombre de fiches</span><span class="value">' + (user.fiche_count || 0) + '</span></div>' +
            '<div class="info-item"><span class="label">Membre depuis</span><span class="value">' + new Date(user.created_at).toLocaleDateString() + '</span></div>' +
            '<div class="info-item"><span class="label">Dernière connexion</span><span class="value">' + (user.last_login ? new Date(user.last_login).toLocaleString() : 'Jamais') + '</span></div>' +
            '</div>';
        if (ips.length > 0) {
            html += '<div style="margin-top:12px;border-top:1px solid var(--border-color);padding-top:12px;"><div style="font-weight:600;color:#ffffff;margin-bottom:6px;">IPs liées (' + ips.length + ')</div>';
            ips.forEach(function(ip) {
                html += '<div style="display:flex;justify-content:space-between;font-size:13px;color:var(--text-secondary);padding:3px 0;border-bottom:1px solid rgba(255,255,255,0.03);"><span>' + ip.ip + '</span><span style="font-size:11px;color:var(--text-muted);">' + new Date(ip.created_at).toLocaleDateString() + '</span></div>';
            });
            html += '</div>';
        }
        if (searches.length > 0) {
            html += '<div style="margin-top:12px;border-top:1px solid var(--border-color);padding-top:12px;"><div style="font-weight:600;color:#ffffff;margin-bottom:6px;">Dernières recherches</div>';
            searches.forEach(function(s) {
                var criteria = Object.entries(s.query || {}).filter(function(kv) { return !['flexible','per_page','page'].includes(kv[0]); });
                html += '<div style="font-size:13px;color:var(--text-secondary);padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.03);"><span>' + (criteria.map(function(kv) { return kv[0] + ': ' + kv[1]; }).join(' · ') || 'Recherche') + '</span><span style="font-size:11px;color:var(--text-muted);float:right;">' + new Date(s.created_at).toLocaleString() + '</span></div>';
            });
            html += '</div>';
        }
        if (isProtected) {
            html += '<div style="margin-top:12px;padding:10px;background:rgba(255,255,255,0.05);border-radius:6px;color:var(--warning);font-size:13px;text-align:center;">🔒 Ce compte admin est protégé</div>';
        }
        html += '<div class="modal-actions" style="margin-top:16px;">';
        if (!isProtected) {
            html += '<button class="btn-primary" onclick="closeModal();toggleBan(' + user.id + ', ' + (!user.banned) + ')">' + (user.banned ? 'Débannir' : 'Bannir') + '</button>';
            html += '<button class="btn-secondary" style="color:var(--danger);border-color:rgba(239,68,68,0.3);" onclick="closeModal();deleteUser(' + user.id + ')">Supprimer</button>';
        }
        html += '<button class="btn-secondary" onclick="closeModal()">Fermer</button></div></div>';
        showModal('Détails utilisateur', html);
    } catch (error) {
        showToast('Erreur chargement utilisateur', 'error');
    }
}

async function toggleBan(userId, banned) {
    if (!confirm('Confirmer le ' + (banned ? 'bannissement' : 'débannissement') + ' ?')) return;
    try {
        var response = await fetch(API_URL + '/api/admin/users/' + userId + '/ban', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({ banned: banned })
        });
        if (response.ok) {
            showToast('Utilisateur ' + (banned ? 'banni' : 'débanni') + ' !', 'success');
            loadUsers(usersPage, usersSearch);
        } else {
            showToast('Erreur', 'error');
        }
    } catch (error) {
        showToast('Erreur réseau', 'error');
    }
}

async function deleteUser(userId) {
    if (!confirm('Confirmer la suppression de cet utilisateur ? (Cette action est irréversible)')) return;
    try {
        var response = await fetch(API_URL + '/api/admin/users/' + userId, {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (response.ok) {
            showToast('Utilisateur supprimé !', 'success');
            loadUsers(usersPage, usersSearch);
        } else {
            var data = await response.json();
            showToast(data.error || 'Erreur', 'error');
        }
    } catch (error) {
        showToast('Erreur réseau', 'error');
    }
}

var searchesPage = 1;
var searchesTotal = 0;

async function loadSearches(page) {
    page = page || 1;
    searchesPage = page;
    var tbody = document.getElementById('searchesTableBody');
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:30px;">Chargement...</td></tr>';
    try {
        var response = await fetch(API_URL + '/api/admin/searches?page=' + page + '&limit=50', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (!response.ok) throw new Error('Erreur');
        var data = await response.json();
        searchesTotal = data.total || 0;
        if (data.searches && data.searches.length > 0) {
            var html = '';
            data.searches.forEach(function(s) {
                var query = s.query || {};
                var criteria = Object.entries(query).filter(function(kv) { return !['flexible','per_page','page'].includes(kv[0]); });
                html += '<tr>' +
                    '<td><span class="clickable" onclick="viewUser(' + s.user_id + ')">' + (s.username || 'Inconnu') + '</span></td>' +
                    '<td style="font-size:12px;">' + (criteria.map(function(kv) { return kv[0] + ': ' + kv[1]; }).join(' · ') || '-') + '</td>' +
                    '<td>' + (s.results_count || 0) + '</td>' +
                    '<td style="font-size:12px;color:var(--text-muted);">' + new Date(s.created_at).toLocaleString() + '</td></tr>';
            });
            tbody.innerHTML = html;
        } else {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:30px;">Aucune recherche</td></tr>';
        }
        updatePagination('searches', page, searchesTotal);
    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--danger);padding:30px;">Erreur de chargement</td></tr>';
    }
}

document.getElementById('searchesPrevPage').addEventListener('click', function() {
    if (searchesPage > 1) loadSearches(searchesPage - 1);
});

document.getElementById('searchesNextPage').addEventListener('click', function() {
    if (searchesPage * 50 < searchesTotal) loadSearches(searchesPage + 1);
});

async function loadBlocklist() {
    var tbody = document.getElementById('blocklistTableBody');
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:30px;">Chargement...</td></tr>';
    try {
        var response = await fetch(API_URL + '/api/admin/blocklist', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (!response.ok) throw new Error('Erreur');
        var data = await response.json();
        if (data.blocklist && data.blocklist.length > 0) {
            var html = '';
            data.blocklist.forEach(function(b) {
                html += '<tr>' +
                    '<td>' + b.type + '</td>' +
                    '<td><span style="color:#ffffff;">' + b.value + '</span></td>' +
                    '<td>' + (b.reason || '-') + '</td>' +
                    '<td style="font-size:12px;color:var(--text-muted);">' + new Date(b.created_at).toLocaleDateString() + '</td>' +
                    '<td><button class="danger" onclick="deleteBlocklistItem(' + b.id + ')">Supprimer</button></td></tr>';
            });
            tbody.innerHTML = html;
        } else {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:30px;">Aucune entrée dans la blocklist</td></tr>';
        }
    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--danger);padding:30px;">Erreur de chargement</td></tr>';
    }
}

document.getElementById('blocklistAddBtn').addEventListener('click', async function() {
    var type = document.getElementById('blocklistType').value;
    var value = document.getElementById('blocklistValue').value.trim();
    var reason = document.getElementById('blocklistReason').value.trim();
    if (!value) {
        showToast('Veuillez entrer une valeur', 'warning');
        return;
    }
    try {
        var response = await fetch(API_URL + '/api/admin/blocklist', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({ type: type, value: value, reason: reason })
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
        var response = await fetch(API_URL + '/api/admin/blocklist/' + id, {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (response.ok) {
            showToast('Supprimé !', 'success');
            loadBlocklist();
        }
    } catch (error) {
        showToast('Erreur', 'error');
    }
}

var ticketsFilter = 'all';

async function loadTickets(filter) {
    filter = filter || 'all';
    ticketsFilter = filter;
    var container = document.getElementById('ticketsList');
    container.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:30px;">Chargement...</div>';
    try {
        var url = filter === 'all' ? API_URL + '/api/admin/tickets' : API_URL + '/api/admin/tickets?status=' + filter;
        var response = await fetch(url, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (!response.ok) throw new Error('Erreur');
        var data = await response.json();
        if (data.tickets && data.tickets.length > 0) {
            var html = '';
            data.tickets.forEach(function(t) {
                var statusText = t.status === 'open' ? 'Ouvert' : t.status === 'in_progress' ? 'En cours' : 'Fermé';
                html += '<div class="ticket-item" data-id="' + t.id + '">' +
                    '<div class="ticket-header">' +
                    '<div><span class="ticket-subject">' + t.subject + '</span><span style="font-size:12px;color:var(--text-muted);margin-left:12px;">par ' + (t.user_name || 'Inconnu') + '</span></div>' +
                    '<div style="display:flex;align-items:center;gap:12px;"><span class="ticket-status ' + t.status + '">' + statusText + '</span><span class="ticket-meta">' + new Date(t.created_at).toLocaleDateString() + '</span></div>' +
                    '</div>' +
                    '<div style="font-size:13px;color:var(--text-secondary);margin-top:4px;">' + t.message.substring(0, 150) + (t.message.length > 150 ? '...' : '') + '</div>' +
                    '<div class="ticket-detail" id="ticketDetail-' + t.id + '">' +
                    '<div id="ticketMessages-' + t.id + '"></div>' +
                    '<div class="ticket-reply"><input type="text" id="ticketReplyInput-' + t.id + '" placeholder="Répondre..." /><button onclick="replyTicket(' + t.id + ')">Envoyer</button></div>' +
                    '<div style="margin-top:8px;display:flex;gap:8px;">' +
                    '<button onclick="changeTicketStatus(' + t.id + ', \'open\')" style="padding:4px 12px;background:transparent;border:1px solid var(--border-color);border-radius:4px;color:var(--text-secondary);cursor:pointer;font-size:12px;font-family:\'Inter\',sans-serif;">Ouvrir</button>' +
                    '<button onclick="changeTicketStatus(' + t.id + ', \'in_progress\')" style="padding:4px 12px;background:transparent;border:1px solid var(--border-color);border-radius:4px;color:var(--text-secondary);cursor:pointer;font-size:12px;font-family:\'Inter\',sans-serif;">En cours</button>' +
                    '<button onclick="changeTicketStatus(' + t.id + ', \'closed\')" style="padding:4px 12px;background:transparent;border:1px solid var(--border-color);border-radius:4px;color:var(--text-secondary);cursor:pointer;font-size:12px;font-family:\'Inter\',sans-serif;">Fermer</button>' +
                    '</div></div></div>';
            });
            container.innerHTML = html;
            document.querySelectorAll('.ticket-item').forEach(function(el) {
                el.addEventListener('click', function(e) {
                    if (e.target.closest('button') || e.target.closest('input')) return;
                    var id = this.dataset.id;
                    var detail = document.getElementById('ticketDetail-' + id);
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
    var container = document.getElementById('ticketMessages-' + ticketId);
    if (!container) return;
    container.innerHTML = 'Chargement...';
    try {
        var response = await fetch(API_URL + '/api/admin/tickets/' + ticketId, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (!response.ok) throw new Error('Erreur');
        var data = await response.json();
        var messages = data.messages || [];
        if (messages.length > 0) {
            var html = '';
            messages.forEach(function(m) {
                html += '<div class="ticket-message' + (m.is_admin ? ' admin' : '') + '">' +
                    '<div class="msg-meta">' + (m.username || 'Inconnu') + ' · ' + new Date(m.created_at).toLocaleString() + (m.is_admin ? ' · Admin' : '') + '</div>' +
                    m.message +
                    '</div>';
            });
            container.innerHTML = html;
        } else {
            container.innerHTML = '<div style="color:var(--text-muted);font-size:13px;">Aucun message</div>';
        }
    } catch (error) {
        container.innerHTML = '<div style="color:var(--danger);font-size:13px;">Erreur</div>';
    }
}

async function replyTicket(ticketId) {
    var input = document.getElementById('ticketReplyInput-' + ticketId);
    if (!input) return;
    var message = input.value.trim();
    if (!message) {
        showToast('Veuillez entrer un message', 'warning');
        return;
    }
    try {
        var response = await fetch(API_URL + '/api/admin/tickets/' + ticketId + '/reply', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({ message: message })
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
        var response = await fetch(API_URL + '/api/admin/tickets/' + ticketId + '/status', {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({ status: status })
        });
        if (response.ok) {
            showToast('Status mis à jour : ' + status, 'success');
            loadTickets(ticketsFilter);
        }
    } catch (error) {
        showToast('Erreur', 'error');
    }
}

async function init() {
    var isAdmin = await checkAdmin();
    if (!isAdmin) return;
    loadStats();
}

init();