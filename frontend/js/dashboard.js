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

// ========================================
// ============ CARTE FRANCE ============
// ========================================

// Coordonnées des régions françaises
const franceRegions = {
    'Grand-Est': '258,68,257,67,256,68,255,66,253,65,252,65,252,66,251,67,249,67,249,66,248,63,246,62,246,61,245,60,243,58,241,58,238,56,237,57,236,57,236,58,235,59,233,58,233,57,231,57,230,56,226,56,225,57,223,58,222,55,221,54,221,54,220,54,220,55,220,54,219,54,220,53,219,52,216,51,215,50,212,48,211,49,210,48,210,46,210,45,208,43,209,40,210,39,210,37,208,37,206,39,206,42,202,44,197,44,196,44,197,47,196,49,197,50,194,54,193,54,193,61,192,63,190,62,185,64,185,65,186,69,184,71,184,72,184,73,185,74,181,79,181,80,180,81,182,86,183,87,181,89,180,90,180,94,182,95,184,98,186,102,187,101,188,103,191,109,198,108,199,108,200,107,203,107,206,105,210,106,210,107,211,107,211,109,213,109,214,110,214,112,213,113,214,116,219,117,220,117,220,119,223,118,223,118,223,117,227,115,228,116,229,115,230,111,231,109,232,110,233,108,233,107,233,107,237,104,241,106,244,106,246,108,249,106,253,110,254,109,254,109,258,112,258,117,259,117,261,119,261,119,262,120,262,121,263,122,265,121,267,121,268,120,267,119,269,118,269,117,270,116,270,114,269,114,269,110,270,104,270,103,269,102,269,99,271,96,271,93,272,92,272,90,273,86,273,84,274,82,275,81,279,76,280,71,274,69,273,70,268,69,268,69,267,68,265,67,265,66,264,65,261,68,258,68',
    'Nouvelle-Aquitaine': '87,138,88,141,90,143,93,152,92,156,94,157,89,159,88,158,84,158,85,157,81,158,82,158,81,160,79,163,80,163,81,164,83,168,82,169,82,172,80,173,80,175,79,175,78,176,79,178,84,181,84,183,87,184,89,187,90,192,89,193,87,189,83,185,82,182,80,184,80,185,77,211,77,209,79,207,81,209,81,211,80,211,79,211,78,212,77,213,76,214,76,217,75,223,71,243,69,246,66,250,65,251,63,251,63,253,66,253,66,255,67,255,68,254,70,255,71,255,72,256,70,260,69,261,70,262,72,262,72,260,74,260,73,261,76,262,77,263,78,263,81,265,84,266,85,265,86,266,86,268,88,268,90,270,91,271,91,270,93,271,95,270,96,265,96,264,98,263,98,262,102,257,102,255,103,255,103,251,101,251,102,250,101,246,97,246,97,245,99,239,99,236,103,235,104,236,105,235,105,234,107,234,108,233,112,233,115,232,119,232,121,232,122,229,124,229,123,228,125,225,124,224,124,223,128,222,127,217,128,215,131,212,134,210,134,208,136,207,137,201,141,201,145,204,147,203,151,203,153,202,152,200,154,200,154,198,155,197,154,196,158,191,158,189,161,190,160,183,161,182,161,179,158,176,163,171,162,168,162,166,160,161,157,159,156,157,153,157,152,157,145,156,144,157,138,158,137,159,136,158,133,158,132,158,132,156,131,156,130,153,128,153,126,151,126,148,122,141,121,139,119,138,119,139,114,140,113,139,112,136,111,136,110,134,108,132,104,136,103,134,98,134,95,135,93,137,87,138',
    'Auvergne-Rhône-Alpes': '194,159,194,156,193,155,189,153,186,146,182,149,180,147,179,148,175,148,172,145,170,145,168,147,163,148,162,149,163,152,162,153,158,154,156,157,157,159,160,161,162,166,162,168,163,171,158,176,161,179,161,182,160,183,161,190,158,189,158,191,154,196,155,197,154,198,154,200,152,200,153,202,151,203,151,206,153,209,153,212,154,214,157,213,160,214,162,211,164,206,166,204,169,206,170,208,171,209,171,211,172,213,172,213,175,205,176,206,180,203,182,204,182,207,186,207,186,206,187,206,192,210,193,215,197,222,201,225,204,222,204,224,206,223,207,223,210,225,210,223,213,223,215,225,219,223,221,224,222,223,222,226,227,226,227,228,230,229,232,227,234,226,234,224,229,221,228,220,230,217,232,218,233,216,231,215,233,212,236,212,236,210,236,208,239,208,240,206,246,204,248,205,248,202,246,200,245,198,246,196,250,198,251,197,254,196,255,195,258,194,259,195,260,194,262,192,263,192,265,191,266,185,264,185,262,183,261,180,261,178,260,178,259,177,258,177,257,174,257,172,260,172,261,171,262,168,259,165,258,166,258,163,256,162,256,162,257,158,255,156,255,155,254,154,249,155,247,157,246,156,245,157,244,159,245,160,245,161,243,162,242,163,240,163,239,164,238,163,238,162,239,161,241,160,241,159,242,156,240,155,237,159,234,160,232,160,232,159,230,158,228,160,226,160,226,159,225,159,223,155,220,153,217,154,214,153,211,164,208,160,208,161,206,160,205,161,204,160,203,161,203,163,200,165,199,164,194,164,192,163,192,161,194,159',
    'Normandie': '138,41,135,43,131,45,130,45,127,46,122,47,121,48,113,52,111,57,111,58,112,59,116,60,116,60,112,61,110,63,107,64,104,65,101,63,94,62,89,61,87,61,86,62,85,61,85,59,83,56,84,53,84,52,83,51,80,50,78,52,77,52,71,50,70,50,70,51,71,52,72,53,71,54,71,55,71,56,72,59,73,61,74,62,74,63,75,66,77,66,76,67,76,70,76,72,77,75,76,78,76,81,78,84,80,83,79,84,78,85,76,85,75,85,77,90,79,90,82,88,85,89,85,89,89,89,91,91,92,90,94,91,97,90,102,89,102,88,104,88,105,91,106,92,106,94,108,94,114,91,115,91,116,96,120,98,121,98,123,100,124,100,124,100,124,96,128,93,128,89,125,87,125,85,126,84,129,83,132,81,134,82,137,81,137,80,140,76,139,73,140,72,142,72,144,67,144,67,146,66,144,62,145,57,144,53,146,50,144,46,138,41',
    'Bourgogne-Franche-Comté': '233,107,233,107,233,108,232,110,231,109,230,111,229,115,228,116,227,115,223,117,223,118,223,118,220,119,220,117,219,117,214,116,213,113,214,112,214,110,213,109,211,109,211,107,210,107,210,106,206,105,203,107,200,107,199,108,198,108,191,109,188,103,187,101,186,102,184,98,182,95,180,94,172,96,172,99,170,101,173,105,174,108,171,111,172,112,171,113,168,115,170,117,171,120,170,121,169,122,170,125,169,128,170,129,172,133,172,136,173,137,173,140,172,145,175,148,179,148,180,147,182,149,186,146,189,153,193,155,194,156,194,159,192,161,192,163,194,164,199,164,200,165,203,163,203,161,204,160,205,161,206,160,208,161,208,160,211,164,214,153,217,154,220,153,223,155,225,159,226,159,226,160,228,160,230,158,232,159,232,160,234,160,237,159,240,155,241,150,242,148,247,143,247,142,247,139,247,138,248,137,248,137,251,136,252,134,253,133,255,131,257,128,257,126,258,125,259,124,256,124,257,122,258,119,260,120,261,119,259,117,258,117,258,112,254,109,254,109,253,110,249,106,246,108,244,106,241,106,237,104,233,107',
    'Bretagne': '84,96,85,95,85,89,85,89,82,87,79,90,77,89,75,84,71,85,69,84,70,82,69,82,68,82,67,83,66,84,68,87,67,88,67,87,66,86,66,84,64,84,64,84,63,84,62,85,61,83,60,84,61,82,59,82,55,84,54,86,52,86,52,87,51,85,50,84,49,81,45,77,46,76,44,77,43,78,44,76,44,75,43,75,41,77,42,76,41,75,41,76,39,75,38,76,37,76,36,75,35,76,34,76,34,80,32,81,31,79,28,79,28,81,27,80,26,81,26,78,24,78,24,79,22,79,18,80,17,79,15,80,14,80,13,81,14,82,13,81,12,82,13,82,10,82,9,82,8,83,8,84,9,85,8,85,7,88,8,89,10,89,11,89,15,88,16,88,18,86,15,89,15,90,16,89,18,90,17,90,19,91,18,92,19,93,21,93,18,93,17,91,15,91,12,91,12,90,12,91,11,92,12,94,13,93,17,94,18,96,17,97,16,98,15,97,9,98,8,98,11,100,13,99,12,100,13,101,14,102,15,105,14,106,16,107,19,107,19,105,20,105,20,104,21,102,20,104,22,106,23,106,23,104,26,107,27,108,28,108,28,106,28,108,30,107,29,108,29,109,32,109,32,108,33,109,34,112,35,111,36,111,36,108,36,109,37,110,38,109,36,111,38,112,36,112,39,113,40,112,39,114,40,115,40,117,40,118,41,119,40,117,41,115,42,116,44,116,44,114,45,115,46,115,48,115,49,116,49,118,48,117,45,117,47,119,54,119,56,119,54,119,55,121,62,119,62,116,65,114,71,114,72,112,77,110,80,112,81,111,82,106,85,105,84,96,84,96',
    'Centre-Val de Loire': '170,101,170,101,164,103,160,102,161,102,161,100,159,98,159,96,157,96,156,97,155,95,154,97,150,97,149,92,147,92,146,91,145,88,142,85,142,80,140,76,137,80,137,81,134,82,132,81,130,83,127,83,125,85,125,86,128,89,128,93,124,96,125,100,125,100,126,102,125,103,124,104,125,105,126,108,122,113,121,114,120,116,116,118,115,118,115,120,112,118,112,120,111,125,108,132,111,134,111,136,112,136,113,139,114,140,120,139,119,138,122,139,122,141,126,148,126,151,128,153,130,153,131,156,133,156,132,158,133,159,136,158,137,159,139,158,144,157,145,156,152,157,154,157,156,157,158,154,163,153,163,152,163,149,164,148,168,147,171,145,173,145,173,140,174,137,172,136,172,133,171,129,169,128,170,125,169,122,170,121,171,120,170,117,169,115,171,113,172,112,172,111,174,108,174,105,170,101,170,101',
    'Pays de la Loire': '97,89,94,91,93,90,91,91,90,89,85,89,85,95,84,96,85,105,82,106,81,111,80,112,77,110,72,112,71,114,65,114,62,116,62,119,55,121,55,121,55,122,54,122,53,124,53,126,55,127,56,126,58,128,61,126,64,126,61,127,60,128,61,129,60,130,59,131,63,133,64,135,63,135,63,137,61,139,60,140,60,141,65,146,66,149,67,152,71,155,73,155,75,157,76,157,78,158,78,159,78,158,80,160,80,158,82,159,85,157,85,159,88,158,89,159,94,157,93,156,93,152,90,143,88,141,87,138,93,137,95,135,98,134,103,134,104,136,108,132,111,125,112,120,112,118,115,120,115,118,116,118,120,116,121,114,122,113,126,108,125,105,124,104,125,103,126,102,125,100,123,100,121,98,120,98,116,96,115,91,114,91,108,94,107,94,107,92,105,91,104,88,102,88,102,89,97,89,97,89',
    'Corse': '287,241,286,242,286,251,282,250,280,253,275,255,274,256,273,256,272,258,272,260,270,262,270,264,271,263,273,265,270,267,271,270,275,272,273,273,272,278,276,276,276,279,275,283,280,284,277,285,277,287,279,289,285,291,286,292,287,293,290,285,289,285,290,284,291,282,291,274,294,268,292,254,289,252,290,246,289,241,287,241,287,241',
    'Île-de-France': '175,72,174,71,173,71,169,72,167,71,166,72,163,72,157,69,156,70,151,68,148,69,145,69,144,67,142,72,140,72,139,73,140,76,142,80,142,85,145,88,146,91,147,92,149,92,150,97,154,97,155,95,156,97,157,96,159,96,159,98,161,100,161,102,160,102,164,103,170,101,170,101,172,99,172,95,180,94,180,89,182,89,183,87,182,86,180,81,181,80,182,79,177,76,175,74,175,72,175,72',
    'Occitanie': '153,212,153,209,151,206,151,203,147,203,145,204,141,201,137,201,136,207,134,208,134,210,131,212,128,215,127,217,128,222,124,223,124,224,125,225,123,228,124,229,122,229,121,232,119,232,115,232,112,233,108,233,107,234,105,234,105,235,104,236,103,235,99,236,99,239,97,245,97,246,101,246,102,250,101,251,103,251,103,255,102,255,102,257,98,262,98,263,96,264,96,265,95,270,96,269,100,272,100,273,102,274,103,275,106,274,108,274,109,275,111,275,112,274,113,275,114,274,119,275,119,271,119,270,129,272,130,274,135,274,136,277,138,278,138,277,140,276,141,277,142,277,143,278,145,279,144,279,144,280,143,281,144,282,148,283,149,285,150,286,153,285,153,284,155,284,156,283,160,285,162,286,163,286,164,286,165,286,166,284,167,284,169,284,172,282,176,283,177,283,177,281,175,280,174,267,175,265,177,260,179,259,182,256,185,256,187,253,186,255,189,253,192,250,194,249,197,247,198,247,199,249,200,250,201,250,203,248,206,247,206,245,208,243,210,243,210,238,215,233,212,230,211,227,210,225,207,223,206,223,204,224,204,222,201,225,197,222,193,215,192,210,187,206,186,206,186,207,182,207,182,204,180,203,176,206,175,205,172,213,172,213,171,211,171,209,170,208,169,206,166,204,164,206,162,211,160,214,157,213,154,214,153,212',
    'Provence-Alpes-Côte d\'Azur': '236,210,236,212,233,212,232,215,233,217,232,218,230,217,228,220,229,221,234,224,234,227,232,227,230,229,228,228,227,227,223,226,222,223,221,224,220,223,215,226,214,223,210,223,211,225,212,227,212,230,215,233,211,238,210,244,208,243,206,246,207,247,204,248,202,251,202,251,209,251,210,251,210,252,210,253,211,254,215,254,216,254,217,254,216,252,217,251,219,251,221,254,226,254,227,253,228,254,228,255,229,257,228,258,233,258,233,259,235,258,236,258,239,261,239,262,240,262,241,261,242,262,242,260,243,260,244,261,245,261,247,262,246,263,247,262,247,261,248,260,249,260,252,260,252,259,254,258,256,257,258,257,259,255,257,254,260,251,260,250,264,249,264,247,264,246,265,245,267,245,268,244,269,244,269,243,270,241,271,241,272,240,273,240,274,239,275,239,277,237,277,236,277,235,277,234,279,231,280,230,280,229,281,228,281,227,280,225,280,224,279,225,273,226,273,226,271,226,269,224,265,223,262,219,263,217,261,215,261,213,262,212,263,210,264,209,265,208,264,206,264,204,263,204,260,203,258,202,258,201,257,200,257,199,256,198,255,196,251,197,250,198,246,196,245,198,246,200,249,202,248,205,247,204,240,206,240,208,237,208,236,210,236,210'
};

// Coordonnées des villes
const cityCoords = {
    'paris': { x: 280, y: 170 },
    'lyon': { x: 320, y: 300 },
    'marseille': { x: 340, y: 420 },
    'toulouse': { x: 250, y: 400 },
    'bordeaux': { x: 190, y: 370 },
    'lille': { x: 240, y: 110 },
    'nice': { x: 390, y: 390 },
    'nantes': { x: 170, y: 280 },
    'strasbourg': { x: 400, y: 170 },
    'montpellier': { x: 290, y: 390 },
    'rennes': { x: 160, y: 230 },
    'grenoble': { x: 350, y: 330 },
    'toulon': { x: 360, y: 410 },
    'angers': { x: 190, y: 260 },
    'dijon': { x: 350, y: 240 },
    'le havre': { x: 210, y: 170 },
    'reims': { x: 320, y: 160 },
    'saint-etienne': { x: 310, y: 320 },
    'limoges': { x: 220, y: 310 },
    'clermont-ferrand': { x: 270, y: 290 },
    'amiens': { x: 260, y: 140 },
    'perpignan': { x: 290, y: 430 },
    'caen': { x: 190, y: 190 },
    'orleans': { x: 270, y: 230 },
    'metz': { x: 370, y: 170 },
    'besancon': { x: 380, y: 220 },
    'mulhouse': { x: 410, y: 210 },
    'valence': { x: 330, y: 340 },
    'nimes': { x: 290, y: 370 },
    'avignon': { x: 310, y: 400 },
    'poitiers': { x: 210, y: 290 },
    'la rochelle': { x: 160, y: 300 },
    'brest': { x: 100, y: 220 },
    'lorient': { x: 120, y: 260 },
    'quimper': { x: 100, y: 240 },
    'annecy': { x: 380, y: 300 },
    'chambery': { x: 370, y: 320 },
    'pau': { x: 190, y: 400 },
    'bayonne': { x: 150, y: 410 },
    'biarritz': { x: 150, y: 420 },
    'albi': { x: 250, y: 370 },
    'carcassonne': { x: 270, y: 400 },
    'beziers': { x: 280, y: 410 },
    'sete': { x: 300, y: 410 },
    'frejus': { x: 370, y: 420 },
    'cannes': { x: 380, y: 430 },
    'antibes': { x: 385, y: 435 },
    'monaco': { x: 395, y: 440 }
};

// ============ DESSINER LA CARTE ============
function drawFranceMap(containerId, ville) {
    var container = document.getElementById(containerId);
    if (!container) return;
    
    var canvas = document.getElementById('franceCanvas');
    if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.id = 'franceCanvas';
        canvas.width = 600;
        canvas.height = 700;
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.display = 'block';
        container.appendChild(canvas);
    }
    
    var ctx = canvas.getContext('2d');
    
    // Effacer
    ctx.clearRect(0, 0, 600, 700);
    
    // Fond
    ctx.fillStyle = '#151515';
    ctx.fillRect(0, 0, 600, 700);
    
    // Grille
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 0.5;
    for (var i = 0; i <= 700; i += 50) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(600, i);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, 700);
        ctx.stroke();
    }
    
    // Dessiner les régions
    for (var region in franceRegions) {
        var coords = franceRegions[region].split(',').map(Number);
        ctx.beginPath();
        ctx.moveTo(coords[0], coords[1]);
        for (var j = 2; j < coords.length; j += 2) {
            ctx.lineTo(coords[j], coords[j+1]);
        }
        ctx.closePath();
        ctx.fillStyle = '#1a1a1a';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.lineWidth = 1;
        ctx.stroke();
    }
    
    // Ajouter le point de localisation
    if (ville) {
        var coords = getCityCoords(ville);
        if (coords) {
            // Cercle extérieur (pulsation)
            var gradient = ctx.createRadialGradient(coords.x, coords.y, 10, coords.x, coords.y, 35);
            gradient.addColorStop(0, 'rgba(255,255,255,0.3)');
            gradient.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.beginPath();
            ctx.arc(coords.x, coords.y, 35, 0, Math.PI * 2);
            ctx.fillStyle = gradient;
            ctx.fill();
            
            // Cercle extérieur
            ctx.beginPath();
            ctx.arc(coords.x, coords.y, 22, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255,255,255,0.05)';
            ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.15)';
            ctx.lineWidth = 1;
            ctx.stroke();
            
            // Point principal
            ctx.beginPath();
            ctx.arc(coords.x, coords.y, 12, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255,255,255,0.95)';
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 3;
            ctx.stroke();
            
            // Point central
            ctx.beginPath();
            ctx.arc(coords.x, coords.y, 5, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
        }
    }
}

// ============ RÉCUPÉRER LES COORDONNÉES D'UNE VILLE ============
function getCityCoords(ville) {
    if (!ville) return { x: 280, y: 170 };
    
    var cityKey = ville.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '');
    
    for (var key in cityCoords) {
        if (cityKey === key || cityKey.includes(key) || key.includes(cityKey)) {
            return cityCoords[key];
        }
    }
    
    return { x: 280, y: 170 };
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

    // ============================================
    // DESSINER LA CARTE
    // ============================================
    setTimeout(function() {
        drawFranceMap('investigationMapContainer', ville);
    }, 100);

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
                        btn.style.borderColor = '#2a2a2a';
                        btn.style.color = '#a0a0a0';
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
        this.style.borderColor = '#2a2a2a';
        this.style.color = '#a0a0a0';
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