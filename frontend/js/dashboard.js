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
    toast.className = 'toast ' + type;
    toast.innerHTML = message + ' <button class="toast-close" onclick="this.parentElement.remove()">×</button>';
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
        const response = await fetch(API_URL + '/api/verify', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (!response.ok) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
            return;
        }
        const data = await response.json();
        const display = document.getElementById('usernameDisplay');
        if (display) display.textContent = data.user.username;
        return data;
    } catch (error) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
    }
}

// ============ NAVIGATION ============
document.querySelectorAll('.sidebar-nav li[data-page]').forEach(item => {
    item.addEventListener('click', function() {
        const page = this.dataset.page;
        if (page === 'discord') {
            window.open('https://discord.gg/ton-invite', '_blank');
            return;
        }
        document.querySelectorAll('.sidebar-nav li[data-page]').forEach(li => li.classList.remove('active'));
        this.classList.add('active');
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        const target = document.getElementById('page-' + page);
        if (target) target.classList.add('active');
        
        // Initialiser les pages
        if (page === 'profile') loadProfile();
        if (page === 'history') loadHistory();
        if (page === 'fiches') loadFiches();
        if (page === 'tickets') loadTickets();
        if (page === 'graphe') {
            setTimeout(() => {
                if (typeof window.initGrapheModule === 'function') {
                    window.initGrapheModule();
                } else {
                    console.error('Module graphe non chargé');
                    showToast('Erreur : module graphe non disponible', 'error');
                }
            }, 100);
        }
    });
});

// ============ SUPPORT TOGGLE ============
document.getElementById('supportToggle').addEventListener('click', function(e) {
    e.stopPropagation();
    const submenu = document.getElementById('supportSubmenu');
    const arrow = this.querySelector('.support-arrow');
    if (submenu) {
        const isOpen = submenu.style.display === 'block';
        submenu.style.display = isOpen ? 'none' : 'block';
        if (arrow) arrow.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
    }
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
        document.getElementById('tab-' + this.dataset.tab).classList.add('active');
    });
});

// ============ LOGOUT ============
document.getElementById('logoutBtn').addEventListener('click', function() {
    if (confirm('Se déconnecter ?')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/';
    }
});

// ============ DISPLAY RESULTS ============
function displayResults(container, results) {
    if (!results || results.length === 0) {
        container.innerHTML = '<div class="empty-state">Aucun resultat trouve</div>';
        return;
    }

    const cardsHtml = results.map((person, index) => {
        const confidence = person._confidence || 0;
        const confidenceClass = confidence >= 70 ? 'high' : confidence >= 40 ? 'medium' : 'low';
        const fullName = (person.prenom || '') + ' ' + (person.nom_famille || 'Inconnu');
        
        let fieldsHtml = '';
        const excludedKeys = ['_confidence', '_sources', '_source_db', 'famille'];
        Object.entries(person)
            .filter(([key]) => !key.startsWith('_') && !excludedKeys.includes(key))
            .forEach(([key, value]) => {
                if (!value) return;
                const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                const isImportant = ['nom_famille', 'prenom', 'email', 'telephone', 'adresse'].includes(key);
                let displayValue = value;
                if (key === 'telephone' || key === 'mobile') displayValue = formatPhone(value);
                fieldsHtml += `
                    <div class="result-field">
                        <span class="field-label">${label}</span>
                        <span class="field-value ${isImportant ? 'highlight' : ''}">${displayValue}</span>
                    </div>
                `;
            });
        
        let familleHtml = '';
        if (person.famille && person.famille.length > 0) {
            familleHtml = `
                <div class="family-tree">
                    <div class="tree-title">Famille associee (${person.famille.length})</div>
                    ${person.famille.map(m => `
                        <div class="tree-item">
                            <span>${m.prenom || ''} ${m.nom_famille || ''}${m.date_naissance ? ' · ' + m.date_naissance : ''}</span>
                            <span class="relation">${m.lien || 'Lie'}</span>
                        </div>
                    `).join('')}
                </div>
            `;
        }
        
        return `
            <div class="result-card-full" data-index="${index}">
                <div class="result-header-full">
                    <div class="result-name-full" onclick="toggleFiche(${index})">${fullName}</div>
                    <div class="result-meta">
                        <span class="confidence-badge confidence-${confidenceClass}">${confidence}%</span>
                        ${person._sources ? '<span class="result-sources-badge">' + person._sources.length + ' source(s)</span>' : ''}
                    </div>
                </div>
                <div class="result-fields" id="fiche-${index}">
                    ${fieldsHtml}
                </div>
                <div class="result-actions">
                    <button class="btn-deep" onclick="toggleDeep(${index})">Approfondir</button>
                    <button class="btn-deep" onclick="addToFiche(${index})">+ Fiche</button>
                    <button class="btn-deep" onclick="copyFullCard(${index})">Copier</button>
                    <button class="btn-deep" onclick="addToGraphe(${index})">Graphe</button>
                    <button class="btn-deep" onclick="openInvestigation(${index})" style="border-color:rgba(255,255,255,0.2);background:rgba(255,255,255,0.05);">Investiguer</button>
                </div>
                <div class="deep-panel" id="deep-${index}">
                    <h4>Approfondir</h4>
                    ${familleHtml || '<div style="color:#6b6b6b;font-size:13px;">Aucun lien familial trouve</div>'}
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = `
        <div class="results-counter">
            <div class="count"><strong>${results.length}</strong> resultat(s) trouve(s)</div>
            <div class="badge">${results.length > 1 ? 'Plusieurs correspondances' : 'Correspondance unique'}</div>
        </div>
        ${cardsHtml}
    `;
    window._resultsData = results;
}

function toggleFiche(index) {
    const el = document.getElementById('fiche-' + index);
    if (el) el.classList.toggle('open');
}

function toggleDeep(index) {
    const el = document.getElementById('deep-' + index);
    if (el) el.classList.toggle('open');
}

// ============ SEARCH ============
document.getElementById('searchBtn').addEventListener('click', async function() {
    const query = {
        flexible: true,
        per_page: 100,
        page: 1,
        nom_famille: document.getElementById('searchNom')?.value || undefined,
        prenom: document.getElementById('searchPrenom')?.value || undefined,
        nom_naissance: document.getElementById('searchNomNaissance')?.value || undefined,
        nom_affichage: document.getElementById('searchNomAffichage')?.value || undefined,
        email: document.getElementById('searchEmail')?.value || undefined,
        telephone: document.getElementById('searchPhone')?.value || undefined,
        nom_utilisateur: document.getElementById('searchUsername')?.value || undefined,
        adresse_ip: document.getElementById('searchIp')?.value || undefined,
        adresse: document.getElementById('searchAdresse')?.value || undefined,
        code_postal: document.getElementById('searchCp')?.value || undefined,
        ville: document.getElementById('searchVille')?.value || undefined,
        ville_naissance: document.getElementById('searchVilleNaissance')?.value || undefined,
        steam_id: document.getElementById('searchSteam')?.value || undefined,
        fivem_license: document.getElementById('searchFivemLicense')?.value || undefined,
        discord_id: document.getElementById('searchDiscord')?.value || undefined,
        xbox_live_id: document.getElementById('searchXbox')?.value || undefined,
        live_id: document.getElementById('searchLive')?.value || undefined,
        fivem_license2: document.getElementById('searchFivemLicense2')?.value || undefined,
        nir: document.getElementById('searchNir')?.value || undefined,
        iban: document.getElementById('searchIban')?.value || undefined,
        bic: document.getElementById('searchBic')?.value || undefined,
        vin_plaque: document.getElementById('searchVin')?.value || undefined
    };

    const dateNaissance = document.getElementById('searchDateNaissance')?.value;
    if (dateNaissance) query.date_naissance = dateNaissance;
    const jour = document.getElementById('searchJour')?.value;
    if (jour) query.jour_naissance = parseInt(jour);
    const mois = document.getElementById('searchMois')?.value;
    if (mois) query.mois_naissance = parseInt(mois);
    const annee = document.getElementById('searchAnnee')?.value;
    if (annee) query.annee_naissance = annee;
    const genre = document.getElementById('searchGenre')?.value;
    if (genre) query.genre = genre;

    Object.keys(query).forEach(key => query[key] === undefined && delete query[key]);

    if (Object.keys(query).length <= 1) {
        showToast('Veuillez remplir au moins un critere', 'warning');
        return;
    }

    const container = document.getElementById('searchResults');
    container.innerHTML = '<div class="empty-state">Recherche en cours...</div>';
    showSearchLoading();

    try {
        const response = await fetch(API_URL + '/api/brix/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify(query)
        });

        const data = await response.json();
        let results = data.data?.results || [];

        const total = data.meta?.total || 0;
        const perPage = query.per_page || 100;
        const totalPages = Math.ceil(total / perPage);
        if (totalPages > 1) {
            for (let page = 2; page <= Math.min(totalPages, 5); page++) {
                try {
                    const pageQuery = { ...query, page: page };
                    const pageResponse = await fetch(API_URL + '/api/brix/search', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': 'Bearer ' + token
                        },
                        body: JSON.stringify(pageQuery)
                    });
                    const pageData = await pageResponse.json();
                    if (pageData.data?.results) {
                        results = results.concat(pageData.data.results);
                    }
                } catch (e) { /* Silence */ }
            }
        }

        const uniqueResults = [];
        const seen = new Set();
        results.forEach(p => {
            const key = (p.nom_famille || '') + '|' + (p.prenom || '') + '|' + (p.email || '') + '|' + (p.telephone || '');
            if (!seen.has(key)) {
                seen.add(key);
                uniqueResults.push(p);
            }
        });
        results = uniqueResults;

        // Pivot famille
        const pivotDone = new Set();
        for (let p of results.slice(0, 5)) {
            const famille = [];
            if (p.adresse && p.code_postal) {
                const pivotKey = 'adresse_' + p.adresse + '_' + p.code_postal;
                if (!pivotDone.has(pivotKey)) {
                    pivotDone.add(pivotKey);
                    try {
                        const pivotPayload = { adresse: p.adresse, code_postal: p.code_postal, flexible: false, per_page: 10 };
                        const pivotResponse = await fetch(API_URL + '/api/brix/search', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': 'Bearer ' + token
                            },
                            body: JSON.stringify(pivotPayload)
                        });
                        const pivotData = await pivotResponse.json();
                        const pivotResults = pivotData.data?.results || [];
                        for (let pr of pivotResults) {
                            if (pr.nom_famille === p.nom_famille && pr.prenom === p.prenom) continue;
                            const membre = {
                                prenom: pr.prenom || '',
                                nom_famille: pr.nom_famille || '',
                                date_naissance: pr.date_naissance || '',
                                email: pr.email || '',
                                telephone: pr.telephone || '',
                                lien: 'Meme adresse'
                            };
                            if (!famille.some(m => m.prenom === membre.prenom && m.nom_famille === membre.nom_famille)) {
                                famille.push(membre);
                            }
                        }
                    } catch (e) { /* Silence */ }
                }
            }
            if (p.telephone && famille.length < 5) {
                const phoneClean = p.telephone.replace(/\D/g, '');
                if (phoneClean.length >= 8) {
                    const pivotKey = 'tel_' + phoneClean;
                    if (!pivotDone.has(pivotKey)) {
                        pivotDone.add(pivotKey);
                        try {
                            const pivotPayload = { telephone: phoneClean, flexible: false, per_page: 5 };
                            const pivotResponse = await fetch(API_URL + '/api/brix/search', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': 'Bearer ' + token
                                },
                                body: JSON.stringify(pivotPayload)
                            });
                            const pivotData = await pivotResponse.json();
                            const pivotResults = pivotData.data?.results || [];
                            for (let pr of pivotResults) {
                                if (pr.nom_famille === p.nom_famille && pr.prenom === p.prenom) continue;
                                const membre = {
                                    prenom: pr.prenom || '',
                                    nom_famille: pr.nom_famille || '',
                                    date_naissance: pr.date_naissance || '',
                                    email: pr.email || '',
                                    telephone: pr.telephone || '',
                                    lien: 'Telephone partage'
                                };
                                if (!famille.some(m => m.prenom === membre.prenom && m.nom_famille === membre.nom_famille)) {
                                    famille.push(membre);
                                }
                            }
                        } catch (e) { /* Silence */ }
                    }
                }
            }
            if (p.email && famille.length < 5) {
                const pivotKey = 'email_' + p.email;
                if (!pivotDone.has(pivotKey)) {
                    pivotDone.add(pivotKey);
                    try {
                        const pivotPayload = { email: p.email, flexible: false, per_page: 5 };
                        const pivotResponse = await fetch(API_URL + '/api/brix/search', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': 'Bearer ' + token
                            },
                            body: JSON.stringify(pivotPayload)
                        });
                        const pivotData = await pivotResponse.json();
                        const pivotResults = pivotData.data?.results || [];
                        for (let pr of pivotResults) {
                            if (pr.nom_famille === p.nom_famille && pr.prenom === p.prenom) continue;
                            const membre = {
                                prenom: pr.prenom || '',
                                nom_famille: pr.nom_famille || '',
                                date_naissance: pr.date_naissance || '',
                                email: pr.email || '',
                                telephone: pr.telephone || '',
                                lien: 'Email partage'
                            };
                            if (!famille.some(m => m.prenom === membre.prenom && m.nom_famille === membre.nom_famille)) {
                                famille.push(membre);
                            }
                        }
                    } catch (e) { /* Silence */ }
                }
            }
            if (famille.length > 0) {
                p.famille = famille;
            }
        }

        setTimeout(() => {
            hideSearchLoading();
            if (container) {
                if (results.length > 0) {
                    displayResults(container, results);
                    showToast(results.length + ' resultat(s) trouve(s)', 'success');
                } else {
                    container.innerHTML = '<div class="empty-state">Aucun resultat trouve</div>';
                    showToast('Aucun resultat', 'info');
                }
            }
        }, 1500);

    } catch (error) {
        console.error('Search error:', error);
        setTimeout(() => {
            hideSearchLoading();
            container.innerHTML = '<div class="empty-state" style="color:#ef4444;">Erreur de recherche</div>';
            showToast('Erreur de recherche', 'error');
        }, 1500);
    }
});

// ============ SEARCH PRO ============
document.getElementById('searchBtnPro').addEventListener('click', async function() {
    const query = {
        flexible: true,
        per_page: 100,
        page: 1,
        nom_famille: document.getElementById('searchNomPro')?.value || undefined,
        prenom: document.getElementById('searchPrenomPro')?.value || undefined,
        nom_naissance: document.getElementById('searchNomNaissancePro')?.value || undefined,
        email: document.getElementById('searchEmailPro')?.value || undefined,
        telephone: document.getElementById('searchPhonePro')?.value || undefined,
        adresse_ip: document.getElementById('searchIpPro')?.value || undefined,
        societe: document.getElementById('searchSociete')?.value || undefined,
        profession: document.getElementById('searchProfession')?.value || undefined,
        fonction: document.getElementById('searchFonction')?.value || undefined,
        siret: document.getElementById('searchSiret')?.value || undefined,
        siren: document.getElementById('searchSiren')?.value || undefined,
        nir: document.getElementById('searchNirPro')?.value || undefined,
        iban: document.getElementById('searchIbanPro')?.value || undefined,
        bic: document.getElementById('searchBicPro')?.value || undefined,
        vin_plaque: document.getElementById('searchVinPro')?.value || undefined
    };

    Object.keys(query).forEach(key => query[key] === undefined && delete query[key]);

    if (Object.keys(query).length <= 1) {
        showToast('Veuillez remplir au moins un critere', 'warning');
        return;
    }

    const container = document.getElementById('searchResults');
    container.innerHTML = '<div class="empty-state">Recherche en cours...</div>';
    showSearchLoading();

    try {
        const response = await fetch(API_URL + '/api/brix/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify(query)
        });

        const data = await response.json();
        let results = data.data?.results || [];

        const total = data.meta?.total || 0;
        const perPage = query.per_page || 100;
        const totalPages = Math.ceil(total / perPage);
        if (totalPages > 1) {
            for (let page = 2; page <= Math.min(totalPages, 5); page++) {
                try {
                    const pageQuery = { ...query, page: page };
                    const pageResponse = await fetch(API_URL + '/api/brix/search', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': 'Bearer ' + token
                        },
                        body: JSON.stringify(pageQuery)
                    });
                    const pageData = await pageResponse.json();
                    if (pageData.data?.results) {
                        results = results.concat(pageData.data.results);
                    }
                } catch (e) { /* Silence */ }
            }
        }

        const uniqueResults = [];
        const seen = new Set();
        results.forEach(p => {
            const key = (p.nom_famille || '') + '|' + (p.prenom || '') + '|' + (p.email || '') + '|' + (p.telephone || '');
            if (!seen.has(key)) {
                seen.add(key);
                uniqueResults.push(p);
            }
        });
        results = uniqueResults;

        const pivotDone = new Set();
        for (let p of results.slice(0, 5)) {
            const famille = [];
            if (p.adresse && p.code_postal) {
                const pivotKey = 'adresse_' + p.adresse + '_' + p.code_postal;
                if (!pivotDone.has(pivotKey)) {
                    pivotDone.add(pivotKey);
                    try {
                        const pivotPayload = { adresse: p.adresse, code_postal: p.code_postal, flexible: false, per_page: 10 };
                        const pivotResponse = await fetch(API_URL + '/api/brix/search', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': 'Bearer ' + token
                            },
                            body: JSON.stringify(pivotPayload)
                        });
                        const pivotData = await pivotResponse.json();
                        const pivotResults = pivotData.data?.results || [];
                        for (let pr of pivotResults) {
                            if (pr.nom_famille === p.nom_famille && pr.prenom === p.prenom) continue;
                            const membre = {
                                prenom: pr.prenom || '',
                                nom_famille: pr.nom_famille || '',
                                date_naissance: pr.date_naissance || '',
                                email: pr.email || '',
                                telephone: pr.telephone || '',
                                lien: 'Meme adresse'
                            };
                            if (!famille.some(m => m.prenom === membre.prenom && m.nom_famille === membre.nom_famille)) {
                                famille.push(membre);
                            }
                        }
                    } catch (e) { /* Silence */ }
                }
            }
            if (famille.length > 0) {
                p.famille = famille;
            }
        }

        setTimeout(() => {
            hideSearchLoading();
            if (container) {
                if (results.length > 0) {
                    displayResults(container, results);
                    showToast(results.length + ' resultat(s) trouve(s)', 'success');
                } else {
                    container.innerHTML = '<div class="empty-state">Aucun resultat trouve</div>';
                    showToast('Aucun resultat', 'info');
                }
            }
        }, 1500);

    } catch (error) {
        console.error('Search error:', error);
        setTimeout(() => {
            hideSearchLoading();
            container.innerHTML = '<div class="empty-state" style="color:#ef4444;">Erreur de recherche</div>';
            showToast('Erreur de recherche', 'error');
        }, 1500);
    }
});

// ============ CLEAR ============
document.getElementById('clearBtn').addEventListener('click', function() {
    document.querySelectorAll('#tab-french input, #tab-french select').forEach(el => el.value = '');
    document.getElementById('searchResults').innerHTML = '';
    showToast('Formulaire efface', 'info');
});

document.getElementById('clearBtnPro').addEventListener('click', function() {
    document.querySelectorAll('#tab-pro input, #tab-pro select').forEach(el => el.value = '');
    document.getElementById('searchResults').innerHTML = '';
    showToast('Formulaire Pro efface', 'info');
});

// ============ LOOKUP ============
document.getElementById('lookupBtn').addEventListener('click', async function() {
    const type = document.getElementById('lookupType').value;
    const value = document.getElementById('lookupValue').value.trim();

    if (!value) {
        showToast('Veuillez entrer une valeur', 'warning');
        return;
    }

    const container = document.getElementById('lookupResults');
    container.innerHTML = '<div class="empty-state">Recherche en cours...</div>';
    showSearchLoading();

    try {
        const response = await fetch(API_URL + '/api/brix/lookup/' + type + '/' + encodeURIComponent(value), {
            headers: { 'Authorization': 'Bearer ' + token }
        });

        const data = await response.json();
        const results = data.data?.results || [];

        setTimeout(() => {
            hideSearchLoading();
            if (results.length > 0) {
                displayResults(container, results);
                showToast(results.length + ' enregistrement(s) trouve(s)', 'success');
            } else {
                container.innerHTML = '<div class="empty-state">Aucun resultat trouve</div>';
                showToast('Aucun resultat', 'info');
            }
        }, 1500);

    } catch (error) {
        console.error('Lookup error:', error);
        setTimeout(() => {
            hideSearchLoading();
            container.innerHTML = '<div class="empty-state" style="color:#ef4444;">Erreur de lookup</div>';
            showToast('Erreur de lookup', 'error');
        }, 1500);
    }
});

// ============ HISTORY ============
async function loadHistory() {
    const container = document.getElementById('historyList');
    container.innerHTML = '<div class="empty-state">Chargement...</div>';

    try {
        const response = await fetch(API_URL + '/api/history', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const data = await response.json();
        const history = data.history || [];

        if (history.length === 0) {
            container.innerHTML = '<div class="empty-state">Aucune recherche dans l\'historique</div>';
            return;
        }

        container.innerHTML = history.map(item => {
            const date = new Date(item.created_at);
            const dateStr = date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
            const timeStr = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
            let query = item.query;
            if (typeof query === 'string') {
                try { query = JSON.parse(query); } catch (e) { query = { raw: query }; }
            }
            const nom = query.nom_famille || '';
            const prenom = query.prenom || '';
            const displayName = (prenom + ' ' + nom).trim() || 'Recherche';
            const resultCount = item.results_count || 0;
            const resultText = resultCount === 0 ? 'Aucun resultat' : resultCount === 1 ? '1 resultat' : resultCount + ' resultats';
            return `
                <div class="history-item">
                    <div class="history-header">
                        <div class="history-date">${dateStr} ${timeStr}</div>
                        <span class="history-result-count ${resultCount === 0 ? 'empty' : ''}">${resultText}</span>
                    </div>
                    <div class="history-footer">
                        <button class="history-replay" onclick="replaySearch(${item.id})">Relancer</button>
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('History error:', error);
        container.innerHTML = '<div class="empty-state" style="color:#ef4444;">Erreur de chargement</div>';
    }
}

async function replaySearch(id) {
    try {
        showSearchLoading();
        const response = await fetch(API_URL + '/api/history/' + id + '/replay', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const data = await response.json();
        const results = data.results || [];
        
        setTimeout(() => {
            hideSearchLoading();
            if (results.length > 0) {
                document.querySelectorAll('.sidebar-nav li[data-page]').forEach(li => li.classList.remove('active'));
                document.querySelector('[data-page="search"]').classList.add('active');
                document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
                document.getElementById('page-search').classList.add('active');
                const container = document.getElementById('searchResults');
                displayResults(container, results);
                showToast(results.length + ' resultat(s) trouve(s)', 'success');
            } else {
                showToast('Aucun resultat', 'info');
            }
        }, 1500);
    } catch (error) {
        console.error('Replay error:', error);
        hideSearchLoading();
        showToast('Erreur de relance', 'error');
    }
}

// ============ FICHES ============
let fichesData = [];

async function loadFiches() {
    const container = document.getElementById('fichesList');
    container.innerHTML = '<div class="empty-state">Chargement...</div>';

    try {
        const response = await fetch(API_URL + '/api/fiches', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const data = await response.json();
        fichesData = data.fiches || [];

        if (fichesData.length === 0) {
            container.innerHTML = '<div class="empty-state">Aucune fiche creee</div>';
            return;
        }

        container.innerHTML = fichesData.map((fiche, index) => `
            <div class="fiche-item">
                <div class="fiche-header">
                    <span class="fiche-name">${fiche.name}</span>
                    <span class="fiche-count">${fiche.persons?.length || 0} personne(s)</span>
                </div>
                <div class="fiche-persons">
                    ${fiche.persons?.map(p => `<span class="fiche-person">${p.prenom || ''} ${p.nom_famille || 'Inconnu'}</span>`).join('') || 'Aucune personne'}
                </div>
                <div class="fiche-actions">
                    <button class="fiche-btn" onclick="viewFiche(${index})">Voir</button>
                    <button class="fiche-btn" onclick="editFiche(${index})">Modifier</button>
                    <button class="fiche-btn danger" onclick="deleteFiche(${index})">Supprimer</button>
                    <button class="fiche-btn" onclick="exportFiche(${index})">Exporter</button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Fiches error:', error);
        container.innerHTML = '<div class="empty-state" style="color:#ef4444;">Erreur de chargement</div>';
    }
}

document.getElementById('createFicheBtn').addEventListener('click', function() {
    showModal('Creer une fiche', `
        <div class="form-group">
            <label>Nom de la fiche</label>
            <input type="text" id="ficheNameInput" placeholder="Ex: Enquete Dupont" style="width:100%;padding:10px;background:#1e1e1e;border:1px solid #2a2a2a;border-radius:8px;color:#fff;">
        </div>
        <div style="font-size:12px;color:#6b6b6b;">Maximum 10 personnes par fiche</div>
    `, 'Creer', async function() {
        const name = document.getElementById('ficheNameInput').value.trim();
        if (!name) {
            showToast('Veuillez donner un nom', 'warning');
            return;
        }
        try {
            const response = await fetch(API_URL + '/api/fiches', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
                body: JSON.stringify({ name })
            });
            if (response.ok) {
                showToast('Fiche creee !', 'success');
                loadFiches();
                closeModal();
            }
        } catch (error) {
            showToast('Erreur', 'error');
        }
    });
});

function viewFiche(index) {
    const fiche = fichesData[index];
    if (!fiche) return;
    const personsHtml = fiche.persons?.map(p => `
        <div style="padding:4px 0;border-bottom:1px solid #2a2a2a;font-size:13px;color:#a0a0a0;">
            ${p.prenom || ''} ${p.nom_famille || 'Inconnu'}
            ${p.email ? ' · ' + p.email : ''}
            ${p.telephone ? ' · ' + formatPhone(p.telephone) : ''}
        </div>
    `).join('') || 'Aucune personne';
    showModal('Fiche: ' + fiche.name, `
        <div style="margin-bottom:12px;font-size:13px;color:#6b6b6b;">${fiche.persons?.length || 0} / 10 personnes</div>
        <div style="max-height:300px;overflow-y:auto;">${personsHtml}</div>
    `, 'Fermer', closeModal);
}

function editFiche(index) {
    const fiche = fichesData[index];
    if (!fiche) return;
    showModal('Modifier la fiche', `
        <div class="form-group">
            <label>Nom de la fiche</label>
            <input type="text" id="editFicheName" value="${fiche.name}" style="width:100%;padding:10px;background:#1e1e1e;border:1px solid #2a2a2a;border-radius:8px;color:#fff;">
        </div>
    `, 'Sauvegarder', async function() {
        const name = document.getElementById('editFicheName').value.trim();
        if (!name) {
            showToast('Veuillez donner un nom', 'warning');
            return;
        }
        try {
            const response = await fetch(API_URL + '/api/fiches/' + fiche.id, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
                body: JSON.stringify({ name })
            });
            if (response.ok) {
                showToast('Fiche modifiee !', 'success');
                loadFiches();
                closeModal();
            }
        } catch (error) {
            showToast('Erreur', 'error');
        }
    });
}

function deleteFiche(index) {
    const fiche = fichesData[index];
    if (!fiche) return;
    showModal('Confirmation', `
        <p style="color:#a0a0a0;">Supprimer la fiche "<strong style="color:#ffffff;">${fiche.name}</strong>" ?</p>
        <p style="font-size:13px;color:#6b6b6b;">Cette action est irreversible.</p>
    `, 'Supprimer', async function() {
        try {
            const response = await fetch(API_URL + '/api/fiches/' + fiche.id, {
                method: 'DELETE',
                headers: { 'Authorization': 'Bearer ' + token }
            });
            if (response.ok) {
                showToast('Fiche supprimee !', 'success');
                loadFiches();
                closeModal();
            }
        } catch (error) {
            showToast('Erreur', 'error');
        }
    });
}

function exportFiche(index) {
    const fiche = fichesData[index];
    if (!fiche) return;
    let text = '=== Marauder - Fiche: ' + fiche.name + ' ===\n\n';
    fiche.persons?.forEach((p, i) => {
        text += 'Personne ' + (i+1) + ':\n';
        Object.entries(p).forEach(([key, value]) => {
            if (value && !key.startsWith('_')) {
                const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                let displayValue = value;
                if (key === 'telephone' || key === 'mobile') displayValue = formatPhone(value);
                text += '  ' + label + ': ' + displayValue + '\n';
            }
        });
        text += '\n';
    });
    text += '\n--- by Marauder ---';
    navigator.clipboard.writeText(text).then(() => showToast('Exporte !', 'success'));
}

// ============ ACTIONS SUR RESULTATS ============
function addToFiche(index) {
    const person = window._resultsData?.[index];
    if (!person) {
        showToast('Personne introuvable', 'error');
        return;
    }
    if (fichesData.length === 0) {
        showToast('Aucune fiche existante', 'warning');
        return;
    }
    const selectOptions = fichesData.map(f => `<option value="${f.id}">${f.name} (${f.persons?.length || 0}/10)</option>`).join('');
    showModal('Ajouter a une fiche', `
        <div class="form-group">
            <label>Selectionner une fiche</label>
            <select id="ficheSelect">${selectOptions}<option value="new">+ Creer une nouvelle fiche</option></select>
        </div>
        <div id="newFicheNameContainer" style="display:none;">
            <div class="form-group"><label>Nom de la nouvelle fiche</label><input type="text" id="newFicheNameInput" placeholder="Nom de la fiche" style="width:100%;padding:10px;background:#1e1e1e;border:1px solid #2a2a2a;border-radius:8px;color:#fff;"></div>
        </div>
        <div style="font-size:12px;color:#6b6b6b;">Personne: ${person.prenom || ''} ${person.nom_famille || 'Inconnu'}</div>
    `, 'Ajouter', async function() {
        const select = document.getElementById('ficheSelect');
        const ficheId = select.value;
        if (ficheId === 'new') {
            const nameInput = document.getElementById('newFicheNameInput');
            const name = nameInput?.value?.trim();
            if (!name) { showToast('Veuillez donner un nom', 'warning'); return; }
            try {
                const createResponse = await fetch(API_URL + '/api/fiches', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + token
                    },
                    body: JSON.stringify({ name })
                });
                const createData = await createResponse.json();
                if (createData.fiche) {
                    await addPersonToFiche(createData.fiche.id, person);
                    loadFiches();
                    showToast('Personne ajoutee !', 'success');
                }
            } catch (error) { showToast('Erreur', 'error'); }
        } else {
            await addPersonToFiche(parseInt(ficheId), person);
            loadFiches();
            showToast('Personne ajoutee !', 'success');
        }
    });
    document.getElementById('ficheSelect')?.addEventListener('change', function() {
        const container = document.getElementById('newFicheNameContainer');
        if (container) container.style.display = this.value === 'new' ? 'block' : 'none';
    });
}

async function addPersonToFiche(ficheId, person) {
    try {
        const response = await fetch(API_URL + '/api/fiches/' + ficheId + '/persons', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({ person })
        });
        if (!response.ok) {
            const data = await response.json();
            showToast(data.error || 'Erreur', 'error');
        }
    } catch (error) { showToast('Erreur reseau', 'error'); }
}

function copyFullCard(index) {
    const data = window._resultsData;
    if (!data || !data[index]) return;
    const person = data[index];
    let text = '=== Marauder Investigation ===\n\n';
    Object.entries(person)
        .filter(([key]) => !key.startsWith('_') && key !== 'famille')
        .forEach(([key, value]) => {
            if (!value) return;
            const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            let displayValue = value;
            if (key === 'telephone' || key === 'mobile') displayValue = formatPhone(value);
            text += label + ': ' + displayValue + '\n';
        });
    if (person.famille && person.famille.length > 0) {
        text += '\n=== Famille ===\n';
        person.famille.forEach(m => {
            text += (m.prenom || '') + ' ' + (m.nom_famille || '');
            if (m.lien) text += ' (' + m.lien + ')';
            text += '\n';
        });
    }
    if (person._sources) text += '\nSources: ' + person._sources.join(', ');
    text += '\n\n--- by Marauder ---';
    navigator.clipboard.writeText(text).then(() => showToast('Copie !', 'success'));
}

function addToGraphe(index) {
    const person = window._resultsData?.[index];
    if (!person) {
        showToast('Personne introuvable', 'error');
        return;
    }
    if (typeof window.addPersonToGrapheWithFamily === 'function') {
        window.addPersonToGrapheWithFamily(person);
    } else {
        showToast('Graphe en developpement', 'info');
    }
}

// ============ INVESTIGATION ============
let investigationData = null;

function openInvestigation(index) {
    const data = window._resultsData;
    if (!data || !data[index]) {
        showToast('Personne introuvable', 'error');
        return;
    }
    investigationData = data[index];
    const person = investigationData;
    const overlay = document.getElementById('investigationOverlay');
    if (!overlay) return;

    const fullName = (person.prenom || '') + ' ' + (person.nom_famille || 'Inconnu');
    document.getElementById('investigationName').textContent = 'Investigation - ' + fullName;

    const ville = person.ville || person.ville_naissance || person.adresse?.split(',').pop()?.trim() || 'Localisation inconnue';
    document.getElementById('investigationCityLabel').textContent = ville;

    const pin = document.getElementById('investigationMapPin');
    if (pin) {
        const cities = {
            'paris': { cx: 300, cy: 190 },
            'lyon': { cx: 320, cy: 310 },
            'marseille': { cx: 340, cy: 420 },
            'toulouse': { cx: 260, cy: 380 },
            'bordeaux': { cx: 190, cy: 360 },
            'lille': { cx: 240, cy: 120 },
            'nice': { cx: 390, cy: 390 },
            'nantes': { cx: 170, cy: 280 },
            'strasbourg': { cx: 400, cy: 180 },
            'montpellier': { cx: 300, cy: 380 },
            'rennes': { cx: 160, cy: 230 },
            'grenoble': { cx: 350, cy: 330 },
            'toulon': { cx: 360, cy: 410 },
            'angers': { cx: 190, cy: 260 },
            'dijon': { cx: 350, cy: 240 },
            'le havre': { cx: 210, cy: 170 },
            'reims': { cx: 320, cy: 160 },
            'saint-etienne': { cx: 310, cy: 320 },
            'limoges': { cx: 220, cy: 310 },
            'clermont-ferrand': { cx: 270, cy: 290 },
            'amiens': { cx: 260, cy: 140 },
            'perpignan': { cx: 290, cy: 430 },
            'caen': { cx: 190, cy: 190 },
            'orleans': { cx: 270, cy: 230 },
            'metz': { cx: 370, cy: 170 },
            'besancon': { cx: 380, cy: 220 },
            'mulhouse': { cx: 410, cy: 210 },
            'valence': { cx: 330, cy: 340 },
            'nimes': { cx: 290, cy: 370 },
            'avignon': { cx: 310, cy: 400 },
            'poitiers': { cx: 210, cy: 290 },
            'la rochelle': { cx: 160, cy: 300 }
        };
        const cityKey = ville.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        let found = false;
        for (const [key, pos] of Object.entries(cities)) {
            if (cityKey.includes(key) || key.includes(cityKey)) {
                pin.setAttribute('cx', pos.cx);
                pin.setAttribute('cy', pos.cy);
                found = true;
                break;
            }
        }
        if (!found) {
            pin.setAttribute('cx', 300);
            pin.setAttribute('cy', 300);
        }
    }

    const confidence = person._confidence || 0;
    const confEl = document.getElementById('investigationConfidence');
    confEl.textContent = confidence + '%';
    confEl.className = 'investigation-confidence ' + (confidence >= 70 ? 'high' : confidence >= 40 ? 'medium' : 'low');

    const grid = document.getElementById('investigationInfoGrid');
    let html = '';
    const importantKeys = ['nom_famille', 'prenom', 'nom_naissance', 'email', 'telephone', 'adresse', 'ville', 'code_postal', 'date_naissance'];
    Object.entries(person)
        .filter(([key]) => !key.startsWith('_') && key !== 'famille')
        .forEach(([key, value]) => {
            if (!value) return;
            const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            const isImportant = importantKeys.includes(key);
            let displayValue = value;
            if (key === 'telephone' || key === 'mobile') displayValue = formatPhone(value);
            html += `
                <div class="investigation-info-item ${isImportant ? 'important' : ''}">
                    <span class="investigation-info-label">${label}</span>
                    <span class="investigation-info-value">${displayValue}</span>
                </div>
            `;
        });
    if (person.famille && person.famille.length > 0) {
        html += `
            <div class="investigation-info-item" style="grid-column:1/-1;border-top:1px solid #2a2a2a;padding-top:12px;margin-top:4px;">
                <span class="investigation-info-label" style="color:#6b6b6b;font-weight:600;">Famille (${person.famille.length})</span>
                <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:6px;">
                    ${person.famille.map(m => `<span style="background:rgba(255,255,255,0.04);border:1px solid #2a2a2a;border-radius:6px;padding:4px 12px;font-size:13px;color:#a0a0a0;">${m.prenom || ''} ${m.nom_famille || ''} ${m.lien ? ' · ' + m.lien : ''}</span>`).join('')}
                </div>
            </div>
        `;
    }
    grid.innerHTML = html;

    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

document.getElementById('investigationBack')?.addEventListener('click', function() {
    document.getElementById('investigationOverlay').classList.remove('active');
    document.body.style.overflow = '';
});
document.getElementById('investigationClose')?.addEventListener('click', function() {
    document.getElementById('investigationOverlay').classList.remove('active');
    document.body.style.overflow = '';
});

document.getElementById('investigationCopy')?.addEventListener('click', function() {
    if (!investigationData) { showToast('Aucune donnee', 'error'); return; }
    const person = investigationData;
    let text = '=== Marauder Investigation ===\n\n';
    Object.entries(person)
        .filter(([key]) => !key.startsWith('_') && key !== 'famille')
        .forEach(([key, value]) => {
            if (!value) return;
            const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            let displayValue = value;
            if (key === 'telephone' || key === 'mobile') displayValue = formatPhone(value);
            text += label + ': ' + displayValue + '\n';
        });
    if (person.famille && person.famille.length > 0) {
        text += '\n=== Famille ===\n';
        person.famille.forEach(m => {
            text += (m.prenom || '') + ' ' + (m.nom_famille || '');
            if (m.lien) text += ' (' + m.lien + ')';
            text += '\n';
        });
    }
    if (person._sources) text += '\nSources: ' + person._sources.join(', ');
    text += '\n\n--- by Marauder ---';
    navigator.clipboard.writeText(text).then(() => showToast('Copie !', 'success'));
});

document.getElementById('investigationGraphe')?.addEventListener('click', function() {
    if (!investigationData) { showToast('Aucune donnee', 'error'); return; }
    if (typeof window.addPersonToGrapheWithFamily === 'function') {
        window.addPersonToGrapheWithFamily(investigationData);
        document.getElementById('investigationOverlay').classList.remove('active');
        document.body.style.overflow = '';
        document.querySelector('[data-page="graphe"]')?.click();
    } else {
        showToast('Graphe en developpement', 'info');
    }
});

document.getElementById('investigationAddFiche')?.addEventListener('click', function() {
    if (!investigationData) { showToast('Aucune donnee', 'error'); return; }
    if (fichesData.length === 0) { showToast('Aucune fiche existante', 'warning'); return; }
    const selectOptions = fichesData.map(f => `<option value="${f.id}">${f.name} (${f.persons?.length || 0}/10)</option>`).join('');
    showModal('Ajouter a une fiche', `
        <div class="form-group"><label>Selectionner une fiche</label>
        <select id="ficheSelectInvestigation">${selectOptions}<option value="new">+ Creer une nouvelle fiche</option></select></div>
        <div id="newFicheNameContainerInvestigation" style="display:none;">
            <div class="form-group"><label>Nom de la nouvelle fiche</label><input type="text" id="newFicheNameInvestigation" placeholder="Nom de la fiche" style="width:100%;padding:10px;background:#1e1e1e;border:1px solid #2a2a2a;border-radius:8px;color:#fff;"></div>
        </div>
        <div style="font-size:12px;color:#6b6b6b;">Personne: ${investigationData.prenom || ''} ${investigationData.nom_famille || 'Inconnu'}</div>
    `, 'Ajouter', async function() {
        const select = document.getElementById('ficheSelectInvestigation');
        const ficheId = select.value;
        if (ficheId === 'new') {
            const nameInput = document.getElementById('newFicheNameInvestigation');
            const name = nameInput?.value?.trim();
            if (!name) { showToast('Veuillez donner un nom', 'warning'); return; }
            try {
                const createResponse = await fetch(API_URL + '/api/fiches', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + token
                    },
                    body: JSON.stringify({ name })
                });
                const createData = await createResponse.json();
                if (createData.fiche) {
                    await addPersonToFiche(createData.fiche.id, investigationData);
                    loadFiches();
                    showToast('Personne ajoutee !', 'success');
                }
            } catch (error) { showToast('Erreur', 'error'); }
        } else {
            await addPersonToFiche(parseInt(ficheId), investigationData);
            loadFiches();
            showToast('Personne ajoutee !', 'success');
        }
    });
    document.getElementById('ficheSelectInvestigation')?.addEventListener('change', function() {
        const container = document.getElementById('newFicheNameContainerInvestigation');
        if (container) container.style.display = this.value === 'new' ? 'block' : 'none';
    });
});

// ============ TICKETS ============
async function loadTickets() {
    const container = document.getElementById('ticketsList');
    container.innerHTML = '<div class="empty-state">Chargement...</div>';

    try {
        const response = await fetch(API_URL + '/api/tickets', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const data = await response.json();
        const tickets = data.tickets || [];

        if (tickets.length === 0) {
            container.innerHTML = '<div class="empty-state">Aucun ticket</div>';
            return;
        }

        container.innerHTML = tickets.map(ticket => `
            <div class="ticket-item" onclick="viewTicket(${ticket.id})">
                <div class="ticket-header">
                    <span class="ticket-subject">${ticket.subject}</span>
                    <span class="ticket-meta">${new Date(ticket.created_at).toLocaleString()} · ${ticket.status}</span>
                </div>
                <div style="font-size:13px;color:#a0a0a0;margin-top:4px;">${ticket.message?.substring(0, 100) || ''}${ticket.message?.length > 100 ? '...' : ''}</div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Tickets error:', error);
        container.innerHTML = '<div class="empty-state" style="color:#ef4444;">Erreur de chargement</div>';
    }
}

document.getElementById('openTicketBtn').addEventListener('click', function() {
    showModal('Nouveau ticket', `
        <div class="form-group"><label>Sujet</label><input type="text" id="ticketSubject" placeholder="Resume de votre probleme" style="width:100%;padding:10px;background:#1e1e1e;border:1px solid #2a2a2a;border-radius:8px;color:#fff;"></div>
        <div class="form-group"><label>Message</label><textarea id="ticketMessage" rows="5" placeholder="Decrivez votre probleme..." style="width:100%;padding:10px;background:#1e1e1e;border:1px solid #2a2a2a;border-radius:8px;color:#fff;font-family:Arial;font-size:14px;resize:vertical;"></textarea></div>
    `, 'Envoyer', async function() {
        const subject = document.getElementById('ticketSubject').value.trim();
        const message = document.getElementById('ticketMessage').value.trim();
        if (!subject || !message) {
            showToast('Veuillez remplir tous les champs', 'warning');
            return;
        }
        try {
            const response = await fetch(API_URL + '/api/tickets', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + token
                },
                body: JSON.stringify({ subject, message })
            });
            if (response.ok) {
                showToast('Ticket cree !', 'success');
                loadTickets();
                closeModal();
            }
        } catch (error) {
            showToast('Erreur', 'error');
        }
    });
});

async function viewTicket(ticketId) {
    try {
        const response = await fetch(API_URL + '/api/tickets/' + ticketId, {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const data = await response.json();
        const ticket = data.ticket;
        const messages = data.messages || [];

        let messagesHtml = messages.map(m => `
            <div style="padding:10px 14px;margin-bottom:8px;background:${m.is_admin ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)'};border-radius:8px;border-left:${m.is_admin ? '2px solid #3b82f6' : '2px solid #2a2a2a'};">
                <div style="font-size:11px;color:#6b6b6b;margin-bottom:4px;">${m.username || 'Inconnu'}${m.is_admin ? ' · Admin' : ''} · ${new Date(m.created_at).toLocaleString()}</div>
                <div style="font-size:13px;color:#a0a0a0;">${m.message}</div>
            </div>
        `).join('');

        showModal(ticket.subject, `
            <div style="margin-bottom:12px;font-size:13px;color:#6b6b6b;">Statut: ${ticket.status} · ${new Date(ticket.created_at).toLocaleString()}</div>
            <div style="max-height:300px;overflow-y:auto;margin-bottom:12px;">${messagesHtml || 'Aucun message'}</div>
            ${ticket.status !== 'closed' ? `
                <div style="display:flex;gap:10px;border-top:1px solid #2a2a2a;padding-top:12px;">
                    <input type="text" id="ticketReplyInput" placeholder="Votre reponse..." style="flex:1;padding:10px 14px;background:#1e1e1e;border:1px solid #2a2a2a;border-radius:8px;color:#fff;font-size:14px;font-family:Arial;outline:none;">
                    <button onclick="replyTicket(${ticketId})" class="btn-primary" style="width:auto;padding:10px 24px;">Repondre</button>
                </div>
            ` : '<div style="color:#6b6b6b;font-size:13px;border-top:1px solid #2a2a2a;padding-top:12px;">Ce ticket est ferme</div>'}
        `, 'Fermer', closeModal);

    } catch (error) {
        console.error('View ticket error:', error);
        showToast('Erreur de chargement', 'error');
    }
}

async function replyTicket(ticketId) {
    const input = document.getElementById('ticketReplyInput');
    if (!input) return;
    const message = input.value.trim();
    if (!message) { showToast('Veuillez entrer un message', 'warning'); return; }

    try {
        const response = await fetch(API_URL + '/api/tickets/' + ticketId + '/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({ message })
        });
        if (response.ok) {
            showToast('Message envoye !', 'success');
            viewTicket(ticketId);
            loadTickets();
        }
    } catch (error) {
        showToast('Erreur', 'error');
    }
}

// ============ PROFIL ============
async function loadProfile() {
    const container = document.getElementById('profileInfo');
    container.innerHTML = '<div class="empty-state">Chargement...</div>';

    try {
        const response = await fetch(API_URL + '/api/me', {
            headers: { 'Authorization': 'Bearer ' + token }
        });
        const data = await response.json();
        if (data.user) {
            container.innerHTML = `
                <div class="profile-card">
                    <div class="profile-row"><span class="label">Nom d'utilisateur</span><span class="value">${data.user.username}</span></div>
                    <div class="profile-row"><span class="label">Role</span><span class="value">${data.user.role}</span></div>
                    <div class="profile-row"><span class="label">Membre depuis</span><span class="value">${new Date(data.user.created_at).toLocaleDateString()}</span></div>
                    <div class="profile-row"><span class="label">Derniere connexion</span><span class="value">${data.user.last_login ? new Date(data.user.last_login).toLocaleString() : 'Jamais'}</span></div>
                </div>
            `;
        }
    } catch (error) {
        console.error('Profile error:', error);
        container.innerHTML = '<div class="empty-state" style="color:#ef4444;">Erreur de chargement</div>';
    }
}

// ============ GRAPHE BOUTONS ============
document.getElementById('grapheAddPersonne').addEventListener('click', function() {
    if (typeof window.showModal === 'function') {
        window.showModal('Ajouter une personne', `
            <div class="form-group"><label>Prenom</label><input type="text" id="newNodePrenom" class="search-input" style="width:100%;padding:10px;background:#1e1e1e;border:1px solid #2a2a2a;border-radius:8px;color:#fff;"></div>
            <div class="form-group"><label>Nom</label><input type="text" id="newNodeNom" class="search-input" style="width:100%;padding:10px;background:#1e1e1e;border:1px solid #2a2a2a;border-radius:8px;color:#fff;"></div>
            <div class="form-group"><label>Role</label><input type="text" id="newNodeRole" class="search-input" style="width:100%;padding:10px;background:#1e1e1e;border:1px solid #2a2a2a;border-radius:8px;color:#fff;"></div>
        `, 'Ajouter', function() {
            const prenom = document.getElementById('newNodePrenom').value.trim();
            const nom = document.getElementById('newNodeNom').value.trim();
            const role = document.getElementById('newNodeRole').value.trim();
            const label = (prenom + ' ' + nom).trim() || 'Personne';
            const container = document.getElementById('grapheContainer');
            const cx = container ? container.offsetWidth / 2 : 400;
            const cy = container ? container.offsetHeight / 2 : 300;
            const newNode = {
                id: Date.now(),
                label: label,
                prenom: prenom,
                nom_famille: nom,
                role: role,
                x: cx + (Math.random() - 0.5) * 100,
                y: cy + (Math.random() - 0.5) * 100,
                radius: 24,
                color: '#ffffff'
            };
            if (typeof window.grapheNodes !== 'undefined') {
                window.grapheNodes.push(newNode);
                if (window.grapheLinkMode && window.grapheLinkFrom !== null) {
                    window.grapheEdges.push({ id: Date.now() + 1, from: window.grapheLinkFrom, to: newNode.id });
                    window.grapheLinkMode = false;
                    window.grapheLinkFrom = null;
                    const btn = document.getElementById('grapheAttacher');
                    if (btn) {
                        btn.style.background = 'rgba(255,255,255,0.05)';
                        btn.style.borderColor = 'var(--border-color)';
                        btn.style.color = 'var(--text-secondary)';
                    }
                    showToast('Personnes attachees !', 'success');
                }
                if (typeof window.renderGraphe === 'function') window.renderGraphe();
                showToast('"' + label + '" ajoute !', 'success');
            }
        });
    }
});

document.getElementById('grapheAttacher').addEventListener('click', function() {
    const nodes = window.grapheNodes || [];
    if (window.grapheLinkMode) {
        window.grapheLinkMode = false;
        window.grapheLinkFrom = null;
        this.style.background = 'rgba(255,255,255,0.05)';
        this.style.borderColor = 'var(--border-color)';
        this.style.color = 'var(--text-secondary)';
        showToast('Mode attacher desactive', 'info');
        return;
    }
    if (nodes.length < 2) { showToast('Ajoutez au moins 2 personnes', 'warning'); return; }
    window.grapheLinkMode = true;
    window.grapheLinkFrom = null;
    this.style.background = 'rgba(255,255,255,0.15)';
    this.style.borderColor = '#ffffff';
    this.style.color = '#ffffff';
    showToast('Cliquez sur une personne pour l attacher', 'info');
});

document.getElementById('grapheSauvegarder').addEventListener('click', function() {
    const nodes = window.grapheNodes || [];
    const edges = window.grapheEdges || [];
    const data = { name: 'Mon graphe', nodes: nodes, edges: edges };
    localStorage.setItem('marauder_graphe', JSON.stringify(data));
    fetch(API_URL + '/api/graphes', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify(data)
    }).then(r => r.ok ? showToast('Sauvegarde sur le serveur !', 'success') : showToast('Sauvegarde locale', 'info'))
      .catch(() => showToast('Sauvegarde locale', 'info'));
});

document.getElementById('grapheMesGraphes').addEventListener('click', showGraphesModal);

document.getElementById('grapheEffacer').addEventListener('click', function() {
    showModal('Confirmation', '<p style="color:var(--text-secondary);">Effacer tout le graphe ?</p>', 'Effacer', function() {
        if (window.grapheNodes) window.grapheNodes = [];
        if (window.grapheEdges) window.grapheEdges = [];
        if (typeof window.renderGraphe === 'function') window.renderGraphe();
        showToast('Graphe efface', 'info');
    });
});

// ============ MODAL GRAPHES ============
async function showGraphesModal() {
    const modal = document.getElementById('graphesModal');
    const list = document.getElementById('graphesList');
    if (!modal || !list) return;
    list.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted);">Chargement...</div>';
    modal.style.display = 'flex';
    try {
        const response = await fetch(API_URL + '/api/graphes/all', { headers: { 'Authorization': 'Bearer ' + token } });
        let graphes = [];
        if (response.ok) { const data = await response.json(); graphes = data.graphes || []; }
        const saved = localStorage.getItem('marauder_graphe');
        if (saved) {
            try { const data = JSON.parse(saved); graphes.push({ id: 'local', name: 'Graphe local', nodes: data.nodes || [], edges: data.edges || [], created_at: new Date().toISOString(), isLocal: true }); } catch (e) {}
        }
        if (graphes.length === 0) {
            list.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted);">Aucun graphe sauvegarde</div>';
            return;
        }
        list.innerHTML = graphes.map((g, i) => `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;background:#111;border:1px solid #2a2a2a;border-radius:10px;margin-bottom:8px;">
                <div>
                    <div style="font-weight:600;color:#fff;">${g.name || 'Sans nom'} ${g.isLocal ? '📁' : ''}</div>
                    <div style="font-size:12px;color:#6b6b6b;">${g.nodes?.length || 0} personnes · ${new Date(g.created_at).toLocaleDateString()}</div>
                </div>
                <div style="display:flex;gap:6px;">
                    <button onclick="loadGrapheFromList(${i}, ${!!g.isLocal})" style="padding:4px 12px;background:transparent;border:1px solid #2a2a2a;border-radius:6px;color:#a0a0a0;cursor:pointer;">Charger</button>
                    ${!g.isLocal ? `<button onclick="deleteGrapheFromList(${g.id})" style="padding:4px 12px;background:transparent;border:1px solid #2a2a2a;border-radius:6px;color:#ef4444;cursor:pointer;">Supprimer</button>` : ''}
                </div>
            </div>
        `).join('');
    } catch (error) {
        list.innerHTML = '<div style="text-align:center;padding:20px;color:var(--danger);">Erreur de chargement</div>';
    }
}

document.getElementById('closeGraphesModal').addEventListener('click', function() {
    document.getElementById('graphesModal').style.display = 'none';
});

async function loadGrapheFromList(index, isLocal) {
    try {
        let data;
        if (isLocal) {
            const saved = localStorage.getItem('marauder_graphe');
            if (saved) data = JSON.parse(saved);
        } else {
            const response = await fetch(API_URL + '/api/graphes/all', { headers: { 'Authorization': 'Bearer ' + token } });
            const result = await response.json();
            if (result.graphes && result.graphes[index]) data = result.graphes[index];
        }
        if (data) {
            if (window.grapheNodes) window.grapheNodes = data.nodes || [];
            if (window.grapheEdges) window.grapheEdges = data.edges || [];
            document.getElementById('graphesModal').style.display = 'none';
            if (typeof window.renderGraphe === 'function') window.renderGraphe();
            showToast('Graphe charge !', 'success');
        }
    } catch (error) { showToast('Erreur de chargement', 'error'); }
}

async function deleteGrapheFromList(grapheId) {
    if (!confirm('Supprimer ce graphe ?')) return;
    try {
        const response = await fetch(API_URL + '/api/graphes/' + grapheId, {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (response.ok) {
            showToast('Graphe supprime !', 'success');
            showGraphesModal();
        }
    } catch (error) { showToast('Erreur', 'error'); }
}

// ============ MOBILE MENU ============
document.getElementById('mobileMenuBtn').addEventListener('click', function() {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('sidebarBackdrop').classList.toggle('active');
});
document.getElementById('sidebarBackdrop').addEventListener('click', function() {
    document.getElementById('sidebar').classList.remove('open');
    this.classList.remove('active');
});

// ============ INIT ============
verifyToken();
loadProfile();
console.log('Dashboard charge');