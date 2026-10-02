const API_URL = window.location.origin;
const token = localStorage.getItem('token');

if (!token) {
    window.location.href = '/login';
}

const state = {
    results: [],
    fiches: [],
    tickets: [],
    history: [],
    familyCache: {},
    familyLoading: {},
    lastSearch: {},
    investigationData: null,
    graphes: [],
    graphNodes: [],
    graphEdges: [],
    graphLinkMode: false,
    graphLinkFrom: null
};

window._resultsData = state.results;
window.grapheNodes = state.graphNodes;
window.grapheEdges = state.graphEdges;

function $(id) {
    return document.getElementById(id);
}

function escapeHtml(value) {
    const div = document.createElement('div');
    div.textContent = value === null || value === undefined ? '' : String(value);
    return div.innerHTML;
}

function authHeaders(json) {
    const headers = {
        Authorization: 'Bearer ' + token
    };

    if (json) {
        headers['Content-Type'] = 'application/json';
    }

    return headers;
}

async function readJson(response) {
    try {
        return await response.json();
    } catch (error) {
        return {};
    }
}

function showToast(message, type, duration) {
    let container = $('toastContainer');

    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.style.cssText =
            'position:fixed;top:20px;right:20px;z-index:99999;display:flex;flex-direction:column;gap:8px;';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'toast toast-' + (type || 'info');

    toast.style.cssText =
        'min-width:260px;max-width:420px;padding:12px 14px;border:1px solid #2a2a2a;' +
        'border-radius:9px;background:#111;color:#fff;display:flex;align-items:center;' +
        'justify-content:space-between;gap:12px;box-shadow:0 12px 30px rgba(0,0,0,.35);';

    const text = document.createElement('span');
    text.textContent = message;

    const close = document.createElement('button');
    close.type = 'button';
    close.textContent = 'X';
    close.style.cssText =
        'border:0;background:transparent;color:#888;cursor:pointer;font-size:12px;';

    close.addEventListener('click', function () {
        toast.remove();
    });

    toast.appendChild(text);
    toast.appendChild(close);
    container.appendChild(toast);

    setTimeout(function () {
        if (toast.parentNode) {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(30px)';
            toast.style.transition = 'all .25s ease';

            setTimeout(function () {
                if (toast.parentNode) toast.remove();
            }, 250);
        }
    }, duration || 3500);
}

function showModal(title, bodyHtml, confirmText, onConfirm) {
    const overlay = $('modalOverlay');

    if (!overlay) {
        return;
    }

    const titleElement = $('modalTitle');
    const bodyElement = $('modalBody');
    const confirmButton = $('modalConfirm');
    const cancelButton = $('modalCancel');

    if (titleElement) {
        titleElement.textContent = title || '';
    }

    if (bodyElement) {
        bodyElement.innerHTML = bodyHtml || '';
    }

    if (confirmButton) {
        confirmButton.textContent = confirmText || 'Confirmer';

        const replacement = confirmButton.cloneNode(true);
        confirmButton.parentNode.replaceChild(replacement, confirmButton);

        replacement.addEventListener('click', async function () {
            if (typeof onConfirm === 'function') {
                await onConfirm();
            }

            if (overlay.classList.contains('active')) {
                closeModal();
            }
        });
    }

    if (cancelButton) {
        const replacement = cancelButton.cloneNode(true);
        cancelButton.parentNode.replaceChild(replacement, cancelButton);

        replacement.addEventListener('click', closeModal);
    }

    overlay.classList.add('active');
}

function closeModal() {
    const overlay = $('modalOverlay');

    if (overlay) {
        overlay.classList.remove('active');
    }
}

function formatPhone(phone) {
    if (!phone) return '';

    let value = String(phone).trim();
    let digits = value.replace(/\D/g, '');

    if (digits.startsWith('0033')) {
        digits = '0' + digits.substring(4);
    }

    if (digits.startsWith('33') && digits.length === 11) {
        digits = '0' + digits.substring(2);
    }

    if (digits.length === 10) {
        return digits.replace(
            /(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/,
            '$1 $2 $3 $4 $5'
        );
    }

    return value;
}

function normalizePhone(phone) {
    if (!phone) return '';

    let value = String(phone).replace(/\D/g, '');

    if (value.startsWith('0033')) {
        value = '0' + value.substring(4);
    }

    if (value.startsWith('33') && value.length === 11) {
        value = '0' + value.substring(2);
    }

    return value;
}

function normalizeAdresse(address) {
    if (!address) return '';

    return String(address)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\w\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function showSearchLoading() {
    let loader = $('searchLoading');

    if (!loader) {
        loader = document.createElement('div');
        loader.id = 'searchLoading';
        loader.innerHTML =
            '<div style="padding:18px 22px;background:#111;border:1px solid #2a2a2a;border-radius:10px;color:#fff;">' +
            'Recherche en cours...' +
            '</div>';

        loader.style.cssText =
            'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;' +
            'background:rgba(0,0,0,.45);z-index:9998;';

        document.body.appendChild(loader);
    }

    loader.style.display = 'flex';
}

function hideSearchLoading() {
    const loader = $('searchLoading');

    if (loader) {
        loader.style.display = 'none';
    }
}

function setText(id, value) {
    const element = $(id);

    if (element) {
        element.textContent =
            value === null || value === undefined ? '' : String(value);
    }
}

function getValue(ids) {
    const list = Array.isArray(ids) ? ids : [ids];

    for (const id of list) {
        const element = $(id);

        if (element && typeof element.value === 'string') {
            const value = element.value.trim();

            if (value) {
                return value;
            }
        }
    }

    return '';
}

function getPersonName(person) {
    const name = [
        person.prenom || '',
        person.nom_famille || person.nom || ''
    ].join(' ').trim();

    return name || 'Personne inconnue';
}

function confidenceClass(confidence) {
    const value = Number(confidence || 0);

    if (value >= 70) return 'high';
    if (value >= 40) return 'medium';

    return 'low';
}

function confidenceColor(confidence) {
    const value = Number(confidence || 0);

    if (value >= 70) return '#22c55e';
    if (value >= 40) return '#f59e0b';

    return '#ef4444';
}

function labelForKey(key) {
    const labels = {
        prenom: 'Prénom',
        nom: 'Nom',
        nom_famille: 'Nom',
        nom_naissance: 'Nom de naissance',
        nom_affichage: 'Nom d\'affichage',
        email: 'Email',
        telephone: 'Téléphone',
        mobile: 'Mobile',
        adresse: 'Adresse',
        code_postal: 'Code postal',
        cp: 'Code postal',
        ville: 'Ville',
        ville_naissance: 'Ville de naissance',
        date_naissance: 'Date de naissance',
        genre: 'Genre',
        username: 'Nom d\'utilisateur',
        nom_utilisateur: 'Nom d\'utilisateur',
        ip: 'IP',
        adresse_ip: 'Adresse IP',
        steam: 'Steam',
        steam_id: 'Steam ID',
        discord: 'Discord',
        discord_id: 'Discord ID',
        fivem_license: 'Licence FiveM',
        fivem_license2: 'Licence FiveM 2',
        xbox: 'Xbox',
        xbox_live_id: 'Xbox Live',
        live: 'Live',
        live_id: 'Live ID',
        nir: 'NIR',
        iban: 'IBAN',
        bic: 'BIC',
        vin: 'VIN',
        plaque: 'Plaque',
        vin_plaque: 'VIN / Plaque',
        profession: 'Profession',
        fonction: 'Fonction',
        role: 'Rôle',
        societe: 'Société',
        siret: 'SIRET',
        siren: 'SIREN'
    };

    if (labels[key]) {
        return labels[key];
    }

    return String(key)
        .replace(/_/g, ' ')
        .replace(/\b\w/g, function (letter) {
            return letter.toUpperCase();
        });
}

function formatValue(key, value) {
    if (key === 'telephone' || key === 'mobile') {
        return formatPhone(value);
    }

    if (typeof value === 'object') {
        try {
            return JSON.stringify(value);
        } catch (error) {
            return String(value);
        }
    }

    return String(value);
}

function uniqueResults(results) {
    const output = [];
    const seen = new Set();

    (results || []).forEach(function (person) {
        if (!person || typeof person !== 'object') return;

        const key = [
            person.prenom || '',
            person.nom_famille || person.nom || '',
            person.email || '',
            normalizePhone(person.telephone || person.mobile || ''),
            normalizeAdresse(person.adresse || '')
        ].join('|');

        if (seen.has(key)) return;

        seen.add(key);
        output.push(person);
    });

    return output;
}

async function verifyToken() {
    if (!token) {
        window.location.href = '/login';
        return false;
    }

    try {
        const response = await fetch(API_URL + '/api/verify', {
            method: 'GET',
            headers: authHeaders(false)
        });

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
    } catch (error) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return false;
    }
}

function buildSearchPayload() {
    return {
        nom: getValue('searchNom'),
        prenom: getValue('searchPrenom'),
        nom_famille: getValue('searchNom'),
        nom_naissance: getValue('searchNomNaissance'),
        nom_affichage: getValue('searchNomAffichage'),
        email: getValue('searchEmail'),
        telephone: getValue(['searchTelephone', 'searchPhone']),
        username: getValue('searchUsername'),
        ip: getValue('searchIp'),
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
        vin: getValue('searchVin'),
        date_naissance: getValue('searchDateNaissance'),
        jour: getValue('searchJour'),
        mois: getValue('searchMois'),
        annee: getValue('searchAnnee'),
        genre: getValue('searchGenre')
    };
}

function buildProSearchPayload() {
    return {
        nom: getValue('searchNomPro'),
        prenom: getValue('searchPrenomPro'),
        email: getValue('searchEmailPro'),
        telephone: getValue(['searchTelephonePro', 'searchPhonePro']),
        adresse: getValue('searchAdressePro'),
        code_postal: getValue('searchCpPro'),
        ville: getValue('searchVillePro'),
        societe: getValue('searchSocietePro'),
        siret: getValue('searchSiretPro'),
        siren: getValue('searchSirenPro'),
        profession: getValue('searchProfessionPro'),
        fonction: getValue('searchFonctionPro')
    };
}

function hasSearchValue(payload) {
    return Object.keys(payload).some(function (key) {
        return payload[key] !== null &&
            payload[key] !== undefined &&
            String(payload[key]).trim() !== '';
    });
}

function extractResults(data) {
    if (Array.isArray(data)) return data;

    if (Array.isArray(data.results)) {
        return data.results;
    }

    if (Array.isArray(data.data)) {
        return data.data;
    }

    if (Array.isArray(data.persons)) {
        return data.persons;
    }

    if (Array.isArray(data.personnes)) {
        return data.personnes;
    }

    if (data.data && Array.isArray(data.data.results)) {
        return data.data.results;
    }

    return [];
}

async function performSearch(customPayload) {
    if (state.searchInProgress) return [];

    const payload =
        customPayload ||
        (document.querySelector('.search-tab.active') &&
        document.querySelector('.search-tab.active').dataset.tab === 'pro'
            ? buildProSearchPayload()
            : buildSearchPayload());

    if (!hasSearchValue(payload)) {
        showToast('Saisissez au moins un critère de recherche', 'warning');
        return [];
    }

    state.searchInProgress = true;
    state.lastSearch = payload;

    showSearchLoading();

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

        results.forEach(function (person) {
            if (person._confidence === undefined) {
                person._confidence =
                    person.confidence !== undefined
                        ? Number(person.confidence)
                        : 0;
            }
        });

        state.results = results;
        window._resultsData = results;

        displayResults(results);

        return results;
    } catch (error) {
        console.error(error);
        state.results = [];
        window._resultsData = [];
        displayResults([]);
        showToast(error.message || 'Erreur pendant la recherche', 'error');

        return [];
    } finally {
        state.searchInProgress = false;
        hideSearchLoading();
    }
}

function createResultCard(person, index) {
    const card = document.createElement('article');
    card.className = 'result-card';

    const header = document.createElement('div');
    header.className = 'result-card-header';

    const nameButton = document.createElement('button');
    nameButton.type = 'button';
    nameButton.className = 'result-name';
    nameButton.dataset.index = String(index);
    nameButton.textContent = getPersonName(person);

    const confidence = Number(person._confidence || 0);

    const badge = document.createElement('span');
    badge.className = 'confidence-badge ' + confidenceClass(confidence);
    badge.textContent = confidence + '%';

    header.appendChild(nameButton);
    header.appendChild(badge);

    const body = document.createElement('div');
    body.className = 'result-card-body';

    const keys = [
        'nom_naissance',
        'date_naissance',
        'email',
        'telephone',
        'adresse',
        'code_postal',
        'ville',
        'ville_naissance',
        'username',
        'ip',
        'steam',
        'discord',
        'fivem_license',
        'xbox',
        'iban',
        'bic',
        'vin'
    ];

    const used = new Set();

    keys.forEach(function (key) {
        if (used.has(key)) return;

        const value = person[key];

        if (value === null || value === undefined || value === '') {
            return;
        }

        used.add(key);

        const row = document.createElement('div');
        row.className = 'result-field';

        const label = document.createElement('span');
        label.className = 'result-field-label';
        label.textContent = labelForKey(key);

        const valueElement = document.createElement('span');
        valueElement.className = 'result-field-value';
        valueElement.textContent = formatValue(key, value);

        row.appendChild(label);
        row.appendChild(valueElement);
        body.appendChild(row);
    });

    Object.keys(person).forEach(function (key) {
        if (key.startsWith('_')) return;
        if (used.has(key)) return;
        if (key === 'famille') return;
        if (key === 'confidence') return;

        const value = person[key];

        if (value === null || value === undefined || value === '') {
            return;
        }

        if (typeof value === 'object') return;

        const row = document.createElement('div');
        row.className = 'result-field';

        const label = document.createElement('span');
        label.className = 'result-field-label';
        label.textContent = labelForKey(key);

        const valueElement = document.createElement('span');
        valueElement.className = 'result-field-value';
        valueElement.textContent = formatValue(key, value);

        row.appendChild(label);
        row.appendChild(valueElement);
        body.appendChild(row);
    });

    const actions = document.createElement('div');
    actions.className = 'result-actions';

    const buttons = [
        ['Approfondir', 'deep'],
        ['+ Fiche', 'fiche'],
        ['Copier', 'copy'],
        ['Graphe', 'graph'],
        ['Investiguer', 'investigate']
    ];

    buttons.forEach(function (item) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'result-action';
        button.dataset.action = item[1];
        button.dataset.index = String(index);
        button.textContent = item[0];
        actions.appendChild(button);
    });

    card.appendChild(header);
    card.appendChild(body);
    card.appendChild(actions);

    return card;
}

function displayResults(results) {
    const container =
        $('searchResults') ||
        $('resultsContainer') ||
        document.querySelector('.search-results');

    const counter =
        $('resultCount') ||
        $('resultsCount') ||
        $('searchResultCount');

    if (counter) {
        counter.textContent = String(results.length);
    }

    if (!container) return;

    container.innerHTML = '';

    if (!results.length) {
        const empty = document.createElement('div');
        empty.className = 'empty-state';
        empty.textContent = 'Aucun résultat';
        container.appendChild(empty);
        return;
    }

    results.forEach(function (person, index) {
        container.appendChild(createResultCard(person, index));
    });
}

function initResultActions() {
    document.addEventListener('click', function (event) {
        const target = event.target.closest(
            '.result-action, .result-name'
        );

        if (!target) return;

        const index = Number(target.dataset.index);

        if (!Number.isInteger(index)) return;

        if (target.classList.contains('result-name')) {
            openInvestigation(index);
            return;
        }

        const action = target.dataset.action;

        if (action === 'deep') {
            toggleDeep(index);
        }

        if (action === 'fiche') {
            addToFiche(index);
        }

        if (action === 'copy') {
            copyFullCard(index);
        }

        if (action === 'graph') {
            addToGraphe(index);
        }

        if (action === 'investigate') {
            openInvestigation(index);
        }
    });
}

async function searchPivot(payload) {
    if (!payload) return [];

    try {
        const response = await fetch(API_URL + '/api/brix/search', {
            method: 'POST',
            headers: authHeaders(true),
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            return [];
        }

        const data = await readJson(response);

        return extractResults(data);
    } catch (error) {
        return [];
    }
}

function samePerson(a, b) {
    if (!a || !b) return false;

    if (a.id !== undefined && b.id !== undefined) {
        return String(a.id) === String(b.id);
    }

    const aEmail = String(a.email || '').toLowerCase();
    const bEmail = String(b.email || '').toLowerCase();

    if (aEmail && bEmail && aEmail === bEmail) {
        return true;
    }

    const aPhone = normalizePhone(a.telephone || a.mobile || '');
    const bPhone = normalizePhone(b.telephone || b.mobile || '');

    if (aPhone && bPhone && aPhone === bPhone) {
        return true;
    }

    return (
        getPersonName(a).toLowerCase() ===
        getPersonName(b).toLowerCase()
    );
}

function familyIdentity(person) {
    if (person.id !== undefined && person.id !== null) {
        return 'id:' + person.id;
    }

    const phone = normalizePhone(person.telephone || person.mobile || '');

    if (phone) {
        return 'phone:' + phone;
    }

    const email = String(person.email || '').toLowerCase();

    if (email) {
        return 'email:' + email;
    }

    return [
        getPersonName(person).toLowerCase(),
        normalizeAdresse(person.adresse || '')
    ].join('|');
}

async function findFamily(person) {
    if (!person) return [];

    const cacheKey = familyIdentity(person);

    if (state.familyCache[cacheKey]) {
        return state.familyCache[cacheKey];
    }

    if (state.familyLoading[cacheKey]) {
        return [];
    }

    state.familyLoading[cacheKey] = true;

    try {
        const address = person.adresse || '';
        const phone = person.telephone || person.mobile || '';

        const searches = [];

        if (address) {
            searches.push(
                searchPivot({
                    adresse: address,
                    flexible: true,
                    per_page: 50
                })
            );
        }

        if (phone) {
            searches.push(
                searchPivot({
                    telephone: phone,
                    flexible: true,
                    per_page: 50
                })
            );
        }

        if (!searches.length) {
            state.familyCache[cacheKey] = [];
            return [];
        }

        const groups = await Promise.all(searches);
        const members = [];
        const byIdentity = new Map();

        groups.forEach(function (group) {
            group.forEach(function (member) {
                if (!member || samePerson(member, person)) {
                    return;
                }

                const identity = familyIdentity(member);

                if (!byIdentity.has(identity)) {
                    byIdentity.set(identity, {
                        person: member,
                        address: false,
                        phone: false
                    });
                }

                const item = byIdentity.get(identity);

                const memberAddress =
                    normalizeAdresse(member.adresse || '');

                const personAddress =
                    normalizeAdresse(person.adresse || '');

                const memberPhone =
                    normalizePhone(
                        member.telephone || member.mobile || ''
                    );

                const personPhone =
                    normalizePhone(
                        person.telephone || person.mobile || ''
                    );

                if (
                    personAddress &&
                    memberAddress &&
                    personAddress === memberAddress
                ) {
                    item.address = true;
                }

                if (
                    personPhone &&
                    memberPhone &&
                    personPhone === memberPhone
                ) {
                    item.phone = true;
                }
            });
        });

        byIdentity.forEach(function (item) {
            let link = 'Mêmes informations';

            if (item.address && item.phone) {
                link = 'Adresse et téléphone';
            } else if (item.address) {
                link = 'Même adresse';
            } else if (item.phone) {
                link = 'Même téléphone';
            }

            members.push({
                ...item.person,
                _familyLink: link,
                _familyStrength:
                    item.address && item.phone
                        ? 3
                        : item.address || item.phone
                        ? 2
                        : 1
            });
        });

        members.sort(function (a, b) {
            return (
                Number(b._familyStrength || 0) -
                Number(a._familyStrength || 0)
            );
        });

        state.familyCache[cacheKey] = members;

        return members;
    } finally {
        delete state.familyLoading[cacheKey];
    }
}

async function toggleDeep(index) {
    const person = state.results[index];

    if (!person) {
        showToast('Personne introuvable', 'error');
        return;
    }

    const card = document.querySelector(
        '.result-card:nth-child(' + (index + 1) + ')'
    );

    let panel = card
        ? card.querySelector('.family-panel')
        : null;

    if (panel) {
        panel.remove();
        return;
    }

    if (!card) return;

    panel = document.createElement('div');
    panel.className = 'family-panel';
    panel.innerHTML =
        '<div style="padding:12px;color:#888;">Recherche des personnes associées...</div>';

    card.appendChild(panel);

    try {
        const family = await findFamily(person);

        renderFamilyInPanel(panel, family);
    } catch (error) {
        panel.innerHTML =
            '<div style="padding:12px;color:#ef4444;">Erreur pendant la recherche associée.</div>';
    }
}

function renderFamilyInPanel(panel, members) {
    panel.innerHTML = '';

    const title = document.createElement('div');
    title.className = 'family-title';
    title.textContent =
        'Famille associée - ' + members.length;

    panel.appendChild(title);

    if (!members.length) {
        const empty = document.createElement('div');
        empty.className = 'family-empty';
        empty.textContent =
            'Aucune personne associée trouvée.';
        panel.appendChild(empty);
        return;
    }

    const groups = {
        'Adresse et téléphone': [],
        'Même adresse': [],
        'Même téléphone': [],
        'Mêmes informations': []
    };

    members.forEach(function (member) {
        const group =
            groups[member._familyLink] ||
            groups['Mêmes informations'];

        group.push(member);
    });

    Object.keys(groups).forEach(function (groupName) {
        const list = groups[groupName];

        if (!list.length) return;

        const section = document.createElement('div');
        section.className =
            'family-section family-section-' +
            groupName
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-');

        const heading = document.createElement('div');
        heading.className = 'family-section-title';
        heading.textContent =
            groupName + ' - ' + list.length;

        section.appendChild(heading);

        list.forEach(function (member) {
            const row = document.createElement('div');
            row.className = 'family-member';

            const name = document.createElement('div');
            name.className = 'family-member-name';
            name.textContent = getPersonName(member);

            const fields = document.createElement('div');
            fields.className = 'family-member-fields';

            const values = [
                member.date_naissance,
                member.email,
                member.telephone || member.mobile
            ];

            values.forEach(function (value, index) {
                if (!value) return;

                const item = document.createElement('span');

                if (index === 2) {
                    item.textContent = formatPhone(value);
                } else {
                    item.textContent = String(value);
                }

                fields.appendChild(item);
            });

            const badge = document.createElement('span');
            badge.className = 'family-link-badge';
            badge.textContent = groupName;

            row.appendChild(name);
            row.appendChild(fields);
            row.appendChild(badge);

            section.appendChild(row);
        });

        panel.appendChild(section);
    });
}

async function loadHistory() {
    const container = $('historyList');

    if (!container) return;

    container.innerHTML =
        '<div class="empty-state">Chargement...</div>';

    try {
        const response = await fetch(API_URL + '/api/history', {
            headers: authHeaders(false)
        });

        const data = await readJson(response);
        const history = data.history || data.results || [];

        state.history = history;

        if (!history.length) {
            container.innerHTML =
                '<div class="empty-state">Aucune recherche dans l\'historique.</div>';
            return;
        }

        container.innerHTML = '';

        history.forEach(function (item, index) {
            const row = document.createElement('div');
            row.className = 'history-item';

            const info = document.createElement('div');

            const title = document.createElement('div');
            title.className = 'history-name';
            title.textContent =
                item.name ||
                item.query_name ||
                'Recherche';

            const date = document.createElement('div');
            date.className = 'history-date';

            date.textContent = item.created_at
                ? new Date(item.created_at).toLocaleString('fr-FR')
                : '';

            const count = document.createElement('div');
            count.className = 'history-count';
            count.textContent =
                String(
                    item.result_count ||
                    item.results_count ||
                    item.count ||
                    0
                ) + ' résultat(s)';

            info.appendChild(title);
            info.appendChild(date);
            info.appendChild(count);

            const replay = document.createElement('button');
            replay.type = 'button';
            replay.className = 'btn-primary';
            replay.textContent = 'Relancer';

            replay.addEventListener('click', function () {
                replaySearch(index);
            });

            row.appendChild(info);
            row.appendChild(replay);

            container.appendChild(row);
        });
    } catch (error) {
        container.innerHTML =
            '<div class="empty-state" style="color:#ef4444;">Erreur de chargement.</div>';
    }
}

async function replaySearch(index) {
    const item = state.history[index];

    if (!item) return;

    let payload =
        item.query ||
        item.filters ||
        item.params ||
        item.search ||
        null;

    if (typeof payload === 'string') {
        try {
            payload = JSON.parse(payload);
        } catch (error) {
            payload = null;
        }
    }

    if (!payload) {
        showToast(
            'Les critères de cette recherche ne sont plus disponibles.',
            'warning'
        );
        return;
    }

    const results = await performSearch(payload);

    if (results.length) {
        switchPage('search');
    }
}

let fichesData = state.fiches;

async function loadFiches() {
    const container = $('fichesList');

    if (!container) return;

    container.innerHTML =
        '<div class="empty-state">Chargement...</div>';

    try {
        const response = await fetch(API_URL + '/api/fiches', {
            headers: authHeaders(false)
        });

        const data = await readJson(response);

        fichesData =
            data.fiches ||
            data.results ||
            data.data ||
            [];

        state.fiches = fichesData;

        if (!fichesData.length) {
            container.innerHTML =
                '<div class="empty-state">Aucune fiche.</div>';
            return;
        }

        container.innerHTML = '';

        fichesData.forEach(function (fiche, index) {
            const row = document.createElement('div');
            row.className = 'fiche-item';

            const info = document.createElement('div');

            const name = document.createElement('div');
            name.className = 'fiche-name';
            name.textContent = fiche.name || 'Sans nom';

            const count = document.createElement('div');
            count.className = 'fiche-count';
            count.textContent =
                String((fiche.persons || []).length) +
                ' / 10 personnes';

            info.appendChild(name);
            info.appendChild(count);

            const actions = document.createElement('div');
            actions.className = 'fiche-actions';

            [
                ['Voir', viewFiche],
                ['Modifier', editFiche],
                ['Exporter', exportFiche],
                ['Supprimer', deleteFiche]
            ].forEach(function (action) {
                const button = document.createElement('button');
                button.type = 'button';
                button.textContent = action[0];

                button.addEventListener('click', function () {
                    action[1](index);
                });

                actions.appendChild(button);
            });

            row.appendChild(info);
            row.appendChild(actions);
            container.appendChild(row);
        });
    } catch (error) {
        container.innerHTML =
            '<div class="empty-state" style="color:#ef4444;">Erreur de chargement.</div>';
    }
}

function viewFiche(index) {
    const fiche = fichesData[index];

    if (!fiche) return;

    const persons = fiche.persons || [];

    let html =
        '<div style="margin-bottom:12px;color:#888;">' +
        persons.length +
        ' / 10 personnes</div>';

    if (!persons.length) {
        html +=
            '<div style="padding:15px;color:#777;">Aucune personne dans cette fiche.</div>';
    } else {
        html +=
            '<div style="max-height:350px;overflow:auto;">';

        persons.forEach(function (person) {
            html +=
                '<div style="padding:10px 0;border-bottom:1px solid #222;">' +
                '<strong style="color:#fff;">' +
                escapeHtml(getPersonName(person)) +
                '</strong>';

            if (person.date_naissance) {
                html +=
                    '<div style="color:#888;font-size:13px;">' +
                    escapeHtml(person.date_naissance) +
                    '</div>';
            }

            if (person.email) {
                html +=
                    '<div style="color:#888;font-size:13px;">' +
                    escapeHtml(person.email) +
                    '</div>';
            }

            if (person.telephone) {
                html +=
                    '<div style="color:#888;font-size:13px;">' +
                    escapeHtml(formatPhone(person.telephone)) +
                    '</div>';
            }

            html += '</div>';
        });

        html += '</div>';
    }

    showModal(
        'Fiche - ' + (fiche.name || 'Sans nom'),
        html,
        'Fermer',
        closeModal
    );
}

function editFiche(index) {
    const fiche = fichesData[index];

    if (!fiche) return;

    showModal(
        'Modifier la fiche',
        '<div class="form-group">' +
        '<label>Nom de la fiche</label>' +
        '<input id="editFicheName" type="text" value="' +
        escapeHtml(fiche.name || '') +
        '" style="width:100%;padding:10px;background:#1e1e1e;border:1px solid #2a2a2a;border-radius:8px;color:#fff;">' +
        '</div>',
        'Sauvegarder',
        async function () {
            const input = $('editFicheName');
            const name = input ? input.value.trim() : '';

            if (!name) {
                showToast('Veuillez donner un nom.', 'warning');
                return;
            }

            try {
                const response = await fetch(
                    API_URL + '/api/fiches/' + fiche.id,
                    {
                        method: 'PUT',
                        headers: authHeaders(true),
                        body: JSON.stringify({
                            name: name
                        })
                    }
                );

                if (!response.ok) {
                    throw new Error();
                }

                showToast('Fiche modifiée.', 'success');
                await loadFiches();
            } catch (error) {
                showToast('Impossible de modifier la fiche.', 'error');
            }
        }
    );
}

function deleteFiche(index) {
    const fiche = fichesData[index];

    if (!fiche) return;

    showModal(
        'Supprimer la fiche',
        '<p style="color:#aaa;">Voulez-vous supprimer la fiche <strong style="color:#fff;">' +
        escapeHtml(fiche.name || 'Sans nom') +
        '</strong> ?</p>',
        'Supprimer',
        async function () {
            try {
                const response = await fetch(
                    API_URL + '/api/fiches/' + fiche.id,
                    {
                        method: 'DELETE',
                        headers: authHeaders(false)
                    }
                );

                if (!response.ok) {
                    throw new Error();
                }

                showToast('Fiche supprimée.', 'success');
                await loadFiches();
            } catch (error) {
                showToast('Impossible de supprimer la fiche.', 'error');
            }
        }
    );
}

function exportFiche(index) {
    const fiche = fichesData[index];

    if (!fiche) return;

    let text =
        'MARAUDER - FICHE\n' +
        '====================\n\n';

    text += 'Nom : ' + (fiche.name || 'Sans nom') + '\n';
    text += 'Personnes : ' +
        ((fiche.persons || []).length) +
        ' / 10\n\n';

    (fiche.persons || []).forEach(function (person, personIndex) {
        text +=
            'PERSONNE ' +
            (personIndex + 1) +
            '\n';

        Object.keys(person).forEach(function (key) {
            if (key.startsWith('_')) return;
            if (key === 'famille') return;

            const value = person[key];

            if (
                value === null ||
                value === undefined ||
                value === ''
            ) {
                return;
            }

            text +=
                labelForKey(key) +
                ' : ' +
                formatValue(key, value) +
                '\n';
        });

        text += '\n';
    });

    downloadText(
        'marauder-fiche-' +
        String(fiche.name || 'fiche')
            .replace(/[^a-z0-9-_]/gi, '-')
            .toLowerCase() +
        '.txt',
        text
    );

    showToast('Fiche exportée.', 'success');
}

function downloadText(filename, text) {
    const blob = new Blob(
        [text],
        {
            type: 'text/plain;charset=utf-8'
        }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(function () {
        URL.revokeObjectURL(url);
    }, 500);
}

function addToFiche(index) {
    const person = state.results[index];

    if (!person) {
        showToast('Personne introuvable.', 'error');
        return;
    }

    if (!fichesData.length) {
        showModal(
            'Créer une fiche',
            '<p style="color:#aaa;">Aucune fiche existante. Créez une nouvelle fiche pour ajouter cette personne.</p>' +
            '<div class="form-group">' +
            '<label>Nom de la fiche</label>' +
            '<input id="newFicheName" type="text" style="width:100%;padding:10px;background:#1e1e1e;border:1px solid #2a2a2a;border-radius:8px;color:#fff;">' +
            '</div>',
            'Créer',
            async function () {
                const name = $('newFicheName')?.value.trim();

                if (!name) {
                    showToast('Veuillez donner un nom.', 'warning');
                    return;
                }

                await createFicheAndAdd(name, person);
            }
        );

        return;
    }

    let options = fichesData
        .map(function (fiche) {
            const count = (fiche.persons || []).length;

            return (
                '<option value="' +
                String(fiche.id) +
                '"' +
                (count >= 10 ? ' disabled' : '') +
                '>' +
                escapeHtml(fiche.name || 'Sans nom') +
                ' (' +
                count +
                '/10)' +
                '</option>'
            );
        })
        .join('');

    options +=
        '<option value="new">Créer une nouvelle fiche</option>';

    showModal(
        'Ajouter à une fiche',
        '<div class="form-group">' +
        '<label>Fiche</label>' +
        '<select id="ficheSelect" style="width:100%;padding:10px;background:#1e1e1e;border:1px solid #2a2a2a;border-radius:8px;color:#fff;">' +
        options +
        '</select>' +
        '</div>' +
        '<div id="newFicheContainer" style="display:none;">' +
        '<div class="form-group">' +
        '<label>Nom de la nouvelle fiche</label>' +
        '<input id="newFicheName" type="text" style="width:100%;padding:10px;background:#1e1e1e;border:1px solid #2a2a2a;border-radius:8px;color:#fff;">' +
        '</div>' +
        '</div>',
        'Ajouter',
        async function () {
            const select = $('ficheSelect');

            if (!select) return;

            if (select.value === 'new') {
                const name = $('newFicheName')?.value.trim();

                if (!name) {
                    showToast('Veuillez donner un nom.', 'warning');
                    return;
                }

                await createFicheAndAdd(name, person);
                return;
            }

            await addPersonToFiche(
                select.value,
                person
            );

            await loadFiches();
        }
    );

    setTimeout(function () {
        const select = $('ficheSelect');
        const container = $('newFicheContainer');

        if (select && container) {
            select.addEventListener('change', function () {
                container.style.display =
                    this.value === 'new'
                        ? 'block'
                        : 'none';
            });
        }
    }, 0);
}

async function createFicheAndAdd(name, person) {
    try {
        if (fichesData.length >= 10) {
            showToast('Limite de 10 fiches atteinte.', 'warning');
            return;
        }

        const response = await fetch(
            API_URL + '/api/fiches',
            {
                method: 'POST',
                headers: authHeaders(true),
                body: JSON.stringify({
                    name: name
                })
            }
        );

        const data = await readJson(response);

        if (!response.ok) {
            throw new Error(
                data.error || 'Erreur de création'
            );
        }

        const fiche = data.fiche || data;

        if (fiche.id) {
            await addPersonToFiche(
                fiche.id,
                person
            );
        }

        await loadFiches();

        showToast('Personne ajoutée à la nouvelle fiche.', 'success');
    } catch (error) {
        showToast(
            error.message || 'Impossible de créer la fiche.',
            'error'
        );
    }
}

async function addPersonToFiche(ficheId, person) {
    try {
        const response = await fetch(
            API_URL + '/api/fiches/' + ficheId + '/persons',
            {
                method: 'POST',
                headers: authHeaders(true),
                body: JSON.stringify({
                    person: person
                })
            }
        );

        const data = await readJson(response);

        if (!response.ok) {
            throw new Error(
                data.error || 'Erreur d\'ajout'
            );
        }

        showToast('Personne ajoutée à la fiche.', 'success');
    } catch (error) {
        showToast(
            error.message || 'Impossible d\'ajouter la personne.',
            'error'
        );
    }
}

function copyFullCard(index) {
    const person = state.results[index];

    if (!person) return;

    let text =
        'MARAUDER - INVESTIGATION\n' +
        '========================\n\n';

    Object.keys(person).forEach(function (key) {
        if (key.startsWith('_')) return;
        if (key === 'famille') return;

        const value = person[key];

        if (
            value === null ||
            value === undefined ||
            value === ''
        ) {
            return;
        }

        text +=
            labelForKey(key) +
            ' : ' +
            formatValue(key, value) +
            '\n';
    });

    navigator.clipboard
        .writeText(text)
        .then(function () {
            showToast('Informations copiées.', 'success');
        })
        .catch(function () {
            downloadText(
                'marauder-investigation.txt',
                text
            );

            showToast(
                'Copie impossible, fichier créé.',
                'info'
            );
        });
}

function addToGraphe(index) {
    const person = state.results[index];

    if (!person) {
        showToast('Personne introuvable.', 'error');
        return;
    }

    grapheAddPersonFromResult(person);
}

function grapheAddPersonFromResult(person) {
    const name = getPersonName(person);

    if (
        state.graphNodes.some(function (node) {
            return (
                node.sourceIdentity &&
                node.sourceIdentity === familyIdentity(person)
            );
        })
    ) {
        showToast('Cette personne est déjà dans le graphe.', 'info');
        switchPage('graphe');
        return;
    }

    const container = $('grapheContainer');

    const width = container
        ? Math.max(container.clientWidth, 600)
        : 900;

    const height = container
        ? Math.max(container.clientHeight, 500)
        : 600;

    const node = {
        id: 'node-' + Date.now() + '-' + Math.random().toString(36).slice(2),
        label: name,
        prenom: person.prenom || '',
        nom_famille: person.nom_famille || person.nom || '',
        role: person.role || 'Personne',
        sourceIdentity: familyIdentity(person),
        person: person,
        x: width / 2 + (Math.random() - 0.5) * 200,
        y: height / 2 + (Math.random() - 0.5) * 150
    };

    state.graphNodes.push(node);
    window.grapheNodes = state.graphNodes;

    switchPage('graphe');

    setTimeout(function () {
        renderGraphe();
    }, 100);

    showToast('Personne ajoutée au graphe.', 'success');
}

async function getCoordinates(query) {
    if (!query) return null;

    try {
        const url =
            'https://nominatim.openstreetmap.org/search?' +
            new URLSearchParams({
                q: query + ', France',
                format: 'json',
                limit: '1',
                countrycodes: 'fr'
            });

        const response = await fetch(url);

        if (!response.ok) return null;

        const data = await response.json();

        if (!Array.isArray(data) || !data.length) {
            return null;
        }

        return {
            lat: Number(data[0].lat),
            lng: Number(data[0].lon),
            display: data[0].display_name
        };
    } catch (error) {
        return null;
    }
}

function getMapPosition(lat, lng) {
    const minLat = 41;
    const maxLat = 51.5;
    const minLng = -5.5;
    const maxLng = 9.5;

    const left =
        ((lng - minLng) /
            (maxLng - minLng)) *
        100;

    const top =
        (1 -
            (lat - minLat) /
                (maxLat - minLat)) *
        100;

    return {
        left: Math.max(2, Math.min(98, left)),
        top: Math.max(2, Math.min(98, top))
    };
}

function ensureInvestigationOverlay() {
    let overlay = $('investigationOverlay');

    if (overlay) return overlay;

    overlay = document.createElement('div');
    overlay.id = 'investigationOverlay';

    overlay.innerHTML =
        '<div style="width:100%;height:100%;background:#080808;color:#fff;display:flex;flex-direction:column;">' +
        '<div style="height:60px;border-bottom:1px solid #222;display:flex;align-items:center;justify-content:space-between;padding:0 20px;">' +
        '<div id="investigationName" style="font-size:18px;font-weight:600;">Investigation</div>' +
        '<button id="investigationClose" style="border:0;background:#151515;color:#aaa;padding:9px 14px;border-radius:7px;cursor:pointer;">Fermer</button>' +
        '</div>' +
        '<div style="flex:1;display:grid;grid-template-columns:1fr 1fr;min-height:0;">' +
        '<div id="investigationMap" style="position:relative;background:#101010;overflow:hidden;">' +
        '<div style="position:absolute;inset:8%;border:1px solid #252525;border-radius:16px;background:linear-gradient(135deg,#111,#0c0c0c);">' +
        '<div style="position:absolute;left:20%;right:20%;top:20%;bottom:20%;border:1px solid #1c1c1c;border-radius:45%;transform:rotate(-12deg);"></div>' +
        '<div id="mapPin" style="position:absolute;width:18px;height:18px;border-radius:50%;background:#ef4444;box-shadow:0 0 0 7px rgba(239,68,68,.15),0 0 20px rgba(239,68,68,.6);display:none;transform:translate(-50%,-50%);"></div>' +
        '</div>' +
        '<div id="investigationCityLabel" style="position:absolute;left:25px;bottom:25px;background:#111;border:1px solid #292929;padding:9px 12px;border-radius:8px;color:#aaa;">Localisation</div>' +
        '</div>' +
        '<div style="overflow:auto;padding:25px;">' +
        '<div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">' +
        '<span style="color:#888;">Confiance</span>' +
        '<span id="investigationConfidence" style="padding:5px 10px;border-radius:6px;background:#151515;">0%</span>' +
        '</div>' +
        '<div id="investigationInfoGrid" style="display:grid;grid-template-columns:1fr 1fr;gap:10px;"></div>' +
        '</div>' +
        '</div>' +
        '<div style="border-top:1px solid #222;padding:12px 20px;display:flex;gap:8px;">' +
        '<button id="investigationAddFiche" class="btn-primary">Ajouter à une fiche</button>' +
        '<button id="investigationCopy" class="btn-secondary">Copier</button>' +
        '<button id="investigationGraphe" class="btn-secondary">Graphe</button>' +
        '</div>' +
        '</div>';

    overlay.style.cssText =
        'position:fixed;inset:0;z-index:100000;display:none;';

    document.body.appendChild(overlay);

    $('investigationClose').addEventListener(
        'click',
        closeInvestigation
    );

    $('investigationCopy').addEventListener(
        'click',
        function () {
            if (!state.investigationData) return;

            copyPerson(
                state.investigationData
            );
        }
    );

    $('investigationGraphe').addEventListener(
        'click',
        function () {
            if (!state.investigationData) return;

            grapheAddPersonFromResult(
                state.investigationData
            );

            closeInvestigation();
        }
    );

    $('investigationAddFiche').addEventListener(
        'click',
        function () {
            if (!state.investigationData) return;

            const index =
                state.results.indexOf(
                    state.investigationData
                );

            if (index >= 0) {
                addToFiche(index);
            }
        }
    );

    return overlay;
}

function closeInvestigation() {
    const overlay = $('investigationOverlay');

    if (!overlay) return;

    overlay.style.display = 'none';
    document.body.style.overflow = '';
}

async function openInvestigation(index) {
    const person = state.results[index];

    if (!person) {
        showToast('Personne introuvable.', 'error');
        return;
    }

    state.investigationData = person;

    const overlay =
        ensureInvestigationOverlay();

    overlay.style.display = 'block';
    document.body.style.overflow = 'hidden';

    setText(
        'investigationName',
        'Investigation - ' + getPersonName(person)
    );

    const confidence =
        Number(person._confidence || 0);

    const confidenceElement =
        $('investigationConfidence');

    if (confidenceElement) {
        confidenceElement.textContent =
            confidence + '%';

        confidenceElement.style.color =
            confidenceColor(confidence);
    }

    const city =
        person.ville ||
        person.ville_naissance ||
        '';

    setText(
        'investigationCityLabel',
        city || 'Localisation inconnue'
    );

    const grid =
        $('investigationInfoGrid');

    if (grid) {
        grid.innerHTML = '';

        Object.keys(person).forEach(function (key) {
            if (key.startsWith('_')) return;
            if (key === 'famille') return;

            const value = person[key];

            if (
                value === null ||
                value === undefined ||
                value === ''
            ) {
                return;
            }

            if (typeof value === 'object') {
                return;
            }

            const item =
                document.createElement('div');

            item.style.cssText =
                'padding:12px;background:#101010;border:1px solid #202020;border-radius:8px;';

            const label =
                document.createElement('div');

            label.style.cssText =
                'font-size:11px;color:#666;margin-bottom:5px;';

            label.textContent =
                labelForKey(key);

            const valueElement =
                document.createElement('div');

            valueElement.style.cssText =
                'font-size:13px;color:#ddd;word-break:break-word;';

            valueElement.textContent =
                formatValue(key, value);

            item.appendChild(label);
            item.appendChild(valueElement);
            grid.appendChild(item);
        });
    }

    const query =
        person.adresse ||
        person.ville ||
        person.code_postal ||
        person.ville_naissance ||
        '';

    const coordinates =
        await getCoordinates(query);

    const map =
        $('investigationMap');

    const pin =
        $('mapPin');

    if (map && pin && coordinates) {
        const position =
            getMapPosition(
                coordinates.lat,
                coordinates.lng
            );

        pin.style.display = 'block';
        pin.style.left =
            position.left + '%';
        pin.style.top =
            position.top + '%';

        setText(
            'investigationCityLabel',
            coordinates.display || query
        );
    } else if (pin) {
        pin.style.display = 'none';
    }
}

function copyPerson(person) {
    let text =
        'MARAUDER - INVESTIGATION\n' +
        '========================\n\n';

    Object.keys(person).forEach(function (key) {
        if (key.startsWith('_')) return;
        if (key === 'famille') return;

        const value = person[key];

        if (
            value === null ||
            value === undefined ||
            value === ''
        ) {
            return;
        }

        text +=
            labelForKey(key) +
            ' : ' +
            formatValue(key, value) +
            '\n';
    });

    navigator.clipboard
        .writeText(text)
        .then(function () {
            showToast('Informations copiées.', 'success');
        })
        .catch(function () {
            showToast(
                'Impossible de copier les informations.',
                'error'
            );
        });
}

async function loadTickets() {
    const container = $('ticketsList');

    if (!container) return;

    container.innerHTML =
        '<div class="empty-state">Chargement...</div>';

    try {
        const response = await fetch(
            API_URL + '/api/tickets',
            {
                headers: authHeaders(false)
            }
        );

        const data = await readJson(response);

        state.tickets =
            data.tickets ||
            data.results ||
            [];

        if (!state.tickets.length) {
            container.innerHTML =
                '<div class="empty-state">Aucun ticket.</div>';
            return;
        }

        container.innerHTML = '';

        state.tickets.forEach(function (ticket, index) {
            const row =
                document.createElement('div');

            row.className = 'ticket-item';

            const subject =
                document.createElement('div');

            subject.className = 'ticket-subject';
            subject.textContent =
                ticket.subject || 'Ticket';

            const meta =
                document.createElement('div');

            meta.className = 'ticket-meta';

            const date = ticket.created_at
                ? new Date(
                    ticket.created_at
                ).toLocaleString('fr-FR')
                : '';

            meta.textContent =
                date +
                ' - ' +
                (ticket.status || 'ouvert');

            const preview =
                document.createElement('div');

            preview.className = 'ticket-preview';

            preview.textContent =
                String(
                    ticket.message || ''
                ).substring(0, 140);

            row.appendChild(subject);
            row.appendChild(meta);
            row.appendChild(preview);

            row.addEventListener(
                'click',
                function () {
                    viewTicket(index);
                }
            );

            container.appendChild(row);
        });
    } catch (error) {
        container.innerHTML =
            '<div class="empty-state" style="color:#ef4444;">Erreur de chargement.</div>';
    }
}

async function viewTicket(index) {
    const ticket = state.tickets[index];

    if (!ticket) return;

    try {
        const response = await fetch(
            API_URL +
            '/api/tickets/' +
            ticket.id,
            {
                headers: authHeaders(false)
            }
        );

        const data = await readJson(response);

        const currentTicket =
            data.ticket || ticket;

        const messages =
            data.messages ||
            currentTicket.messages ||
            [];

        let html =
            '<div style="max-height:360px;overflow:auto;">';

        messages.forEach(function (message) {
            html +=
                '<div style="padding:12px;margin-bottom:8px;background:#111;border:1px solid #222;border-radius:8px;">' +
                '<div style="font-size:11px;color:#666;margin-bottom:6px;">' +
                escapeHtml(
                    message.username ||
                    'Utilisateur'
                ) +
                ' - ' +
                escapeHtml(
                    message.created_at
                        ? new Date(
                            message.created_at
                        ).toLocaleString('fr-FR')
                        : ''
                ) +
                '</div>' +
                '<div style="color:#ddd;white-space:pre-wrap;">' +
                escapeHtml(
                    message.message || ''
                ) +
                '</div>' +
                '</div>';
        });

        html += '</div>';

        if (
            currentTicket.status !== 'closed' &&
            currentTicket.status !== 'ferme'
        ) {
            html +=
                '<div style="margin-top:12px;border-top:1px solid #222;padding-top:12px;">' +
                '<textarea id="ticketReplyInput" rows="4" placeholder="Votre réponse..." style="width:100%;box-sizing:border-box;padding:10px;background:#101010;border:1px solid #2a2a2a;border-radius:8px;color:#fff;resize:vertical;"></textarea>' +
                '</div>';
        }

        showModal(
            currentTicket.subject ||
            'Ticket',
            html,
            currentTicket.status === 'closed'
                ? 'Fermer'
                : 'Répondre',
            async function () {
                if (
                    currentTicket.status === 'closed'
                ) {
                    return;
                }

                await replyTicket(
                    currentTicket.id
                );
            }
        );
    } catch (error) {
        showToast(
            'Impossible de charger le ticket.',
            'error'
        );
    }
}

async function replyTicket(ticketId) {
    const input =
        $('ticketReplyInput');

    if (!input) return;

    const message =
        input.value.trim();

    if (!message) {
        showToast(
            'Écrivez une réponse.',
            'warning'
        );
        return;
    }

    try {
        let response =
            await fetch(
                API_URL +
                '/api/tickets/' +
                ticketId +
                '/reply',
                {
                    method: 'POST',
                    headers: authHeaders(true),
                    body: JSON.stringify({
                        message: message
                    })
                }
            );

        if (!response.ok) {
            response =
                await fetch(
                    API_URL +
                    '/api/tickets/' +
                    ticketId +
                    '/messages',
                    {
                        method: 'POST',
                        headers: authHeaders(true),
                        body: JSON.stringify({
                            message: message
                        })
                    }
                );
        }

        if (!response.ok) {
            throw new Error();
        }

        showToast(
            'Réponse envoyée.',
            'success'
        );

        closeModal();
        await loadTickets();
    } catch (error) {
        showToast(
            'Impossible d\'envoyer la réponse.',
            'error'
        );
    }
}

function initTickets() {
    const button =
        $('openTicketBtn');

    if (!button) return;

    button.addEventListener(
        'click',
        function () {
            showModal(
                'Nouveau ticket',
                '<div class="form-group">' +
                '<label>Sujet</label>' +
                '<input id="ticketSubject" type="text" style="width:100%;box-sizing:border-box;padding:10px;background:#101010;border:1px solid #2a2a2a;border-radius:8px;color:#fff;">' +
                '</div>' +
                '<div class="form-group">' +
                '<label>Message</label>' +
                '<textarea id="ticketMessage" rows="6" style="width:100%;box-sizing:border-box;padding:10px;background:#101010;border:1px solid #2a2a2a;border-radius:8px;color:#fff;resize:vertical;"></textarea>' +
                '</div>',
                'Envoyer',
                async function () {
                    const subject =
                        $('ticketSubject')?.value.trim();

                    const message =
                        $('ticketMessage')?.value.trim();

                    if (!subject || !message) {
                        showToast(
                            'Remplissez tous les champs.',
                            'warning'
                        );
                        return;
                    }

                    try {
                        const response =
                            await fetch(
                                API_URL +
                                '/api/tickets',
                                {
                                    method: 'POST',
                                    headers: authHeaders(true),
                                    body: JSON.stringify({
                                        subject: subject,
                                        message: message
                                    })
                                }
                            );

                        if (!response.ok) {
                            throw new Error();
                        }

                        showToast(
                            'Ticket créé.',
                            'success'
                        );

                        await loadTickets();
                    } catch (error) {
                        showToast(
                            'Impossible de créer le ticket.',
                            'error'
                        );
                    }
                }
            );
        }
    );
}

async function loadProfile() {
    const container =
        $('profileInfo');

    if (!container) return;

    container.innerHTML =
        '<div class="empty-state">Chargement...</div>';

    try {
        const response =
            await fetch(
                API_URL + '/api/me',
                {
                    headers: authHeaders(false)
                }
            );

        const data =
            await readJson(response);

        const user =
            data.user || data;

        if (!user) {
            throw new Error();
        }

        container.innerHTML =
            '<div class="profile-card">' +
            '<div class="profile-row">' +
            '<span>Nom d\'utilisateur</span>' +
            '<strong>' +
            escapeHtml(
                user.username || ''
            ) +
            '</strong>' +
            '</div>' +
            '<div class="profile-row">' +
            '<span>Rôle</span>' +
            '<strong>' +
            escapeHtml(
                user.role || ''
            ) +
            '</strong>' +
            '</div>' +
            '<div class="profile-row">' +
            '<span>Date d\'inscription</span>' +
            '<strong>' +
            escapeHtml(
                user.created_at
                    ? new Date(
                        user.created_at
                    ).toLocaleDateString('fr-FR')
                    : ''
            ) +
            '</strong>' +
            '</div>' +
            '<div class="profile-row">' +
            '<span>Dernière connexion</span>' +
            '<strong>' +
            escapeHtml(
                user.last_login
                    ? new Date(
                        user.last_login
                    ).toLocaleString('fr-FR')
                    : 'Aucune'
            ) +
            '</strong>' +
            '</div>' +
            '</div>';
    } catch (error) {
        container.innerHTML =
            '<div class="empty-state" style="color:#ef4444;">Erreur de chargement.</div>';
    }
}

async function loadUsage() {
    try {
        const response =
            await fetch(
                API_URL + '/api/my-api-usage',
                {
                    headers: authHeaders(false)
                }
            );

        if (!response.ok) {
            return;
        }

        const data =
            await readJson(response);

        const today =
            data.today ??
            data.daily ??
            0;

        const month =
            data.month ??
            data.monthly ??
            0;

        const limit =
            data.limit ??
            0;

        const remaining =
            data.remaining ??
            Math.max(
                0,
                Number(limit) -
                Number(month)
            );

        document
            .querySelectorAll(
                '.api-stat-value[data-stat]'
            )
            .forEach(function (element) {
                const stat =
                    element.dataset.stat;

                if (stat === 'today') {
                    element.textContent =
                        String(today);
                }

                if (stat === 'month') {
                    element.textContent =
                        String(month);
                }

                if (stat === 'limit') {
                    element.textContent =
                        String(limit);
                }

                if (stat === 'remaining') {
                    element.textContent =
                        String(remaining);
                }
            });

        const usageCount =
            $('usageCount');

        if (usageCount) {
            usageCount.textContent =
                String(month) +
                ' / ' +
                String(limit);
        }

        const usageBar =
            $('usageBarFill');

        if (usageBar) {
            const percentage =
                Number(limit) > 0
                    ? Math.min(
                        100,
                        Number(month) /
                        Number(limit) *
                        100
                    )
                    : 0;

            usageBar.style.width =
                percentage + '%';
        }
    } catch (error) {
        console.error(
            'Erreur usage:',
            error
        );
    }
}

function createGraphNodeElement(node) {
    const element =
        document.createElement('div');

    element.className = 'graph-node';
    element.dataset.nodeId =
        node.id;

    element.style.cssText =
        'position:absolute;width:150px;min-height:65px;' +
        'padding:10px;box-sizing:border-box;background:#111;' +
        'border:1px solid #333;border-radius:10px;color:#fff;' +
        'cursor:pointer;transform:translate(-50%,-50%);' +
        'user-select:none;';

    const name =
        document.createElement('div');

    name.style.cssText =
        'font-size:13px;font-weight:600;';

    name.textContent =
        node.label || 'Personne';

    const role =
        document.createElement('div');

    role.style.cssText =
        'font-size:11px;color:#777;margin-top:4px;';

    role.textContent =
        node.role || 'Personne';

    element.appendChild(name);
    element.appendChild(role);

    element.style.left =
        (node.x || 100) + 'px';

    element.style.top =
        (node.y || 100) + 'px';

    element.addEventListener(
        'click',
        function (event) {
            event.stopPropagation();

            if (!state.graphLinkMode) {
                return;
            }

            handleGraphLinkClick(node.id);
        }
    );

    return element;
}

function handleGraphLinkClick(nodeId) {
    if (!state.graphLinkMode) return;

    if (!state.graphLinkFrom) {
        state.graphLinkFrom =
            nodeId;

        showToast(
            'Sélectionnez la deuxième personne.',
            'info'
        );

        return;
    }

    if (
        state.graphLinkFrom ===
        nodeId
    ) {
        showToast(
            'Sélectionnez une autre personne.',
            'warning'
        );

        return;
    }

    const exists =
        state.graphEdges.some(function (edge) {
            return (
                edge.from ===
                state.graphLinkFrom &&
                edge.to ===
                nodeId
            ) ||
            (
                edge.from ===
                nodeId &&
                edge.to ===
                state.graphLinkFrom
            );
        });

    if (!exists) {
        state.graphEdges.push({
            id:
                'edge-' +
                Date.now() +
                '-' +
                Math.random()
                    .toString(36)
                    .slice(2),
            from:
                state.graphLinkFrom,
            to:
                nodeId
        });
    }

    state.graphLinkFrom = null;
    state.graphLinkMode = false;

    window.grapheNodes =
        state.graphNodes;

    window.grapheEdges =
        state.graphEdges;

    renderGraphe();

    showToast(
        'Personnes attachées.',
        'success'
    );
}

function renderGraphEdges(container) {
    const svg =
        document.createElementNS(
            'http://www.w3.org/2000/svg',
            'svg'
        );

    svg.style.cssText =
        'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible;';

    state.graphEdges.forEach(function (edge) {
        const from =
            state.graphNodes.find(function (node) {
                return node.id === edge.from;
            });

        const to =
            state.graphNodes.find(function (node) {
                return node.id === edge.to;
            });

        if (!from || !to) return;

        const line =
            document.createElementNS(
                'http://www.w3.org/2000/svg',
                'line'
            );

        line.setAttribute(
            'x1',
            String(from.x || 0)
        );

        line.setAttribute(
            'y1',
            String(from.y || 0)
        );

        line.setAttribute(
            'x2',
            String(to.x || 0)
        );

        line.setAttribute(
            'y2',
            String(to.y || 0)
        );

        line.setAttribute(
            'stroke',
            '#444'
        );

        line.setAttribute(
            'stroke-width',
            '2'
        );

        svg.appendChild(line);
    });

    container.appendChild(svg);
}

function renderGraphe() {
    const container =
        $('grapheContainer');

    if (!container) return;

    container.innerHTML = '';

    container.style.position =
        'relative';

    container.style.overflow =
        'hidden';

    renderGraphEdges(container);

    state.graphNodes.forEach(function (node) {
        container.appendChild(
            createGraphNodeElement(node)
        );
    });
}

function grapheAddPersonne() {
    showModal(
        'Ajouter une personne',
        '<div class="form-group">' +
        '<label>Prénom</label>' +
        '<input id="newNodePrenom" type="text" style="width:100%;padding:10px;background:#101010;border:1px solid #2a2a2a;border-radius:8px;color:#fff;">' +
        '</div>' +
        '<div class="form-group">' +
        '<label>Nom</label>' +
        '<input id="newNodeNom" type="text" style="width:100%;padding:10px;background:#101010;border:1px solid #2a2a2a;border-radius:8px;color:#fff;">' +
        '</div>' +
        '<div class="form-group">' +
        '<label>Rôle</label>' +
        '<input id="newNodeRole" type="text" style="width:100%;padding:10px;background:#101010;border:1px solid #2a2a2a;border-radius:8px;color:#fff;">' +
        '</div>',
        'Ajouter',
        function () {
            const prenom =
                $('newNodePrenom')?.value.trim() || '';

            const nom =
                $('newNodeNom')?.value.trim() || '';

            const role =
                $('newNodeRole')?.value.trim() ||
                'Personne';

            const container =
                $('grapheContainer');

            const width =
                container?.clientWidth || 900;

            const height =
                container?.clientHeight || 600;

            state.graphNodes.push({
                id:
                    'node-' +
                    Date.now() +
                    '-' +
                    Math.random()
                        .toString(36)
                        .slice(2),
                label:
                    (prenom + ' ' + nom).trim() ||
                    'Personne',
                prenom:
                    prenom,
                nom_famille:
                    nom,
                role:
                    role,
                x:
                    width / 2 +
                    (Math.random() - 0.5) *
                    200,
                y:
                    height / 2 +
                    (Math.random() - 0.5) *
                    150
            });

            window.grapheNodes =
                state.graphNodes;

            renderGraphe();

            showToast(
                'Personne ajoutée.',
                'success'
            );
        }
    );
}

function grapheAttacher() {
    if (state.graphNodes.length < 2) {
        showToast(
            'Ajoutez au moins deux personnes.',
            'warning'
        );
        return;
    }

    state.graphLinkMode =
        !state.graphLinkMode;

    state.graphLinkFrom = null;

    const button =
        $('grapheAttacher');

    if (button) {
        button.classList.toggle(
            'active',
            state.graphLinkMode
        );
    }

    showToast(
        state.graphLinkMode
            ? 'Cliquez sur deux personnes.'
            : 'Mode attacher désactivé.',
        'info'
    );
}

function grapheSauvegarder() {
    const data = {
        name: 'Graphe Marauder',
        nodes: state.graphNodes,
        edges: state.graphEdges
    };

    localStorage.setItem(
        'marauder_graphe',
        JSON.stringify(data)
    );

    fetch(
        API_URL + '/api/graphes',
        {
            method: 'POST',
            headers: authHeaders(true),
            body: JSON.stringify(data)
        }
    )
        .then(function (response) {
            if (response.ok) {
                showToast(
                    'Graphe sauvegardé sur le serveur.',
                    'success'
                );
            } else {
                showToast(
                    'Graphe sauvegardé localement.',
                    'info'
                );
            }
        })
        .catch(function () {
            showToast(
                'Graphe sauvegardé localement.',
                'info'
            );
        });
}

async function grapheMesGraphes() {
    const modal =
        $('graphesModal');

    const list =
        $('graphesList');

    if (!modal || !list) return;

    modal.style.display =
        'flex';

    list.innerHTML =
        '<div style="padding:20px;color:#777;">Chargement...</div>';

    try {
        const response =
            await fetch(
                API_URL +
                '/api/graphes/all',
                {
                    headers: authHeaders(false)
                }
            );

        const data =
            await readJson(response);

        state.graphes =
            data.graphes ||
            data.results ||
            [];

        const local =
            localStorage.getItem(
                'marauder_graphe'
            );

        if (local) {
            try {
                const localGraph =
                    JSON.parse(local);

                state.graphes.unshift({
                    id: 'local',
                    name: 'Graphe local',
                    nodes:
                        localGraph.nodes || [],
                    edges:
                        localGraph.edges || [],
                    created_at:
                        new Date().toISOString(),
                    local: true
                });
            } catch (error) {
                console.error(error);
            }
        }

        if (!state.graphes.length) {
            list.innerHTML =
                '<div style="padding:20px;color:#777;">Aucun graphe sauvegardé.</div>';
            return;
        }

        list.innerHTML = '';

        state.graphes.forEach(function (graph, index) {
            const row =
                document.createElement('div');

            row.style.cssText =
                'padding:14px;border:1px solid #222;background:#101010;border-radius:9px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;gap:12px;';

            const info =
                document.createElement('div');

            const name =
                document.createElement('div');

            name.style.fontWeight =
                '600';

            name.textContent =
                graph.name ||
                'Graphe sans nom';

            const count =
                document.createElement('div');

            count.style.cssText =
                'font-size:12px;color:#666;margin-top:4px;';

            count.textContent =
                String(
                    (graph.nodes || []).length
                ) +
                ' personnes - ' +
                String(
                    (graph.edges || []).length
                ) +
                ' liens';

            info.appendChild(name);
            info.appendChild(count);

            const actions =
                document.createElement('div');

            const load =
                document.createElement('button');

            load.textContent =
                'Charger';

            load.addEventListener(
                'click',
                function () {
                    loadGraph(
                        graph
                    );
                }
            );

            actions.appendChild(load);

            if (!graph.local) {
                const remove =
                    document.createElement('button');

                remove.textContent =
                    'Supprimer';

                remove.addEventListener(
                    'click',
                    function () {
                        grapheEffacerServeur(
                            graph.id
                        );
                    }
                );

                actions.appendChild(remove);
            }

            row.appendChild(info);
            row.appendChild(actions);

            list.appendChild(row);
        });
    } catch (error) {
        list.innerHTML =
            '<div style="padding:20px;color:#ef4444;">Erreur de chargement.</div>';
    }
}

function loadGraph(graph) {
    state.graphNodes =
        Array.isArray(graph.nodes)
            ? graph.nodes
            : [];

    state.graphEdges =
        Array.isArray(graph.edges)
            ? graph.edges
            : [];

    window.grapheNodes =
        state.graphNodes;

    window.grapheEdges =
        state.graphEdges;

    const modal =
        $('graphesModal');

    if (modal) {
        modal.style.display =
            'none';
    }

    renderGraphe();

    showToast(
        'Graphe chargé.',
        'success'
    );
}

async function grapheEffacerServeur(id) {
    if (!confirm('Supprimer ce graphe ?')) {
        return;
    }

    try {
        const response =
            await fetch(
                API_URL +
                '/api/graphes/' +
                id,
                {
                    method: 'DELETE',
                    headers: authHeaders(false)
                }
            );

        if (!response.ok) {
            throw new Error();
        }

        showToast(
            'Graphe supprimé.',
            'success'
        );

        await grapheMesGraphes();
    } catch (error) {
        showToast(
            'Impossible de supprimer le graphe.',
            'error'
        );
    }
}

function grapheEffacer() {
    showModal(
        'Effacer le graphe',
        '<p style="color:#aaa;">Voulez-vous effacer toutes les personnes et tous les liens du graphe ?</p>',
        'Effacer',
        function () {
            state.graphNodes = [];
            state.graphEdges = [];
            state.graphLinkMode = false;
            state.graphLinkFrom = null;

            window.grapheNodes =
                state.graphNodes;

            window.grapheEdges =
                state.graphEdges;

            localStorage.removeItem(
                'marauder_graphe'
            );

            renderGraphe();

            showToast(
                'Graphe effacé.',
                'success'
            );
        }
    );
}

function initGraph() {
    const add =
        $('grapheAddPersonne');

    const attach =
        $('grapheAttacher');

    const save =
        $('grapheSauvegarder');

    const graphs =
        $('grapheMesGraphes');

    const clear =
        $('grapheEffacer');

    if (add) {
        add.addEventListener(
            'click',
            grapheAddPersonne
        );
    }

    if (attach) {
        attach.addEventListener(
            'click',
            grapheAttacher
        );
    }

    if (save) {
        save.addEventListener(
            'click',
            grapheSauvegarder
        );
    }

    if (graphs) {
        graphs.addEventListener(
            'click',
            grapheMesGraphes
        );
    }

    if (clear) {
        clear.addEventListener(
            'click',
            grapheEffacer
        );
    }

    const close =
        $('closeGraphesModal');

    if (close) {
        close.addEventListener(
            'click',
            function () {
                const modal =
                    $('graphesModal');

                if (modal) {
                    modal.style.display =
                        'none';
                }
            }
        );
    }

    const saved =
        localStorage.getItem(
            'marauder_graphe'
        );

    if (saved) {
        try {
            const data =
                JSON.parse(saved);

            state.graphNodes =
                Array.isArray(data.nodes)
                    ? data.nodes
                    : [];

            state.graphEdges =
                Array.isArray(data.edges)
                    ? data.edges
                    : [];

            window.grapheNodes =
                state.graphNodes;

            window.grapheEdges =
                state.graphEdges;
        } catch (error) {
            console.error(error);
        }
    }
}

function switchPage(page) {
    document
        .querySelectorAll(
            '[data-page]'
        )
        .forEach(function (element) {
            if (
                element.closest('.sidebar') ||
                element.matches(
                    '.sidebar-nav li'
                )
            ) {
                element.classList.toggle(
                    'active',
                    element.dataset.page === page
                );
            }
        });

    document
        .querySelectorAll(
            '.page'
        )
        .forEach(function (element) {
            element.classList.remove(
                'active'
            );
        });

    const pageElement =
        $('page-' + page);

    if (pageElement) {
        pageElement.classList.add(
            'active'
        );
    }

    if (page === 'history') {
        loadHistory();
    }

    if (page === 'fiches') {
        loadFiches();
    }

    if (page === 'tickets') {
        loadTickets();
    }

    if (page === 'profile') {
        loadProfile();
    }

    if (
        page === 'stats' ||
        page === 'usage'
    ) {
        loadUsage();
    }

    if (page === 'graphe') {
        setTimeout(
            renderGraphe,
            100
        );
    }

    const sidebar =
        $('sidebar');

    const backdrop =
        $('sidebarBackdrop');

    if (sidebar) {
        sidebar.classList.remove(
            'open'
        );
    }

    if (backdrop) {
        backdrop.classList.remove(
            'active'
        );
    }
}

function initNavigation() {
    document
        .querySelectorAll(
            '.sidebar-nav li[data-page]'
        )
        .forEach(function (item) {
            item.addEventListener(
                'click',
                function () {
                    const page =
                        this.dataset.page;

                    if (!page) return;

                    switchPage(page);
                }
            );
        });

    document
        .querySelectorAll(
            '.search-tab'
        )
        .forEach(function (tab) {
            tab.addEventListener(
                'click',
                function () {
                    document
                        .querySelectorAll(
                            '.search-tab'
                        )
                        .forEach(
                            function (element) {
                                element.classList.remove(
                                    'active'
                                );
                            }
                        );

                    this.classList.add(
                        'active'
                    );

                    const target =
                        $('tab-' +
                        this.dataset.tab);

                    document
                        .querySelectorAll(
                            '.search-tab-content'
                        )
                        .forEach(
                            function (element) {
                                element.classList.remove(
                                    'active'
                                );
                            }
                        );

                    if (target) {
                        target.classList.add(
                            'active'
                        );
                    }
                }
            );
        });

    document
        .querySelectorAll(
            '.section-header'
        )
        .forEach(function (header) {
            header.addEventListener(
                'click',
                function () {
                    const body =
                        this.nextElementSibling;

                    if (body) {
                        body.classList.toggle(
                            'open'
                        );
                    }

                    const icon =
                        this.querySelector(
                            '.toggle-icon'
                        );

                    if (icon) {
                        icon.classList.toggle(
                            'open'
                        );
                    }
                }
            );
        });

    const support =
        $('supportToggle');

    if (support) {
        support.addEventListener(
            'click',
            function () {
                const submenu =
                    $('supportSubmenu');

                if (!submenu) return;

                const open =
                    submenu.style.display ===
                    'block';

                submenu.style.display =
                    open
                        ? 'none'
                        : 'block';
            }
        );
    }
}

function initMobile() {
    const menu =
        $('mobileMenuBtn');

    const sidebar =
        $('sidebar');

    const backdrop =
        $('sidebarBackdrop');

    if (menu) {
        menu.addEventListener(
            'click',
            function () {
                if (!sidebar) return;

                sidebar.classList.toggle(
                    'open'
                );

                if (backdrop) {
                    backdrop.classList.toggle(
                        'active'
                    );
                }
            }
        );
    }

    if (backdrop) {
        backdrop.addEventListener(
            'click',
            function () {
                if (sidebar) {
                    sidebar.classList.remove(
                        'open'
                    );
                }

                backdrop.classList.remove(
                    'active'
                );
            }
        );
    }
}

function initLogout() {
    const logout =
        $('logoutBtn');

    if (!logout) return;

    logout.addEventListener(
        'click',
        function () {
            showModal(
                'Déconnexion',
                '<p style="color:#aaa;">Voulez-vous vraiment vous déconnecter ?</p>',
                'Se déconnecter',
                function () {
                    localStorage.removeItem(
                        'token'
                    );

                    localStorage.removeItem(
                        'user'
                    );

                    window.location.href =
                        '/login';
                }
            );
        }
    );
}

function initSearch() {
    const button =
        $('searchButton') ||
        $('performSearch') ||
        $('searchBtn');

    if (button) {
        button.addEventListener(
            'click',
            function () {
                performSearch();
            }
        );
    }

    document
        .querySelectorAll(
            'input[data-search], .search-input'
        )
        .forEach(function (input) {
            input.addEventListener(
                'keydown',
                function (event) {
                    if (
                        event.key ===
                        'Enter'
                    ) {
                        event.preventDefault();
                        performSearch();
                    }
                }
            );
        });
}

async function createTicket() {
    const subject =
        $('ticketSubject')?.value.trim();

    const message =
        $('ticketMessage')?.value.trim();

    if (!subject || !message) {
        showToast(
            'Remplissez tous les champs.',
            'warning'
        );

        return;
    }

    try {
        const response =
            await fetch(
                API_URL +
                '/api/tickets',
                {
                    method: 'POST',
                    headers: authHeaders(true),
                    body: JSON.stringify({
                        subject: subject,
                        message: message
                    })
                }
            );

        if (!response.ok) {
            throw new Error();
        }

        closeModal();

        showToast(
            'Ticket créé.',
            'success'
        );

        await loadTickets();
    } catch (error) {
        showToast(
            'Impossible de créer le ticket.',
            'error'
        );
    }
}

function initModal() {
    const overlay =
        $('modalOverlay');

    if (!overlay) return;

    overlay.addEventListener(
        'click',
        function (event) {
            if (
                event.target ===
                overlay
            ) {
                closeModal();
            }
        }
    );
}

function initGlobalKeyboard() {
    document.addEventListener(
        'keydown',
        function (event) {
            if (
                event.key ===
                'Escape'
            ) {
                const investigation =
                    $('investigationOverlay');

                if (
                    investigation &&
                    investigation.style.display ===
                    'block'
                ) {
                    closeInvestigation();
                    return;
                }

                closeModal();
            }
        }
    );
}

function init() {
    initNavigation();
    initMobile();
    initLogout();
    initSearch();
    initResultActions();
    initTickets();
    initGraph();
    initModal();
    initGlobalKeyboard();

    verifyToken();
    loadProfile();
    loadUsage();

    const searchResults =
        $('searchResults');

    if (searchResults) {
        displayResults([]);
    }

    console.log(
        'Marauder dashboard chargé.'
    );
}

window.showToast =
    showToast;

window.showModal =
    showModal;

window.closeModal =
    closeModal;

window.formatPhone =
    formatPhone;

window.performSearch =
    performSearch;

window.displayResults =
    displayResults;

window.findFamily =
    findFamily;

window.searchPivot =
    searchPivot;

window.normalizeAdresse =
    normalizeAdresse;

window.normalizePhone =
    normalizePhone;

window.toggleDeep =
    toggleDeep;

window.renderFamilyInPanel =
    renderFamilyInPanel;

window.loadHistory =
    loadHistory;

window.replaySearch =
    replaySearch;

window.loadFiches =
    loadFiches;

window.viewFiche =
    viewFiche;

window.editFiche =
    editFiche;

window.deleteFiche =
    deleteFiche;

window.exportFiche =
    exportFiche;

window.addToFiche =
    addToFiche;

window.copyFullCard =
    copyFullCard;

window.addToGraphe =
    addToGraphe;

window.openInvestigation =
    openInvestigation;

window.closeInvestigation =
    closeInvestigation;

window.loadTickets =
    loadTickets;

window.viewTicket =
    viewTicket;

window.replyTicket =
    replyTicket;

window.loadProfile =
    loadProfile;

window.loadUsage =
    loadUsage;

window.grapheAddPersonne =
    grapheAddPersonne;

window.grapheAttacher =
    grapheAttacher;

window.grapheSauvegarder =
    grapheSauvegarder;

window.grapheMesGraphes =
    grapheMesGraphes;

window.grapheEffacer =
    grapheEffacer;

window.renderGraphe =
    renderGraphe;

window.switchPage =
    switchPage;

if (
    document.readyState ===
    'loading'
) {
    document.addEventListener(
        'DOMContentLoaded',
        init
    );
} else {
    init();
}