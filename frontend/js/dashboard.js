/* ============================================
   MARAUDER - DASHBOARD.JS
   Version propre UTF-8, style original conservé
   ============================================ */

const API_URL = window.location.origin;
const token = localStorage.getItem('token');

if (!token) {
    window.location.href = '/login';
}

// ============================================
// ÉTAT GLOBAL
// ============================================
const state = {
    results: [],
    fiches: [],
    tickets: [],
    history: [],
    familyCache: {},
    familyLoading: {},
    investigationData: null,
    graphNodes: [],
    graphEdges: [],
    graphLinkMode: false,
    graphLinkFrom: null,
    searchInProgress: false
};

window._resultsData = state.results;
window.grapheNodes = state.graphNodes;
window.grapheEdges = state.graphEdges;

// ============================================
// UTILITAIRES
// ============================================
function $(id) { return document.getElementById(id); }

function escapeHtml(value) {
    const div = document.createElement('div');
    div.textContent = value === null || value === undefined ? '' : String(value);
    return div.innerHTML;
}

function authHeaders(json) {
    const h = { Authorization: 'Bearer ' + token };
    if (json) h['Content-Type'] = 'application/json';
    return h;
}

async function readJson(response) {
    try { return await response.json(); } catch (e) { return {}; }
}

function showToast(message, type, duration) {
    type = type || 'info';
    const container = $('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast ' + type;
    toast.innerHTML = '<button class="toast-close" onclick="this.parentElement.remove()">X</button>' + escapeHtml(message);
    container.appendChild(toast);
    setTimeout(function () {
        if (toast.parentElement) toast.remove();
    }, duration || 4000);
}

function formatPhone(phone) {
    if (!phone) return '';
    let digits = String(phone).replace(/\D/g, '');
    if (digits.startsWith('0033')) digits = '0' + digits.substring(4);
    if (digits.startsWith('33') && digits.length === 11) digits = '0' + digits.substring(2);
    if (digits.length === 10) {
        return digits.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5');
    }
    return String(phone);
}

function normalizePhone(phone) {
    if (!phone) return '';
    let v = String(phone).replace(/\D/g, '');
    if (v.startsWith('0033')) v = '0' + v.substring(4);
    if (v.startsWith('33') && v.length === 11) v = '0' + v.substring(2);
    return v;
}

function normalizeAdresse(addr) {
    if (!addr) return '';
    return String(addr).toLowerCase().trim()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function showSearchLoading() {
    const overlay = $('searchOverlay');
    if (overlay) overlay.classList.add('active');
}

function hideSearchLoading() {
    const overlay = $('searchOverlay');
    if (overlay) overlay.classList.remove('active');
}

function setText(id, value) {
    const el = $(id);
    if (el) el.textContent = value === null || value === undefined ? '' : String(value);
}

function getValue(id) {
    const el = $(id);
    if (el && typeof el.value === 'string') return el.value.trim();
    return '';
}

function getPersonName(p) {
    const name = [(p.prenom || ''), (p.nom_famille || p.nom || '')].join(' ').trim();
    return name || 'Personne inconnue';
}

function confidenceClass(c) {
    const v = Number(c || 0);
    if (v >= 70) return 'high';
    if (v >= 40) return 'medium';
    return 'low';
}

function labelForKey(key) {
    const labels = {
        prenom: 'Prénom', nom: 'Nom', nom_famille: 'Nom',
        nom_naissance: 'Nom de naissance', nom_affichage: 'Nom d\'affichage',
        email: 'Email', telephone: 'Téléphone', mobile: 'Mobile',
        adresse: 'Adresse', code_postal: 'Code postal', ville: 'Ville',
        ville_naissance: 'Ville de naissance', date_naissance: 'Date de naissance',
        genre: 'Genre', username: 'Nom d\'utilisateur', nom_utilisateur: 'Nom d\'utilisateur',
        ip: 'IP', adresse_ip: 'Adresse IP',
        steam: 'Steam', steam_id: 'Steam ID',
        discord: 'Discord', discord_id: 'Discord ID',
        fivem_license: 'Licence FiveM', fivem_license2: 'Licence FiveM 2',
        xbox: 'Xbox', xbox_live_id: 'Xbox Live',
        live: 'Live', live_id: 'Live ID',
        nir: 'NIR', iban: 'IBAN', bic: 'BIC',
        vin: 'VIN', plaque: 'Plaque', vin_plaque: 'VIN / Plaque',
        profession: 'Profession', fonction: 'Fonction', role: 'Rôle',
        societe: 'Société', siret: 'SIRET', siren: 'SIREN'
    };
    if (labels[key]) return labels[key];
    return String(key).replace(/_/g, ' ').replace(/\b\w/g, function (l) { return l.toUpperCase(); });
}

function formatValue(key, value) {
    if (key === 'telephone' || key === 'mobile') return formatPhone(value);
    if (typeof value === 'object') {
        try { return JSON.stringify(value); } catch (e) { return String(value); }
    }
    return String(value);
}

function uniqueResults(results) {
    const out = [];
    const seen = new Set();
    (results || []).forEach(function (p) {
        if (!p || typeof p !== 'object') return;
        const key = [p.prenom || '', p.nom_famille || p.nom || '', p.email || '',
            normalizePhone(p.telephone || p.mobile || ''), normalizeAdresse(p.adresse || '')].join('|');
        if (seen.has(key)) return;
        seen.add(key);
        out.push(p);
    });
    return out;
}

// ============================================
// AUTHENTIFICATION
// ============================================
async function verifyToken() {
    if (!token) { window.location.href = '/login'; return false; }
    try {
        const response = await fetch(API_URL + '/api/verify', { headers: authHeaders(false) });
        if (!response.ok) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
            return false;
        }
        const data = await readJson(response);
        const user = data.user || data;
        setText('usernameDisplay', user.username || 'Utilisateur');
        localStorage.setItem('user', JSON.stringify(user));
        return true;
    } catch (e) {
        localStorage.removeItem('token');
        window.location.href = '/login';
        return false;
    }
}

// ============================================
// RECHERCHE
// ============================================
function buildSearchPayload() {
    return {
        nom_famille: getValue('searchNom'),
        prenom: getValue('searchPrenom'),
        nom_naissance: getValue('searchNomNaissance'),
        nom_affichage: getValue('searchNomAffichage'),
        email: getValue('searchEmail'),
        telephone: getValue('searchPhone'),
        username: getValue('searchUsername'),
        adresse_ip: getValue('searchIp'),
        adresse: getValue('searchAdresse'),
        code_postal: getValue('searchCp'),
        ville: getValue('searchVille'),
        ville_naissance: getValue('searchVilleNaissance'),
        steam: getValue('searchSteam'),
        fivem_license: getValue('searchFivemLicense'),
        discord: getValue('searchDiscord'),
        xbox: getValue('searchXbox'),
        live: getValue('searchLive'),
        fivem_license2: getValue('searchFivemLicense2'),
        nir: getValue('searchNir'),
        iban: getValue('searchIban'),
        bic: getValue('searchBic'),
        vin_plaque: getValue('searchVin'),
        date_naissance: getValue('searchDateNaissance'),
        jour_naissance: getValue('searchJour'),
        mois_naissance: getValue('searchMois'),
        annee_naissance: getValue('searchAnnee'),
        genre: getValue('searchGenre'),
        flexible: true,
        per_page: 50
    };
}

function buildProSearchPayload() {
    return {
        nom_famille: getValue('searchNomPro'),
        prenom: getValue('searchPrenomPro'),
        nom_naissance: getValue('searchNomNaissancePro'),
        societe: getValue('searchSociete'),
        profession: getValue('searchProfession'),
        fonction: getValue('searchFonction'),
        email: getValue('searchEmailPro'),
        telephone: getValue('searchPhonePro'),
        adresse_ip: getValue('searchIpPro'),
        siret: getValue('searchSiret'),
        siren: getValue('searchSiren'),
        nir: getValue('searchNirPro'),
        iban: getValue('searchIbanPro'),
        bic: getValue('searchBicPro'),
        vin_plaque: getValue('searchVinPro'),
        flexible: true,
        per_page: 50
    };
}

function hasSearchValue(payload) {
    return Object.keys(payload).some(function (k) {
        return k !== 'flexible' && k !== 'per_page' &&
            payload[k] !== null && payload[k] !== undefined && String(payload[k]).trim() !== '';
    });
}

function extractResults(data) {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.results)) return data.results;
    if (Array.isArray(data.data)) return data.data;
    if (Array.isArray(data.persons)) return data.persons;
    if (data.data && Array.isArray(data.data.results)) return data.data.results;
    return [];
}

async function performSearch(customPayload) {
    if (state.searchInProgress) return [];

    const activeTab = document.querySelector('.search-tab.active');
    const payload = customPayload || (activeTab && activeTab.dataset.tab === 'pro'
        ? buildProSearchPayload()
        : buildSearchPayload());

    // Nettoyage : retirer les champs vides
    Object.keys(payload).forEach(function (k) {
        if (k !== 'flexible' && k !== 'per_page' && !payload[k]) delete payload[k];
    });

    if (!hasSearchValue(payload)) {
        showToast('Veuillez remplir au moins un critère', 'warning');
        return [];
    }

    state.searchInProgress = true;
    showSearchLoading();

    const container = $('searchResults');

    try {
        const response = await fetch(API_URL + '/api/brix/search', {
            method: 'POST',
            headers: authHeaders(true),
            body: JSON.stringify(payload)
        });

        const data = await readJson(response);

        if (!response.ok) {
            throw new Error(data.error || 'Erreur de recherche');
        }

        const results = uniqueResults(extractResults(data));

        results.forEach(function (p) {
            if (p._confidence === undefined) {
                p._confidence = p.confidence !== undefined ? Number(p.confidence) : 0;
            }
        });

        state.results = results;
        window._resultsData = results;

        displayResults(results);

        if (results.length > 0) {
            showToast(results.length + ' résultat(s) trouvé(s)', 'success');
        } else {
            showToast('Aucun résultat', 'info');
        }

        return results;
    } catch (error) {
        console.error(error);
        state.results = [];
        window._resultsData = [];
        if (container) container.innerHTML = '<div class="empty-state">Erreur de recherche</div>';
        showToast(error.message || 'Erreur pendant la recherche', 'error');
        return [];
    } finally {
        state.searchInProgress = false;
        hideSearchLoading();
    }
}

// ============================================
// AFFICHAGE DES RÉSULTATS
// ============================================
function displayResults(results) {
    const container = $('searchResults');
    if (!container) return;

    if (!results || results.length === 0) {
        container.innerHTML = '<div class="empty-state">Aucun résultat trouvé</div>';
        return;
    }

    let html = '<div class="results-counter"><div class="count"><strong>' + results.length + '</strong> résultat(s) trouvé(s)</div></div>';

    results.forEach(function (person, index) {
        html += renderResultCard(person, index);
    });

    container.innerHTML = html;
}

function renderResultCard(person, index) {
    const confidence = Number(person._confidence || 0);
    const confClass = confidenceClass(confidence);
    const fullName = getPersonName(person);

    const priorityKeys = ['nom_naissance', 'date_naissance', 'email', 'telephone', 'mobile',
        'adresse', 'code_postal', 'ville', 'ville_naissance', 'username', 'adresse_ip',
        'steam', 'discord', 'fivem_license', 'xbox', 'iban', 'bic', 'vin_plaque'];

    let fieldsHtml = '';
    const used = {};

    priorityKeys.forEach(function (key) {
        if (used[key]) return;
        const value = person[key];
        if (!value) return;
        used[key] = true;
        fieldsHtml += '<div class="result-field"><span class="field-label">' +
            labelForKey(key) + '</span><span class="field-value highlight">' +
            escapeHtml(formatValue(key, value)) + '</span></div>';
    });

    Object.keys(person).forEach(function (key) {
        if (key.startsWith('_') || key === 'famille' || used[key]) return;
        const value = person[key];
        if (!value || typeof value === 'object') return;
        used[key] = true;
        fieldsHtml += '<div class="result-field"><span class="field-label">' +
            labelForKey(key) + '</span><span class="field-value">' +
            escapeHtml(formatValue(key, value)) + '</span></div>';
    });

    return '<div class="result-card-full" data-index="' + index + '">' +
        '<div class="result-header-full">' +
        '<div class="result-name-full" onclick="toggleFiche(' + index + ')">' + escapeHtml(fullName) + '</div>' +
        '<div class="result-meta"><span class="confidence-badge confidence-' + confClass + '">' + confidence + '%</span></div>' +
        '</div>' +
        '<div class="result-fields" id="fiche-' + index + '">' + fieldsHtml + '</div>' +
        '<div class="result-actions">' +
        '<button class="btn-deep" onclick="toggleDeep(' + index + ')">Approfondir</button>' +
        '<button class="btn-deep" onclick="addToFiche(' + index + ')">+ Fiche</button>' +
        '<button class="btn-deep" onclick="copyFullCard(' + index + ')">Copier</button>' +
        '<button class="btn-deep" onclick="addToGraphe(' + index + ')">Graphe</button>' +
        '<button class="btn-deep" onclick="openInvestigation(' + index + ')" style="border-color:rgba(255,255,255,0.2);background:rgba(255,255,255,0.05);">Investiguer</button>' +
        '</div>' +
        '<div class="deep-panel" id="deep-' + index + '">' +
        '<h4>Approfondir</h4>' +
        '<div class="family-loading" style="color:#6b6b6b;font-size:13px;">Cliquez sur Approfondir pour lancer l\'analyse familiale</div>' +
        '</div>' +
        '</div>';
}

function toggleFiche(index) {
    const el = $('fiche-' + index);
    if (el) el.classList.toggle('open');
}

// ============================================
// PIVOT FAMILIAL
// ============================================
async function searchPivot(payload) {
    if (!payload) return [];
    try {
        const response = await fetch(API_URL + '/api/brix/search', {
            method: 'POST',
            headers: authHeaders(true),
            body: JSON.stringify(payload)
        });
        if (!response.ok) return [];
        const data = await readJson(response);
        return extractResults(data);
    } catch (e) {
        return [];
    }
}

function familyIdentity(person) {
    if (person.id !== undefined && person.id !== null) return 'id:' + person.id;
    const phone = normalizePhone(person.telephone || person.mobile || '');
    if (phone) return 'phone:' + phone;
    const email = String(person.email || '').toLowerCase();
    if (email) return 'email:' + email;
    return getPersonName(person).toLowerCase() + '|' + normalizeAdresse(person.adresse || '');
}

function samePerson(a, b) {
    if (!a || !b) return false;
    return familyIdentity(a) === familyIdentity(b);
}

async function findFamily(person) {
    if (!person) return [];
    const cacheKey = familyIdentity(person);
    if (state.familyCache[cacheKey]) return state.familyCache[cacheKey];
    if (state.familyLoading[cacheKey]) return [];
    state.familyLoading[cacheKey] = true;

    try {
        const address = person.adresse || '';
        const phone = person.telephone || person.mobile || '';
        const searches = [];

        if (address) {
            searches.push(searchPivot({ adresse: address, flexible: true, per_page: 50 }));
        }
        if (phone) {
            searches.push(searchPivot({ telephone: phone, flexible: true, per_page: 50 }));
        }

        if (!searches.length) {
            state.familyCache[cacheKey] = [];
            return [];
        }

        const groups = await Promise.all(searches);
        const byIdentity = new Map();
        const personAddr = normalizeAdresse(person.adresse || '');
        const personPhone = normalizePhone(person.telephone || person.mobile || '');

        groups.forEach(function (group) {
            group.forEach(function (member) {
                if (!member || samePerson(member, person)) return;
                const id = familyIdentity(member);
                if (!byIdentity.has(id)) {
                    byIdentity.set(id, { person: member, address: false, phone: false });
                }
                const item = byIdentity.get(id);
                const memAddr = normalizeAdresse(member.adresse || '');
                const memPhone = normalizePhone(member.telephone || member.mobile || '');
                if (personAddr && memAddr && personAddr === memAddr) item.address = true;
                if (personPhone && memPhone && personPhone === memPhone) item.phone = true;
            });
        });

        const members = [];
        byIdentity.forEach(function (item) {
            let link = 'Mêmes informations';
            let strength = 1;
            if (item.address && item.phone) { link = 'Adresse et téléphone'; strength = 3; }
            else if (item.address) { link = 'Même adresse'; strength = 2; }
            else if (item.phone) { link = 'Même téléphone'; strength = 2; }
            members.push(Object.assign({}, item.person, { _familyLink: link, _familyStrength: strength }));
        });

        members.sort(function (a, b) { return b._familyStrength - a._familyStrength; });
        state.familyCache[cacheKey] = members;
        return members;
    } finally {
        delete state.familyLoading[cacheKey];
    }
}

async function toggleDeep(index) {
    const panel = $('deep-' + index);
    if (!panel) return;

    const wasOpen = panel.classList.contains('open');
    panel.classList.toggle('open');
    if (wasOpen) return;

    if (state.familyCache[index] !== undefined) {
        renderFamilyInPanel(panel, state.familyCache[index]);
        return;
    }

    const person = state.results[index];
    if (!person) {
        panel.innerHTML = '<h4>Approfondir</h4><div style="color:#ef4444;font-size:13px;">Erreur : personne introuvable</div>';
        return;
    }

    panel.innerHTML = '<h4>Approfondir</h4>' +
        '<div class="family-loading" style="display:flex;align-items:center;gap:10px;color:#7a7a7a;font-size:13px;padding:12px 0;">' +
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation:spin 1s linear infinite;">' +
        '<circle cx="12" cy="12" r="10" opacity="0.3"/><path d="M12 2a10 10 0 0 1 10 10" /></svg>' +
        '<span>Recherche des liens familiaux en cours...</span></div>' +
        '<style>@keyframes spin { to { transform: rotate(360deg); } }</style>';

    try {
        const family = await findFamily(person);
        state.familyCache[index] = family;
        person.famille = family;
        renderFamilyInPanel(panel, family);
    } catch (e) {
        panel.innerHTML = '<h4>Approfondir</h4><div style="color:#ef4444;font-size:13px;">Erreur lors de l\'analyse familiale</div>';
    }
}

function renderFamilyInPanel(panel, family) {
    if (!family || family.length === 0) {
        panel.innerHTML = '<h4>Approfondir</h4>' +
            '<div style="color:#6b6b6b;font-size:13px;padding:12px 0;">Aucun lien familial trouvé.</div>';
        return;
    }

    const forts = family.filter(function (m) { return m._familyLink === 'Adresse et téléphone'; });
    const parAdresse = family.filter(function (m) { return m._familyLink === 'Même adresse'; });
    const parTel = family.filter(function (m) { return m._familyLink === 'Même téléphone'; });
    const autres = family.filter(function (m) { return m._familyLink === 'Mêmes informations'; });

    let html = '<h4 style="display:flex;align-items:center;gap:10px;">' +
        '<span>Famille associée</span>' +
        '<span style="font-size:11px;font-weight:600;color:#7a7a7a;background:rgba(255,255,255,0.05);padding:2px 10px;border-radius:100px;">' +
        family.length + '</span></h4>' +
        '<div class="family-tree">';

    if (forts.length > 0) {
        html += '<div class="tree-title" style="color:#10b981;">Lien fort - Adresse + Téléphone (' + forts.length + ')</div>';
        forts.forEach(function (m) { html += renderFamilyItem(m, '#10b981'); });
    }
    if (parAdresse.length > 0) {
        html += '<div class="tree-title" style="color:#3b82f6;margin-top:12px;">Même adresse (' + parAdresse.length + ')</div>';
        parAdresse.forEach(function (m) { html += renderFamilyItem(m, '#3b82f6'); });
    }
    if (parTel.length > 0) {
        html += '<div class="tree-title" style="color:#f59e0b;margin-top:12px;">Même téléphone (' + parTel.length + ')</div>';
        parTel.forEach(function (m) { html += renderFamilyItem(m, '#f59e0b'); });
    }
    if (autres.length > 0) {
        html += '<div class="tree-title" style="color:#7a7a7a;margin-top:12px;">Autres liens (' + autres.length + ')</div>';
        autres.forEach(function (m) { html += renderFamilyItem(m, '#7a7a7a'); });
    }

    html += '</div>';
    panel.innerHTML = html;
}

function renderFamilyItem(m, color) {
    const name = getPersonName(m);
    const extras = [];
    if (m.date_naissance) extras.push(m.date_naissance);
    if (m.email) extras.push(m.email);
    if (m.telephone || m.mobile) extras.push(formatPhone(m.telephone || m.mobile));

    return '<div class="tree-item">' +
        '<div style="display:flex;flex-direction:column;gap:2px;">' +
        '<span style="color:#fff;font-weight:500;">' + escapeHtml(name) + '</span>' +
        (extras.length > 0 ? '<span style="font-size:11px;color:#7a7a7a;">' + escapeHtml(extras.join(' - ')) + '</span>' : '') +
        '</div>' +
        '<span class="relation" style="color:' + color + ';border-color:' + color + '33;background:' + color + '11;">' +
        escapeHtml(m._familyLink || 'Lien') + '</span>' +
        '</div>';
}

// ============================================
// HISTORIQUE
// ============================================
async function loadHistory() {
    const container = $('historyList');
    if (!container) return;
    container.innerHTML = '<div class="empty-state">Chargement...</div>';

    try {
        const response = await fetch(API_URL + '/api/history', { headers: authHeaders(false) });
        const data = await readJson(response);
        const history = data.history || data.results || [];
        state.history = history;

        if (!history.length) {
            container.innerHTML = '<div class="empty-state">Aucune recherche dans l\'historique</div>';
            return;
        }

        container.innerHTML = history.map(function (item, index) {
            const date = item.created_at ? new Date(item.created_at).toLocaleDateString('fr-FR', {
                day: '2-digit', month: '2-digit', year: 'numeric'
            }) : '';
            const time = item.created_at ? new Date(item.created_at).toLocaleTimeString('fr-FR', {
                hour: '2-digit', minute: '2-digit'
            }) : '';
            const query = typeof item.query === 'string' ? JSON.parse(item.query || '{}') : (item.query || {});
            const name = ((query.prenom || '') + ' ' + (query.nom_famille || query.nom || '')).trim() || 'Recherche';
            const count = item.results_count || item.result_count || 0;
            const countText = count === 0 ? 'Aucun résultat' : count + ' résultat(s)';

            return '<div class="history-item">' +
                '<div class="history-header">' +
                '<div class="history-date">' + date + ' ' + time + ' - ' + escapeHtml(name) + '</div>' +
                '<span class="history-result-count ' + (count === 0 ? 'empty' : '') + '">' + countText + '</span>' +
                '</div>' +
                '<div class="history-footer">' +
                '<button class="history-replay" onclick="replaySearch(' + index + ')">Relancer</button>' +
                '</div>' +
                '</div>';
        }).join('');
    } catch (e) {
        container.innerHTML = '<div class="empty-state" style="color:#ef4444;">Erreur de chargement</div>';
    }
}

async function replaySearch(index) {
    const item = state.history[index];
    if (!item) return;
    let payload = item.query || item.filters || null;
    if (typeof payload === 'string') {
        try { payload = JSON.parse(payload); } catch (e) { payload = null; }
    }
    if (!payload) {
        showToast('Critères non disponibles', 'warning');
        return;
    }
    switchPage('search');
    await performSearch(payload);
}

// ============================================
// FICHES
// ============================================
async function loadFiches() {
    const container = $('fichesList');
    if (!container) return;
    container.innerHTML = '<div class="empty-state">Chargement...</div>';

    try {
        const response = await fetch(API_URL + '/api/fiches', { headers: authHeaders(false) });
        const data = await readJson(response);
        state.fiches = data.fiches || data.results || [];

        if (!state.fiches.length) {
            container.innerHTML = '<div class="empty-state">Aucune fiche créée</div>';
            return;
        }

        container.innerHTML = state.fiches.map(function (fiche, index) {
            const persons = fiche.persons || [];
            const personsHtml = persons.slice(0, 3).map(function (p) {
                return '<span style="font-size:12px;color:#7a7a7a;">' + escapeHtml(getPersonName(p)) + '</span>';
            }).join(', ') + (persons.length > 3 ? ' +' + (persons.length - 3) : '');

            return '<div class="fiche-item">' +
                '<div class="fiche-header">' +
                '<span class="fiche-name">' + escapeHtml(fiche.name || 'Sans nom') + '</span>' +
                '<span class="fiche-count">' + persons.length + ' personne(s)</span>' +
                '</div>' +
                (persons.length ? '<div style="margin-top:6px;">' + personsHtml + '</div>' : '') +
                '<div class="fiche-actions">' +
                '<button class="fiche-btn" onclick="viewFiche(' + index + ')">Voir</button>' +
                '<button class="fiche-btn" onclick="editFiche(' + index + ')">Modifier</button>' +
                '<button class="fiche-btn" onclick="exportFiche(' + index + ')">Exporter</button>' +
                '<button class="fiche-btn danger" onclick="deleteFiche(' + index + ')">Supprimer</button>' +
                '</div>' +
                '</div>';
        }).join('');
    } catch (e) {
        container.innerHTML = '<div class="empty-state" style="color:#ef4444;">Erreur de chargement</div>';
    }
}

function viewFiche(index) {
    const fiche = state.fiches[index];
    if (!fiche) return;
    const persons = fiche.persons || [];
    let html = '<div style="margin-bottom:12px;font-size:13px;color:#7a7a7a;">' + persons.length + ' / 10 personnes</div>';
    if (!persons.length) {
        html += '<div style="padding:20px;color:#7a7a7a;text-align:center;">Aucune personne</div>';
    } else {
        html += '<div style="max-height:400px;overflow-y:auto;">';
        persons.forEach(function (p) {
            html += '<div style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.05);">' +
                '<div style="font-weight:600;color:#fff;">' + escapeHtml(getPersonName(p)) + '</div>' +
                (p.email ? '<div style="font-size:12px;color:#7a7a7a;">' + escapeHtml(p.email) + '</div>' : '') +
                (p.telephone ? '<div style="font-size:12px;color:#7a7a7a;">' + escapeHtml(formatPhone(p.telephone)) + '</div>' : '') +
                '</div>';
        });
        html += '</div>';
    }
    showModal('Fiche - ' + (fiche.name || 'Sans nom'), html, 'Fermer', closeModal);
}

function editFiche(index) {
    const fiche = state.fiches[index];
    if (!fiche) return;
    showModal('Modifier la fiche',
        '<div class="form-group"><label>Nom de la fiche</label>' +
        '<input id="editFicheName" type="text" value="' + escapeHtml(fiche.name || '') + '" style="width:100%;padding:10px;background:#1e1e1e;border:1px solid #2a2a2a;border-radius:8px;color:#fff;"></div>',
        'Sauvegarder',
        async function () {
            const name = ($('editFicheName') || {}).value;
            if (!name || !name.trim()) {
                showToast('Veuillez donner un nom', 'warning');
                return;
            }
            try {
                const response = await fetch(API_URL + '/api/fiches/' + fiche.id, {
                    method: 'PUT',
                    headers: authHeaders(true),
                    body: JSON.stringify({ name: name.trim() })
                });
                if (response.ok) {
                    showToast('Fiche modifiée', 'success');
                    await loadFiches();
                }
            } catch (e) {
                showToast('Erreur', 'error');
            }
        });
}

function deleteFiche(index) {
    const fiche = state.fiches[index];
    if (!fiche) return;
    showModal('Supprimer la fiche',
        '<p style="color:#a0a0a0;">Supprimer la fiche <strong style="color:#fff;">' + escapeHtml(fiche.name) + '</strong> ?</p>',
        'Supprimer',
        async function () {
            try {
                const response = await fetch(API_URL + '/api/fiches/' + fiche.id, {
                    method: 'DELETE',
                    headers: authHeaders(false)
                });
                if (response.ok) {
                    showToast('Fiche supprimée', 'success');
                    await loadFiches();
                }
            } catch (e) {
                showToast('Erreur', 'error');
            }
        });
}

function exportFiche(index) {
    const fiche = state.fiches[index];
    if (!fiche) return;
    let text = 'MARAUDER - FICHE : ' + (fiche.name || 'Sans nom') + '\n\n';
    (fiche.persons || []).forEach(function (p, i) {
        text += 'Personne ' + (i + 1) + ' :\n';
        Object.keys(p).forEach(function (k) {
            if (k.startsWith('_') || k === 'famille') return;
            if (!p[k]) return;
            text += '  ' + labelForKey(k) + ' : ' + formatValue(k, p[k]) + '\n';
        });
        text += '\n';
    });
    navigator.clipboard.writeText(text).then(function () {
        showToast('Fiche copiée', 'success');
    });
}

function addToFiche(index) {
    const person = state.results[index];
    if (!person) {
        showToast('Personne introuvable', 'error');
        return;
    }
    if (!state.fiches.length) {
        showModal('Créer une fiche',
            '<p style="color:#a0a0a0;">Aucune fiche existante.</p>' +
            '<div class="form-group"><label>Nom</label>' +
            '<input id="newFicheName" type="text" style="width:100%;padding:10px;background:#1e1e1e;border:1px solid #2a2a2a;border-radius:8px;color:#fff;"></div>',
            'Créer',
            async function () {
                const name = ($('newFicheName') || {}).value;
                if (!name || !name.trim()) {
                    showToast('Veuillez donner un nom', 'warning');
                    return;
                }
                await createFicheAndAdd(name.trim(), person);
            });
        return;
    }

    const options = state.fiches.map(function (f) {
        const count = (f.persons || []).length;
        return '<option value="' + f.id + '"' + (count >= 10 ? ' disabled' : '') + '>' +
            escapeHtml(f.name) + ' (' + count + '/10)</option>';
    }).join('') + '<option value="new">Créer une nouvelle fiche</option>';

    showModal('Ajouter à une fiche',
        '<div class="form-group"><label>Fiche</label>' +
        '<select id="ficheSelect" style="width:100%;padding:10px;background:#1e1e1e;border:1px solid #2a2a2a;border-radius:8px;color:#fff;">' +
        options + '</select></div>' +
        '<div id="newFicheContainer" style="display:none;margin-top:10px;">' +
        '<div class="form-group"><label>Nom de la nouvelle fiche</label>' +
        '<input id="newFicheName" type="text" style="width:100%;padding:10px;background:#1e1e1e;border:1px solid #2a2a2a;border-radius:8px;color:#fff;"></div></div>',
        'Ajouter',
        async function () {
            const select = $('ficheSelect');
            if (!select) return;
            if (select.value === 'new') {
                const name = ($('newFicheName') || {}).value;
                if (!name || !name.trim()) {
                    showToast('Veuillez donner un nom', 'warning');
                    return;
                }
                await createFicheAndAdd(name.trim(), person);
            } else {
                await addPersonToFiche(select.value, person);
                await loadFiches();
            }
        });

    setTimeout(function () {
        const sel = $('ficheSelect');
        const cont = $('newFicheContainer');
        if (sel && cont) {
            sel.addEventListener('change', function () {
                cont.style.display = this.value === 'new' ? 'block' : 'none';
            });
        }
    }, 0);
}

async function createFicheAndAdd(name, person) {
    try {
        const response = await fetch(API_URL + '/api/fiches', {
            method: 'POST',
            headers: authHeaders(true),
            body: JSON.stringify({ name: name })
        });
        const data = await readJson(response);
        if (!response.ok) throw new Error(data.error || 'Erreur');
        const fiche = data.fiche || data;
        if (fiche.id) await addPersonToFiche(fiche.id, person);
        await loadFiches();
        showToast('Personne ajoutée', 'success');
    } catch (e) {
        showToast('Erreur', 'error');
    }
}

async function addPersonToFiche(ficheId, person) {
    try {
        const response = await fetch(API_URL + '/api/fiches/' + ficheId + '/persons', {
            method: 'POST',
            headers: authHeaders(true),
            body: JSON.stringify({ person: person })
        });
        const data = await readJson(response);
        if (!response.ok) throw new Error(data.error || 'Erreur');
        showToast('Personne ajoutée', 'success');
    } catch (e) {
        showToast(e.message || 'Erreur', 'error');
    }
}

// ============================================
// COPIER / GRAPHE
// ============================================
function copyFullCard(index) {
    const person = state.results[index];
    if (!person) return;
    let text = 'MARAUDER - INVESTIGATION\n\n';
    Object.keys(person).forEach(function (k) {
        if (k.startsWith('_') || k === 'famille') return;
        if (!person[k]) return;
        text += labelForKey(k) + ' : ' + formatValue(k, person[k]) + '\n';
    });
    if (person.famille && person.famille.length) {
        text += '\n--- Famille ---\n';
        person.famille.forEach(function (m) {
            text += getPersonName(m) + ' (' + m._familyLink + ')\n';
        });
    }
    navigator.clipboard.writeText(text).then(function () {
        showToast('Copié', 'success');
    });
}

function addToGraphe(index) {
    const person = state.results[index];
    if (!person) {
        showToast('Personne introuvable', 'error');
        return;
    }

    const id = familyIdentity(person);
    if (state.graphNodes.some(function (n) { return n.sourceIdentity === id; })) {
        showToast('Déjà dans le graphe', 'info');
        switchPage('graphe');
        return;
    }

    const container = $('grapheContainer');
    const w = container ? Math.max(container.clientWidth, 600) : 900;
    const h = container ? Math.max(container.clientHeight, 500) : 600;

    state.graphNodes.push({
        id: 'node-' + Date.now() + '-' + Math.random().toString(36).slice(2),
        label: getPersonName(person),
        prenom: person.prenom || '',
        nom_famille: person.nom_famille || person.nom || '',
        role: person.role || 'Personne',
        sourceIdentity: id,
        person: person,
        x: w / 2 + (Math.random() - 0.5) * 200,
        y: h / 2 + (Math.random() - 0.5) * 150
    });

    window.grapheNodes = state.graphNodes;
    switchPage('graphe');
    setTimeout(renderGraphe, 100);
    showToast('Ajouté au graphe', 'success');
}

// ============================================
// INVESTIGATION
// ============================================
async function getCoordinates(query) {
    if (!query) return null;
    try {
        const url = 'https://nominatim.openstreetmap.org/search?' +
            new URLSearchParams({ q: query + ', France', format: 'json', limit: '1', countrycodes: 'fr' });
        const response = await fetch(url);
        if (!response.ok) return null;
        const data = await response.json();
        if (!data || !data.length) return null;
        return { lat: Number(data[0].lat), lng: Number(data[0].lon), display: data[0].display_name };
    } catch (e) {
        return null;
    }
}

function getMapPosition(lat, lng) {
    const minLat = 41, maxLat = 51.5, minLng = -5.5, maxLng = 9.5;
    const left = ((lng - minLng) / (maxLng - minLng)) * 100;
    const top = (1 - (lat - minLat) / (maxLat - minLat)) * 100;
    return { left: Math.max(2, Math.min(98, left)), top: Math.max(2, Math.min(98, top)) };
}

async function openInvestigation(index) {
    const person = state.results[index];
    if (!person) {
        showToast('Personne introuvable', 'error');
        return;
    }

    state.investigationData = person;
    const overlay = $('investigationOverlay');
    if (!overlay) return;

    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';

    setText('investigationName', 'Investigation - ' + getPersonName(person));

    const confidence = Number(person._confidence || 0);
    const confEl = $('investigationConfidence');
    if (confEl) {
        confEl.textContent = confidence + '%';
        confEl.className = 'investigation-confidence ' + confidenceClass(confidence);
    }

    const city = person.ville || person.ville_naissance || '';
    setText('investigationCityLabel', city || 'Localisation inconnue');

    const grid = $('investigationInfoGrid');
    if (grid) {
        grid.innerHTML = '';
        Object.keys(person).forEach(function (k) {
            if (k.startsWith('_') || k === 'famille') return;
            const value = person[k];
            if (!value || typeof value === 'object') return;
            const item = document.createElement('div');
            item.className = 'investigation-info-item important';
            item.innerHTML = '<div class="investigation-info-label">' + escapeHtml(labelForKey(k)) + '</div>' +
                '<div class="investigation-info-value">' + escapeHtml(formatValue(k, value)) + '</div>';
            grid.appendChild(item);
        });
    }

    const query = person.adresse || person.ville || person.code_postal || '';
    const coords = await getCoordinates(query);
    const pin = $('mapPin');

    if (pin && coords) {
        const pos = getMapPosition(coords.lat, coords.lng);
        pin.style.display = 'block';
        pin.style.left = pos.left + '%';
        pin.style.top = pos.top + '%';
        setText('investigationCityLabel', coords.display || query);
    } else if (pin) {
        pin.style.display = 'none';
    }
}

function closeInvestigation() {
    const overlay = $('investigationOverlay');
    if (overlay) overlay.classList.remove('active');
    document.body.style.overflow = '';
}

// ============================================
// TICKETS
// ============================================
async function loadTickets() {
    const container = $('ticketsList');
    if (!container) return;
    container.innerHTML = '<div class="empty-state">Chargement...</div>';

    try {
        const response = await fetch(API_URL + '/api/tickets', { headers: authHeaders(false) });
        const data = await readJson(response);
        state.tickets = data.tickets || data.results || [];

        if (!state.tickets.length) {
            container.innerHTML = '<div class="empty-state">Aucun ticket</div>';
            return;
        }

        container.innerHTML = state.tickets.map(function (ticket, index) {
            const date = ticket.created_at ? new Date(ticket.created_at).toLocaleString('fr-FR') : '';
            return '<div class="ticket-item" onclick="viewTicket(' + index + ')" style="cursor:pointer;">' +
                '<div class="ticket-header">' +
                '<span class="ticket-subject">' + escapeHtml(ticket.subject || 'Ticket') + '</span>' +
                '<span class="ticket-meta">' + date + ' - ' + escapeHtml(ticket.status || 'ouvert') + '</span>' +
                '</div>' +
                '<div style="font-size:13px;color:#a0a0a0;margin-top:6px;">' +
                escapeHtml(String(ticket.message || '').substring(0, 140)) + '</div>' +
                '</div>';
        }).join('');
    } catch (e) {
        container.innerHTML = '<div class="empty-state" style="color:#ef4444;">Erreur de chargement</div>';
    }
}

async function viewTicket(index) {
    const ticket = state.tickets[index];
    if (!ticket) return;

    try {
        const response = await fetch(API_URL + '/api/tickets/' + ticket.id, { headers: authHeaders(false) });
        const data = await readJson(response);
        const currentTicket = data.ticket || ticket;
        const messages = data.messages || currentTicket.messages || [];

        let html = '<div style="max-height:400px;overflow-y:auto;margin-bottom:12px;">';
        messages.forEach(function (m) {
            html += '<div style="padding:10px 14px;margin-bottom:8px;background:rgba(255,255,255,0.03);border-radius:8px;border-left:2px solid ' +
                (m.is_admin ? '#3b82f6' : '#2a2a2a') + ';">' +
                '<div style="font-size:11px;color:#7a7a7a;margin-bottom:4px;">' +
                escapeHtml(m.username || 'Utilisateur') + ' - ' +
                (m.created_at ? new Date(m.created_at).toLocaleString('fr-FR') : '') + '</div>' +
                '<div style="font-size:13px;color:#ddd;white-space:pre-wrap;">' + escapeHtml(m.message || '') + '</div>' +
                '</div>';
        });
        html += '</div>';

        if (currentTicket.status !== 'closed') {
            html += '<div style="border-top:1px solid rgba(255,255,255,0.05);padding-top:12px;">' +
                '<textarea id="ticketReplyInput" rows="4" placeholder="Votre réponse..." style="width:100%;box-sizing:border-box;padding:10px;background:#1e1e1e;border:1px solid #2a2a2a;border-radius:8px;color:#fff;resize:vertical;font-family:inherit;"></textarea></div>';
        }

        showModal(currentTicket.subject || 'Ticket', html,
            currentTicket.status === 'closed' ? 'Fermer' : 'Répondre',
            async function () {
                if (currentTicket.status === 'closed') return;
                const input = $('ticketReplyInput');
                if (!input || !input.value.trim()) {
                    showToast('Écrivez une réponse', 'warning');
                    return;
                }
                try {
                    const r = await fetch(API_URL + '/api/tickets/' + currentTicket.id + '/messages', {
                        method: 'POST',
                        headers: authHeaders(true),
                        body: JSON.stringify({ message: input.value.trim() })
                    });
                    if (r.ok) {
                        showToast('Réponse envoyée', 'success');
                        await loadTickets();
                    }
                } catch (e) {
                    showToast('Erreur', 'error');
                }
            });
    } catch (e) {
        showToast('Erreur de chargement', 'error');
    }
}

function initTickets() {
    const btn = $('openTicketBtn');
    if (!btn) return;
    btn.addEventListener('click', function () {
        showModal('Nouveau ticket',
            '<div class="form-group"><label>Sujet</label>' +
            '<input id="ticketSubject" type="text" style="width:100%;padding:10px;background:#1e1e1e;border:1px solid #2a2a2a;border-radius:8px;color:#fff;"></div>' +
            '<div class="form-group" style="margin-top:10px;"><label>Message</label>' +
            '<textarea id="ticketMessage" rows="6" style="width:100%;box-sizing:border-box;padding:10px;background:#1e1e1e;border:1px solid #2a2a2a;border-radius:8px;color:#fff;resize:vertical;font-family:inherit;"></textarea></div>',
            'Envoyer',
            async function () {
                const subject = ($('ticketSubject') || {}).value;
                const message = ($('ticketMessage') || {}).value;
                if (!subject || !message || !subject.trim() || !message.trim()) {
                    showToast('Remplissez tous les champs', 'warning');
                    return;
                }
                try {
                    const r = await fetch(API_URL + '/api/tickets', {
                        method: 'POST',
                        headers: authHeaders(true),
                        body: JSON.stringify({ subject: subject.trim(), message: message.trim() })
                    });
                    if (r.ok) {
                        showToast('Ticket créé', 'success');
                        await loadTickets();
                    }
                } catch (e) {
                    showToast('Erreur', 'error');
                }
            });
    });
}

// ============================================
// PROFIL
// ============================================
async function loadProfile() {
    const container = $('profileInfo');
    if (!container) return;
    container.innerHTML = '<div class="empty-state">Chargement...</div>';

    try {
        const response = await fetch(API_URL + '/api/me', { headers: authHeaders(false) });
        const data = await readJson(response);
        const user = data.user || data;

        if (!user) throw new Error();

        container.innerHTML = '<div class="profile-header">' +
            '<div class="profile-avatar">' + escapeHtml((user.username || 'U').charAt(0).toUpperCase()) + '</div>' +
            '<div class="profile-header-info">' +
            '<h3>' + escapeHtml(user.username || 'Utilisateur') + '</h3>' +
            '<p>Compte Marauder</p>' +
            '</div></div>' +
            '<div class="profile-row"><span class="label">Nom d\'utilisateur</span><span class="value">' + escapeHtml(user.username || '') + '</span></div>' +
            '<div class="profile-row"><span class="label">Rôle</span><span class="value">' + escapeHtml(user.role || '') + '</span></div>' +
            '<div class="profile-row"><span class="label">Membre depuis</span><span class="value">' +
            (user.created_at ? new Date(user.created_at).toLocaleDateString('fr-FR') : '-') + '</span></div>' +
            '<div class="profile-row"><span class="label">Dernière connexion</span><span class="value">' +
            (user.last_login ? new Date(user.last_login).toLocaleString('fr-FR') : 'Maintenant') + '</span></div>';
    } catch (e) {
        container.innerHTML = '<div class="empty-state" style="color:#ef4444;">Erreur de chargement</div>';
    }
}

// ============================================
// USAGE API
// ============================================
async function loadUsage() {
    try {
        const response = await fetch(API_URL + '/api/my-api-usage', { headers: authHeaders(false) });
        if (!response.ok) return;
        const data = await readJson(response);

        const today = data.today || 0;
        const month = data.month || 0;
        const limit = data.limit || 10;
        const remaining = data.remaining !== undefined ? data.remaining : Math.max(0, limit - month);

        document.querySelectorAll('.api-stat-value[data-stat]').forEach(function (el) {
            const stat = el.dataset.stat;
            if (stat === 'today') el.textContent = String(today);
            if (stat === 'month') el.textContent = String(month);
            if (stat === 'limit') el.textContent = String(limit);
            if (stat === 'remaining') el.textContent = String(remaining);
        });

        const usageCount = $('usageCount');
        if (usageCount) usageCount.textContent = month + ' / ' + limit;

        const usageBar = $('usageBarFill');
        if (usageBar) {
            const pct = limit > 0 ? Math.min(100, (month / limit) * 100) : 0;
            usageBar.style.width = pct + '%';
        }
    } catch (e) {
        console.error('Erreur usage:', e);
    }
}

// ============================================
// GRAPHE
// ============================================
function renderGraphNode(node) {
    const el = document.createElement('div');
    el.className = 'graph-node';
    el.dataset.nodeId = node.id;
    el.style.cssText = 'position:absolute;left:' + (node.x || 100) + 'px;top:' + (node.y || 100) + 'px;' +
        'width:150px;min-height:65px;padding:10px;box-sizing:border-box;' +
        'background:#111;border:1px solid #333;border-radius:10px;color:#fff;' +
        'cursor:pointer;transform:translate(-50%,-50%);user-select:none;';

    el.innerHTML = '<div style="font-size:13px;font-weight:600;">' + escapeHtml(node.label || 'Personne') + '</div>' +
        '<div style="font-size:11px;color:#777;margin-top:4px;">' + escapeHtml(node.role || 'Personne') + '</div>';

    el.addEventListener('click', function (e) {
        e.stopPropagation();
        if (!state.graphLinkMode) return;
        handleGraphLinkClick(node.id);
    });

    return el;
}

function handleGraphLinkClick(nodeId) {
    if (!state.graphLinkMode) return;
    if (!state.graphLinkFrom) {
        state.graphLinkFrom = nodeId;
        showToast('Sélectionnez la 2ème personne', 'info');
        return;
    }
    if (state.graphLinkFrom === nodeId) {
        showToast('Sélectionnez une autre personne', 'warning');
        return;
    }
    const exists = state.graphEdges.some(function (e) {
        return (e.from === state.graphLinkFrom && e.to === nodeId) ||
            (e.from === nodeId && e.to === state.graphLinkFrom);
    });
    if (!exists) {
        state.graphEdges.push({
            id: 'edge-' + Date.now(),
            from: state.graphLinkFrom,
            to: nodeId
        });
    }
    state.graphLinkFrom = null;
    state.graphLinkMode = false;
    window.grapheEdges = state.graphEdges;
    renderGraphe();
    showToast('Personnes attachées', 'success');
}

function renderGraphe() {
    const container = $('grapheContainer');
    if (!container) return;

    container.innerHTML = '';
    container.style.position = 'relative';

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible;';

    state.graphEdges.forEach(function (edge) {
        const from = state.graphNodes.find(function (n) { return n.id === edge.from; });
        const to = state.graphNodes.find(function (n) { return n.id === edge.to; });
        if (!from || !to) return;
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', String(from.x || 0));
        line.setAttribute('y1', String(from.y || 0));
        line.setAttribute('x2', String(to.x || 0));
        line.setAttribute('y2', String(to.y || 0));
        line.setAttribute('stroke', '#444');
        line.setAttribute('stroke-width', '2');
        svg.appendChild(line);
    });

    container.appendChild(svg);
    state.graphNodes.forEach(function (node) {
        container.appendChild(renderGraphNode(node));
    });
}

function grapheAddPersonne() {
    showModal('Ajouter une personne',
        '<div class="form-group"><label>Prénom</label>' +
        '<input id="newNodePrenom" type="text" style="width:100%;padding:10px;background:#1e1e1e;border:1px solid #2a2a2a;border-radius:8px;color:#fff;"></div>' +
        '<div class="form-group" style="margin-top:10px;"><label>Nom</label>' +
        '<input id="newNodeNom" type="text" style="width:100%;padding:10px;background:#1e1e1e;border:1px solid #2a2a2a;border-radius:8px;color:#fff;"></div>' +
        '<div class="form-group" style="margin-top:10px;"><label>Rôle</label>' +
        '<input id="newNodeRole" type="text" style="width:100%;padding:10px;background:#1e1e1e;border:1px solid #2a2a2a;border-radius:8px;color:#fff;"></div>',
        'Ajouter',
        function () {
            const prenom = ($('newNodePrenom') || {}).value || '';
            const nom = ($('newNodeNom') || {}).value || '';
            const role = ($('newNodeRole') || {}).value || 'Personne';
            const container = $('grapheContainer');
            const w = container ? container.clientWidth : 900;
            const h = container ? container.clientHeight : 600;

            state.graphNodes.push({
                id: 'node-' + Date.now() + '-' + Math.random().toString(36).slice(2),
                label: (prenom + ' ' + nom).trim() || 'Personne',
                prenom: prenom.trim(),
                nom_famille: nom.trim(),
                role: role.trim(),
                x: w / 2 + (Math.random() - 0.5) * 200,
                y: h / 2 + (Math.random() - 0.5) * 150
            });
            window.grapheNodes = state.graphNodes;
            renderGraphe();
            showToast('Personne ajoutée', 'success');
        });
}

function grapheAttacher() {
    if (state.graphNodes.length < 2) {
        showToast('Ajoutez au moins 2 personnes', 'warning');
        return;
    }
    state.graphLinkMode = !state.graphLinkMode;
    state.graphLinkFrom = null;
    showToast(state.graphLinkMode ? 'Cliquez sur 2 personnes' : 'Mode attacher désactivé', 'info');
}

function grapheSauvegarder() {
    const data = { name: 'Graphe Marauder', nodes: state.graphNodes, edges: state.graphEdges };
    localStorage.setItem('marauder_graphe', JSON.stringify(data));
    fetch(API_URL + '/api/graphes', {
        method: 'POST',
        headers: authHeaders(true),
        body: JSON.stringify(data)
    }).then(function (r) {
        showToast(r.ok ? 'Graphe sauvegardé sur le serveur' : 'Sauvegardé localement', r.ok ? 'success' : 'info');
    }).catch(function () {
        showToast('Sauvegardé localement', 'info');
    });
}

async function grapheMesGraphes() {
    const modal = $('graphesModal');
    const list = $('graphesList');
    if (!modal || !list) return;
    modal.style.display = 'flex';
    list.innerHTML = '<div style="padding:20px;color:#777;text-align:center;">Chargement...</div>';

    try {
        const r = await fetch(API_URL + '/api/graphes/all', { headers: authHeaders(false) });
        const d = await readJson(r);
        const graphes = d.graphes || d.results || [];

        const local = localStorage.getItem('marauder_graphe');
        if (local) {
            try {
                const lg = JSON.parse(local);
                graphes.unshift({ id: 'local', name: 'Graphe local', nodes: lg.nodes || [], edges: lg.edges || [], created_at: new Date().toISOString(), local: true });
            } catch (e) {}
        }

        if (!graphes.length) {
            list.innerHTML = '<div style="padding:20px;color:#777;text-align:center;">Aucun graphe sauvegardé</div>';
            return;
        }

        list.innerHTML = graphes.map(function (g, i) {
            return '<div style="display:flex;justify-content:space-between;align-items:center;padding:12px;background:#101010;border:1px solid #222;border-radius:9px;margin-bottom:8px;">' +
                '<div><div style="font-weight:600;color:#fff;">' + escapeHtml(g.name || 'Sans nom') + '</div>' +
                '<div style="font-size:12px;color:#777;margin-top:3px;">' + (g.nodes || []).length + ' personnes - ' + (g.edges || []).length + ' liens</div></div>' +
                '<div style="display:flex;gap:6px;">' +
                '<button class="btn-secondary" style="padding:6px 14px;font-size:12px;" onclick="loadGraph(' + i + ')">Charger</button>' +
                (g.local ? '' : '<button class="btn-secondary" style="padding:6px 14px;font-size:12px;color:#ef4444;" onclick="grapheEffacerServeur(' + g.id + ')">Supprimer</button>') +
                '</div></div>';
        }).join('');

        window._graphesCache = graphes;
    } catch (e) {
        list.innerHTML = '<div style="padding:20px;color:#ef4444;text-align:center;">Erreur de chargement</div>';
    }
}

window.loadGraph = function (index) {
    const graph = (window._graphesCache || [])[index];
    if (!graph) return;
    state.graphNodes = Array.isArray(graph.nodes) ? graph.nodes : [];
    state.graphEdges = Array.isArray(graph.edges) ? graph.edges : [];
    window.grapheNodes = state.graphNodes;
    window.grapheEdges = state.graphEdges;
    const m = $('graphesModal');
    if (m) m.style.display = 'none';
    renderGraphe();
    showToast('Graphe chargé', 'success');
};

async function grapheEffacerServeur(id) {
    if (!confirm('Supprimer ce graphe ?')) return;
    try {
        const r = await fetch(API_URL + '/api/graphes/' + id, { method: 'DELETE', headers: authHeaders(false) });
        if (r.ok) {
            showToast('Graphe supprimé', 'success');
            await grapheMesGraphes();
        }
    } catch (e) {
        showToast('Erreur', 'error');
    }
}

function grapheEffacer() {
    showModal('Effacer le graphe',
        '<p style="color:#a0a0a0;">Effacer toutes les personnes et liens ?</p>',
        'Effacer',
        function () {
            state.graphNodes = [];
            state.graphEdges = [];
            state.graphLinkMode = false;
            window.grapheNodes = state.graphNodes;
            window.grapheEdges = state.graphEdges;
            localStorage.removeItem('marauder_graphe');
            renderGraphe();
            showToast('Graphe effacé', 'success');
        });
}

// ============================================
// NAVIGATION
// ============================================
function switchPage(page) {
    if (!page) return;
    document.querySelectorAll('.sidebar-nav li[data-page]').forEach(function (li) {
        li.classList.toggle('active', li.dataset.page === page);
    });
    document.querySelectorAll('.page').forEach(function (p) {
        p.classList.remove('active');
    });
    const el = $('page-' + page);
    if (el) el.classList.add('active');

    if (page === 'history') loadHistory();
    if (page === 'fiches') loadFiches();
    if (page === 'tickets') loadTickets();
    if (page === 'profile') loadProfile();
    if (page === 'graphe') setTimeout(renderGraphe, 100);

    const sidebar = $('sidebar');
    const backdrop = $('sidebarBackdrop');
    if (sidebar) sidebar.classList.remove('open');
    if (backdrop) backdrop.classList.remove('active');
}

function initNavigation() {
    document.querySelectorAll('.sidebar-nav li[data-page]').forEach(function (li) {
        li.addEventListener('click', function () {
            const page = this.dataset.page;
            if (page === 'discord') {
                window.open('https://discord.gg/jf6QRZHaTB', '_blank');
                return;
            }
            switchPage(page);
        });
    });

    document.querySelectorAll('.search-tab').forEach(function (tab) {
        tab.addEventListener('click', function () {
            document.querySelectorAll('.search-tab').forEach(function (t) { t.classList.remove('active'); });
            this.classList.add('active');
            document.querySelectorAll('.search-tab-content').forEach(function (c) { c.classList.remove('active'); });
            const target = $('tab-' + this.dataset.tab);
            if (target) target.classList.add('active');
        });
    });

    document.querySelectorAll('.section-header').forEach(function (h) {
        h.addEventListener('click', function () {
            const body = this.nextElementSibling;
            if (body) body.classList.toggle('open');
            const icon = this.querySelector('.toggle-icon');
            if (icon) icon.classList.toggle('open');
        });
    });

    const support = $('supportToggle');
    if (support) {
        support.addEventListener('click', function (e) {
            e.stopPropagation();
            const submenu = $('supportSubmenu');
            const arrow = this.querySelector('.support-arrow');
            if (!submenu) return;
            const open = submenu.classList.contains('open');
            submenu.classList.toggle('open', !open);
            if (arrow) arrow.classList.toggle('open', !open);
        });
    }

    document.querySelectorAll('.api-tab').forEach(function (tab) {
        tab.addEventListener('click', function () {
            document.querySelectorAll('.api-tab').forEach(function (t) { t.classList.remove('active'); });
            this.classList.add('active');
            document.querySelectorAll('.api-tab-content').forEach(function (c) { c.classList.remove('active'); });
            const target = $('api-tab-' + this.dataset.apiTab);
            if (target) target.classList.add('active');
            if (this.dataset.apiTab === 'stats') loadUsage();
        });
    });
}

// ============================================
// MODALES
// ============================================
function showModal(title, bodyHtml, confirmText, onConfirm) {
    const overlay = $('modalOverlay');
    if (!overlay) return;
    const titleEl = $('modalTitle');
    const bodyEl = $('modalBody');
    const confirmBtn = $('modalConfirm');
    const cancelBtn = $('modalCancel');

    if (titleEl) titleEl.textContent = title || '';
    if (bodyEl) bodyEl.innerHTML = bodyHtml || '';

    if (confirmBtn) {
        confirmBtn.textContent = confirmText || 'Confirmer';
        const clone = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(clone, confirmBtn);
        clone.addEventListener('click', async function () {
            if (typeof onConfirm === 'function') await onConfirm();
            closeModal();
        });
    }
    if (cancelBtn) {
        const clone = cancelBtn.cloneNode(true);
        cancelBtn.parentNode.replaceChild(clone, cancelBtn);
        clone.addEventListener('click', closeModal);
    }

    overlay.classList.add('active');
}

function closeModal() {
    const overlay = $('modalOverlay');
    if (overlay) overlay.classList.remove('active');
}

// ============================================
// MOBILE
// ============================================
function initMobile() {
    const btn = $('mobileMenuBtn');
    const sidebar = $('sidebar');
    const backdrop = $('sidebarBackdrop');
    if (btn) {
        btn.addEventListener('click', function () {
            if (sidebar) sidebar.classList.toggle('open');
            if (backdrop) backdrop.classList.toggle('active');
        });
    }
    if (backdrop) {
        backdrop.addEventListener('click', function () {
            if (sidebar) sidebar.classList.remove('open');
            backdrop.classList.remove('active');
        });
    }
}

// ============================================
// LOGOUT
// ============================================
function initLogout() {
    const btn = $('logoutBtn');
    if (!btn) return;
    btn.addEventListener('click', function () {
        showModal('Déconnexion',
            '<p style="color:#a0a0a0;">Voulez-vous vraiment vous déconnecter ?</p>',
            'Déconnexion',
            function () {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/login';
            });
    });
}

// ============================================
// RECHERCHE - BOUTONS
// ============================================
function initSearch() {
    const btnFr = $('searchBtn');
    const btnPro = $('searchBtnPro');
    const clearFr = $('clearBtn');
    const clearPro = $('clearBtnPro');
    const lookupBtn = $('lookupBtn');
    const createFicheBtn = $('createFicheBtn');

    if (btnFr) btnFr.addEventListener('click', function () { performSearch(); });
    if (btnPro) btnPro.addEventListener('click', function () { performSearch(); });

    if (clearFr) clearFr.addEventListener('click', function () {
        document.querySelectorAll('#tab-french input, #tab-french select').forEach(function (el) { el.value = ''; });
        const r = $('searchResults');
        if (r) r.innerHTML = '';
    });
    if (clearPro) clearPro.addEventListener('click', function () {
        document.querySelectorAll('#tab-pro input, #tab-pro select').forEach(function (el) { el.value = ''; });
    });

    if (lookupBtn) lookupBtn.addEventListener('click', async function () {
        const type = ($('lookupType') || {}).value;
        const value = ($('lookupValue') || {}).value;
        if (!value || !value.trim()) {
            showToast('Veuillez entrer une valeur', 'warning');
            return;
        }
        showSearchLoading();
        try {
            const r = await fetch(API_URL + '/api/brix/lookup/' + type + '/' + encodeURIComponent(value), {
                headers: authHeaders(false)
            });
            const d = await readJson(r);
            const results = uniqueResults(extractResults(d));
            state.results = results;
            window._resultsData = results;
            displayResults(results);
            if (results.length) showToast(results.length + ' résultat(s)', 'success');
            else showToast('Aucun résultat', 'info');
        } catch (e) {
            showToast('Erreur', 'error');
        } finally {
            hideSearchLoading();
        }
    });

    if (createFicheBtn) createFicheBtn.addEventListener('click', function () {
        showModal('Créer une fiche',
            '<div class="form-group"><label>Nom de la fiche</label>' +
            '<input id="ficheNameInput" type="text" placeholder="Nom" style="width:100%;padding:10px;background:#1e1e1e;border:1px solid #2a2a2a;border-radius:8px;color:#fff;"></div>',
            'Créer',
            async function () {
                const name = ($('ficheNameInput') || {}).value;
                if (!name || !name.trim()) {
                    showToast('Veuillez donner un nom', 'warning');
                    return;
                }
                try {
                    const r = await fetch(API_URL + '/api/fiches', {
                        method: 'POST',
                        headers: authHeaders(true),
                        body: JSON.stringify({ name: name.trim() })
                    });
                    if (r.ok) {
                        showToast('Fiche créée', 'success');
                        await loadFiches();
                    }
                } catch (e) {
                    showToast('Erreur', 'error');
                }
            });
    });
}

// ============================================
// INVESTIGATION - BOUTONS
// ============================================
function initInvestigation() {
    const back = $('investigationBack');
    const close = $('investigationClose');
    const copy = $('investigationCopy');
    const graph = $('investigationGraphe');
    const addFiche = $('investigationAddFiche');

    if (back) back.addEventListener('click', closeInvestigation);
    if (close) close.addEventListener('click', closeInvestigation);
    if (copy) copy.addEventListener('click', function () {
        if (state.investigationData) copyFullCard(state.results.indexOf(state.investigationData));
    });
    if (graph) graph.addEventListener('click', function () {
        if (state.investigationData) {
            addToGraphe(state.results.indexOf(state.investigationData));
            closeInvestigation();
        }
    });
    if (addFiche) addFiche.addEventListener('click', function () {
        if (state.investigationData) addToFiche(state.results.indexOf(state.investigationData));
    });
}

// ============================================
// GRAPHE - BOUTONS
// ============================================
function initGraph() {
    const add = $('grapheAddPersonne');
    const attach = $('grapheAttacher');
    const save = $('grapheSauvegarder');
    const list = $('grapheMesGraphes');
    const clear = $('grapheEffacer');
    const closeModalBtn = $('closeGraphesModal');

    if (add) add.addEventListener('click', grapheAddPersonne);
    if (attach) attach.addEventListener('click', grapheAttacher);
    if (save) save.addEventListener('click', grapheSauvegarder);
    if (list) list.addEventListener('click', grapheMesGraphes);
    if (clear) clear.addEventListener('click', grapheEffacer);
    if (closeModalBtn) closeModalBtn.addEventListener('click', function () {
        const m = $('graphesModal');
        if (m) m.style.display = 'none';
    });

    const saved = localStorage.getItem('marauder_graphe');
    if (saved) {
        try {
            const d = JSON.parse(saved);
            state.graphNodes = Array.isArray(d.nodes) ? d.nodes : [];
            state.graphEdges = Array.isArray(d.edges) ? d.edges : [];
            window.grapheNodes = state.graphNodes;
            window.grapheEdges = state.graphEdges;
        } catch (e) {}
    }
}

// ============================================
// INIT
// ============================================
function init() {
    initNavigation();
    initMobile();
    initLogout();
    initSearch();
    initTickets();
    initGraph();
    initInvestigation();

    const overlay = $('modalOverlay');
    if (overlay) {
        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) closeModal();
        });
    }

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            const inv = $('investigationOverlay');
            if (inv && inv.classList.contains('active')) {
                closeInvestigation();
                return;
            }
            closeModal();
        }
    });

    verifyToken();
    loadProfile();
    loadUsage();

    console.log('Marauder dashboard chargé.');
}

// ============================================
// EXPORTS GLOBAUX (pour onclick dans le HTML)
// ============================================
window.showToast = showToast;
window.showModal = showModal;
window.closeModal = closeModal;
window.formatPhone = formatPhone;
window.performSearch = performSearch;
window.displayResults = displayResults;
window.findFamily = findFamily;
window.toggleDeep = toggleDeep;
window.toggleFiche = toggleFiche;
window.renderFamilyInPanel = renderFamilyInPanel;
window.loadHistory = loadHistory;
window.replaySearch = replaySearch;
window.loadFiches = loadFiches;
window.viewFiche = viewFiche;
window.editFiche = editFiche;
window.deleteFiche = deleteFiche;
window.exportFiche = exportFiche;
window.addToFiche = addToFiche;
window.copyFullCard = copyFullCard;
window.addToGraphe = addToGraphe;
window.openInvestigation = openInvestigation;
window.closeInvestigation = closeInvestigation;
window.loadTickets = loadTickets;
window.viewTicket = viewTicket;
window.loadProfile = loadProfile;
window.loadUsage = loadUsage;
window.grapheAddPersonne = grapheAddPersonne;
window.grapheAttacher = grapheAttacher;
window.grapheSauvegarder = grapheSauvegarder;
window.grapheMesGraphes = grapheMesGraphes;
window.grapheEffacer = grapheEffacer;
window.grapheEffacerServeur = grapheEffacerServeur;
window.renderGraphe = renderGraphe;
window.switchPage = switchPage;

// ============================================
// LANCEMENT
// ============================================
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}