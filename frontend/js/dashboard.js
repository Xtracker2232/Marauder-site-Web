const API_URL = window.location.origin;

const token = localStorage.getItem('token');
if (!token) {
    window.location.href = '/login';
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
    overlay.classList.add('active');
    const bar = document.querySelector('.neon-bar');
    if (bar) {
        bar.style.animation = 'none';
        bar.offsetHeight;
        bar.style.animation = 'neonSlide 1.8s ease-in-out infinite';
    }
}

function hideSearchLoading() {
    const overlay = document.getElementById('searchOverlay');
    overlay.classList.remove('active');
}

// ============ MODAL ============
function showModal(title, bodyHtml, confirmText, onConfirm) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').innerHTML = bodyHtml;
    document.getElementById('modalOverlay').classList.add('active');
    
    const confirmBtn = document.getElementById('modalConfirm');
    confirmBtn.textContent = confirmText || 'Confirmer';
    
    // Retirer les anciens écouteurs
    const newConfirm = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirm, confirmBtn);
    
    newConfirm.addEventListener('click', function() {
        if (onConfirm) onConfirm();
        closeModal();
    });
    
    document.getElementById('modalCancel').addEventListener('click', closeModal);
}

function closeModal() {
    document.getElementById('modalOverlay').classList.remove('active');
}

// ============ SECTIONS DÉPLIABLES ============
document.querySelectorAll('.section-header').forEach(header => {
    header.addEventListener('click', function() {
        const body = this.nextElementSibling;
        const icon = this.querySelector('.toggle-icon');
        body.classList.toggle('open');
        icon.classList.toggle('open');
    });
});

// ============ TABS ============
document.querySelectorAll('.search-tab').forEach(tab => {
    tab.addEventListener('click', function() {
        document.querySelectorAll('.search-tab').forEach(t => t.classList.remove('active'));
        this.classList.add('active');
        document.querySelectorAll('.search-tab-content').forEach(c => c.classList.remove('active'));
        const tabId = this.dataset.tab;
        document.getElementById(`tab-${tabId}`).classList.add('active');
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
        }
        const data = await response.json();
        document.getElementById('usernameDisplay').textContent = data.user.username;
        return data;
    } catch (error) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
    }
}

// Navigation
document.querySelectorAll('.sidebar-nav li').forEach(item => {
    item.addEventListener('click', function() {
        document.querySelectorAll('.sidebar-nav li').forEach(li => li.classList.remove('active'));
        this.classList.add('active');
        const page = this.dataset.page;
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.getElementById(`page-${page}`).classList.add('active');
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
    document.getElementById('searchResults').innerHTML = '';
});

document.getElementById('clearBtnPro').addEventListener('click', () => {
    document.querySelectorAll('#tab-pro input, #tab-pro select').forEach(el => {
        el.value = '';
    });
    document.getElementById('searchResults').innerHTML = '';
});

// ============ TOUCHE ENTREE POUR RECHERCHER ============
document.querySelectorAll('.search-input').forEach(input => {
    input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            const activeTab = document.querySelector('.search-tab.active');
            if (activeTab) {
                const tabId = activeTab.dataset.tab;
                if (tabId === 'french') {
                    document.getElementById('searchBtn').click();
                } else if (tabId === 'pro') {
                    document.getElementById('searchBtnPro').click();
                }
            }
        }
    });
});

// ============ RECHERCHE AVEC PIVOT FAMILLE ============
document.getElementById('searchBtn').addEventListener('click', async () => {
    const query = {
        flexible: true,
        per_page: 100,
        page: 1,
        
        nom_famille: document.getElementById('searchNom').value || undefined,
        prenom: document.getElementById('searchPrenom').value || undefined,
        nom_naissance: document.getElementById('searchNomNaissance').value || undefined,
        nom_affichage: document.getElementById('searchNomAffichage').value || undefined,
        email: document.getElementById('searchEmail').value || undefined,
        telephone: document.getElementById('searchPhone').value || undefined,
        nom_utilisateur: document.getElementById('searchUsername').value || undefined,
        adresse_ip: document.getElementById('searchIp').value || undefined,
        adresse: document.getElementById('searchAdresse').value || undefined,
        code_postal: document.getElementById('searchCp').value || undefined,
        ville: document.getElementById('searchVille').value || undefined,
        ville_naissance: document.getElementById('searchVilleNaissance').value || undefined,
        steam_id: document.getElementById('searchSteam').value || undefined,
        fivem_license: document.getElementById('searchFivemLicense').value || undefined,
        discord_id: document.getElementById('searchDiscord').value || undefined,
        xbox_live_id: document.getElementById('searchXbox').value || undefined,
        live_id: document.getElementById('searchLive').value || undefined,
        fivem_license2: document.getElementById('searchFivemLicense2').value || undefined,
        nir: document.getElementById('searchNir').value || undefined,
        iban: document.getElementById('searchIban').value || undefined,
        bic: document.getElementById('searchBic').value || undefined,
        vin_plaque: document.getElementById('searchVin').value || undefined
    };

    const dateNaissance = document.getElementById('searchDateNaissance').value;
    if (dateNaissance) query.date_naissance = dateNaissance;
    const jour = document.getElementById('searchJour').value;
    if (jour) query.jour_naissance = parseInt(jour);
    const mois = document.getElementById('searchMois').value;
    if (mois) query.mois_naissance = parseInt(mois);
    const annee = document.getElementById('searchAnnee').value;
    if (annee) query.annee_naissance = annee;
    const genre = document.getElementById('searchGenre').value;
    if (genre) query.genre = genre;

    Object.keys(query).forEach(key => query[key] === undefined && delete query[key]);

    if (Object.keys(query).length <= 1) {
        const container = document.getElementById('searchResults');
        container.innerHTML = '<div class="empty-state" style="color:var(--warning);">Veuillez remplir au moins un critère de recherche</div>';
        return;
    }

    const container = document.getElementById('searchResults');
    container.innerHTML = '<div class="empty-state">Recherche en cours...</div>';
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

        // Pagination auto (max 5 pages)
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

        // Déduplication
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

        // Pivot famille
        for (let p of results.slice(0, 5)) {
            const famille = [];
            const pivotDone = new Set();

            if (p.adresse && p.code_postal) {
                const pivotKey = `adresse_${p.adresse}_${p.code_postal}`;
                if (!pivotDone.has(pivotKey)) {
                    pivotDone.add(pivotKey);
                    try {
                        const pivotPayload = {
                            adresse: p.adresse,
                            code_postal: p.code_postal,
                            flexible: false,
                            per_page: 10
                        };
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
                        const pivotPayload = {
                            telephone: p.telephone,
                            flexible: false,
                            per_page: 5
                        };
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
            if (results.length > 0) {
                displayResults(container, results);
            } else {
                container.innerHTML = '<div class="empty-state">Aucun résultat trouvé</div>';
            }
        }, 1500);

    } catch (error) {
        setTimeout(() => {
            hideSearchLoading();
            container.innerHTML = '<div class="empty-state" style="color:var(--danger);">Erreur de recherche</div>';
        }, 1500);
    }
});

// ============ RECHERCHE PRO ============
document.getElementById('searchBtnPro').addEventListener('click', async () => {
    const query = {
        flexible: true,
        per_page: 100,
        page: 1,
        
        nom_famille: document.getElementById('searchNomPro').value || undefined,
        prenom: document.getElementById('searchPrenomPro').value || undefined,
        nom_naissance: document.getElementById('searchNomNaissancePro').value || undefined,
        email: document.getElementById('searchEmailPro').value || undefined,
        telephone: document.getElementById('searchPhonePro').value || undefined,
        adresse_ip: document.getElementById('searchIpPro').value || undefined,
        societe: document.getElementById('searchSociete').value || undefined,
        profession: document.getElementById('searchProfession').value || undefined,
        fonction: document.getElementById('searchFonction').value || undefined,
        siret: document.getElementById('searchSiret').value || undefined,
        siren: document.getElementById('searchSiren').value || undefined,
        nir: document.getElementById('searchNirPro').value || undefined,
        iban: document.getElementById('searchIbanPro').value || undefined,
        bic: document.getElementById('searchBicPro').value || undefined,
        vin_plaque: document.getElementById('searchVinPro').value || undefined
    };

    Object.keys(query).forEach(key => query[key] === undefined && delete query[key]);

    if (Object.keys(query).length <= 1) {
        const container = document.getElementById('searchResults');
        container.innerHTML = '<div class="empty-state" style="color:var(--warning);">Veuillez remplir au moins un critère de recherche</div>';
        return;
    }

    const container = document.getElementById('searchResults');
    container.innerHTML = '<div class="empty-state">Recherche en cours...</div>';
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

        // Pivot famille
        for (let p of results.slice(0, 5)) {
            const famille = [];
            const pivotDone = new Set();

            if (p.adresse && p.code_postal) {
                const pivotKey = `adresse_${p.adresse}_${p.code_postal}`;
                if (!pivotDone.has(pivotKey)) {
                    pivotDone.add(pivotKey);
                    try {
                        const pivotPayload = {
                            adresse: p.adresse,
                            code_postal: p.code_postal,
                            flexible: false,
                            per_page: 10
                        };
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
                        const pivotPayload = {
                            telephone: p.telephone,
                            flexible: false,
                            per_page: 5
                        };
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
            if (results.length > 0) {
                displayResults(container, results);
            } else {
                container.innerHTML = '<div class="empty-state">Aucun résultat trouvé</div>';
            }
        }, 1500);

    } catch (error) {
        setTimeout(() => {
            hideSearchLoading();
            container.innerHTML = '<div class="empty-state" style="color:var(--danger);">Erreur de recherche</div>';
        }, 1500);
    }
});

// ============ LOOKUP ============
document.getElementById('lookupBtn').addEventListener('click', async () => {
    const type = document.getElementById('lookupType').value;
    const value = document.getElementById('lookupValue').value.trim();

    if (!value) {
        const container = document.getElementById('lookupResults');
        container.innerHTML = '<div class="empty-state" style="color:var(--warning);">Veuillez entrer une valeur</div>';
        return;
    }

    const container = document.getElementById('lookupResults');
    container.innerHTML = '<div class="empty-state">Recherche en cours...</div>';
    showSearchLoading();

    try {
        const response = await fetch(`${API_URL}/api/brix/lookup/${type}/${encodeURIComponent(value)}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();

        setTimeout(() => {
            hideSearchLoading();
            if (data.data?.results?.length > 0) {
                displayLookupResults(container, data.data.results);
            } else {
                container.innerHTML = '<div class="empty-state">Aucun résultat trouvé</div>';
            }
        }, 1500);

    } catch (error) {
        setTimeout(() => {
            hideSearchLoading();
            container.innerHTML = '<div class="empty-state" style="color:var(--danger);">Erreur de lookup</div>';
        }, 1500);
    }
});

// ============ TOGGLE FICHE ============
function toggleFiche(index) {
    const details = document.getElementById(`fiche-${index}`);
    if (details) {
        details.classList.toggle('open');
    }
}

// ============ TOGGLE APPROFONDIR ============
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
        
        // Famille
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
                        ${m.email ? `<div class="tree-sub">📧 ${m.email}</div>` : ''}
                        ${m.telephone ? `<div class="tree-sub">📱 ${formatPhone(m.telephone)}</div>` : ''}
                    `).join('')}
                </div>
            `;
        }
        
        // Bouton Ajouter à la fiche
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
        const btns = document.querySelectorAll('.btn-deep');
        btns.forEach(btn => {
            if (btn.textContent.includes('Copier')) {
                btn.innerHTML = '✅ Copié !';
                setTimeout(() => {
                    btn.innerHTML = `
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                        </svg>
                        Copier
                    `;
                }, 2000);
            }
        });
    }).catch(() => {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
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
        const btns = document.querySelectorAll('.btn-deep');
        btns.forEach(btn => {
            if (btn.textContent.includes('Copier')) {
                btn.innerHTML = '✅ Copié !';
                setTimeout(() => {
                    btn.innerHTML = `
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                        </svg>
                        Copier
                    `;
                }, 2000);
            }
        });
    }).catch(() => {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
    });
}

// ============ HISTORIQUE ============
async function loadHistory() {
    const container = document.getElementById('historyList');
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
                            <div class="history-result-count ${resultCount === 0 ? 'empty' : ''}">
                                ${resultText}
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
                displayResults(container, data.results);
                // Changer d'onglet vers recherche
                document.querySelectorAll('.sidebar-nav li').forEach(li => li.classList.remove('active'));
                document.querySelector('[data-page="search"]').classList.add('active');
                document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
                document.getElementById('page-search').classList.add('active');
            } else {
                alert('Aucun résultat pour cette recherche replay');
            }
        }, 1500);
    } catch (error) {
        hideSearchLoading();
        alert('Erreur lors du replay de la recherche');
    }
}

// ============ FICHES ============
let fichesData = [];

async function loadFiches() {
    const container = document.getElementById('fichesList');
    container.innerHTML = '<div class="empty-state">Chargement...</div>';

    try {
        const response = await fetch(`${API_URL}/api/fiches`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
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
        container.innerHTML = '<div class="empty-state" style="color:var(--danger);">Erreur de chargement des fiches</div>';
    }
}

document.getElementById('createFicheBtn').addEventListener('click', () => {
    showModal('Créer une fiche', `
        <div class="form-group">
            <label>Nom de la fiche</label>
            <input type="text" id="ficheNameInput" placeholder="Ex: Enquête Dupont">
        </div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:8px;">
            Maximum 10 personnes par fiche
        </div>
    `, 'Créer', async () => {
        const name = document.getElementById('ficheNameInput').value.trim();
        if (!name) {
            alert('Veuillez donner un nom à la fiche');
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
                loadFiches();
            } else {
                alert('Erreur lors de la création');
            }
        } catch (error) {
            alert('Erreur réseau');
        }
    });
});

function addToFiche(index) {
    const person = window._resultsData[index];
    if (!person) return;

    showModal('Ajouter à une fiche', `
        <div class="form-group">
            <label>Sélectionner une fiche</label>
            <select id="ficheSelect">
                ${fichesData.map(f => `<option value="${f.id}">${f.name} (${f.persons?.length || 0}/10)</option>`).join('')}
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
        const ficheId = select.value;
        
        if (ficheId === 'new') {
            const name = document.getElementById('newFicheNameInput').value.trim();
            if (!name) {
                alert('Veuillez donner un nom à la fiche');
                return;
            }
            // Créer la fiche puis ajouter la personne
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
                }
            } catch (error) {
                alert('Erreur');
            }
        } else {
            await addPersonToFiche(parseInt(ficheId), person);
            loadFiches();
        }
    });

    // Gérer l'affichage du champ nouveau nom
    document.getElementById('ficheSelect').addEventListener('change', function() {
        const container = document.getElementById('newFicheNameContainer');
        if (this.value === 'new') {
            container.style.display = 'block';
        } else {
            container.style.display = 'none';
        }
    });
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
            alert(data.error || 'Erreur');
        }
    } catch (error) {
        alert('Erreur réseau');
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
        const name = document.getElementById('editFicheName').value.trim();
        if (!name) {
            alert('Veuillez donner un nom');
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
                loadFiches();
            }
        } catch (error) {
            alert('Erreur');
        }
    });
}

function deleteFiche(index) {
    const fiche = fichesData[index];
    if (!fiche) return;
    
    if (!confirm(`Supprimer la fiche "${fiche.name}" ?`)) return;
    
    fetch(`${API_URL}/api/fiches/${fiche.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
    }).then(() => {
        loadFiches();
    }).catch(() => {
        alert('Erreur');
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
        alert('Fiche copiée dans le presse-papiers !');
    }).catch(() => {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        alert('Fiche copiée !');
    });
}

// ============ PROFIL ============
async function loadProfile() {
    const container = document.getElementById('profileInfo');
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
let grapheDragData = null;
let grapheZoom = 1;
let graphePanX = 0;
let graphePanY = 0;
let grapheSelectedNode = null;
let grapheContextNode = null;

function initGraphe() {
    const canvas = document.getElementById('grapheCanvas');
    if (!canvas) return;
    
    // Nettoyer
    canvas.innerHTML = '';
    
    // Ajouter les nœuds et arêtes existants
    grapheNodes.forEach(node => {
        createGrapheNode(node);
    });
    grapheEdges.forEach(edge => {
        createGrapheEdge(edge);
    });
    
    // Mettre à jour les positions
    updateGraphe();
}

function createGrapheNode(node) {
    const canvas = document.getElementById('grapheCanvas');
    const el = document.createElement('div');
    el.className = 'graphe-node';
    el.id = `node-${node.id}`;
    el.style.left = `${node.x}px`;
    el.style.top = `${node.y}px`;
    el.style.backgroundColor = node.color || 'var(--bg-secondary)';
    el.style.borderColor = node.borderColor || 'var(--border-color)';
    el.textContent = node.label || 'Personne';
    
    // Bouton supprimer
    const removeBtn = document.createElement('button');
    removeBtn.className = 'node-remove';
    removeBtn.textContent = '×';
    removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        removeGrapheNode(node.id);
    });
    el.appendChild(removeBtn);
    
    // Drag
    el.addEventListener('mousedown', (e) => {
        if (e.button === 0) {
            startGrapheDrag(e, node.id);
        }
    });
    
    // Clic droit pour menu contextuel
    el.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        grapheContextNode = node.id;
        showGrapheContextMenu(e.clientX, e.clientY);
    });
    
    canvas.appendChild(el);
}

function createGrapheEdge(edge) {
    const canvas = document.getElementById('grapheCanvas');
    const el = document.createElement('div');
    el.className = 'graphe-edge';
    el.id = `edge-${edge.id}`;
    el.style.backgroundColor = edge.color || 'var(--border-color)';
    canvas.appendChild(el);
}

function startGrapheDrag(e, nodeId) {
    const node = grapheNodes.find(n => n.id === nodeId);
    if (!node) return;
    
    const canvas = document.getElementById('grapheCanvas');
    const rect = canvas.getBoundingClientRect();
    
    grapheDragData = {
        nodeId: nodeId,
        offsetX: e.clientX - rect.left - node.x,
        offsetY: e.clientY - rect.top - node.y,
        startX: node.x,
        startY: node.y
    };
    
    document.getElementById(`node-${nodeId}`).classList.add('dragging');
    
    document.addEventListener('mousemove', onGrapheDrag);
    document.addEventListener('mouseup', endGrapheDrag);
}

function onGrapheDrag(e) {
    if (!grapheDragData) return;
    
    const canvas = document.getElementById('grapheCanvas');
    const rect = canvas.getBoundingClientRect();
    
    const node = grapheNodes.find(n => n.id === grapheDragData.nodeId);
    if (!node) return;
    
    const x = e.clientX - rect.left - grapheDragData.offsetX;
    const y = e.clientY - rect.top - grapheDragData.offsetY;
    
    node.x = Math.max(0, x);
    node.y = Math.max(0, y);
    
    const el = document.getElementById(`node-${grapheDragData.nodeId}`);
    if (el) {
        el.style.left = `${node.x}px`;
        el.style.top = `${node.y}px`;
    }
    
    updateGrapheEdges();
}

function endGrapheDrag() {
    if (grapheDragData) {
        const el = document.getElementById(`node-${grapheDragData.nodeId}`);
        if (el) el.classList.remove('dragging');
    }
    grapheDragData = null;
    document.removeEventListener('mousemove', onGrapheDrag);
    document.removeEventListener('mouseup', endGrapheDrag);
}

function updateGrapheEdges() {
    grapheEdges.forEach(edge => {
        const fromNode = grapheNodes.find(n => n.id === edge.from);
        const toNode = grapheNodes.find(n => n.id === edge.to);
        if (!fromNode || !toNode) return;
        
        const el = document.getElementById(`edge-${edge.id}`);
        if (!el) return;
        
        const dx = toNode.x - fromNode.x;
        const dy = toNode.y - fromNode.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);
        
        el.style.width = `${length}px`;
        el.style.transform = `rotate(${angle}rad)`;
        el.style.left = `${fromNode.x}px`;
        el.style.top = `${fromNode.y + 15}px`;
    });
}

function updateGraphe() {
    updateGrapheEdges();
}

function removeGrapheNode(nodeId) {
    grapheNodes = grapheNodes.filter(n => n.id !== nodeId);
    grapheEdges = grapheEdges.filter(e => e.from !== nodeId && e.to !== nodeId);
    
    const el = document.getElementById(`node-${nodeId}`);
    if (el) el.remove();
    
    grapheEdges.forEach(edge => {
        const edgeEl = document.getElementById(`edge-${edge.id}`);
        if (edgeEl) edgeEl.remove();
    });
    
    // Recréer les edges
    grapheEdges.forEach(edge => {
        createGrapheEdge(edge);
    });
    updateGraphe();
}

function showGrapheContextMenu(x, y) {
    const menu = document.getElementById('grapheContextMenu');
    if (!menu) return;
    
    menu.style.display = 'block';
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    
    // Positionner dans la fenêtre
    const rect = menu.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
        menu.style.left = `${window.innerWidth - rect.width - 10}px`;
    }
    if (rect.bottom > window.innerHeight) {
        menu.style.top = `${window.innerHeight - rect.height - 10}px`;
    }
}

// Fermer le menu contextuel au clic ailleurs
document.addEventListener('click', () => {
    const menu = document.getElementById('grapheContextMenu');
    if (menu) menu.style.display = 'none';
});

// Actions du menu contextuel
document.querySelectorAll('#grapheContextMenu .menu-item').forEach(item => {
    item.addEventListener('click', function() {
        const action = this.dataset.action;
        const nodeId = grapheContextNode;
        if (nodeId === null) return;
        
        const node = grapheNodes.find(n => n.id === nodeId);
        if (!node) return;
        
        switch(action) {
            case 'edit':
                showModal('Modifier la personne', `
                    <div class="form-group">
                        <label>Nom</label>
                        <input type="text" id="editNodeNom" value="${node.label || ''}">
                    </div>
                    <div class="form-group">
                        <label>Prénom</label>
                        <input type="text" id="editNodePrenom" value="${node.prenom || ''}">
                    </div>
                `, 'Sauvegarder', () => {
                    const label = document.getElementById('editNodeNom').value.trim() || 'Personne';
                    const prenom = document.getElementById('editNodePrenom').value.trim();
                    node.label = label;
                    node.prenom = prenom;
                    const el = document.getElementById(`node-${nodeId}`);
                    if (el) el.textContent = label;
                    document.getElementById('grapheContextMenu').style.display = 'none';
                });
                break;
                
            case 'color':
                showModal('Changer la couleur', `
                    <div class="form-group">
                        <label>Couleur</label>
                        <input type="color" id="editNodeColor" value="${node.color || '#1a1a1a'}">
                    </div>
                `, 'Appliquer', () => {
                    const color = document.getElementById('editNodeColor').value;
                    node.color = color;
                    const el = document.getElementById(`node-${nodeId}`);
                    if (el) el.style.backgroundColor = color;
                    document.getElementById('grapheContextMenu').style.display = 'none';
                });
                break;
                
            case 'role':
                showModal('Changer la fonction', `
                    <div class="form-group">
                        <label>Fonction</label>
                        <input type="text" id="editNodeRole" value="${node.role || ''}" placeholder="Ex: Cible, Témoin, Suspect...">
                    </div>
                `, 'Appliquer', () => {
                    const role = document.getElementById('editNodeRole').value.trim();
                    node.role = role;
                    const el = document.getElementById(`node-${nodeId}`);
                    if (el && role) {
                        el.textContent = `${node.label} (${role})`;
                    }
                    document.getElementById('grapheContextMenu').style.display = 'none';
                });
                break;
                
            case 'detach':
                // Supprimer les edges liés
                const edgesToRemove = grapheEdges.filter(e => e.from === nodeId || e.to === nodeId);
                edgesToRemove.forEach(e => {
                    const edgeEl = document.getElementById(`edge-${e.id}`);
                    if (edgeEl) edgeEl.remove();
                });
                grapheEdges = grapheEdges.filter(e => e.from !== nodeId && e.to !== nodeId);
                document.getElementById('grapheContextMenu').style.display = 'none';
                break;
                
            case 'delete':
                if (confirm('Supprimer cette personne du graphe ?')) {
                    removeGrapheNode(nodeId);
                }
                document.getElementById('grapheContextMenu').style.display = 'none';
                break;
        }
    });
});

// Ajouter une personne au graphe
document.getElementById('grapheAddPersonne').addEventListener('click', () => {
    showModal('Ajouter une personne', `
        <div class="form-group">
            <label>Nom</label>
            <input type="text" id="grapheNewNom" placeholder="Nom">
        </div>
        <div class="form-group">
            <label>Prénom</label>
            <input type="text" id="grapheNewPrenom" placeholder="Prénom">
        </div>
        <div class="form-group">
            <label>Fonction (optionnel)</label>
            <input type="text" id="grapheNewRole" placeholder="Ex: Cible, Témoin...">
        </div>
    `, 'Ajouter', () => {
        const nom = document.getElementById('grapheNewNom').value.trim();
        const prenom = document.getElementById('grapheNewPrenom').value.trim();
        const role = document.getElementById('grapheNewRole').value.trim();
        
        const label = `${prenom} ${nom}`.trim() || 'Personne';
        
        const newNode = {
            id: Date.now(),
            label: label,
            prenom: prenom,
            nom_famille: nom,
            role: role,
            x: 100 + Math.random() * 400,
            y: 100 + Math.random() * 300,
            color: '#1a1a1a',
            borderColor: 'var(--border-color)'
        };
        
        grapheNodes.push(newNode);
        createGrapheNode(newNode);
        updateGraphe();
    });
});

// Sauvegarder le graphe
document.getElementById('grapheSauvegarder').addEventListener('click', () => {
    const data = {
        nodes: grapheNodes,
        edges: grapheEdges
    };
    localStorage.setItem('marauder_graphe', JSON.stringify(data));
    alert('Graphe sauvegardé !');
});

// Charger un graphe sauvegardé
document.getElementById('grapheMesGraphes').addEventListener('click', () => {
    const saved = localStorage.getItem('marauder_graphe');
    if (!saved) {
        alert('Aucun graphe sauvegardé');
        return;
    }
    try {
        const data = JSON.parse(saved);
        grapheNodes = data.nodes || [];
        grapheEdges = data.edges || [];
        initGraphe();
        alert('Graphe chargé !');
    } catch (e) {
        alert('Erreur de chargement');
    }
});

// Effacer le graphe
document.getElementById('grapheEffacer').addEventListener('click', () => {
    if (!confirm('Effacer tout le graphe ?')) return;
    grapheNodes = [];
    grapheEdges = [];
    initGraphe();
});

// Zoom avec la molette
document.getElementById('grapheContainer').addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    grapheZoom = Math.max(0.5, Math.min(2, grapheZoom + delta));
    // Appliquer le zoom sur tous les nodes
    document.querySelectorAll('.graphe-node').forEach(el => {
        el.style.transform = `scale(${grapheZoom})`;
        el.style.transformOrigin = 'center center';
    });
});

// Drag du fond pour déplacer la vue
let isPanning = false;
let panStartX = 0;
let panStartY = 0;
let panStartPanX = 0;
let panStartPanY = 0;

document.getElementById('grapheCanvas').addEventListener('mousedown', (e) => {
    if (e.target === e.currentTarget || e.target.id === 'grapheCanvas') {
        isPanning = true;
        panStartX = e.clientX;
        panStartY = e.clientY;
        panStartPanX = graphePanX;
        panStartPanY = graphePanY;
        document.getElementById('grapheContainer').style.cursor = 'grabbing';
    }
});

document.addEventListener('mousemove', (e) => {
    if (isPanning) {
        const dx = e.clientX - panStartX;
        const dy = e.clientY - panStartY;
        graphePanX = panStartPanX + dx;
        graphePanY = panStartPanY + dy;
        
        document.querySelectorAll('.graphe-node').forEach(el => {
            el.style.transform = `translate(${graphePanX}px, ${graphePanY}px) scale(${grapheZoom})`;
        });
        document.querySelectorAll('.graphe-edge').forEach(el => {
            el.style.transform = `translate(${graphePanX}px, ${graphePanY}px)`;
        });
    }
});

document.addEventListener('mouseup', () => {
    if (isPanning) {
        isPanning = false;
        document.getElementById('grapheContainer').style.cursor = 'grab';
    }
});

// ============ INIT ============
verifyToken();
loadProfile();