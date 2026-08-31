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
        
        // Charger les données selon la page
        if (page === 'profile') loadProfile();
        if (page === 'history') loadHistory();
        if (page === 'fiches') loadFiches();
        if (page === 'tickets') loadTickets();
        if (page === 'search') {
            // Rien à faire
        }
        if (page === 'lookup') {
            // Rien à faire
        }
        if (page === 'graphe') {
            if (typeof window.initGrapheModule === 'function') {
                window.initGrapheModule();
            }
        }
    });
});

// ============ SUPPORT TOGGLE ============
document.getElementById('supportToggle')?.addEventListener('click', function(e) {
    e.stopPropagation();
    const submenu = document.getElementById('supportSubmenu');
    const arrow = this.querySelector('.support-arrow');
    if (submenu) {
        const isOpen = submenu.style.display === 'block';
        submenu.style.display = isOpen ? 'none' : 'block';
        if (arrow) arrow.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
    }
});

// ============ LOGOUT ============
document.getElementById('logoutBtn')?.addEventListener('click', function() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
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

// ============ SEARCH TABS ============
document.querySelectorAll('.search-tab').forEach(tab => {
    tab.addEventListener('click', function() {
        document.querySelectorAll('.search-tab').forEach(t => t.classList.remove('active'));
        this.classList.add('active');
        document.querySelectorAll('.search-tab-content').forEach(c => c.classList.remove('active'));
        const tabId = this.dataset.tab;
        const target = document.getElementById('tab-' + tabId);
        if (target) target.classList.add('active');
    });
});

// ============ CLEAR FORM ============
document.getElementById('clearBtn')?.addEventListener('click', function() {
    document.querySelectorAll('#tab-french input, #tab-french select').forEach(el => {
        el.value = '';
    });
    document.getElementById('searchResults').innerHTML = '';
});

document.getElementById('clearBtnPro')?.addEventListener('click', function() {
    document.querySelectorAll('#tab-pro input, #tab-pro select').forEach(el => {
        el.value = '';
    });
    document.getElementById('searchResults').innerHTML = '';
});

// ============ SEARCH ============
document.getElementById('searchBtn')?.addEventListener('click', async () => {
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
        if (container) container.innerHTML = '<div class="empty-state" style="color:var(--warning);">Veuillez remplir au moins un critere</div>';
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

        setTimeout(() => {
            hideSearchLoading();
            if (container) {
                if (results.length > 0) {
                    displayResults(container, results);
                } else {
                    container.innerHTML = '<div class="empty-state">Aucun resultat trouve</div>';
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

// ============ SEARCH PRO ============
document.getElementById('searchBtnPro')?.addEventListener('click', async () => {
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
        if (container) container.innerHTML = '<div class="empty-state" style="color:var(--warning);">Veuillez remplir au moins un critere</div>';
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

        setTimeout(() => {
            hideSearchLoading();
            if (container) {
                if (results.length > 0) {
                    displayResults(container, results);
                } else {
                    container.innerHTML = '<div class="empty-state">Aucun resultat trouve</div>';
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

// ============ DISPLAY RESULTS ============
function displayResults(container, results) {
    const counterHtml = `
        <div class="results-counter">
            <div class="count">
                <strong>${results.length}</strong> resultat${results.length > 1 ? 's' : ''} trouve${results.length > 1 ? 's' : ''}
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
                if (key === 'telephone' || key === 'mobile') displayValue = formatPhone(value);
                fieldsHtml += `
                    <div class="result-field">
                        <span class="field-label">${label}</span>
                        <span class="field-value ${isImportant ? 'highlight' : ''}">${displayValue}</span>
                    </div>
                `;
            });
        
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
                </div>
                <div class="result-actions">
                    <button class="btn-deep" onclick="toggleDeep(${index})">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                            <circle cx="11" cy="11" r="8"/>
                            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                        </svg>
                        Approfondir
                    </button>
                    <button class="btn-deep" onclick="addToFiche(${index})">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                            <line x1="12" y1="5" x2="12" y2="19"/>
                            <line x1="5" y1="12" x2="19" y2="12"/>
                        </svg>
                        + Fiche
                    </button>
                    <button class="btn-deep" onclick="copyFullCard(${index})">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
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
                    <div style="color:var(--text-muted);font-size:13px;">Aucun detail supplementaire</div>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = counterHtml + cardsHtml;
    window._resultsData = results;
}

function toggleFiche(index) {
    const details = document.getElementById(`fiche-${index}`);
    if (details) details.classList.toggle('open');
}

function toggleDeep(index) {
    const panel = document.getElementById(`deep-${index}`);
    if (panel) panel.classList.toggle('open');
}

function addToFiche(index) {
    showToast('Fonctionnalite en developpement', 'info');
}

function copyFullCard(index) {
    const data = window._resultsData;
    if (!data || !data[index]) return;
    const person = data[index];
    let text = '=== Marauder ===\n\n';
    Object.entries(person).forEach(([key, value]) => {
        if (value && !key.startsWith('_')) {
            text += `${key}: ${value}\n`;
        }
    });
    navigator.clipboard.writeText(text).then(() => showToast('Copie !', 'success'));
}

function addToGraphe(index) {
    showToast('Fonctionnalite en developpement', 'info');
}

// ============ LOOKUP ============
document.getElementById('lookupBtn')?.addEventListener('click', async () => {
    const type = document.getElementById('lookupType')?.value || 'email';
    const value = document.getElementById('lookupValue')?.value?.trim() || '';

    if (!value) {
        document.getElementById('lookupResults').innerHTML = '<div class="empty-state" style="color:var(--warning);">Veuillez entrer une valeur</div>';
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
                container.innerHTML = data.data.results.map((row, i) => `
                    <div class="result-card-full">
                        <div class="result-header-full">
                            <div class="result-name-full">Enregistrement #${i + 1}</div>
                        </div>
                        <div class="result-fields open">
                            ${Object.entries(row).map(([key, val]) => `
                                <div class="result-field">
                                    <span class="field-label">${key}</span>
                                    <span class="field-value">${val}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `).join('');
            } else {
                container.innerHTML = '<div class="empty-state">Aucun resultat trouve</div>';
            }
        }, 1500);

    } catch (error) {
        setTimeout(() => {
            hideSearchLoading();
            container.innerHTML = '<div class="empty-state" style="color:var(--danger);">Erreur de lookup</div>';
        }, 1500);
    }
});

// ============ PROFILE ============
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
                    <div class="profile-row"><span class="label">Nom d'utilisateur</span><span class="value">${data.user.username}</span></div>
                    <div class="profile-row"><span class="label">Role</span><span class="value">${data.user.role}</span></div>
                    <div class="profile-row"><span class="label">Membre depuis</span><span class="value">${new Date(data.user.created_at).toLocaleDateString()}</span></div>
                    <div class="profile-row"><span class="label">Derniere connexion</span><span class="value">${data.user.last_login ? new Date(data.user.last_login).toLocaleString() : 'Jamais'}</span></div>
                </div>
            `;
        }
    } catch (error) {
        container.innerHTML = '<div class="empty-state" style="color:var(--danger);">Erreur de chargement</div>';
    }
}

// ============ HISTORY ============
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
            container.innerHTML = data.history.map(item => `
                <div class="history-item">
                    <div class="history-header">
                        <div class="history-date">
                            <span>${new Date(item.created_at).toLocaleString()}</span>
                        </div>
                        <div class="history-result-count ${item.results_count === 0 ? 'empty' : ''}">
                            ${item.results_count} resultat${item.results_count > 1 ? 's' : ''}
                        </div>
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
            `).join('');
        } else {
            container.innerHTML = '<div class="empty-state">Aucune recherche dans l\'historique</div>';
        }
    } catch (error) {
        container.innerHTML = '<div class="empty-state" style="color:var(--danger);">Erreur de chargement</div>';
    }
}

async function replaySearch(id) {
    try {
        showSearchLoading();
        const response = await fetch(`${API_URL}/api/history/${id}/replay`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const data = await response.json();
        setTimeout(() => {
            hideSearchLoading();
            if (data.results?.length > 0) {
                displayResults(document.getElementById('searchResults'), data.results);
                showToast('Recherche relancee !', 'success');
            } else {
                showToast('Aucun resultat', 'warning');
            }
        }, 1500);
    } catch (error) {
        hideSearchLoading();
        showToast('Erreur', 'error');
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
        } else {
            container.innerHTML = '<div class="empty-state">Aucune fiche creee</div>';
        }
    } catch (error) {
        container.innerHTML = '<div class="empty-state" style="color:var(--danger);">Erreur de chargement</div>';
    }
}

document.getElementById('createFicheBtn')?.addEventListener('click', () => {
    showModal('Creer une fiche', `
        <div class="form-group">
            <label>Nom de la fiche</label>
            <input type="text" id="ficheNameInput" placeholder="Ex: Enquete Dupont">
        </div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:8px;">Maximum 10 personnes par fiche</div>
    `, 'Creer', async () => {
        const name = document.getElementById('ficheNameInput')?.value?.trim();
        if (!name) { showToast('Veuillez donner un nom', 'warning'); return; }
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
                showToast('Fiche creee !', 'success');
                loadFiches();
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
        <div style="padding:4px 0;border-bottom:1px solid var(--border-color);font-size:13px;color:var(--text-secondary);">
            ${p.prenom || ''} ${p.nom_famille || 'Inconnu'}
        </div>
    `).join('') || 'Aucune personne';
    showModal(`Fiche: ${fiche.name}`, `
        <div style="margin-bottom:12px;font-size:13px;color:var(--text-muted);">${fiche.persons?.length || 0} / 10 personnes</div>
        <div style="max-height:300px;overflow-y:auto;">${personsHtml}</div>
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
        if (!name) { showToast('Veuillez donner un nom', 'warning'); return; }
        try {
            await fetch(`${API_URL}/api/fiches/${fiche.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ name })
            });
            showToast('Fiche modifiee !', 'success');
            loadFiches();
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
        <p style="font-size:13px;color:var(--text-muted);margin-top:8px;">Cette action est irreversible.</p>
    `, 'Supprimer', async () => {
        try {
            await fetch(`${API_URL}/api/fiches/${fiche.id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            showToast('Fiche supprimee !', 'success');
            loadFiches();
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
            if (value) text += `  ${key}: ${value}\n`;
        });
        text += '\n';
    });
    navigator.clipboard.writeText(text).then(() => showToast('Exporte !', 'success'));
}

// ============ TICKETS ============
async function loadTickets() {
    const container = document.getElementById('ticketsList');
    if (!container) return;
    container.innerHTML = '<div class="empty-state">Chargement...</div>';

    try {
        const response = await fetch(`${API_URL}/api/tickets`, {
            headers: { 'Authorization': `Bearer ${token}` }
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
                <div style="font-size:13px;color:var(--text-secondary);margin-top:4px;">
                    ${ticket.message?.substring(0, 100) || ''}${ticket.message?.length > 100 ? '...' : ''}
                </div>
            </div>
        `).join('');
    } catch (error) {
        container.innerHTML = '<div class="empty-state" style="color:var(--danger);">Erreur de chargement</div>';
    }
}

document.getElementById('openTicketBtn')?.addEventListener('click', () => {
    showModal('Nouveau ticket', `
        <div class="form-group">
            <label>Sujet</label>
            <input type="text" id="ticketSubject" placeholder="Résumé de votre problème" class="search-input">
        </div>
        <div class="form-group">
            <label>Message</label>
            <textarea id="ticketMessage" rows="5" placeholder="Décrivez votre problème..." style="width:100%;padding:12px;background:#1e1e1e;border:1px solid #2a2a2a;border-radius:8px;color:#ffffff;font-family:'Inter',sans-serif;font-size:14px;resize:vertical;outline:none;"></textarea>
        </div>
    `, 'Envoyer', async () => {
        const subject = document.getElementById('ticketSubject')?.value?.trim();
        const message = document.getElementById('ticketMessage')?.value?.trim();
        if (!subject || !message) {
            showToast('Veuillez remplir tous les champs', 'warning');
            return;
        }
        try {
            const response = await fetch(`${API_URL}/api/tickets`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ subject, message })
            });
            if (response.ok) {
                showToast('Ticket cree !', 'success');
                loadTickets();
            }
        } catch (error) {
            showToast('Erreur', 'error');
        }
    });
});

async function viewTicket(ticketId) {
    try {
        const response = await fetch(`${API_URL}/api/tickets/${ticketId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        const ticket = data.ticket;
        const messages = data.messages || [];

        showModal(ticket.subject, `
            <div style="margin-bottom:12px;font-size:13px;color:var(--text-muted);">
                Status: ${ticket.status} · ${new Date(ticket.created_at).toLocaleString()}
            </div>
            ${messages.map(m => `
                <div style="padding:10px 14px;margin-bottom:8px;background:${m.is_admin ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)'};border-radius:8px;border-left:${m.is_admin ? '2px solid #3b82f6' : '2px solid var(--border-color)'};">
                    <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px;">
                        ${m.username || 'Inconnu'}${m.is_admin ? ' · Admin' : ''} · ${new Date(m.created_at).toLocaleString()}
                    </div>
                    <div style="font-size:13px;color:var(--text-secondary);">${m.message}</div>
                </div>
            `).join('')}
            ${ticket.status !== 'closed' ? `
                <div style="display:flex;gap:10px;border-top:1px solid var(--border-color);padding-top:12px;">
                    <input type="text" id="ticketReplyInput" placeholder="Votre reponse..." style="flex:1;padding:10px 14px;background:#1e1e1e;border:1px solid #2a2a2a;border-radius:8px;color:#ffffff;font-size:14px;font-family:'Inter',sans-serif;outline:none;">
                    <button onclick="replyTicket(${ticketId})" class="btn-primary" style="width:auto;padding:10px 24px;">Repondre</button>
                </div>
            ` : '<div style="color:var(--text-muted);font-size:13px;border-top:1px solid var(--border-color);padding-top:12px;">Ce ticket est ferme</div>'}
        `, 'Fermer', closeModal);
    } catch (error) {
        showToast('Erreur de chargement', 'error');
    }
}

async function replyTicket(ticketId) {
    const input = document.getElementById('ticketReplyInput');
    if (!input) return;
    const message = input.value.trim();
    if (!message) { showToast('Veuillez entrer un message', 'warning'); return; }

    try {
        const response = await fetch(`${API_URL}/api/tickets/${ticketId}/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
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

// ============ GRAPHE BOUTONS ============
document.getElementById('grapheAddPersonne')?.addEventListener('click', () => {
    showToast('Fonctionnalite en developpement', 'info');
});

document.getElementById('grapheAttacher')?.addEventListener('click', function() {
    showToast('Fonctionnalite en developpement', 'info');
});

document.getElementById('grapheSauvegarder')?.addEventListener('click', () => {
    showToast('Sauvegarde en developpement', 'info');
});

document.getElementById('grapheMesGraphes')?.addEventListener('click', () => {
    showToast('Fonctionnalite en developpement', 'info');
});

document.getElementById('grapheEffacer')?.addEventListener('click', () => {
    showToast('Fonctionnalite en developpement', 'info');
});

// ============ MOBILE MENU ============
const mobileBtn = document.getElementById('mobileMenuBtn');
const sidebar = document.querySelector('.sidebar');
const backdrop = document.getElementById('sidebarBackdrop');

if (mobileBtn && sidebar && backdrop) {
    mobileBtn.addEventListener('click', function() {
        sidebar.classList.toggle('open');
        backdrop.classList.toggle('active');
        document.body.style.overflow = sidebar.classList.contains('open') ? 'hidden' : '';
    });

    backdrop.addEventListener('click', function() {
        sidebar.classList.remove('open');
        backdrop.classList.remove('active');
        document.body.style.overflow = '';
    });

    document.querySelectorAll('.sidebar-nav li[data-page]').forEach(item => {
        item.addEventListener('click', function() {
            if (window.innerWidth <= 768) {
                sidebar.classList.remove('open');
                backdrop.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    });
}

// ============ INVESTIGATION ============
function openInvestigation(index) {
    showToast('Fonctionnalite en developpement', 'info');
}

// ============ INIT ============
verifyToken();
loadProfile();