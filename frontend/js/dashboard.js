const API_URL = window.location.origin;

const token = localStorage.getItem('token');
if (!token) {
    window.location.href = '/';
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
            window.location.href = '/';
        }
        const data = await response.json();
        document.getElementById('usernameDisplay').textContent = data.user.username;
        return data;
    } catch (error) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/';
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

// ============ RECHERCHE AVEC PIVOT FAMILLE (comme Xtracker) ============
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

        // ============ PIVOT FAMILLE (comme Xtracker) ============
        for (let p of results.slice(0, 5)) {
            const famille = [];
            const pivotDone = new Set();

            // Pivot par adresse + code postal
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
                            // Exclure la personne elle-même
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
                            // Éviter les doublons
                            if (!famille.some(m => m.prenom === membre.prenom && m.nom_famille === membre.nom_famille)) {
                                famille.push(membre);
                            }
                        }
                    } catch (e) { /* Silence */ }
                }
            }

            // Pivot par téléphone (si moins de 5 membres trouvés)
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

// ============ RECHERCHE PRO (sans pivot pour l'instant) ============
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
        const results = data.data?.results || [];

        // Pivot famille pour la recherche Pro aussi
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

// ============ DISPLAY RESULTS AVEC FAMILLE ============
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
                fieldsHtml += `
                    <div class="result-field">
                        <span class="field-label">${label}</span>
                        <span class="field-value ${isImportant ? 'highlight' : ''}">${value}</span>
                    </div>
                `;
            });
        
        const sourcesHtml = person._sources ? 
            person._sources.map(s => `<span class="source-tag">${s}</span>`).join('') : '';
        
        // ============ FAMILLE (comme Xtracker) ============
        let familleHtml = '';
        if (person.famille && person.famille.length > 0) {
            familleHtml = `
                <div class="family-tree" style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border-color);">
                    <div class="tree-title" style="font-size:12px;font-weight:500;color:var(--text-muted);margin-bottom:8px;">
                        👨‍👩‍👧‍👦 Famille associée (${person.famille.length})
                    </div>
                    ${person.famille.map(m => `
                        <div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;font-size:13px;border-bottom:1px solid rgba(255,255,255,0.03);">
                            <span style="color:var(--text-secondary);">
                                ${m.prenom} ${m.nom_famille}
                                ${m.date_naissance ? ` · <span style="color:var(--text-muted);font-size:11px;">${m.date_naissance}</span>` : ''}
                            </span>
                            <span style="font-size:10px;color:var(--text-muted);background:rgba(255,255,255,0.03);padding:2px 10px;border-radius:4px;">
                                ${m.lien || 'Lié'}
                            </span>
                        </div>
                        ${m.email ? `<div style="font-size:11px;color:var(--text-muted);padding-left:12px;">📧 ${m.email}</div>` : ''}
                        ${m.telephone ? `<div style="font-size:11px;color:var(--text-muted);padding-left:12px;">📱 ${m.telephone}</div>` : ''}
                    `).join('')}
                </div>
            `;
        }
        
        return `
            <div class="result-card-full" data-index="${index}">
                <div class="result-header-full">
                    <div class="result-name-full">${fullName}</div>
                    <div class="result-meta">
                        <span class="confidence-badge confidence-${confidenceClass}">${confidence}%</span>
                        ${person._sources ? `<span class="result-sources-badge">${person._sources.length} source${person._sources.length > 1 ? 's' : ''}</span>` : ''}
                    </div>
                </div>
                
                <div class="result-fields">${fieldsHtml}</div>
                
                ${sourcesHtml ? `
                    <div class="result-sources-full">
                        ${sourcesHtml}
                    </div>
                ` : ''}
                
                ${familleHtml}
                
                <div class="result-actions">
                    <button class="btn-deep" onclick="copyFullCard(${index})">
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
                fieldsHtml += `
                    <div class="result-field">
                        <span class="field-label">${label}</span>
                        <span class="field-value ${isImportant ? 'highlight' : ''}">${value}</span>
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
                
                <div class="result-fields">${fieldsHtml}</div>
                
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
            text += `${label}: ${value}\n`;
        });
    
    if (person.famille && person.famille.length > 0) {
        text += '\n=== Famille associée ===\n';
        person.famille.forEach(m => {
            text += `${m.prenom} ${m.nom_famille}`;
            if (m.date_naissance) text += ` (${m.date_naissance})`;
            if (m.email) text += ` - ${m.email}`;
            if (m.telephone) text += ` - ${m.telephone}`;
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
            text += `${label}: ${value}\n`;
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
            container.innerHTML = data.history.map(item => `
                <div class="result-card-full">
                    <div style="display:flex;justify-content:space-between;font-size:14px;color:var(--text-secondary)">
                        <span>${new Date(item.created_at).toLocaleString()}</span>
                        <span>${item.results_count || 0} résultats</span>
                    </div>
                    <div style="margin-top:8px;font-size:13px;color:var(--text-muted);font-family:monospace">
                        ${JSON.stringify(item.query, null, 2)}
                    </div>
                </div>
            `).join('');
        } else {
            container.innerHTML = '<div class="empty-state">Aucun historique</div>';
        }
    } catch (error) {
        container.innerHTML = '<div class="empty-state" style="color:var(--danger);">Erreur de chargement</div>';
    }
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

// ============ INIT ============
verifyToken();
loadProfile();