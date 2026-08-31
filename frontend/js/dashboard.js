const API_URL = window.location.origin;

const token = localStorage.getItem('token');
if (!token) {
    window.location.href = '/login';
}

// ============ TOAST NOTIFICATIONS ============
function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
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

// ============ FORMATAGE TÉLÉPHONE ============
function formatPhone(phone) {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
        return cleaned.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5');
    }
    return phone;
}

// ============ ANIMATION DE RECHERCHE ============
function showSearchLoading() {
    const overlay = document.getElementById('searchOverlay');
    if (overlay) overlay.classList.add('active');
    const bar = document.querySelector('.neon-bar');
    if (bar) {
        bar.style.animation = 'none';
        bar.offsetHeight;
        bar.style.animation = 'neonSlide 1.8s ease-in-out infinite';
    }
}

function hideSearchLoading() {
    const overlay = document.getElementById('searchOverlay');
    if (overlay) overlay.classList.remove('active');
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

// ============ SECTIONS DÉPLIABLES ============
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

// ============ VÉRIFICATION TOKEN ============
async function verifyToken() {
    try {
        const response = await fetch(`${API_URL}/api/verify`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
            return null;
        }
        const data = await response.json();
        const display = document.getElementById('usernameDisplay');
        if (display) display.textContent = data.user.username;
        return data;
    } catch (error) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return null;
    }
}

// Navigation
document.querySelectorAll('.sidebar-nav li').forEach(item => {
    item.addEventListener('click', function() {
        document.querySelectorAll('.sidebar-nav li').forEach(li => li.classList.remove('active'));
        this.classList.add('active');
        const page = this.dataset.page;
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        const target = document.getElementById(`page-${page}`);
        if (target) target.classList.add('active');
        if (page === 'profile') loadProfile();
        if (page === 'history') loadHistory();
        if (page === 'fiches') loadFiches();
        if (page === 'graphe') initGraphe();
    });
});

// Déconnexion
document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
});

// ============ CLEAR FORM ============
document.getElementById('clearBtn').addEventListener('click', () => {
    document.querySelectorAll('#tab-french input, #tab-french select').forEach(el => {
        el.value = '';
    });
    const results = document.getElementById('searchResults');
    if (results) results.innerHTML = '';
});

document.getElementById('clearBtnPro').addEventListener('click', () => {
    document.querySelectorAll('#tab-pro input, #tab-pro select').forEach(el => {
        el.value = '';
    });
    const results = document.getElementById('searchResults');
    if (results) results.innerHTML = '';
});

// ============ TOUCHE ENTREE POUR RECHERCHER ============
document.querySelectorAll('.search-input').forEach(input => {
    input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            const activeTab = document.querySelector('.search-tab.active');
            if (activeTab) {
                const tabId = activeTab.dataset.tab;
                if (tabId === 'french') {
                    const btn = document.getElementById('searchBtn');
                    if (btn) btn.click();
                } else if (tabId === 'pro') {
                    const btn = document.getElementById('searchBtnPro');
                    if (btn) btn.click();
                }
            }
        }
    });
});

// ============ RECHERCHE FRANÇAISE ============
document.getElementById('searchBtn').addEventListener('click', async () => {
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
        const container = document.getElementById('searchResults');
        if (container) container.innerHTML = '<div class="empty-state" style="color:var(--warning);">Veuillez remplir au moins un critère de recherche</div>';
        return;
    }

    const container = document.getElementById('searchResults');
    if (container) container.innerHTML = '<div class="empty-state">Recherche en cours...</div>';
    showSearchLoading();

    try {
        const response = await fetch(`${API_URL}/api/brix/search`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
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
                    const pageResponse = await fetch(`${API_URL}/api/brix/search`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
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
            const key = `${p.nom_famille || ''}|${p.prenom || ''}|${p.email || ''}|${p.telephone || ''}`;
            if (!seen.has(key)) {
                seen.add(key);
                uniqueResults.push(p);
            }
        });
        results = uniqueResults;

        for (let p of results.slice(0, 5)) {
            const famille = [];
            const pivotDone = new Set();

            if (p.adresse && p.code_postal) {
                const pivotKey = `adresse_${p.adresse}_${p.code_postal}`;
                if (!pivotDone.has(pivotKey)) {
                    pivotDone.add(pivotKey);
                    try {
                        const pivotPayload = { adresse: p.adresse, code_postal: p.code_postal, flexible: false, per_page: 10 };
                        const pivotResponse = await fetch(`${API_URL}/api/brix/search`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
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
                                lien: 'Même adresse',
                                _sources: pr._sources || []
                            };
                            if (!famille.some(m => m.prenom === membre.prenom && m.nom_famille === membre.nom_famille)) {
                                famille.push(membre);
                            }
                        }
                    } catch (e) { /* Silence */ }
                }
            }

            if (p.telephone && famille.length < 5) {
                const pivotKey = `tel_${p.telephone}`;
                if (!pivotDone.has(pivotKey)) {
                    pivotDone.add(pivotKey);
                    try {
                        const pivotPayload = { telephone: p.telephone, flexible: false, per_page: 5 };
                        const pivotResponse = await fetch(`${API_URL}/api/brix/search`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
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
                                lien: 'Téléphone partagé',
                                _sources: pr._sources || []
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
                } else {
                    container.innerHTML = '<div class="empty-state">Aucun résultat trouvé</div>';
                }
            }
        }, 1500);

    } catch (error) {
        setTimeout(() => {
            hideSearchLoading();
            if (container) container.innerHTML = '<div class="empty-state" style="color:var(--danger);">Erreur de recherche</div>';
        }, 1500);
    }
});

// ============ RECHERCHE PRO ============
document.getElementById('searchBtnPro').addEventListener('click', async () => {
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
        const container = document.getElementById('searchResults');
        if (container) container.innerHTML = '<div class="empty-state" style="color:var(--warning);">Veuillez remplir au moins un critère de recherche</div>';
        return;
    }

    const container = document.getElementById('searchResults');
    if (container) container.innerHTML = '<div class="empty-state">Recherche en cours...</div>';
    showSearchLoading();

    try {
        const response = await fetch(`${API_URL}/api/brix/search`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
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
                    const pageResponse = await fetch(`${API_URL}/api/brix/search`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
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
            const key = `${p.nom_famille || ''}|${p.prenom || ''}|${p.email || ''}|${p.telephone || ''}`;
            if (!seen.has(key)) {
                seen.add(key);
                uniqueResults.push(p);
            }
        });
        results = uniqueResults;

        for (let p of results.slice(0, 5)) {
            const famille = [];
            const pivotDone = new Set();

            if (p.adresse && p.code_postal) {
                const pivotKey = `adresse_${p.adresse}_${p.code_postal}`;
                if (!pivotDone.has(pivotKey)) {
                    pivotDone.add(pivotKey);
                    try {
                        const pivotPayload = { adresse: p.adresse, code_postal: p.code_postal, flexible: false, per_page: 10 };
                        const pivotResponse = await fetch(`${API_URL}/api/brix/search`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
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
                                lien: 'Même adresse',
                                _sources: pr._sources || []
                            };
                            if (!famille.some(m => m.prenom === membre.prenom && m.nom_famille === membre.nom_famille)) {
                                famille.push(membre);
                            }
                        }
                    } catch (e) { /* Silence */ }
                }
            }

            if (p.telephone && famille.length < 5) {
                const pivotKey = `tel_${p.telephone}`;
                if (!pivotDone.has(pivotKey)) {
                    pivotDone.add(pivotKey);
                    try {
                        const pivotPayload = { telephone: p.telephone, flexible: false, per_page: 5 };
                        const pivotResponse = await fetch(`${API_URL}/api/brix/search`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
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
                                lien: 'Téléphone partagé',
                                _sources: pr._sources || []
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
                } else {
                    container.innerHTML = '<div class="empty-state">Aucun résultat trouvé</div>';
                }
            }
        }, 1500);

    } catch (error) {
        setTimeout(() => {
            hideSearchLoading();
            if (container) container.innerHTML = '<div class="empty-state" style="color:var(--danger);">Erreur de recherche</div>';
        }, 1500);
    }
});

// ============ LOOKUP ============
document.getElementById('lookupBtn').addEventListener('click', async () => {
    const type = document.getElementById('lookupType')?.value || 'email';
    const value = document.getElementById('lookupValue')?.value?.trim() || '';

    if (!value) {
        const container = document.getElementById('lookupResults');
        if (container) container.innerHTML = '<div class="empty-state" style="color:var(--warning);">Veuillez entrer une valeur</div>';
        return;
    }

    const container = document.getElementById('lookupResults');
    if (container) container.innerHTML = '<div class="empty-state">Recherche en cours...</div>';
    showSearchLoading();

    try {
        const response = await fetch(`${API_URL}/api/brix/lookup/${type}/${encodeURIComponent(value)}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();

        setTimeout(() => {
            hideSearchLoading();
            if (container) {
                if (data.data?.results?.length > 0) {
                    displayLookupResults(container, data.data.results);
                } else {
                    container.innerHTML = '<div class="empty-state">Aucun résultat trouvé</div>';
                }
            }
        }, 1500);

    } catch (error) {
        setTimeout(() => {
            hideSearchLoading();
            if (container) container.innerHTML = '<div class="empty-state" style="color:var(--danger);">Erreur de lookup</div>';
        }, 1500);
    }
});

// ============ TOGGLE FUNCTIONS ============
function toggleFiche(index) {
    const details = document.getElementById(`fiche-${index}`);
    if (details) {
        details.classList.toggle('open');
    }
}

function toggleDeep(index) {
    const panel = document.getElementById(`deep-${index}`);
    if (panel) {
        panel.classList.toggle('open');
    }
}

// ============ DISPLAY RESULTS ============
function displayResults(container, results) {
    const counterHtml = `
        <div class="results-counter">
            <div class="count">
                <strong>${results.length}</strong> résultat${results.length > 1 ? 's' : ''} trouvé${results.length > 1 ? 's' : ''}
            </div>
            <div class="badge">${results.length > 1 ? 'Plusieurs correspondances' : 'Correspondance unique'}</div>
        </div>
    `;

    const cardsHtml = results.map((person, index) => {
        const confidence = person._confidence || 0;
        const confidenceClass = confidence >= 70 ? 'high' : confidence >= 40 ? 'medium' : 'low';
        const fullName = `${person.prenom || ''} ${person.nom_famille || 'Inconnu'}`.trim();
        
        let fieldsHtml = '';
        const excludedKeys = ['_confidence', '_sources', '_source_db', 'famille'];
        
        Object.entries(person)
            .filter(([key]) => !key.startsWith('_') && !excludedKeys.includes(key))
            .forEach(([key, value]) => {
                if (!value) return;
                const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                const isImportant = ['nom_famille', 'prenom', 'email', 'telephone', 'adresse'].includes(key);
                let displayValue = value;
                if (key === 'telephone' || key === 'mobile') {
                    displayValue = formatPhone(value);
                }
                fieldsHtml += `
                    <div class="result-field">
                        <span class="field-label">${label}</span>
                        <span class="field-value ${isImportant ? 'highlight' : ''}">${displayValue}</span>
                    </div>
                `;
            });
        
        const sourcesHtml = person._sources ? 
            person._sources.map(s => `<span class="source-tag">${s}</span>`).join('') : '';
        
        let familleHtml = '';
        if (person.famille && person.famille.length > 0) {
            familleHtml = `
                <div class="family-tree">
                    <div class="tree-title">Famille associée (${person.famille.length})</div>
                    ${person.famille.map(m => `
                        <div class="tree-item">
                            <span>${m.prenom} ${m.nom_famille}${m.date_naissance ? ` · ${m.date_naissance}` : ''}</span>
                            <span class="relation">${m.lien || 'Lié'}</span>
                        </div>
                        ${m.email ? `<div class="tree-sub">${m.email}</div>` : ''}
                        ${m.telephone ? `<div class="tree-sub">${formatPhone(m.telephone)}</div>` : ''}
                    `).join('')}
                </div>
            `;
        }
        
        const ficheBtn = `
            <button class="btn-deep" onclick="addToFiche(${index})">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                    <line x1="12" y1="5" x2="12" y2="19"/>
                    <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                + Fiche
            </button>
        `;
        
        return `
            <div class="result-card-full" data-index="${index}">
                <div class="result-header-full">
                    <div class="result-name-full" onclick="toggleFiche(${index})">${fullName}</div>
                    <div class="result-meta">
                        <span class="confidence-badge confidence-${confidenceClass}">${confidence}%</span>
                        ${person._sources ? `<span class="result-sources-badge">${person._sources.length} source${person._sources.length > 1 ? 's' : ''}</span>` : ''}
                    </div>
                </div>
                
                <div class="result-fields" id="fiche-${index}">
                    ${fieldsHtml}
                    ${sourcesHtml ? `
                        <div class="result-sources-full" style="grid-column:1/-1;">
                            ${sourcesHtml}
                        </div>
                    ` : ''}
                </div>
                
                <div class="result-actions">
                    <button class="btn-deep" onclick="toggleDeep(${index})">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="11" cy="11" r="8"/>
                            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                        </svg>
                        Approfondir
                    </button>
                    ${ficheBtn}
                    <button class="btn-deep" onclick="copyFullCard(${index})">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                        </svg>
                        Copier
                    </button>
                    <button class="btn-deep" onclick="addToGraphe(${index})">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                            <circle cx="12" cy="12" r="3"/>
                            <line x1="3" x2="9" y1="12" y2="12"/>
                            <line x1="15" x2="21" y1="12" y2="12"/>
                            <line x1="12" x2="12" y1="3" y2="9"/>
                            <line x1="12" x2="12" y1="15" y2="21"/>
                        </svg>
                        Graphe
                    </button>
                </div>
                
                <div class="deep-panel" id="deep-${index}">
                    <h4>Approfondir</h4>
                    ${familleHtml || '<div style="color:var(--text-muted);font-size:13px;">Aucun lien familial trouvé</div>'}
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = counterHtml + cardsHtml;
    window._resultsData = results;
}

// ============ DISPLAY LOOKUP RESULTS ============
function displayLookupResults(container, results) {
    const counterHtml = `
        <div class="results-counter">
            <div class="count">
                <strong>${results.length}</strong> enregistrement${results.length > 1 ? 's' : ''} trouvé${results.length > 1 ? 's' : ''}
            </div>
            <div class="badge">Lookup brut</div>
        </div>
    `;

    const cardsHtml = results.map((row, index) => {
        let fieldsHtml = '';
        Object.entries(row)
            .filter(([key]) => !key.startsWith('_'))
            .forEach(([key, value]) => {
                if (!value) return;
                const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                const isImportant = ['nom_famille', 'prenom', 'email', 'telephone', 'adresse'].includes(key);
                let displayValue = value;
                if (key === 'telephone' || key === 'mobile') {
                    displayValue = formatPhone(value);
                }
                fieldsHtml += `
                    <div class="result-field">
                        <span class="field-label">${label}</span>
                        <span class="field-value ${isImportant ? 'highlight' : ''}">${displayValue}</span>
                    </div>
                `;
            });
        
        const source = row._source_db || 'Source inconnue';
        
        return `
            <div class="result-card-full">
                <div class="result-header-full">
                    <div class="result-name-full">Enregistrement #${index + 1}</div>
                    <div class="result-meta">
                        <span class="result-sources-badge">${source}</span>
                    </div>
                </div>
                
                <div class="result-fields open">
                    ${fieldsHtml}
                </div>
                
                <div class="result-actions">
                    <button class="btn-deep" onclick="copyLookupCard(${index})">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                        </svg>
                        Copier
                    </button>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = counterHtml + cardsHtml;
    window._lookupData = results;
}

// ============ COPY FUNCTIONS ============
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
            if (key === 'telephone' || key === 'mobile') {
                displayValue = formatPhone(value);
            }
            text += `${label}: ${displayValue}\n`;
        });
    
    if (person.famille && person.famille.length > 0) {
        text += '\n=== Famille associée ===\n';
        person.famille.forEach(m => {
            text += `${m.prenom} ${m.nom_famille}`;
            if (m.date_naissance) text += ` (${m.date_naissance})`;
            if (m.email) text += ` - ${m.email}`;
            if (m.telephone) text += ` - ${formatPhone(m.telephone)}`;
            text += ` - ${m.lien || 'Lié'}\n`;
        });
    }
    
    if (person._sources) {
        text += `\nSources: ${person._sources.join(', ')}`;
    }
    
    text += '\n\n--- by Marauder ---';
    
    navigator.clipboard.writeText(text).then(() => {
        showToast('Fiche copiée dans le presse-papiers !', 'success');
    }).catch(() => {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showToast('Fiche copiée !', 'success');
    });
}

function copyLookupCard(index) {
    const data = window._lookupData;
    if (!data || !data[index]) return;
    
    const row = data[index];
    let text = '=== Marauder Lookup ===\n\n';
    
    Object.entries(row)
        .filter(([key]) => !key.startsWith('_'))
        .forEach(([key, value]) => {
            if (!value) return;
            const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            let displayValue = value;
            if (key === 'telephone' || key === 'mobile') {
                displayValue = formatPhone(value);
            }
            text += `${label}: ${displayValue}\n`;
        });
    
    if (row._source_db) {
        text += `\nSource: ${row._source_db}`;
    }
    
    text += '\n\n--- by Marauder ---';
    
    navigator.clipboard.writeText(text).then(() => {
        showToast('Lookup copié !', 'success');
    }).catch(() => {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showToast('Lookup copié !', 'success');
    });
}

// ============ HISTORIQUE ============
async function loadHistory() {
    const container = document.getElementById('historyList');
    if (!container) return;
    container.innerHTML = '<div class="empty-state">Chargement...</div>';

    try {
        const response = await fetch(`${API_URL}/api/history`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();

        if (data.history?.length > 0) {
            container.innerHTML = data.history.map(item => {
                const date = new Date(item.created_at);
                const dateStr = date.toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                });
                const timeStr = date.toLocaleTimeString('fr-FR', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                });

                let query = item.query;
                if (typeof query === 'string') {
                    try {
                        query = JSON.parse(query);
                    } catch (e) {
                        query = { raw: query };
                    }
                }

                const nom = query.nom_famille || '';
                const prenom = query.prenom || '';
                const displayName = `${prenom} ${nom}`.trim() || 'Recherche';

                const criteriaLabels = {
                    nom_famille: 'Nom',
                    prenom: 'Prénom',
                    email: 'Email',
                    telephone: 'Téléphone',
                    adresse: 'Adresse',
                    code_postal: 'Code postal',
                    ville: 'Ville',
                    nir: 'NIR',
                    iban: 'IBAN',
                    adresse_ip: 'IP',
                    discord_id: 'Discord ID',
                    steam_id: 'Steam ID',
                    fivem_license: 'FiveM License',
                    nom_naissance: 'Nom naissance',
                    nom_affichage: 'Nom affiché',
                    nom_utilisateur: 'Nom utilisateur',
                    date_naissance: 'Date naissance',
                    annee_naissance: 'Année naissance',
                    genre: 'Genre',
                    societe: 'Société',
                    profession: 'Profession',
                    fonction: 'Fonction',
                    siret: 'SIRET',
                    siren: 'SIREN',
                    vin_plaque: 'VIN/Plaque',
                    bic: 'BIC',
                    ville_naissance: 'Ville naissance'
                };

                const criteriaHtml = Object.entries(query)
                    .filter(([key]) => !['flexible', 'per_page', 'page'].includes(key))
                    .filter(([_, value]) => value && value !== '')
                    .map(([key, value]) => {
                        const label = criteriaLabels[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                        return `<span class="history-tag">${label}: <span class="history-value">${value}</span></span>`;
                    })
                    .join('');

                let optionsHtml = '';
                if (query.flexible !== undefined) {
                    optionsHtml += `<span class="history-opt">Flexible: ${query.flexible ? '✅' : '❌'}</span>`;
                }
                if (query.per_page) {
                    optionsHtml += `<span class="history-opt">Par page: ${query.per_page}</span>`;
                }
                if (query.page && query.page > 1) {
                    optionsHtml += `<span class="history-opt">Page: ${query.page}</span>`;
                }

                const resultCount = item.results_count || 0;
                const resultText = resultCount === 0 ? 'Aucun résultat' : 
                                   resultCount === 1 ? '1 résultat' : 
                                   `${resultCount} résultats`;

                return `
                    <div class="history-item">
                        <div class="history-header">
                            <div class="history-date">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                                    <circle cx="12" cy="12" r="10"/>
                                    <polyline points="12 6 12 12 16 14"/>
                                </svg>
                                <span>${dateStr}</span>
                                <span class="history-time">${timeStr}</span>
                            </div>
                            <div style="display:flex;align-items:center;gap:12px;">
                                <span style="font-size:13px;color:var(--text-secondary);font-weight:500;">${displayName}</span>
                                <span class="history-result-count ${resultCount === 0 ? 'empty' : ''}">${resultText}</span>
                            </div>
                        </div>
                        <div class="history-body">
                            ${criteriaHtml ? `<div class="history-criteria">${criteriaHtml}</div>` : ''}
                            ${optionsHtml ? `<div class="history-options">${optionsHtml}</div>` : ''}
                        </div>
                        <div class="history-footer">
                            <button class="history-replay" onclick="replaySearch(${item.id})">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                                    <polyline points="23 4 23 10 17 10"/>
                                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                                </svg>
                                Relancer
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            container.innerHTML = `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="48" height="48">
                        <circle cx="12" cy="12" r="10"/>
                        <polyline points="12 6 12 12 16 14"/>
                    </svg>
                    <p>Aucune recherche dans l'historique</p>
                    <span style="font-size:13px;color:var(--text-muted);">Effectuez votre première recherche pour commencer</span>
                </div>
            `;
        }
    } catch (error) {
        container.innerHTML = '<div class="empty-state" style="color:var(--danger);">Erreur de chargement de l\'historique</div>';
    }
}

// ============ REPLAY SEARCH ============
async function replaySearch(searchId) {
    try {
        showSearchLoading();
        const response = await fetch(`${API_URL}/api/history/${searchId}/replay`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        const data = await response.json();
        setTimeout(() => {
            hideSearchLoading();
            if (data.results && data.results.length > 0) {
                const container = document.getElementById('searchResults');
                if (container) {
                    displayResults(container, data.results);
                }
                document.querySelectorAll('.sidebar-nav li').forEach(li => li.classList.remove('active'));
                const searchLi = document.querySelector('[data-page="search"]');
                if (searchLi) searchLi.classList.add('active');
                document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
                const searchPage = document.getElementById('page-search');
                if (searchPage) searchPage.classList.add('active');
                showToast('Recherche relancée avec succès !', 'success');
            } else {
                showToast('Aucun résultat pour cette recherche', 'warning');
            }
        }, 1500);
    } catch (error) {
        hideSearchLoading();
        showToast('Erreur lors du replay', 'error');
    }
}

// ============ FICHES ============
let fichesData = [];

async function loadFiches() {
    const container = document.getElementById('fichesList');
    if (!container) return;
    container.innerHTML = '<div class="empty-state">Chargement...</div>';

    try {
        const response = await fetch(`${API_URL}/api/fiches`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            container.innerHTML = `
                <div class="empty-state" style="color:var(--warning);">
                    <p>Erreur ${response.status}</p>
                </div>
            `;
            return;
        }
        
        const data = await response.json();
        fichesData = data.fiches || [];

        if (fichesData.length > 0) {
            container.innerHTML = fichesData.map((fiche, index) => `
                <div class="fiche-item">
                    <div class="fiche-header">
                        <span class="fiche-name">${fiche.name}</span>
                        <span class="fiche-count">${fiche.persons?.length || 0} personne${fiche.persons?.length > 1 ? 's' : ''}</span>
                    </div>
                    <div class="fiche-persons">
                        ${fiche.persons?.map(p => `
                            <span class="fiche-person">${p.prenom || ''} ${p.nom_famille || 'Inconnu'}</span>
                        `).join('') || 'Aucune personne'}
                    </div>
                    <div class="fiche-actions">
                        <button class="fiche-btn" onclick="viewFiche(${index})">👁️ Voir</button>
                        <button class="fiche-btn" onclick="editFiche(${index})">✏️ Modifier</button>
                        <button class="fiche-btn danger" onclick="deleteFiche(${index})">🗑️ Supprimer</button>
                        <button class="fiche-btn" onclick="exportFiche(${index})">📤 Exporter</button>
                    </div>
                </div>
            `).join('');
        } else {
            container.innerHTML = `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="48" height="48">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                    </svg>
                    <p>Aucune fiche créée</p>
                    <span style="font-size:13px;color:var(--text-muted);">Créez votre première fiche pour organiser vos recherches</span>
                </div>
            `;
        }
    } catch (error) {
        console.error('❌ Erreur loadFiches:', error);
        container.innerHTML = `
            <div class="empty-state" style="color:var(--danger);">
                <p>Erreur de chargement</p>
                <span style="font-size:13px;color:var(--text-muted);">${error.message}</span>
            </div>
        `;
    }
}

// Bouton Créer une fiche
const createFicheBtn = document.getElementById('createFicheBtn');
if (createFicheBtn) {
    createFicheBtn.addEventListener('click', () => {
        showModal('Créer une fiche', `
            <div class="form-group">
                <label>Nom de la fiche</label>
                <input type="text" id="ficheNameInput" placeholder="Ex: Enquête Dupont">
            </div>
            <div style="font-size:12px;color:var(--text-muted);margin-top:8px;">
                Maximum 10 personnes par fiche
            </div>
        `, 'Créer', async () => {
            const name = document.getElementById('ficheNameInput')?.value?.trim();
            if (!name) {
                showToast('Veuillez donner un nom à la fiche', 'warning');
                return;
            }
            try {
                const response = await fetch(`${API_URL}/api/fiches`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ name })
                });
                if (response.ok) {
                    showToast('Fiche créée avec succès !', 'success');
                    loadFiches();
                } else {
                    const data = await response.json();
                    showToast(data.error || 'Erreur lors de la création', 'error');
                }
            } catch (error) {
                showToast('Erreur réseau', 'error');
            }
        });
    });
}

// ============ ADD TO FICHE ============
function addToFiche(index) {
    const person = window._resultsData?.[index];
    if (!person) {
        showToast('Personne introuvable', 'error');
        return;
    }

    if (fichesData.length === 0) {
        showToast('Aucune fiche existante. Créez-en une d\'abord !', 'warning');
        return;
    }

    const selectOptions = fichesData.map(f => 
        `<option value="${f.id}">${f.name} (${f.persons?.length || 0}/10)</option>`
    ).join('');

    showModal('Ajouter à une fiche', `
        <div class="form-group">
            <label>Sélectionner une fiche</label>
            <select id="ficheSelect">
                ${selectOptions}
                <option value="new">+ Créer une nouvelle fiche</option>
            </select>
        </div>
        <div id="newFicheNameContainer" style="display:none;">
            <div class="form-group">
                <label>Nom de la nouvelle fiche</label>
                <input type="text" id="newFicheNameInput" placeholder="Nom de la fiche">
            </div>
        </div>
        <div style="font-size:12px;color:var(--text-muted);">
            Personne à ajouter : ${person.prenom || ''} ${person.nom_famille || 'Inconnu'}
        </div>
    `, 'Ajouter', async () => {
        const select = document.getElementById('ficheSelect');
        if (!select) return;
        const ficheId = select.value;
        
        if (ficheId === 'new') {
            const nameInput = document.getElementById('newFicheNameInput');
            const name = nameInput?.value?.trim();
            if (!name) {
                showToast('Veuillez donner un nom à la fiche', 'warning');
                return;
            }
            try {
                const createResponse = await fetch(`${API_URL}/api/fiches`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ name })
                });
                const createData = await createResponse.json();
                if (createData.fiche) {
                    await addPersonToFiche(createData.fiche.id, person);
                    loadFiches();
                    showToast('Personne ajoutée à la fiche !', 'success');
                }
            } catch (error) {
                showToast('Erreur', 'error');
            }
        } else {
            await addPersonToFiche(parseInt(ficheId), person);
            loadFiches();
            showToast('Personne ajoutée à la fiche !', 'success');
        }
    });

    const ficheSelect = document.getElementById('ficheSelect');
    if (ficheSelect) {
        ficheSelect.addEventListener('change', function() {
            const container = document.getElementById('newFicheNameContainer');
            if (container) {
                container.style.display = this.value === 'new' ? 'block' : 'none';
            }
        });
    }
}

async function addPersonToFiche(ficheId, person) {
    try {
        const response = await fetch(`${API_URL}/api/fiches/${ficheId}/persons`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ person })
        });
        if (!response.ok) {
            const data = await response.json();
            showToast(data.error || 'Erreur', 'error');
        }
    } catch (error) {
        showToast('Erreur réseau', 'error');
    }
}

function viewFiche(index) {
    const fiche = fichesData[index];
    if (!fiche) return;
    
    const personsHtml = fiche.persons?.map(p => `
        <div style="padding:4px 0;border-bottom:1px solid var(--border-color);font-size:13px;color:var(--text-secondary);">
            ${p.prenom || ''} ${p.nom_famille || 'Inconnu'}
            ${p.email ? ` · ${p.email}` : ''}
            ${p.telephone ? ` · ${formatPhone(p.telephone)}` : ''}
        </div>
    `).join('') || 'Aucune personne';
    
    showModal(`Fiche: ${fiche.name}`, `
        <div style="margin-bottom:12px;font-size:13px;color:var(--text-muted);">
            ${fiche.persons?.length || 0} / 10 personnes
        </div>
        <div style="max-height:300px;overflow-y:auto;">
            ${personsHtml}
        </div>
    `, 'Fermer', closeModal);
}

function editFiche(index) {
    const fiche = fichesData[index];
    if (!fiche) return;
    
    showModal('Modifier la fiche', `
        <div class="form-group">
            <label>Nom de la fiche</label>
            <input type="text" id="editFicheName" value="${fiche.name}">
        </div>
    `, 'Sauvegarder', async () => {
        const name = document.getElementById('editFicheName')?.value?.trim();
        if (!name) {
            showToast('Veuillez donner un nom', 'warning');
            return;
        }
        try {
            const response = await fetch(`${API_URL}/api/fiches/${fiche.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ name })
            });
            if (response.ok) {
                showToast('Fiche modifiée !', 'success');
                loadFiches();
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
        <p style="color:var(--text-secondary);">Supprimer la fiche "<strong style="color:#ffffff;">${fiche.name}</strong>" ?</p>
        <p style="font-size:13px;color:var(--text-muted);margin-top:8px;">Cette action est irréversible.</p>
    `, 'Supprimer', async () => {
        try {
            const response = await fetch(`${API_URL}/api/fiches/${fiche.id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                showToast('Fiche supprimée !', 'success');
                loadFiches();
            }
        } catch (error) {
            showToast('Erreur', 'error');
        }
    });
}

function exportFiche(index) {
    const fiche = fichesData[index];
    if (!fiche) return;
    
    let text = `=== Marauder - Fiche: ${fiche.name} ===\n\n`;
    fiche.persons?.forEach((p, i) => {
        text += `Personne ${i+1}:\n`;
        Object.entries(p).forEach(([key, value]) => {
            if (value && !key.startsWith('_')) {
                const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                let displayValue = value;
                if (key === 'telephone' || key === 'mobile') {
                    displayValue = formatPhone(value);
                }
                text += `  ${label}: ${displayValue}\n`;
            }
        });
        text += '\n';
    });
    text += '\n--- by Marauder ---';
    
    navigator.clipboard.writeText(text).then(() => {
        showToast('Fiche exportée dans le presse-papiers !', 'success');
    }).catch(() => {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showToast('Fiche exportée !', 'success');
    });
}

// ============ ADD TO GRAPHE ============
function addToGraphe(index) {
    const person = window._resultsData?.[index];
    if (!person) {
        showToast('Personne introuvable', 'error');
        return;
    }
    
    const name = `${person.prenom || ''} ${person.nom_famille || 'Inconnu'}`.trim();
    
    const container = document.getElementById('grapheContainer');
    const cx = container ? container.offsetWidth / 2 : 400;
    const cy = container ? container.offsetHeight / 2 : 300;
    
    const newNode = {
        id: Date.now(),
        label: name,
        prenom: person.prenom || '',
        nom_famille: person.nom_famille || '',
        role: '',
        x: cx + (Math.random() - 0.5) * 150,
        y: cy + (Math.random() - 0.5) * 150,
        radius: 24,
        color: '#ffffff'
    };
    
    grapheNodes.push(newNode);
    
    // Forcer le rendu du graphe
    if (document.getElementById('page-graphe').classList.contains('active')) {
        if (grapheCanvas) {
            renderGraphe();
        } else {
            initGraphe();
        }
    }
    
    showToast(`"${name}" ajouté au graphe !`, 'success');
}

// ============ PROFIL ============
async function loadProfile() {
    const container = document.getElementById('profileInfo');
    if (!container) return;
    container.innerHTML = '<div class="empty-state">Chargement...</div>';

    try {
        const response = await fetch(`${API_URL}/api/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();

        if (data.user) {
            container.innerHTML = `
                <div class="profile-card">
                    <div class="profile-row">
                        <span class="label">Nom d'utilisateur</span>
                        <span class="value">${data.user.username}</span>
                    </div>
                    <div class="profile-row">
                        <span class="label">Rôle</span>
                        <span class="value">${data.user.role}</span>
                    </div>
                    <div class="profile-row">
                        <span class="label">Membre depuis</span>
                        <span class="value">${new Date(data.user.created_at).toLocaleDateString()}</span>
                    </div>
                    <div class="profile-row">
                        <span class="label">Dernière connexion</span>
                        <span class="value">${data.user.last_login ? new Date(data.user.last_login).toLocaleString() : 'Jamais'}</span>
                    </div>
                    <div class="profile-row">
                        <span class="label">Total recherches</span>
                        <span class="value">${data.stats?.total_searches || 0}</span>
                    </div>
                </div>
            `;
        }
    } catch (error) {
        container.innerHTML = '<div class="empty-state" style="color:var(--danger);">Erreur de chargement</div>';
    }
}

// ============ GRAPHE ============
let grapheNodes = [];
let grapheEdges = [];
let grapheZoom = 1;
let graphePanX = 0;
let graphePanY = 0;
let grapheIsPanning = false;
let graphePanStartX = 0;
let graphePanStartY = 0;
let graphePanStartPanX = 0;
let graphePanStartPanY = 0;
let grapheDraggingNode = null;
let grapheDragOffsetX = 0;
let grapheDragOffsetY = 0;
let grapheContextNode = null;
let grapheLinkMode = false;
let grapheLinkFrom = null;
let grapheCanvas = null;
let grapheCtx = null;
let grapheAnimationId = null;

function initGraphe() {
    grapheCanvas = document.getElementById('grapheCanvas');
    if (!grapheCanvas) return;
    
    grapheCtx = grapheCanvas.getContext('2d');
    resizeGraphe();
    
    grapheCanvas.onmousedown = onGrapheMouseDown;
    grapheCanvas.onmousemove = onGrapheMouseMove;
    grapheCanvas.onmouseup = onGrapheMouseUp;
    grapheCanvas.onmouseleave = onGrapheMouseUp;
    grapheCanvas.onwheel = onGrapheWheel;
    grapheCanvas.oncontextmenu = (e) => e.preventDefault();
    
    window.addEventListener('resize', resizeGraphe);
    
    if (grapheAnimationId) cancelAnimationFrame(grapheAnimationId);
    renderGraphe();
}

function resizeGraphe() {
    const container = document.getElementById('grapheContainer');
    if (!container || !grapheCanvas) return;
    const rect = container.getBoundingClientRect();
    grapheCanvas.width = rect.width;
    grapheCanvas.height = rect.height;
    grapheCanvas.style.width = rect.width + 'px';
    grapheCanvas.style.height = rect.height + 'px';
}

function getGrapheMousePos(e) {
    const rect = grapheCanvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

function getNodeAtGraphe(x, y) {
    const wx = (x - graphePanX) / grapheZoom;
    const wy = (y - graphePanY) / grapheZoom;
    for (let i = grapheNodes.length - 1; i >= 0; i--) {
        const node = grapheNodes[i];
        const dx = wx - node.x;
        const dy = wy - node.y;
        const r = node.radius || 24;
        if (dx * dx + dy * dy < r * r) {
            return node;
        }
    }
    return null;
}

function renderGraphe() {
    if (!grapheCtx || !grapheCanvas) return;
    
    const W = grapheCanvas.width;
    const H = grapheCanvas.height;
    
    grapheCtx.clearRect(0, 0, W, H);
    
    // Grille
    const step = 40;
    const ox = graphePanX % step;
    const oy = graphePanY % step;
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
    grapheCtx.translate(graphePanX, graphePanY);
    grapheCtx.scale(grapheZoom, grapheZoom);
    
    // Arêtes
    grapheEdges.forEach(edge => {
        const from = grapheNodes.find(n => n.id === edge.from);
        const to = grapheNodes.find(n => n.id === edge.to);
        if (!from || !to) return;
        grapheCtx.beginPath();
        grapheCtx.moveTo(from.x, from.y);
        grapheCtx.lineTo(to.x, to.y);
        grapheCtx.strokeStyle = 'rgba(255,255,255,0.3)';
        grapheCtx.lineWidth = 2 / grapheZoom;
        grapheCtx.shadowColor = 'rgba(255,255,255,0.05)';
        grapheCtx.shadowBlur = 10;
        grapheCtx.stroke();
        grapheCtx.shadowBlur = 0;
    });
    
    // Nœuds
    grapheNodes.forEach(node => {
        const r = node.radius || 24;
        const isSelected = grapheLinkMode && grapheLinkFrom === node.id;
        const isHover = node._hover;
        
        grapheCtx.shadowColor = 'rgba(255,255,255,0.05)';
        grapheCtx.shadowBlur = 20;
        
        // Glow si sélectionné
        if (isSelected) {
            grapheCtx.beginPath();
            grapheCtx.arc(node.x, node.y, r + 10, 0, Math.PI * 2);
            grapheCtx.fillStyle = 'rgba(255,255,255,0.05)';
            grapheCtx.fill();
        }
        
        // Cercle principal
        const grad = grapheCtx.createRadialGradient(
            node.x - r * 0.3, node.y - r * 0.3, r * 0.1,
            node.x, node.y, r
        );
        const color = node.color || '#ffffff';
        grad.addColorStop(0, color);
        grad.addColorStop(1, color + '33');
        grapheCtx.beginPath();
        grapheCtx.arc(node.x, node.y, r, 0, Math.PI * 2);
        grapheCtx.fillStyle = grad;
        grapheCtx.fill();
        grapheCtx.strokeStyle = isSelected ? '#ffffff' : (isHover ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)');
        grapheCtx.lineWidth = isSelected ? 3 / grapheZoom : 1.5 / grapheZoom;
        grapheCtx.stroke();
        grapheCtx.shadowBlur = 0;
        
        // Petit personnage
        const s = r * 0.4;
        grapheCtx.fillStyle = 'rgba(255,255,255,0.7)';
        grapheCtx.beginPath();
        grapheCtx.arc(node.x, node.y - s * 0.2, s * 0.35, 0, Math.PI * 2);
        grapheCtx.fill();
        grapheCtx.beginPath();
        grapheCtx.ellipse(node.x, node.y + s * 0.5, s * 0.5, s * 0.4, 0, 0, Math.PI * 2);
        grapheCtx.fill();
        
        // Label
        grapheCtx.fillStyle = '#ffffff';
        grapheCtx.font = `${12 / grapheZoom}px Inter`;
        grapheCtx.textAlign = 'center';
        grapheCtx.textBaseline = 'top';
        let label = node.label || 'Personne';
        if (grapheCtx.measureText(label).width > r * 2.5) {
            label = label.slice(0, 12) + '...';
        }
        grapheCtx.fillText(label, node.x, node.y + r + 6 / grapheZoom);
        
        // Rôle
        if (node.role) {
            grapheCtx.fillStyle = 'rgba(255,255,255,0.4)';
            grapheCtx.font = `${10 / grapheZoom}px Inter`;
            grapheCtx.fillText(node.role, node.x, node.y + r + 22 / grapheZoom);
        }
    });
    
    grapheCtx.restore();
    
    grapheAnimationId = requestAnimationFrame(renderGraphe);
}

// ============ SOURIS GRAPHE ============
function onGrapheMouseDown(e) {
    const pos = getGrapheMousePos(e);
    const node = getNodeAtGraphe(pos.x, pos.y);
    
    if (e.button === 2) {
        if (node) {
            grapheContextNode = node;
            showGrapheMenu(e.clientX, e.clientY);
        }
        return;
    }
    
    if (grapheLinkMode && node) {
        if (grapheLinkFrom === null) {
            grapheLinkFrom = node.id;
            showToast('Sélectionnez la destination', 'info');
            return;
        }
        if (grapheLinkFrom !== node.id) {
            grapheEdges.push({ id: Date.now(), from: grapheLinkFrom, to: node.id });
            grapheLinkFrom = null;
            grapheLinkMode = false;
            const btn = document.getElementById('grapheAttacher');
            if (btn) {
                btn.style.background = 'rgba(255,255,255,0.05)';
                btn.style.borderColor = 'var(--border-color)';
                btn.style.color = 'var(--text-secondary)';
            }
            showToast('Personnes attachées !', 'success');
            return;
        }
        return;
    }
    
    if (node) {
        grapheDraggingNode = node;
        const wx = (pos.x - graphePanX) / grapheZoom;
        const wy = (pos.y - graphePanY) / grapheZoom;
        grapheDragOffsetX = wx - node.x;
        grapheDragOffsetY = wy - node.y;
        grapheCanvas.style.cursor = 'grabbing';
        return;
    }
    
    grapheIsPanning = true;
    graphePanStartX = pos.x;
    graphePanStartY = pos.y;
    graphePanStartPanX = graphePanX;
    graphePanStartPanY = graphePanY;
    grapheCanvas.style.cursor = 'grabbing';
}

function onGrapheMouseMove(e) {
    const pos = getGrapheMousePos(e);
    
    // Hover
    const node = getNodeAtGraphe(pos.x, pos.y);
    grapheNodes.forEach(n => n._hover = false);
    if (node) node._hover = true;
    
    if (grapheDraggingNode) {
        const wx = (pos.x - graphePanX) / grapheZoom;
        const wy = (pos.y - graphePanY) / grapheZoom;
        grapheDraggingNode.x = wx - grapheDragOffsetX;
        grapheDraggingNode.y = wy - grapheDragOffsetY;
        return;
    }
    
    if (grapheIsPanning) {
        graphePanX = graphePanStartPanX + (pos.x - graphePanStartX);
        graphePanY = graphePanStartPanY + (pos.y - graphePanStartY);
    }
}

function onGrapheMouseUp() {
    grapheDraggingNode = null;
    grapheIsPanning = false;
    grapheCanvas.style.cursor = 'grab';
}

function onGrapheWheel(e) {
    e.preventDefault();
    const pos = getGrapheMousePos(e);
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.3, Math.min(3, grapheZoom * delta));
    const wx = (pos.x - graphePanX) / grapheZoom;
    const wy = (pos.y - graphePanY) / grapheZoom;
    grapheZoom = newZoom;
    graphePanX = pos.x - wx * grapheZoom;
    graphePanY = pos.y - wy * grapheZoom;
}

// ============ MENU CONTEXTUEL ============
function showGrapheMenu(x, y) {
    const menu = document.getElementById('grapheContextMenu');
    if (!menu) return;
    menu.style.display = 'block';
    menu.style.left = Math.min(x, window.innerWidth - 220) + 'px';
    menu.style.top = Math.min(y, window.innerHeight - 300) + 'px';
}

document.addEventListener('click', () => {
    const menu = document.getElementById('grapheContextMenu');
    if (menu) menu.style.display = 'none';
});

// ============ ACTIONS MENU ============
document.querySelectorAll('#grapheContextMenu .menu-item').forEach(item => {
    item.addEventListener('click', function(e) {
        e.stopPropagation();
        const action = this.dataset.action;
        const nodeId = grapheContextNode?.id;
        if (!nodeId) return;
        const node = grapheNodes.find(n => n.id === nodeId);
        if (!node) return;
        hideGrapheMenu();
        
        switch(action) {
            case 'edit':
                showModal('Modifier', `
                    <div class="form-group"><label>Nom</label><input type="text" id="editNodeName" value="${node.label || ''}" class="search-input"></div>
                    <div class="form-group"><label>Rôle</label><input type="text" id="editNodeRole" value="${node.role || ''}" class="search-input"></div>
                `, 'Sauvegarder', () => {
                    node.label = document.getElementById('editNodeName').value.trim() || 'Personne';
                    node.role = document.getElementById('editNodeRole').value.trim();
                });
                break;
            case 'color':
                const colors = ['#ffffff', '#ef4444', '#f59e0b', '#22c55e', '#06b6d4', '#ec4899', '#8b5cf6', '#f97316'];
                const colorHtml = colors.map(c => `
                    <button onclick="changeNodeColor(${node.id}, '${c}')" style="width:30px;height:30px;border-radius:50%;border:2px solid ${c === node.color ? '#fff' : 'transparent'};background:${c};cursor:pointer;margin:3px;"></button>
                `).join('');
                showModal('Couleur', `<div style="display:flex;flex-wrap:wrap;gap:4px;justify-content:center;padding:8px 0;">${colorHtml}</div>`, 'Fermer', closeModal);
                break;
            case 'role':
                showModal('Fonction', `
                    <div class="form-group"><label>Fonction</label><input type="text" id="editRoleInput" value="${node.role || ''}" class="search-input"></div>
                `, 'Appliquer', () => {
                    node.role = document.getElementById('editRoleInput').value.trim();
                });
                break;
            case 'link':
                grapheLinkMode = true;
                grapheLinkFrom = node.id;
                const btn = document.getElementById('grapheAttacher');
                if (btn) {
                    btn.style.background = 'rgba(255,255,255,0.15)';
                    btn.style.borderColor = '#ffffff';
                    btn.style.color = '#ffffff';
                }
                showToast('Cliquez sur une personne pour l\'attacher', 'info');
                break;
            case 'detach':
                const toRemove = grapheEdges.filter(e => e.from === node.id || e.to === node.id);
                toRemove.forEach(e => {
                    grapheEdges = grapheEdges.filter(ed => ed.id !== e.id);
                });
                showToast('Personne détachée', 'info');
                break;
            case 'delete':
                showModal('Confirmation', `<p style="color:var(--text-secondary);">Supprimer "${node.label}" du graphe ?</p>`, 'Supprimer', () => {
                    grapheNodes = grapheNodes.filter(n => n.id !== node.id);
                    grapheEdges = grapheEdges.filter(e => e.from !== node.id && e.to !== node.id);
                    showToast('Personne supprimée', 'info');
                });
                break;
        }
    });
});

function changeNodeColor(nodeId, color) {
    const node = grapheNodes.find(n => n.id === nodeId);
    if (node) { node.color = color; closeModal(); }
}

function hideGrapheMenu() {
    const menu = document.getElementById('grapheContextMenu');
    if (menu) menu.style.display = 'none';
}

// ============ BOUTONS GRAPHE ============

// Ajouter une personne
document.getElementById('grapheAddPersonne')?.addEventListener('click', () => {
    showModal('Ajouter une personne', `
        <div class="form-group"><label>Prénom</label><input type="text" id="newNodePrenom" class="search-input"></div>
        <div class="form-group"><label>Nom</label><input type="text" id="newNodeNom" class="search-input"></div>
        <div class="form-group"><label>Rôle</label><input type="text" id="newNodeRole" class="search-input"></div>
    `, 'Ajouter', () => {
        const prenom = document.getElementById('newNodePrenom').value.trim();
        const nom = document.getElementById('newNodeNom').value.trim();
        const role = document.getElementById('newNodeRole').value.trim();
        const label = `${prenom} ${nom}`.trim() || 'Personne';
        const container = document.getElementById('grapheContainer');
        const cx = container ? container.offsetWidth / 2 : 400;
        const cy = container ? container.offsetHeight / 2 : 300;
        grapheNodes.push({
            id: Date.now(),
            label: label,
            role: role,
            x: cx + (Math.random() - 0.5) * 150,
            y: cy + (Math.random() - 0.5) * 150,
            radius: 24,
            color: ['#ffffff','#ef4444','#f59e0b','#22c55e','#06b6d4','#ec4899','#8b5cf6','#f97316'][Math.floor(Math.random() * 8)]
        });
        if (grapheLinkMode && grapheLinkFrom !== null) {
            grapheEdges.push({ id: Date.now() + 1, from: grapheLinkFrom, to: grapheNodes[grapheNodes.length - 1].id });
            grapheLinkMode = false;
            grapheLinkFrom = null;
            const btn = document.getElementById('grapheAttacher');
            if (btn) {
                btn.style.background = 'rgba(255,255,255,0.05)';
                btn.style.borderColor = 'var(--border-color)';
                btn.style.color = 'var(--text-secondary)';
            }
            showToast('Personnes attachées !', 'success');
        }
        showToast(`"${label}" ajouté au graphe !`, 'success');
    });
});

// Attacher
document.getElementById('grapheAttacher')?.addEventListener('click', function() {
    if (grapheLinkMode) {
        grapheLinkMode = false;
        grapheLinkFrom = null;
        this.style.background = 'rgba(255,255,255,0.05)';
        this.style.borderColor = 'var(--border-color)';
        this.style.color = 'var(--text-secondary)';
        showToast('Mode attacher désactivé', 'info');
        return;
    }
    if (grapheNodes.length < 2) {
        showToast('Ajoutez au moins 2 personnes au graphe', 'warning');
        return;
    }
    grapheLinkMode = true;
    grapheLinkFrom = null;
    this.style.background = 'rgba(255,255,255,0.15)';
    this.style.borderColor = '#ffffff';
    this.style.color = '#ffffff';
    showToast('Cliquez sur une personne pour l\'attacher', 'info');
});

// Sauvegarder
document.getElementById('grapheSauvegarder')?.addEventListener('click', () => {
    const data = { name: 'Mon graphe', nodes: grapheNodes, edges: grapheEdges };
    localStorage.setItem('marauder_graphe', JSON.stringify(data));
    fetch(`${API_URL}/api/graphes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(data)
    })
    .then(r => r.ok ? showToast('Graphe sauvegardé !', 'success') : showToast('Sauvegarde locale', 'info'))
    .catch(() => showToast('Sauvegarde locale', 'info'));
});

// Mes graphes
document.getElementById('grapheMesGraphes')?.addEventListener('click', showGraphesModal);

// Effacer
document.getElementById('grapheEffacer')?.addEventListener('click', () => {
    showModal('Confirmation', '<p style="color:var(--text-secondary);">Effacer tout le graphe ?</p>', 'Effacer', () => {
        grapheNodes = [];
        grapheEdges = [];
        showToast('Graphe effacé', 'info');
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
        const response = await fetch(`${API_URL}/api/graphes/all`, { headers: { 'Authorization': `Bearer ${token}` } });
        let graphes = [];
        if (response.ok) { const data = await response.json(); graphes = data.graphes || []; }
        const saved = localStorage.getItem('marauder_graphe');
        if (saved) {
            try { const data = JSON.parse(saved); graphes.push({ id: 'local', name: 'Graphe local', nodes: data.nodes || [], edges: data.edges || [], created_at: new Date().toISOString(), isLocal: true }); } catch (e) {}
        }
        if (graphes.length === 0) {
            list.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted);">Aucun graphe sauvegardé</div>';
            return;
        }
        list.innerHTML = graphes.map((g, i) => `
            <div class="graphe-item" style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;background:#111;border:1px solid #2a2a2a;border-radius:10px;margin-bottom:8px;">
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

document.getElementById('closeGraphesModal')?.addEventListener('click', () => {
    document.getElementById('graphesModal').style.display = 'none';
});

async function loadGrapheFromList(index, isLocal) {
    try {
        let data;
        if (isLocal) {
            const saved = localStorage.getItem('marauder_graphe');
            if (saved) data = JSON.parse(saved);
        } else {
            const response = await fetch(`${API_URL}/api/graphes/all`, { headers: { 'Authorization': `Bearer ${token}` } });
            const result = await response.json();
            if (result.graphes && result.graphes[index]) data = result.graphes[index];
        }
        if (data) {
            grapheNodes = data.nodes || [];
            grapheEdges = data.edges || [];
            document.getElementById('graphesModal').style.display = 'none';
            showToast('Graphe chargé !', 'success');
        }
    } catch (error) { showToast('Erreur de chargement', 'error'); }
}

async function deleteGrapheFromList(grapheId) {
    if (!confirm('Supprimer ce graphe ?')) return;
    try {
        const response = await fetch(`${API_URL}/api/graphes/${grapheId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            showToast('Graphe supprimé !', 'success');
            showGraphesModal();
        }
    } catch (error) { showToast('Erreur', 'error'); }
}

// ============ INIT ============
verifyToken();
loadProfile();