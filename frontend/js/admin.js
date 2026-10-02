// ============================================
// ADMIN PANEL - admin.js
// ============================================
const API_URL = window.location.origin;
const token = localStorage.getItem('token');

if (!token) {
    window.location.href = '/login';
}

// ============================================
// PLAN LIMITS (source unique, synchro avec index.js)
// ============================================
var PLAN_LIMITS = {
    free: 10,
    starter: 1000,
    pro: 10000,
    enterprise: Infinity
};

// ============ TOAST ============
function showToast(message, type, duration) {
    type = type || 'info';
    duration = duration || 3000;
    var container = document.getElementById('toastContainer');
    if (!container) return;
    var toast = document.createElement('div');
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

// ============ MODAL ============
function showModal(title, bodyHtml) {
    var overlay = document.getElementById('modalOverlay');
    var content = document.getElementById('modalContent');
    if (!overlay || !content) return;
    content.innerHTML = '<h3>' + title + '</h3>' + bodyHtml;
    overlay.classList.add('active');
}

function closeModal() {
    var overlay = document.getElementById('modalOverlay');
    if (overlay) overlay.classList.remove('active');
}

// ============ VERIFICATION ADMIN ============
async function checkAdmin() {
    try {
        var response = await fetch(API_URL + '/api/admin/check', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (!response.ok) {
            showToast('Acces refuse - Admin requis', 'error');
            window.location.href = '/dashboard.html';
            return false;
        }
        var data = await response.json();
        if (!data.isAdmin) {
            showToast('Acces refuse - Admin requis', 'error');
            window.location.href = '/dashboard.html';
            return false;
        }
        return true;
    } catch (error) {
        showToast('Erreur de verification', 'error');
        window.location.href = '/dashboard.html';
        return false;
    }
}

// ============ TABS ============
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
        if (tabId === 'crypto') loadCryptoOrders();
    });
});

document.querySelectorAll('[data-filter]').forEach(function(btn) {
    btn.addEventListener('click', function() {
        document.querySelectorAll('[data-filter]').forEach(function(b) { b.style.borderColor = 'var(--border-color)'; });
        this.style.borderColor = '#ffffff';
        loadTickets(this.dataset.filter);
    });
});

// ============ STATS ============
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

// ============================================
// API MAINTENANCE
// ============================================
async function loadApiMaintenance() {
    try {
        var response = await fetch(API_URL + '/api/admin/api-maintenance', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (!response.ok) return;
        var data = await response.json();
        updateApiMaintenanceUI(data.enabled);
    } catch (error) {
        console.error('Erreur maintenance:', error);
    }
}

function updateApiMaintenanceUI(enabled) {
    var badge = document.getElementById('apiMaintenanceBadge');
    var btn = document.getElementById('apiMaintenanceBtn');
    if (badge) {
        if (enabled) {
            badge.textContent = '🔴 EN MAINTENANCE';
            badge.style.background = 'rgba(239,68,68,0.15)';
            badge.style.color = '#ef4444';
            badge.style.borderColor = 'rgba(239,68,68,0.3)';
        } else {
            badge.textContent = '🟢 EN LIGNE';
            badge.style.background = 'rgba(16,185,129,0.15)';
            badge.style.color = '#10b981';
            badge.style.borderColor = 'rgba(16,185,129,0.3)';
        }
    }
    if (btn) {
        btn.textContent = enabled ? 'Désactiver la maintenance' : 'Activer la maintenance';
        btn.style.background = enabled ? '#ef4444' : '#ffffff';
        btn.style.color = enabled ? '#ffffff' : '#000000';
    }
}

async function toggleApiMaintenance() {
    var badge = document.getElementById('apiMaintenanceBadge');
    var currentState = badge && badge.textContent.includes('EN MAINTENANCE');
    var newState = !currentState;

    if (!confirm(newState ? 'Activer la maintenance de l\'API ? Les utilisateurs ne pourront plus l\'utiliser.' : 'Désactiver la maintenance ?')) return;

    try {
        var response = await fetch(API_URL + '/api/admin/api-maintenance', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({ enabled: newState })
        });
        if (response.ok) {
            showToast(newState ? '🔴 API en maintenance' : '🟢 API de nouveau en ligne', 'success');
            updateApiMaintenanceUI(newState);
        }
    } catch (error) {
        showToast('Erreur', 'error');
    }
}

// ============================================
// USERS
// ============================================
var usersPage = 1;
var usersTotal = 0;
var usersSearch = '';

function getUserLimitText(u) {
    var used = u.search_count || 0;
    var customQuota = u.custom_quota || 0;
    var plan = u.plan || 'free';

    if (customQuota > 0) {
        return '<span style="color:#f59e0b;font-weight:600;">' + used + ' / ' + customQuota + ' <span style="font-size:10px;">(custom)</span></span>';
    }
    var limit = PLAN_LIMITS[plan] || 10;
    if (limit === Infinity) {
        return '<span style="color:#10b981;font-weight:600;">' + used + ' / ∞</span>';
    }
    var pct = (used / limit) * 100;
    var color = pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : '#a0a0a0';
    return '<span style="color:' + color + ';font-weight:600;">' + used + ' / ' + limit + '</span>';
}

function getPlanBadge(plan, customQuota) {
    if (customQuota > 0) {
        return '<span style="background:rgba(245,158,11,0.15);color:#f59e0b;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600;">CUSTOM</span>';
    }
    var colors = {
        free: 'rgba(107,107,107,0.15)',
        starter: 'rgba(59,130,246,0.15)',
        pro: 'rgba(139,92,246,0.15)',
        enterprise: 'rgba(16,185,129,0.15)'
    };
    var textColors = {
        free: '#a0a0a0',
        starter: '#3b82f6',
        pro: '#8b5cf6',
        enterprise: '#10b981'
    };
    var p = plan || 'free';
    return '<span style="background:' + colors[p] + ';color:' + textColors[p] + ';padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600;text-transform:uppercase;">' + p + '</span>';
}

async function loadUsers(page, search) {
    page = page || 1;
    search = search || '';
    usersPage = page;
    usersSearch = search;
    var tbody = document.getElementById('usersTableBody');
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--text-muted);padding:30px;">Chargement...</td></tr>';
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
                var usernameEscaped = u.username.replace(/'/g, "\\'");
                html += '<tr>' +
    '<td><span class="clickable" onclick="viewUser(' + u.id + ')">' + u.username + '</span></td>' +
    '<td>' + getPlanBadge(u.plan, u.custom_quota) + '</td>' +
    '<td><span class="badge-status ' + statusClass + '">' + statusText + '</span></td>' +
    '<td style="font-size:12px;">' + getUserLimitText(u) + '</td>' +
    '<td>' + (u.search_count || 0) + '</td>' +
    '<td>' + (u.fiche_count || 0) + '</td>' +
    '<td style="font-size:11px;color:var(--text-muted);">' + (u.reg_ip || '-') + '</td>' +
    '<td><div class="admin-actions">';
if (!isAdmin) {
    html += '<button class="primary" onclick="viewUser(' + u.id + ')">Voir</button>';
    html += '<button class="primary" onclick="openPlanModal(' + u.id + ', \'' + usernameEscaped + '\', \'' + (u.plan || 'free') + '\')">Plan</button>';
    html += '<button class="primary" onclick="openQuotaModal(' + u.id + ', \'' + usernameEscaped + '\', ' + (u.custom_quota || 0) + ', \'' + (u.plan || 'free') + '\')">Requetes</button>';
    html += '<button class="' + (u.banned ? 'success' : 'danger') + '" onclick="toggleBan(' + u.id + ', ' + (!u.banned) + ')">' + (u.banned ? 'Debannir' : 'Bannir') + '</button>';
    html += '<button class="danger" onclick="deleteUser(' + u.id + ')">Sup.</button>';
} else {
    html += '<span style="color:var(--text-muted);font-size:11px;">Protege</span>';
}
html += '</div></td></tr>';
            });
            tbody.innerHTML = html;
        } else {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--text-muted);padding:30px;">Aucun utilisateur trouve</td></tr>';
        }
        updatePagination('users', page, usersTotal);
    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--danger);padding:30px;">Erreur de chargement</td></tr>';
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

// ============================================
// Ouvrir la modale de changement de plan
// ============================================
function openPlanModal(userId, username, currentPlan) {
    var plans = ['free', 'starter', 'pro', 'enterprise'];
    var options = plans.map(function(p) {
        var label = p.charAt(0).toUpperCase() + p.slice(1);
        return '<option value="' + p + '"' + (p === currentPlan ? ' selected' : '') + '>' + label + '</option>';
    }).join('');

    var html = '<div style="padding:8px 0;">';
    html += '<div style="margin-bottom:16px;color:var(--text-secondary);font-size:14px;">Utilisateur : <strong style="color:#fff;">' + username + '</strong></div>';
    html += '<div style="margin-bottom:12px;"><label style="display:block;font-size:13px;color:var(--text-muted);margin-bottom:6px;">Nouveau plan</label>';
    html += '<select id="planSelect" style="width:100%;padding:12px;background:#1a1a1a;border:1px solid #333;border-radius:8px;color:#fff;font-size:14px;">' + options + '</select></div>';
    html += '<div style="margin-bottom:16px;"><label style="display:block;font-size:13px;color:var(--text-muted);margin-bottom:6px;">Duree en jours (pour les plans payants)</label>';
    html += '<input type="number" id="planDays" value="30" min="1" max="3650" style="width:100%;padding:12px;background:#1a1a1a;border:1px solid #333;border-radius:8px;color:#fff;font-size:14px;box-sizing:border-box;"></div>';
    html += '<div style="padding:10px 14px;background:rgba(59,130,246,0.08);border:1px solid rgba(59,130,246,0.25);border-radius:8px;font-size:12px;color:var(--text-secondary);line-height:1.5;">';
    html += 'Le plan <strong>free</strong> n\'a pas de date d\'expiration. Les autres plans expirent apres le nombre de jours indique.';
    html += '</div>';
    html += '</div>';

    showModal('Changer le plan de ' + username, html, 'Valider', async function() {
        var newPlan = document.getElementById('planSelect').value;
        var days = parseInt(document.getElementById('planDays').value) || 30;
        await changePlan(userId, newPlan, days);
    });
}

// ============================================
// Changer le plan (appel API)
// ============================================
async function changePlan(userId, plan, days) {
    try {
        var response = await fetch(API_URL + '/api/admin/users/' + userId + '/plan', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({ plan: plan, days: days })
        });
        var data = await response.json();
        if (response.ok) {
            showToast('Plan change en ' + plan.toUpperCase() + (plan !== 'free' ? ' pour ' + days + ' jours' : ''), 'success');
            closeModal();
            loadUsers(usersPage, usersSearch);
        } else {
            showToast(data.error || 'Erreur', 'error');
        }
    } catch (error) {
        showToast('Erreur reseau', 'error');
    }
}

// Exposer globalement
window.openPlanModal = openPlanModal;
window.changePlan = changePlan;

// ============================================
// QUOTA CUSTOM
// ============================================
function openQuotaModal(userId, username, currentQuota, plan) {
    var planLimit = PLAN_LIMITS[plan] || 10;
    var planLimitText = planLimit === Infinity ? '∞' : planLimit;

    var html = '<div style="margin-bottom:16px;">' +
        '<div style="font-size:13px;color:var(--text-muted);margin-bottom:4px;">Utilisateur</div>' +
        '<div style="font-size:16px;font-weight:600;color:#ffffff;">' + username + '</div>' +
        '<div style="font-size:12px;color:var(--text-muted);margin-top:4px;">Plan actuel : <strong style="color:#fff;text-transform:uppercase;">' + plan + '</strong> (' + planLimitText + ' req/mois)</div>' +
        '</div>' +
        '<div class="form-group" style="margin-bottom:16px;">' +
        '<label style="display:block;font-size:13px;color:var(--text-secondary);margin-bottom:6px;">Requêtes par mois (custom quota)</label>' +
        '<input type="number" id="quotaInput" value="' + (currentQuota || 0) + '" min="0" placeholder="Ex: 20000" ' +
        'style="width:100%;padding:14px;background:var(--bg-input);border:1px solid var(--border-color);border-radius:8px;color:#fff;font-size:16px;font-family:\'Inter\',sans-serif;outline:none;box-sizing:border-box;">' +
        '<div style="font-size:12px;color:var(--text-muted);margin-top:10px;line-height:1.6;">' +
        '• <strong style="color:#fff;">0</strong> → retire le quota custom (utilise le plan: ' + planLimitText + ')' +
        '<br>• <strong style="color:#fff;">20000</strong> → force 20 000 requêtes/mois' +
        '<br>• Effet immédiat après validation' +
        '</div>' +
        '</div>' +
        '<div style="font-size:13px;color:var(--text-muted);padding:14px;background:rgba(255,255,255,0.02);border-radius:8px;border:1px solid var(--border-color);margin-bottom:20px;">' +
        'Quota actuel : <strong style="color:#ffffff;font-size:15px;">' + (currentQuota > 0 ? currentQuota : planLimitText) + '</strong>' +
        (currentQuota > 0 ? ' <span style="color:#f59e0b;font-size:11px;">(CUSTOM)</span>' : ' <span style="font-size:11px;">(plan ' + plan + ')</span>') +
        '</div>' +
        '<div class="modal-actions">' +
        '<button class="btn-primary" onclick="saveQuota(' + userId + ')">Valider</button>' +
        '<button class="btn-secondary" onclick="closeModal()">Annuler</button>' +
        '</div>';

    showModal('Attribuer un quota', html);
}

async function saveQuota(userId) {
    var input = document.getElementById('quotaInput');
    if (!input) return;
    var quota = parseInt(input.value) || 0;
    if (quota < 0) {
        showToast('Quota invalide', 'error');
        return;
    }

    try {
        var response = await fetch(API_URL + '/api/admin/users/' + userId + '/quota', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({ custom_quota: quota })
        });

        if (response.ok) {
            showToast(quota === 0 ? 'Quota custom retiré' : 'Quota : ' + quota + ' req/mois', 'success');
            closeModal();
            loadUsers(usersPage, usersSearch);
        } else {
            var data = await response.json();
            showToast(data.error || 'Erreur', 'error');
        }
    } catch (error) {
        showToast('Erreur reseau', 'error');
    }
}

// ============ VIEW USER ============
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
        var planLimit = PLAN_LIMITS[user.plan || 'free'] || 10;
        var planLimitText = planLimit === Infinity ? '∞' : planLimit;
        var usedCount = user.search_count || 0;
        var effectiveLimit = user.custom_quota > 0 ? user.custom_quota : planLimit;
        var effectiveLimitText = effectiveLimit === Infinity ? '∞' : effectiveLimit;

        var html = '<div class="user-detail-modal"><div class="info-grid">' +
            '<div class="info-item"><span class="label">Nom d\'utilisateur</span><span class="value highlight">' + user.username + '</span></div>' +
            '<div class="info-item"><span class="label">Role</span><span class="value">' + user.role + '</span></div>' +
            '<div class="info-item"><span class="label">Plan</span><span class="value">' + getPlanBadge(user.plan, user.custom_quota) + '</span></div>' +
            '<div class="info-item"><span class="label">Status</span><span class="value' + (user.banned ? ' style=color:var(--danger);' : '') + '">' + (user.banned ? 'Banni' : 'Actif') + '</span></div>' +
            '<div class="info-item"><span class="label">Quota</span><span class="value">' + usedCount + ' / ' + effectiveLimitText + (user.custom_quota > 0 ? ' <span style="color:#f59e0b;font-size:10px;">(custom)</span>' : '') + '</span></div>' +
            '<div class="info-item"><span class="label">Recherches totales</span><span class="value">' + usedCount + '</span></div>' +
            '<div class="info-item"><span class="label">Fiches</span><span class="value">' + (user.fiche_count || 0) + '</span></div>' +
            '<div class="info-item"><span class="label">Graphes</span><span class="value">' + (user.graphe_count || 0) + '</span></div>' +
            '<div class="info-item"><span class="label">IP d\'inscription</span><span class="value">' + (user.reg_ip || '-') + '</span></div>' +
            '<div class="info-item"><span class="label">Membre depuis</span><span class="value">' + new Date(user.created_at).toLocaleDateString() + '</span></div>' +
            '<div class="info-item"><span class="label">Derniere connexion</span><span class="value">' + (user.last_login ? new Date(user.last_login).toLocaleString() : 'Jamais') + '</span></div>' +
            '</div>';

        if (ips.length > 0) {
            html += '<div style="margin-top:12px;border-top:1px solid var(--border-color);padding-top:12px;"><div style="font-weight:600;color:#ffffff;margin-bottom:6px;">IPs liees (' + ips.length + ')</div>';
            ips.forEach(function(ip) {
                html += '<div style="display:flex;justify-content:space-between;font-size:13px;color:var(--text-secondary);padding:3px 0;border-bottom:1px solid rgba(255,255,255,0.03);"><span>' + ip.ip + '</span><span style="font-size:11px;color:var(--text-muted);">' + new Date(ip.created_at).toLocaleDateString() + '</span></div>';
            });
            html += '</div>';
        }

        if (searches.length > 0) {
            html += '<div style="margin-top:12px;border-top:1px solid var(--border-color);padding-top:12px;"><div style="font-weight:600;color:#ffffff;margin-bottom:6px;">Dernieres recherches</div>';
            searches.forEach(function(s) {
                var criteria = Object.entries(s.query || {}).filter(function(kv) { return !['flexible','per_page','page'].includes(kv[0]); });
                html += '<div style="font-size:13px;color:var(--text-secondary);padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.03);"><span>' + (criteria.map(function(kv) { return kv[0] + ': ' + kv[1]; }).join(' · ') || 'Recherche') + '</span><span style="font-size:11px;color:var(--text-muted);float:right;">' + new Date(s.created_at).toLocaleString() + '</span></div>';
            });
            html += '</div>';
        }

        if (isProtected) {
            html += '<div style="margin-top:12px;padding:10px;background:rgba(255,255,255,0.05);border-radius:6px;color:var(--warning);font-size:13px;text-align:center;">Ce compte admin est protege</div>';
        }

        html += '<div class="modal-actions" style="margin-top:16px;flex-wrap:wrap;">';
        if (!isProtected) {
            html += '<button class="btn-primary" onclick="closeModal();openQuotaModal(' + user.id + ', \'' + user.username.replace(/'/g, "\\'") + '\', ' + (user.custom_quota || 0) + ', \'' + (user.plan || 'free') + '\')">Requêtes</button>';
            html += '<button class="btn-secondary" onclick="closeModal();toggleBan(' + user.id + ', ' + (!user.banned) + ')">' + (user.banned ? 'Debannir' : 'Bannir') + '</button>';
            html += '<button class="btn-secondary" style="color:var(--danger);border-color:rgba(239,68,68,0.3);" onclick="closeModal();deleteUser(' + user.id + ')">Supprimer</button>';
        }
        html += '<button class="btn-secondary" onclick="closeModal()">Fermer</button></div></div>';
        showModal('Details utilisateur', html);
    } catch (error) {
        showToast('Erreur chargement utilisateur', 'error');
    }
}

// ============ TOGGLE BAN ============
async function toggleBan(userId, banned) {
    if (!confirm('Confirmer le ' + (banned ? 'bannissement' : 'debannissement') + ' ?')) return;
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
            showToast('Utilisateur ' + (banned ? 'banni' : 'debanni') + ' !', 'success');
            loadUsers(usersPage, usersSearch);
        } else {
            var data = await response.json();
            showToast(data.error || 'Erreur', 'error');
        }
    } catch (error) {
        showToast('Erreur reseau', 'error');
    }
}

// ============ DELETE USER ============
async function deleteUser(userId) {
    if (!confirm('Confirmer la suppression de cet utilisateur ? (Cette action est irreversible)')) return;
    try {
        var response = await fetch(API_URL + '/api/admin/users/' + userId, {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (response.ok) {
            showToast('Utilisateur supprime !', 'success');
            loadUsers(usersPage, usersSearch);
        } else {
            var data = await response.json();
            showToast(data.error || 'Erreur', 'error');
        }
    } catch (error) {
        showToast('Erreur reseau', 'error');
    }
}

// ============ SEARCHES ============
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

// ============ BLOCKLIST ============
async function loadBlocklist() {
    var tbody = document.getElementById('blocklistTableBody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:30px;">Chargement...</td></tr>';
    try {
        var response = await fetch(API_URL + '/api/admin/blocklist', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (!response.ok) throw new Error('Erreur ' + response.status);
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
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:30px;">Aucune entree dans la blocklist</td></tr>';
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
            showToast('Ajoute a la blocklist !', 'success');
            document.getElementById('blocklistValue').value = '';
            document.getElementById('blocklistReason').value = '';
            loadBlocklist();
        } else {
            showToast('Erreur', 'error');
        }
    } catch (error) {
        showToast('Erreur reseau', 'error');
    }
});

async function deleteBlocklistItem(id) {
    if (!confirm('Supprimer cette entree ?')) return;
    try {
        var response = await fetch(API_URL + '/api/admin/blocklist/' + id, {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (response.ok) {
            showToast('Supprime !', 'success');
            loadBlocklist();
        }
    } catch (error) {
        showToast('Erreur', 'error');
    }
}

// ============ TICKETS ============
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
                var statusText = t.status === 'open' ? 'Ouvert' : t.status === 'in_progress' ? 'En cours' : 'Ferme';
                html += '<div class="ticket-item" data-id="' + t.id + '">' +
                    '<div class="ticket-header">' +
                    '<div><span class="ticket-subject">' + t.subject + '</span><span style="font-size:12px;color:var(--text-muted);margin-left:12px;">par ' + (t.user_name || 'Inconnu') + '</span></div>' +
                    '<div style="display:flex;align-items:center;gap:12px;"><span class="ticket-status ' + t.status + '">' + statusText + '</span><span class="ticket-meta">' + new Date(t.created_at).toLocaleDateString() + '</span></div>' +
                    '</div>' +
                    '<div style="font-size:13px;color:var(--text-secondary);margin-top:4px;">' + t.message.substring(0, 150) + (t.message.length > 150 ? '...' : '') + '</div>' +
                    '<div class="ticket-detail" id="ticketDetail-' + t.id + '">' +
                    '<div id="ticketMessages-' + t.id + '"></div>' +
                    '<div class="ticket-reply"><input type="text" id="ticketReplyInput-' + t.id + '" placeholder="Repondre..." /><button onclick="replyTicket(' + t.id + ')">Envoyer</button></div>' +
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
            showToast('Reponse envoyee !', 'success');
            loadTicketMessages(ticketId);
            loadTickets(ticketsFilter);
        } else {
            showToast('Erreur', 'error');
        }
    } catch (error) {
        showToast('Erreur reseau', 'error');
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
            showToast('Status mis a jour : ' + status, 'success');
            loadTickets(ticketsFilter);
        }
    } catch (error) {
        showToast('Erreur', 'error');
    }
}

// ============ INIT ============
async function init() {
    var isAdmin = await checkAdmin();
    if (!isAdmin) return;
    loadStats();
    loadBlocklist();
    loadApiMaintenance();
}

init();

// ============ EXPOSE GLOBAL ============
window.loadBlocklist = loadBlocklist;
window.loadUsers = loadUsers;
window.loadStats = loadStats;
window.loadSearches = loadSearches;
window.loadTickets = loadTickets;
window.viewUser = viewUser;
window.toggleBan = toggleBan;
window.deleteUser = deleteUser;
window.deleteBlocklistItem = deleteBlocklistItem;
window.replyTicket = replyTicket;
window.changeTicketStatus = changeTicketStatus;
window.closeModal = closeModal;
window.openQuotaModal = openQuotaModal;
window.saveQuota = saveQuota;
window.toggleApiMaintenance = toggleApiMaintenance;
window.toggleApiMaintenance = toggleApiMaintenance;
window.loadCryptoOrders = loadCryptoOrders;
window.validateCryptoOrder = validateCryptoOrder;
window.refuseCryptoOrder = refuseCryptoOrder;

// ============================================
// 💳 COMMANDES CRYPTO
// ============================================
var cryptoPage = 1;
var cryptoTotal = 0;
var cryptoSearch = '';

function getCryptoStatusBadge(status) {
    var labels = {
        waiting: 'En attente',
        confirming: 'Confirmation...',
        confirmed: 'Confirmé',
        finished: 'Payé',
        expired: 'Expiré',
        failed: 'Échoué',
        refused: 'Refusé'
    };
    var colors = {
        waiting: '#f59e0b',
        confirming: '#3b82f6',
        confirmed: '#10b981',
        finished: '#10b981',
        expired: '#ef4444',
        failed: '#ef4444',
        refused: '#ef4444'
    };
    var color = colors[status] || '#a0a0a0';
    var label = labels[status] || status;
    return '<span style="background:rgba(255,255,255,0.05);color:' + color + ';padding:2px 10px;border-radius:10px;font-size:11px;font-weight:600;text-transform:uppercase;">' + label + '</span>';
}

async function loadCryptoOrders(page, search) {
    page = page || 1;
    search = search || '';
    cryptoPage = page;
    cryptoSearch = search;

    var tbody = document.getElementById('cryptoTableBody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--text-muted);padding:30px;">Chargement...</td></tr>';

    try {
        var url = API_URL + '/api/admin/crypto/orders?page=' + page + '&limit=30&search=' + encodeURIComponent(search);
        var response = await fetch(url, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (!response.ok) throw new Error('Erreur');
        var data = await response.json();
        cryptoTotal = data.total || 0;

        if (data.orders && data.orders.length > 0) {
            var html = '';
            data.orders.forEach(function(o) {
                var dateStr = new Date(o.created_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
                var canAct = (o.payment_status === 'waiting' || o.payment_status === 'confirming');
                html += '<tr>' +
                    '<td><span style="font-family:\'Courier New\',monospace;color:#ffffff;font-weight:600;">' + (o.order_number || '-') + '</span></td>' +
                    '<td style="font-size:12px;color:#a0a0a0;">' + (o.email || '-') + '</td>' +
                    '<td>' + getPlanBadge(o.plan, 0) + '</td>' +
                    '<td style="font-size:12px;color:#ffffff;">' + (o.price_amount || 0) + ' ' + (o.price_currency || 'EUR').toUpperCase() + '</td>' +
                    '<td style="font-size:12px;color:#a0a0a0;font-family:\'Courier New\',monospace;">' + (o.pay_amount || '-') + ' ' + (o.pay_currency || '').toUpperCase() + '</td>' +
                    '<td>' + getCryptoStatusBadge(o.payment_status) + '</td>' +
                    '<td style="font-size:11px;color:var(--text-muted);">' + dateStr + '</td>' +
                    '<td><div class="admin-actions">';
                if (canAct) {
                    html += '<button class="success" onclick="validateCryptoOrder(' + o.id + ')">Valider</button>';
                    html += '<button class="danger" onclick="refuseCryptoOrder(' + o.id + ')">Refuser</button>';
                } else {
                    html += '<span style="color:var(--text-muted);font-size:11px;">—</span>';
                }
                html += '</div></td></tr>';
            });
            tbody.innerHTML = html;
        } else {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--text-muted);padding:30px;">Aucune commande</td></tr>';
        }
        updateCryptoPagination(page, cryptoTotal);
    } catch (error) {
        console.error(error);
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--danger);padding:30px;">Erreur de chargement</td></tr>';
    }
}

function updateCryptoPagination(page, total) {
    var totalPages = Math.ceil(total / 30) || 1;
    var info = document.getElementById('cryptoPaginationInfo');
    var prev = document.getElementById('cryptoPrevPage');
    var next = document.getElementById('cryptoNextPage');
    if (info) info.textContent = 'Page ' + page + ' / ' + totalPages + ' (' + total + ' commandes)';
    if (prev) prev.disabled = page <= 1;
    if (next) next.disabled = page >= totalPages;
}

window.validateCryptoOrder = async function(id) {
    if (!confirm('Valider cette commande manuellement ? Le plan sera activé et un email sera envoyé au client.')) return;
    try {
        var response = await fetch(API_URL + '/api/admin/crypto/orders/' + id + '/validate', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (response.ok) {
            showToast('✅ Commande validée, plan activé et email envoyé', 'success');
            loadCryptoOrders(cryptoPage, cryptoSearch);
        } else {
            var data = await response.json();
            showToast(data.error || 'Erreur', 'error');
        }
    } catch (error) {
        showToast('Erreur réseau', 'error');
    }
};

window.refuseCryptoOrder = async function(id) {
    var reason = prompt('Raison du refus (optionnel) :');
    if (reason === null) return;
    try {
        var response = await fetch(API_URL + '/api/admin/crypto/orders/' + id + '/refuse', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({ reason: reason || '' })
        });
        if (response.ok) {
            showToast('Commande refusée', 'success');
            loadCryptoOrders(cryptoPage, cryptoSearch);
        } else {
            var data = await response.json();
            showToast(data.error || 'Erreur', 'error');
        }
    } catch (error) {
        showToast('Erreur réseau', 'error');
    }
};

// Event listeners
document.getElementById('cryptoSearchBtn')?.addEventListener('click', function() {
    var search = document.getElementById('cryptoSearch').value.trim();
    loadCryptoOrders(1, search);
});
document.getElementById('cryptoSearch')?.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        var search = document.getElementById('cryptoSearch').value.trim();
        loadCryptoOrders(1, search);
    }
});
document.getElementById('cryptoPrevPage')?.addEventListener('click', function() {
    if (cryptoPage > 1) loadCryptoOrders(cryptoPage - 1, cryptoSearch);
});
document.getElementById('cryptoNextPage')?.addEventListener('click', function() {
    if (cryptoPage * 30 < cryptoTotal) loadCryptoOrders(cryptoPage + 1, cryptoSearch);
});

// Ajouter le chargement dans le switch des tabs (dans le listener .admin-tab)
// Cherche ce bloc et ajoute la ligne crypto :