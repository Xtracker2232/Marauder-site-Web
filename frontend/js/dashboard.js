const API_URL = window.location.origin;
const token = localStorage.getItem('token');

// ============================================
// OVERRIDE DES CONFIRM NATIFS
// ============================================
(function() {
    const nativeConfirm = window.confirm;
    window.confirm = function(message) {
        if (typeof window.customConfirm === 'function') {
            window._pendingConfirmMessage = message;
            window.customConfirm('Confirmation', message, function() {
                console.log('✅ Confirmé par utilisateur');
            });
            return false;
        }
        return nativeConfirm(message);
    };
})();

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
            window.open('https://discord.gg/jf6QRZHaTB', '_blank');
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
    if (typeof window.customConfirm === 'function') {
        window.customConfirm(
            'Déconnexion',
            'Voulez-vous vraiment vous déconnecter ?',
            function() {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/';
            },
            { confirmText: 'Se déconnecter', danger: true }
        );
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

        // La famille est chargée À LA DEMANDE via le bouton "Approfondir"
        // (calculée dans toggleDeep, pas ici)

        return `
            <div class="result-card-full" data-index="${index}">
                <div class="result-header-full">
                    <div class="result-name-full" onclick="toggleFiche(${index})">${fullName}</div>
                    <div class="result-meta">
                        <span class="confidence-badge confidence-${confidenceClass}">${confidence}%</span>
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
                    <div class="family-loading" style="color:#6b6b6b;font-size:13px;">Cliquez sur "Approfondir" pour lancer l'analyse familiale</div>
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

// ============================================
// TOGGLE DEEP — Charge la famille À LA DEMANDE
// ============================================
const _familyCache = {}; // Cache : évite de recalculer 2x
const _familyLoading = {}; // Empêche les appels multiples

async function toggleDeep(index) {
    const panel = document.getElementById('deep-' + index);
    if (!panel) return;

    const wasOpen = panel.classList.contains('open');
    panel.classList.toggle('open');

    // Si on ferme, on s'arrête là
    if (wasOpen) return;

    // Si déjà chargé → rien à faire
    if (_familyCache[index] !== undefined) {
        renderFamilyInPanel(panel, _familyCache[index], index);
        return;
    }

    // Si en cours de chargement → on attend
    if (_familyLoading[index]) return;

    const person = window._resultsData?.[index];
    if (!person) {
        panel.innerHTML = '<h4>Approfondir</h4><div style="color:#ef4444;font-size:13px;">Erreur : personne introuvable</div>';
        return;
    }

    // Afficher le loader
    panel.innerHTML = `
        <h4>Approfondir</h4>
        <div class="family-loading" style="display:flex;align-items:center;gap:10px;color:#7a7a7a;font-size:13px;padding:12px 0;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation:spin 1s linear infinite;">
                <circle cx="12" cy="12" r="10" opacity="0.3"/>
                <path d="M12 2a10 10 0 0 1 10 10" />
            </svg>
            <span>Recherche des liens familiaux en cours...</span>
        </div>
        <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
    `;

    _familyLoading[index] = true;

    try {
        // Vérifier qu'on a bien quelque chose à pivoter
        if (!person.adresse && !person.telephone) {
            _familyCache[index] = [];
            renderFamilyInPanel(panel, [], index);
            _familyLoading[index] = false;
            return;
        }

        // Recherche familiale (adresse + téléphone)
        const famille = await findFamily(person);

        // Sauvegarder dans le cache
        _familyCache[index] = famille;

        // Stocker sur la personne (pour Copier / Graphe / Investigation)
        person.famille = famille;

        // Afficher
        renderFamilyInPanel(panel, famille, index);

    } catch (e) {
        console.error('Erreur pivot famille:', e);
        panel.innerHTML = '<h4>Approfondir</h4><div style="color:#ef4444;font-size:13px;">Erreur lors de l\'analyse familiale</div>';
    } finally {
        _familyLoading[index] = false;
    }
}

/**
 * Affiche la famille dans le panel "Approfondir"
 */
function renderFamilyInPanel(panel, famille, index) {
    if (!famille || famille.length === 0) {
        panel.innerHTML = `
            <h4>Approfondir</h4>
            <div style="color:#6b6b6b;font-size:13px;padding:12px 0;">
                Aucun lien familial trouvé (adresse et téléphone uniques)
            </div>
        `;
        return;
    }

    // Séparer par force du lien
    const forts = famille.filter(m => m.lien === 'Adresse + Téléphone');
    const parAdresse = famille.filter(m => m.lien === 'Même adresse');
    const parTel = famille.filter(m => m.lien === 'Même téléphone');

    let html = `
        <h4 style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
            <span>Famille associée</span>
            <span style="font-size:11px;font-weight:600;color:#7a7a7a;background:rgba(255,255,255,0.05);padding:2px 10px;border-radius:100px;">
                ${famille.length}
            </span>
        </h4>
        <div class="family-tree">
    `;

    // Lien fort (adresse ET téléphone)
    if (forts.length > 0) {
        html += `<div class="tree-title" style="color:#10b981;">● Lien fort — Adresse + Téléphone (${forts.length})</div>`;
        forts.forEach(m => {
            html += renderFamilyItem(m, '#10b981');
        });
    }

    // Lien adresse
    if (parAdresse.length > 0) {
        html += `<div class="tree-title" style="color:#3b82f6;margin-top:12px;">● Même adresse (${parAdresse.length})</div>`;
        parAdresse.forEach(m => {
            html += renderFamilyItem(m, '#3b82f6');
        });
    }

    // Lien téléphone
    if (parTel.length > 0) {
        html += `<div class="tree-title" style="color:#f59e0b;margin-top:12px;">● Même téléphone (${parTel.length})</div>`;
        parTel.forEach(m => {
            html += renderFamilyItem(m, '#f59e0b');
        });
    }

    html += `</div>`;
    panel.innerHTML = html;
}

function renderFamilyItem(m, color) {
    const name = ((m.prenom || '') + ' ' + (m.nom_famille || '')).trim() || 'Inconnu';
    const extras = [];
    if (m.date_naissance) extras.push(m.date_naissance);
    if (m.email) extras.push(m.email);
    if (m.telephone) extras.push(formatPhone(m.telephone));

    return `
        <div class="tree-item">
            <div style="display:flex;flex-direction:column;gap:2px;">
                <span style="color:#fff;font-weight:500;">${name}</span>
                ${extras.length > 0 ? `<span style="font-size:11px;color:#7a7a7a;">${extras.join(' · ')}</span>` : ''}
            </div>
            <span class="relation" style="color:${color};border-color:${color}33;background:${color}11;">
                ${m.lien || 'Lié'}
            </span>
        </div>
    `;
}

// ============================================
// PIVOT FAMILLE — RECHERCHE FAMILIALE (ADRESSE + TÉLÉPHONE)
// ============================================
let searchInProgress = false;

/**
 * Extrait la clé "adresse normalisée" pour comparer deux personnes
 */
function normalizeAdresse(adresse) {
    if (!adresse) return '';
    return String(adresse)
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/[^\w\s]/g, '');
}

/**
 * Extrait le numéro de téléphone normalisé (10 chiffres)
 */
function normalizePhone(phone) {
    if (!phone) return '';
    const cleaned = String(phone).replace(/\D/g, '');
    if (cleaned.length === 10) return cleaned;
    if (cleaned.length === 11 && cleaned.startsWith('33')) return '0' + cleaned.substring(2);
    return cleaned;
}

/**
 * Recherche une seule catégorie de pivot (adresse OU téléphone)
 * Retourne les résultats Brix bruts
 */
async function searchPivot(payload) {
    try {
        const response = await fetch(API_URL + '/api/brix/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify(payload)
        });
        const data = await response.json();
        return data.data?.results || [];
    } catch (e) {
        console.error('Erreur pivot:', e);
        return [];
    }
}

/**
 * Détecte et récupère la famille d'une personne
 * Utilise l'adresse ET le téléphone comme pivots
 */
async function findFamily(person) {
    const famille = [];
    const seen = new Set();

    // Clé de la personne de référence (pour l'exclure de sa propre famille)
    const refKey = (person.nom_famille || '') + '|' + (person.prenom || '') + '|' +
                   (person.telephone || '') + '|' + (person.adresse || '');

    // ---------- PIVOT 1 : ADRESSE ----------
    if (person.adresse) {
        const adresseNorm = normalizeAdresse(person.adresse);
        if (adresseNorm) {
            const pivotAddress = {
                adresse: person.adresse,
                code_postal: person.code_postal || undefined,
                ville: person.ville || undefined,
                flexible: false,
                per_page: 20
            };
            Object.keys(pivotAddress).forEach(k => pivotAddress[k] === undefined && delete pivotAddress[k]);

            const resultsAddress = await searchPivot(pivotAddress);

            for (const p of resultsAddress) {
                if (!p || !p.nom_famille) continue;

                // Vérifier que c'est bien la même adresse (comparaison normalisée)
                const pAdresseNorm = normalizeAdresse(p.adresse);
                if (pAdresseNorm !== adresseNorm) continue;

                const key = (p.nom_famille || '') + '|' + (p.prenom || '') + '|' +
                            (p.telephone || '') + '|' + (p.adresse || '');

                // Ne pas s'ajouter soi-même
                if (key === refKey) continue;
                if (seen.has(key)) continue;

                seen.add(key);
                famille.push({
                    prenom: p.prenom || '',
                    nom_famille: p.nom_famille || '',
                    date_naissance: p.date_naissance || '',
                    email: p.email || '',
                    telephone: p.telephone || '',
                    adresse: p.adresse || '',
                    ville: p.ville || '',
                    lien: 'Même adresse'
                });
            }
        }
    }

    // ---------- PIVOT 2 : TÉLÉPHONE ----------
    if (person.telephone) {
        const phoneNorm = normalizePhone(person.telephone);
        if (phoneNorm && phoneNorm.length === 10) {
            const pivotPhone = {
                telephone: person.telephone,
                flexible: false,
                per_page: 20
            };

            const resultsPhone = await searchPivot(pivotPhone);

            for (const p of resultsPhone) {
                if (!p || !p.nom_famille) continue;

                // Vérifier que c'est bien le même téléphone
                const pPhoneNorm = normalizePhone(p.telephone);
                if (pPhoneNorm !== phoneNorm) continue;

                const key = (p.nom_famille || '') + '|' + (p.prenom || '') + '|' +
                            (p.telephone || '') + '|' + (p.adresse || '');

                if (key === refKey) continue;
                if (seen.has(key)) continue;

                // Si déjà vu via adresse, mettre à jour le lien
                const existing = famille.find(f =>
                    f.nom_famille === p.nom_famille &&
                    f.prenom === p.prenom
                );
                if (existing) {
                    existing.lien = 'Adresse + Téléphone';
                    continue;
                }

                seen.add(key);
                famille.push({
                    prenom: p.prenom || '',
                    nom_famille: p.nom_famille || '',
                    date_naissance: p.date_naissance || '',
                    email: p.email || '',
                    telephone: p.telephone || '',
                    adresse: p.adresse || '',
                    ville: p.ville || '',
                    lien: 'Même téléphone'
                });
            }
        }
    }

    return famille;
}

/**
 * Recherche principale : recherche + pivot famille sur TOUS les résultats
 */
async function performSearch(query, container) {
    // ---------- 1. Recherche principale ----------
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

    // ---------- 2. Déduplication ----------
    const uniqueResults = [];
    const seen = new Set();
    results.forEach(p => {
        const key = (p.nom_famille || '') + '|' + (p.prenom || '') + '|' +
                    (p.email || '') + '|' + (p.telephone || '') + '|' + (p.adresse || '');
        if (!seen.has(key)) {
            seen.add(key);
            uniqueResults.push(p);
        }
    });
    results = uniqueResults;

    // ---------- 3. Pivot famille ----------
    // La famille n'est PAS calculée ici.
    // Elle sera calculée À LA DEMANDE quand l'utilisateur clique sur "Approfondir"
    // → économise le quota Brix + recherche instantanée

    return results;
}

// ============ SEARCH FRENCH ============
document.getElementById('searchBtn').addEventListener('click', async function() {
    if (searchInProgress) {
        showToast('Recherche deja en cours...', 'info');
        return;
    }
    searchInProgress = true;
    this.disabled = true;

    const query = {
        flexible: true,
        per_page: 50,
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

    if (Object.keys(query).length <= 3) {
        showToast('Veuillez remplir au moins un critere', 'warning');
        searchInProgress = false;
        this.disabled = false;
        return;
    }

    const container = document.getElementById('searchResults');
    container.innerHTML = '<div class="empty-state">Recherche en cours...</div>';
    showSearchLoading();

    try {
        const results = await performSearch(query, container);

        setTimeout(() => {
            hideSearchLoading();
            if (results.length > 0) {
                displayResults(container, results);
                showToast(results.length + ' resultat(s) trouve(s)', 'success');
            } else {
                container.innerHTML = '<div class="empty-state">Aucun resultat trouve</div>';
                showToast('Aucun resultat', 'info');
            }
            searchInProgress = false;
            document.getElementById('searchBtn').disabled = false;
        }, 500);

    } catch (error) {
        console.error('Search error:', error);
        setTimeout(() => {
            hideSearchLoading();
            container.innerHTML = '<div class="empty-state" style="color:#ef4444;">Erreur de recherche</div>';
            showToast('Erreur de recherche', 'error');
            searchInProgress = false;
            document.getElementById('searchBtn').disabled = false;
        }, 500);
    }
});

// ============ SEARCH PRO ============
document.getElementById('searchBtnPro').addEventListener('click', async function() {
    if (searchInProgress) {
        showToast('Recherche deja en cours...', 'info');
        return;
    }
    searchInProgress = true;
    this.disabled = true;

    const query = {
        flexible: true,
        per_page: 50,
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

    if (Object.keys(query).length <= 3) {
        showToast('Veuillez remplir au moins un critere', 'warning');
        searchInProgress = false;
        this.disabled = false;
        return;
    }

    const container = document.getElementById('searchResults');
    container.innerHTML = '<div class="empty-state">Recherche en cours...</div>';
    showSearchLoading();

    try {
        const results = await performSearch(query, container);

        setTimeout(() => {
            hideSearchLoading();
            if (results.length > 0) {
                displayResults(container, results);
                showToast(results.length + ' resultat(s) trouve(s)', 'success');
            } else {
                container.innerHTML = '<div class="empty-state">Aucun resultat trouve</div>';
                showToast('Aucun resultat', 'info');
            }
            searchInProgress = false;
            document.getElementById('searchBtnPro').disabled = false;
        }, 500);

    } catch (error) {
        console.error('Search error:', error);
        setTimeout(() => {
            hideSearchLoading();
            container.innerHTML = '<div class="empty-state" style="color:#ef4444;">Erreur de recherche</div>';
            showToast('Erreur de recherche', 'error');
            searchInProgress = false;
            document.getElementById('searchBtnPro').disabled = false;
        }, 500);
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
        let results = data.data?.results || [];

        // Déduplication
        const uniqueResults = [];
        const seen = new Set();
        results.forEach(p => {
            const key = (p.nom_famille || '') + '|' + (p.prenom || '') + '|' +
                        (p.email || '') + '|' + (p.telephone || '') + '|' + (p.adresse || '');
            if (!seen.has(key)) {
                seen.add(key);
                uniqueResults.push(p);
            }
        });
        results = uniqueResults;

        // Le pivot famille est fait à la demande (bouton "Approfondir")

        setTimeout(() => {
            hideSearchLoading();
            if (results.length > 0) {
                displayResults(container, results);
                showToast(results.length + ' enregistrement(s) trouve(s)', 'success');
            } else {
                container.innerHTML = '<div class="empty-state">Aucun resultat trouve</div>';
                showToast('Aucun resultat', 'info');
            }
        }, 500);

    } catch (error) {
        console.error('Lookup error:', error);
        setTimeout(() => {
            hideSearchLoading();
            container.innerHTML = '<div class="empty-state" style="color:#ef4444;">Erreur de lookup</div>';
            showToast('Erreur de lookup', 'error');
        }, 500);
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
                        <div class="history-date">${dateStr} ${timeStr} · ${displayName}</div>
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
        }, 500);
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

// ============ API NOMINATIM (géocodage) ============
async function getCityCoordinates(ville) {
    if (!ville) return null;
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(ville + ', France')}&format=json&limit=1`,
            { headers: { 'User-Agent': 'Marauder-App/1.0' } }
        );
        if (!response.ok) return null;
        const data = await response.json();
        if (data && data.length > 0) {
            return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
        }
        return null;
    } catch (error) {
        console.error('Erreur de géocodage:', error);
        return null;
    }
}

function gpsToPosition(lat, lng) {
    const MIN_LAT = 41.0, MAX_LAT = 51.5;
    const MIN_LNG = -5.5, MAX_LNG = 9.0;
    const left = ((lng - MIN_LNG) / (MAX_LNG - MIN_LNG)) * 100;
    const top = (1 - ((lat - MIN_LAT) / (MAX_LAT - MIN_LAT))) * 100;
    return {
        top: Math.max(2, Math.min(98, top)),
        left: Math.max(2, Math.min(98, left))
    };
}

async function movePinOnMap(ville) {
    const pin = document.getElementById('mapPin');
    if (!pin) return;
    if (!ville) { pin.style.display = 'none'; return; }
    try {
        const coords = await getCityCoordinates(ville);
        if (coords) {
            const pos = gpsToPosition(coords.lat, coords.lng);
            pin.style.display = 'block';
            pin.style.top = pos.top + '%';
            pin.style.left = pos.left + '%';
        } else {
            pin.style.display = 'block';
            pin.style.top = '24%';
            pin.style.left = '48%';
        }
    } catch (error) {
        pin.style.display = 'block';
        pin.style.top = '24%';
        pin.style.left = '48%';
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

    movePinOnMap(ville);

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
    showModal('Confirmation', '<p style="color:#a0a0a0;">Effacer tout le graphe ?</p>', 'Effacer', function() {
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
    list.innerHTML = '<div style="text-align:center;padding:20px;color:#6b6b6b;">Chargement...</div>';
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
            list.innerHTML = '<div style="text-align:center;padding:40px;color:#6b6b6b;">Aucun graphe sauvegarde</div>';
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
        list.innerHTML = '<div style="text-align:center;padding:20px;color:#ef4444;">Erreur de chargement</div>';
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

// ============ USAGE API ============
window.loadUsage = async function() {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
        const res = await fetch('/api/my-api-usage', { headers: { 'Authorization': 'Bearer ' + token } });
        if (!res.ok) return;
        const data = await res.json();
        const setStat = (key, value) => {
            const el = document.querySelector('.api-stat-value[data-stat="' + key + '"]');
            if (el) el.textContent = value;
        };
        setStat('today', data.today);
        setStat('month', data.month);
        setStat('limit', data.limit);
        setStat('remaining', data.remaining);
        const usageCount = document.getElementById('usageCount');
        const usageBar = document.getElementById('usageBarFill');
        if (usageCount) usageCount.textContent = data.month + ' / ' + data.limit;
        if (usageBar) {
            if (data.limit === '∞' || data.limit === Infinity) usageBar.style.width = '0%';
            else usageBar.style.width = Math.min(100, (data.month / data.limit) * 100) + '%';
        }
    } catch (err) { console.error('Erreur loadUsage:', err); }
};

// ============ USAGE API (appelé par l'onglet Statistiques) ============
window.loadSubscription = window.loadSubscription || function() {
    // déjà géré dans dashboard.html si présent
};

console.log('Dashboard charge');