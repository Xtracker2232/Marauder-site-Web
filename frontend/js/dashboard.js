const API_URL = window.location.origin;

// Vérification token
const token = localStorage.getItem('token');
if (!token) {
    window.location.href = '/';
}

// ============ FONCTIONS DES SECTIONS DÉPLIABLES ============
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

// ============ RECHERCHE FRANÇAISE ============
document.getElementById('searchBtn').addEventListener('click', async () => {
    const query = {
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
        vin_plaque: document.getElementById('searchVin').value || undefined,
        flexible: true,
        per_page: 20
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
        // Message sur la page au lieu d'alert
        const container = document.getElementById('searchResults');
        container.innerHTML = '<div class="empty-state" style="color:var(--warning);">Veuillez remplir au moins un critère de recherche</div>';
        return;
    }

    const container = document.getElementById('searchResults');
    container.innerHTML = '<div class="empty-state">Recherche en cours...</div>';

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

        if (data.data?.results?.length > 0) {
            displayResults(container, data.data.results);
        } else {
            container.innerHTML = '<div class="empty-state">Aucun résultat trouvé</div>';
        }
    } catch (error) {
        container.innerHTML = '<div class="empty-state" style="color:var(--danger);">Erreur de recherche</div>';
    }
});

// ============ RECHERCHE PRO ============
document.getElementById('searchBtnPro').addEventListener('click', async () => {
    const query = {
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
        vin_plaque: document.getElementById('searchVinPro').value || undefined,
        flexible: true,
        per_page: 20
    };

    Object.keys(query).forEach(key => query[key] === undefined && delete query[key]);

    if (Object.keys(query).length <= 1) {
        const container = document.getElementById('searchResults');
        container.innerHTML = '<div class="empty-state" style="color:var(--warning);">Veuillez remplir au moins un critère de recherche</div>';
        return;
    }

    const container = document.getElementById('searchResults');
    container.innerHTML = '<div class="empty-state">Recherche en cours...</div>';

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

        if (data.data?.results?.length > 0) {
            displayResults(container, data.data.results);
        } else {
            container.innerHTML = '<div class="empty-state">Aucun résultat trouvé</div>';
        }
    } catch (error) {
        container.innerHTML = '<div class="empty-state" style="color:var(--danger);">Erreur de recherche</div>';
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

    try {
        const response = await fetch(`${API_URL}/api/brix/lookup/${type}/${encodeURIComponent(value)}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();

        if (data.data?.results?.length > 0) {
            displayLookupResults(container, data.data.results);
        } else {
            container.innerHTML = '<div class="empty-state">Aucun résultat trouvé</div>';
        }
    } catch (error) {
        container.innerHTML = '<div class="empty-state" style="color:var(--danger);">Erreur de lookup</div>';
    }
});

// ============ DISPLAY FUNCTIONS ============
function displayResults(container, results) {
    container.innerHTML = results.map((person, index) => {
        const confidence = person._confidence || 0;
        const confidenceClass = confidence >= 70 ? 'high' : confidence >= 40 ? 'medium' : 'low';
        const fullName = `${person.prenom || ''} ${person.nom_famille || 'Inconnu'}`.trim();
        
        let detailsHtml = '';
        Object.entries(person)
            .filter(([key]) => !key.startsWith('_'))
            .forEach(([key, value]) => {
                if (!value) return;
                const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                detailsHtml += `
                    <div>
                        <span class="label">${label}</span> ${value}
                    </div>
                `;
            });
        
        return `
            <div class="result-card" data-index="${index}">
                <div class="result-header">
                    <div class="result-name" onclick="toggleDetails(${index})">${fullName}</div>
                    <span class="confidence-badge confidence-${confidenceClass}">${confidence}%</span>
                </div>
                <div class="result-details" id="details-${index}">
                    ${detailsHtml}
                    ${person._sources ? `
                        <div class="result-sources" style="grid-column:1/-1">
                            Sources : ${person._sources.map(s => `<span>${s}</span>`).join('')}
                        </div>
                    ` : ''}
                </div>
                <button class="copy-btn" onclick="copyFullCard(${index})">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                    </svg>
                    Copier la fiche
                    <span class="marauder-tag">by Marauder</span>
                </button>
            </div>
        `;
    }).join('');
    
    window._resultsData = results;
}

function displayLookupResults(container, results) {
    container.innerHTML = results.map((row, index) => {
        let detailsHtml = '';
        Object.entries(row)
            .filter(([key]) => !key.startsWith('_'))
            .forEach(([key, value]) => {
                if (!value) return;
                const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                detailsHtml += `
                    <div>
                        <span class="label">${label}</span> ${value}
                    </div>
                `;
            });
        
        return `
            <div class="result-card">
                <div class="result-header">
                    <div class="result-name" onclick="toggleDetails(${index})">Fiche ${index + 1}</div>
                </div>
                <div class="result-details open" id="details-${index}">
                    ${detailsHtml}
                    ${row._source_db ? `
                        <div class="result-sources" style="grid-column:1/-1">
                            Source : <span>${row._source_db}</span>
                        </div>
                    ` : ''}
                </div>
                <button class="copy-btn" onclick="copyFullCard(${index})">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                    </svg>
                    Copier la fiche
                    <span class="marauder-tag">by Marauder</span>
                </button>
            </div>
        `;
    }).join('');
    
    window._resultsData = results;
}

// ============ TOGGLE DETAILS ============
function toggleDetails(index) {
    const details = document.getElementById(`details-${index}`);
    if (details) {
        details.classList.toggle('open');
    }
}

// ============ COPY FULL CARD ============
function copyFullCard(index) {
    const data = window._resultsData;
    if (!data || !data[index]) return;
    
    const person = data[index];
    let text = '=== Marauder Investigation ===\n\n';
    
    Object.entries(person)
        .filter(([key]) => !key.startsWith('_'))
        .forEach(([key, value]) => {
            if (!value) return;
            const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            text += `${label}: ${value}\n`;
        });
    
    if (person._sources) {
        text += `\nSources: ${person._sources.join(', ')}`;
    }
    
    text += '\n\n--- by Marauder ---';
    
    navigator.clipboard.writeText(text).then(() => {
        const btns = document.querySelectorAll('.copy-btn');
        btns.forEach(btn => {
            btn.classList.add('copied');
            btn.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                    <polyline points="20 6 9 17 4 12"/>
                </svg>
                Copié !
                <span class="marauder-tag">by Marauder</span>
            `;
            setTimeout(() => {
                btn.classList.remove('copied');
                btn.innerHTML = `
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                    </svg>
                    Copier la fiche
                    <span class="marauder-tag">by Marauder</span>
                `;
            }, 2000);
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
                <div class="result-card">
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