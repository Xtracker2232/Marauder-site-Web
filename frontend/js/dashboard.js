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

// ============ SECTIONS ============
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
        if (page === 'tickets') {
            document.querySelectorAll('.sidebar-nav li[data-page]').forEach(li => li.classList.remove('active'));
            this.classList.add('active');
            document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
            const target = document.getElementById('page-tickets');
            if (target) target.classList.add('active');
            loadTickets();
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
    });
});

// Support submenu items
document.querySelectorAll('.support-submenu li[data-page]').forEach(item => {
    item.addEventListener('click', function(e) {
        e.stopPropagation();
        const page = this.dataset.page;
        
        if (page === 'discord') {
            window.open('https://discord.gg/ton-invite', '_blank');
            return;
        }
        if (page === 'tickets') {
            document.querySelectorAll('.sidebar-nav li[data-page]').forEach(li => li.classList.remove('active'));
            document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
            const target = document.getElementById('page-tickets');
            if (target) target.classList.add('active');
            loadTickets();
            // Fermer le submenu
            const submenu = document.getElementById('supportSubmenu');
            const arrow = document.querySelector('.support-arrow');
            if (submenu) submenu.style.display = 'none';
            if (arrow) arrow.style.transform = 'rotate(0deg)';
        }
    });
});

// Support submenu items
document.querySelectorAll('.support-submenu li[data-page]').forEach(item => {
    item.addEventListener('click', function(e) {
        e.stopPropagation();
        const page = this.dataset.page;
        console.log('Support submenu ->', page);
        
        if (page === 'discord') {
            window.open('https://discord.gg/ton-invite', '_blank');
            return;
        }
        if (page === 'tickets') {
            document.querySelectorAll('.sidebar-nav li[data-page]').forEach(li => li.classList.remove('active'));
            document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
            const target = document.getElementById('page-tickets');
            if (target) target.classList.add('active');
            loadTickets();
            // Fermer le submenu
            const submenu = document.getElementById('supportSubmenu');
            const arrow = document.querySelector('.support-arrow');
            if (submenu) submenu.style.display = 'none';
            if (arrow) arrow.style.transform = 'rotate(0deg)';
        }
    });
});

// ============ LOGOUT ============
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

// ============ ENTER KEY ============
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

// ============ SEARCH ============
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

        // ============================================
        // PIVOT FAMILLE - Marauder fait les recherches
        // ============================================
        const pivotDone = new Set();
        for (let p of results.slice(0, 5)) {
            const famille = [];

            // PIVOT 1 : ADRESSE + CODE POSTAL
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

            // PIVOT 2 : TÉLÉPHONE
            if (p.telephone && famille.length < 5) {
                const phoneClean = p.telephone.replace(/\D/g, '');
                if (phoneClean.length >= 8) {
                    const pivotKey = `tel_${phoneClean}`;
                    if (!pivotDone.has(pivotKey)) {
                        pivotDone.add(pivotKey);
                        try {
                            const pivotPayload = {
                                telephone: phoneClean,
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
            }

            // PIVOT 3 : EMAIL
            if (p.email && famille.length < 5) {
                const pivotKey = `email_${p.email}`;
                if (!pivotDone.has(pivotKey)) {
                    pivotDone.add(pivotKey);
                    try {
                        const pivotPayload = {
                            email: p.email,
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
                                lien: 'Email partagé',
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

        // ============================================
        // PIVOT FAMILLE - Marauder fait les recherches
        // ============================================
        const pivotDone = new Set();
        for (let p of results.slice(0, 5)) {
            const famille = [];

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
                const phoneClean = p.telephone.replace(/\D/g, '');
                if (phoneClean.length >= 8) {
                    const pivotKey = `tel_${phoneClean}`;
                    if (!pivotDone.has(pivotKey)) {
                        pivotDone.add(pivotKey);
                        try {
                            const pivotPayload = {
                                telephone: phoneClean,
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
            }

            if (p.email && famille.length < 5) {
                const pivotKey = `email_${p.email}`;
                if (!pivotDone.has(pivotKey)) {
                    pivotDone.add(pivotKey);
                    try {
                        const pivotPayload = {
                            email: p.email,
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
                                lien: 'Email partagé',
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
                    container.innerHTML = '<div class="empty-state">Aucun resultat trouve</div>';
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

// ============ TOGGLE ============
function toggleFiche(index) {
    const details = document.getElementById(`fiche-${index}`);
    if (details) details.classList.toggle('open');
}

function toggleDeep(index) {
    const panel = document.getElementById(`deep-${index}`);
    if (panel) panel.classList.toggle('open');
}

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
        
        const sourcesHtml = person._sources ? 
            person._sources.map(s => `<span class="source-tag">${s}</span>`).join('') : '';
        
        let familleHtml = '';
        if (person.famille && person.famille.length > 0) {
            familleHtml = `
                <div class="family-tree">
                    <div class="tree-title">Famille associee (${person.famille.length})</div>
                    ${person.famille.map(m => `
                        <div class="tree-item">
                            <span>${m.prenom} ${m.nom_famille}${m.date_naissance ? ` · ${m.date_naissance}` : ''}</span>
                            <span class="relation">${m.lien || 'Lie'}</span>
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

        const investigateBtn = `
            <button class="btn-deep" onclick="openInvestigation(${index})" style="border-color:rgba(255,255,255,0.2);background:rgba(255,255,255,0.05);">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                    <circle cx="11" cy="11" r="8"/>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    <path d="M11 7v4l3 3"/>
                </svg>
                Investiguer
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
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                            <circle cx="11" cy="11" r="8"/>
                            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                        </svg>
                        Approfondir
                    </button>
                    ${investigateBtn}
                    ${ficheBtn}
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
                    ${familleHtml || '<div style="color:var(--text-muted);font-size:13px;">Aucun lien familial trouve</div>'}
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
                <strong>${results.length}</strong> enregistrement${results.length > 1 ? 's' : ''} trouve${results.length > 1 ? 's' : ''}
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
                if (key === 'telephone' || key === 'mobile') displayValue = formatPhone(value);
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
                <div class="result-fields open">${fieldsHtml}</div>
                <div class="result-actions">
                    <button class="btn-deep" onclick="copyLookupCard(${index})">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
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

// ========================================
// ============ INVESTIGATION ============
// ========================================

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

    const fullName = `${person.prenom || ''} ${person.nom_famille || 'Inconnu'}`.trim();
    document.getElementById('investigationName').textContent = `Investigation - ${fullName}`;

    const ville = person.ville || person.ville_naissance || person.adresse?.split(',').pop()?.trim() || 'Localisation inconnue';
    document.getElementById('investigationCityLabel').textContent = ville;

    const confidence = person._confidence || 0;
    const confEl = document.getElementById('investigationConfidence');
    confEl.textContent = `${confidence}%`;
    confEl.className = `investigation-confidence ${confidence >= 70 ? 'high' : confidence >= 40 ? 'medium' : 'low'}`;

    const pin = document.getElementById('investigationMapPin');
    if (pin) {
        const cities = {
            'paris': { cx: 300, cy: 190 }, 'lyon': { cx: 320, cy: 310 }, 'marseille': { cx: 340, cy: 420 },
            'toulouse': { cx: 260, cy: 380 }, 'bordeaux': { cx: 190, cy: 360 }, 'lille': { cx: 240, cy: 120 },
            'nice': { cx: 390, cy: 390 }, 'nantes': { cx: 170, cy: 280 }, 'strasbourg': { cx: 400, cy: 180 },
            'montpellier': { cx: 300, cy: 380 }, 'rennes': { cx: 160, cy: 230 }, 'grenoble': { cx: 350, cy: 330 },
            'toulon': { cx: 360, cy: 410 }, 'angers': { cx: 190, cy: 260 }, 'dijon': { cx: 350, cy: 240 },
            'le havre': { cx: 210, cy: 170 }, 'reims': { cx: 320, cy: 160 }, 'saint-etienne': { cx: 310, cy: 320 },
            'limoges': { cx: 220, cy: 310 }, 'clermont-ferrand': { cx: 270, cy: 290 }, 'amiens': { cx: 260, cy: 140 },
            'perpignan': { cx: 290, cy: 430 }, 'caen': { cx: 190, cy: 190 }, 'orleans': { cx: 270, cy: 230 },
            'metz': { cx: 370, cy: 170 }, 'besancon': { cx: 380, cy: 220 }, 'mulhouse': { cx: 410, cy: 210 },
            'valence': { cx: 330, cy: 340 }, 'nimes': { cx: 290, cy: 370 }, 'avignon': { cx: 310, cy: 400 },
            'poitiers': { cx: 210, cy: 290 }, 'la rochelle': { cx: 160, cy: 300 }
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

    const grid = document.getElementById('investigationInfoGrid');
    if (grid) {
        let html = '';
        const excludedKeys = ['_confidence', '_sources', '_source_db', 'famille'];
        const importantKeys = ['nom_famille', 'prenom', 'nom_naissance', 'email', 'telephone', 'adresse', 'ville', 'code_postal', 'date_naissance', 'profession', 'societe', 'fonction'];
        
        const sortedKeys = Object.keys(person).sort((a, b) => {
            const aImp = importantKeys.includes(a) ? 0 : 1;
            const bImp = importantKeys.includes(b) ? 0 : 1;
            return aImp - bImp;
        });

        sortedKeys.forEach(key => {
            if (key.startsWith('_') || excludedKeys.includes(key)) return;
            const value = person[key];
            if (!value) return;
            const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            let displayValue = value;
            if (key === 'telephone' || key === 'mobile') displayValue = formatPhone(value);
            const isImportant = importantKeys.includes(key);
            html += `
                <div class="investigation-info-item ${isImportant ? 'important' : ''}">
                    <span class="investigation-info-label">${label}</span>
                    <span class="investigation-info-value">${displayValue}</span>
                </div>
            `;
        });

        if (person.famille && person.famille.length > 0) {
            html += `
                <div class="investigation-info-item" style="grid-column:1/-1;border-top:1px solid var(--border-color);padding-top:12px;margin-top:4px;">
                    <span class="investigation-info-label" style="color:var(--text-muted);font-weight:600;">Famille (${person.famille.length})</span>
                    <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:6px;">
                        ${person.famille.map(m => `
                            <span style="background:rgba(255,255,255,0.04);border:1px solid var(--border-color);border-radius:6px;padding:4px 12px;font-size:13px;color:var(--text-secondary);">
                                ${m.prenom || ''} ${m.nom_famille || ''}
                                ${m.lien ? ` · ${m.lien}` : ''}
                            </span>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        if (person._sources && person._sources.length > 0) {
            html += `
                <div class="investigation-info-item" style="grid-column:1/-1;border-top:1px solid var(--border-color);padding-top:12px;margin-top:4px;">
                    <span class="investigation-info-label" style="color:var(--text-muted);font-weight:600;">Sources</span>
                    <div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:6px;">
                        ${person._sources.map(s => `
                            <span style="font-size:11px;color:var(--text-muted);background:rgba(255,255,255,0.02);border:1px solid var(--border-color);padding:2px 10px;border-radius:12px;">${s}</span>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        grid.innerHTML = html;
    }

    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeInvestigation() {
    const overlay = document.getElementById('investigationOverlay');
    if (overlay) {
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    }
}

document.getElementById('investigationBack')?.addEventListener('click', closeInvestigation);
document.getElementById('investigationClose')?.addEventListener('click', closeInvestigation);

document.getElementById('investigationAddFiche')?.addEventListener('click', function() {
    if (!investigationData) {
        showToast('Aucune donnee', 'error');
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
            <select id="ficheSelectInvestigation">
                ${selectOptions}
                <option value="new">+ Creer une nouvelle fiche</option>
            </select>
        </div>
        <div id="newFicheNameContainerInvestigation" style="display:none;">
            <div class="form-group">
                <label>Nom de la nouvelle fiche</label>
                <input type="text" id="newFicheNameInvestigation" placeholder="Nom de la fiche">
            </div>
        </div>
        <div style="font-size:12px;color:var(--text-muted);">Personne : ${investigationData.prenom || ''} ${investigationData.nom_famille || 'Inconnu'}</div>
    `, 'Ajouter', async () => {
        const select = document.getElementById('ficheSelectInvestigation');
        if (!select) return;
        const ficheId = select.value;
        if (ficheId === 'new') {
            const nameInput = document.getElementById('newFicheNameInvestigation');
            const name = nameInput?.value?.trim();
            if (!name) { showToast('Veuillez donner un nom', 'warning'); return; }
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

document.getElementById('investigationCopy')?.addEventListener('click', function() {
    if (!investigationData) {
        showToast('Aucune donnee', 'error');
        return;
    }
    const person = investigationData;
    let text = '=== Marauder Investigation ===\n\n';
    Object.entries(person)
        .filter(([key]) => !key.startsWith('_') && key !== 'famille')
        .forEach(([key, value]) => {
            if (!value) return;
            const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            let displayValue = value;
            if (key === 'telephone' || key === 'mobile') displayValue = formatPhone(value);
            text += `${label}: ${displayValue}\n`;
        });
    if (person.famille && person.famille.length > 0) {
        text += '\n=== Famille ===\n';
        person.famille.forEach(m => {
            text += `${m.prenom || ''} ${m.nom_famille || ''}`;
            if (m.lien) text += ` (${m.lien})`;
            text += '\n';
        });
    }
    if (person._sources) text += `\nSources: ${person._sources.join(', ')}`;
    text += '\n\n--- by Marauder ---';
    navigator.clipboard.writeText(text).then(() => showToast('Copie !', 'success'));
});

document.getElementById('investigationGraphe')?.addEventListener('click', function() {
    if (!investigationData) {
        showToast('Aucune donnee', 'error');
        return;
    }
    if (typeof window.addPersonToGrapheWithFamily === 'function') {
        window.addPersonToGrapheWithFamily(investigationData);
        closeInvestigation();
        const grapheLi = document.querySelector('[data-page="graphe"]');
        if (grapheLi) grapheLi.click();
    } else {
        showToast('Module graphe indisponible', 'warning');
    }
});

// ============ COPY ============
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
            text += `${label}: ${displayValue}\n`;
        });
    if (person.famille && person.famille.length > 0) {
        text += '\n=== Famille associee ===\n';
        person.famille.forEach(m => {
            text += `${m.prenom} ${m.nom_famille}`;
            if (m.date_naissance) text += ` (${m.date_naissance})`;
            if (m.email) text += ` - ${m.email}`;
            if (m.telephone) text += ` - ${formatPhone(m.telephone)}`;
            text += ` - ${m.lien || 'Lie'}\n`;
        });
    }
    if (person._sources) text += `\nSources: ${person._sources.join(', ')}`;
    text += '\n\n--- by Marauder ---';
    navigator.clipboard.writeText(text).then(() => showToast('Copie !', 'success')).catch(() => {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showToast('Copie !', 'success');
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
            if (key === 'telephone' || key === 'mobile') displayValue = formatPhone(value);
            text += `${label}: ${displayValue}\n`;
        });
    if (row._source_db) text += `\nSource: ${row._source_db}`;
    text += '\n\n--- by Marauder ---';
    navigator.clipboard.writeText(text).then(() => showToast('Copie !', 'success')).catch(() => {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showToast('Copie !', 'success');
    });
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
            container.innerHTML = data.history.map(item => {
                const date = new Date(item.created_at);
                const dateStr = date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
                const timeStr = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                let query = item.query;
                if (typeof query === 'string') {
                    try { query = JSON.parse(query); } catch (e) { query = { raw: query }; }
                }
                const nom = query.nom_famille || '';
                const prenom = query.prenom || '';
                const displayName = `${prenom} ${nom}`.trim() || 'Recherche';
                const resultCount = item.results_count || 0;
                const resultText = resultCount === 0 ? 'Aucun resultat' : resultCount === 1 ? '1 resultat' : `${resultCount} resultats`;
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
            container.innerHTML = `<div class="empty-state"><p>Aucune recherche dans l'historique</p></div>`;
        }
    } catch (error) {
        container.innerHTML = '<div class="empty-state" style="color:var(--danger);">Erreur de chargement</div>';
    }
}

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
                if (container) displayResults(container, data.results);
                document.querySelectorAll('.sidebar-nav li').forEach(li => li.classList.remove('active'));
                const searchLi = document.querySelector('[data-page="search"]');
                if (searchLi) searchLi.classList.add('active');
                document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
                const searchPage = document.getElementById('page-search');
                if (searchPage) searchPage.classList.add('active');
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
        if (!response.ok) {
            container.innerHTML = `<div class="empty-state" style="color:var(--warning);"><p>Erreur ${response.status}</p></div>`;
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
            container.innerHTML = `<div class="empty-state"><p>Aucune fiche creee</p></div>`;
        }
    } catch (error) {
        container.innerHTML = `<div class="empty-state" style="color:var(--danger);"><p>Erreur de chargement</p></div>`;
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
            } else {
                const data = await response.json();
                showToast(data.error || 'Erreur', 'error');
            }
        } catch (error) {
            showToast('Erreur reseau', 'error');
        }
    });
});

function addToFiche(index) {
    const person = window._resultsData?.[index];
    if (!person) { showToast('Personne introuvable', 'error'); return; }
    if (fichesData.length === 0) { showToast('Aucune fiche existante', 'warning'); return; }

    const selectOptions = fichesData.map(f => `<option value="${f.id}">${f.name} (${f.persons?.length || 0}/10)</option>`).join('');

    showModal('Ajouter a une fiche', `
        <div class="form-group">
            <label>Selectionner une fiche</label>
            <select id="ficheSelect">
                ${selectOptions}
                <option value="new">+ Creer une nouvelle fiche</option>
            </select>
        </div>
        <div id="newFicheNameContainer" style="display:none;">
            <div class="form-group">
                <label>Nom de la nouvelle fiche</label>
                <input type="text" id="newFicheNameInput" placeholder="Nom de la fiche">
            </div>
        </div>
        <div style="font-size:12px;color:var(--text-muted);">Personne : ${person.prenom || ''} ${person.nom_famille || 'Inconnu'}</div>
    `, 'Ajouter', async () => {
        const select = document.getElementById('ficheSelect');
        if (!select) return;
        const ficheId = select.value;
        if (ficheId === 'new') {
            const nameInput = document.getElementById('newFicheNameInput');
            const name = nameInput?.value?.trim();
            if (!name) { showToast('Veuillez donner un nom', 'warning'); return; }
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
    } catch (error) { showToast('Erreur reseau', 'error'); }
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
            const response = await fetch(`${API_URL}/api/fiches/${fiche.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ name })
            });
            if (response.ok) {
                showToast('Fiche modifiee !', 'success');
                loadFiches();
            }
        } catch (error) { showToast('Erreur', 'error'); }
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
            const response = await fetch(`${API_URL}/api/fiches/${fiche.id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                showToast('Fiche supprimee !', 'success');
                loadFiches();
            }
        } catch (error) { showToast('Erreur', 'error'); }
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
                if (key === 'telephone' || key === 'mobile') displayValue = formatPhone(value);
                text += `  ${label}: ${displayValue}\n`;
            }
        });
        text += '\n';
    });
    text += '\n--- by Marauder ---';
    navigator.clipboard.writeText(text).then(() => showToast('Exporte !', 'success')).catch(() => {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showToast('Exporte !', 'success');
    });
}

// ============ ADD TO GRAPHE ============
function addToGraphe(index) {
    const person = window._resultsData?.[index];
    if (!person) {
        showToast('Personne introuvable', 'error');
        return;
    }
    if (typeof window.addPersonToGrapheWithFamily === 'function') {
        window.addPersonToGrapheWithFamily(person);
    } else {
        showToast('Le graphe n est pas disponible', 'warning');
    }
}

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
                    <div class="profile-row"><span class="label">Total recherches</span><span class="value">${data.stats?.total_searches || 0}</span></div>
                </div>
            `;
        }
    } catch (error) {
        container.innerHTML = '<div class="empty-state" style="color:var(--danger);">Erreur de chargement</div>';
    }
}

// ============ GRAPHE BOUTONS ============
document.getElementById('grapheAddPersonne')?.addEventListener('click', () => {
    if (!window.grapheNodes) { showToast('Graphe non initialise', 'warning'); return; }
    showModal('Ajouter une personne', `
        <div class="form-group"><label>Prenom</label><input type="text" id="newNodePrenom" class="search-input"></div>
        <div class="form-group"><label>Nom</label><input type="text" id="newNodeNom" class="search-input"></div>
        <div class="form-group"><label>Role</label><input type="text" id="newNodeRole" class="search-input"></div>
    `, 'Ajouter', () => {
        const prenom = document.getElementById('newNodePrenom').value.trim();
        const nom = document.getElementById('newNodeNom').value.trim();
        const role = document.getElementById('newNodeRole').value.trim();
        const label = `${prenom} ${nom}`.trim() || 'Personne';
        const container = document.getElementById('grapheContainer');
        const cx = container ? container.offsetWidth / 2 : 400;
        const cy = container ? container.offsetHeight / 2 : 300;
        const newNode = {
            id: Date.now(),
            label: label,
            role: role,
            x: cx + (Math.random() - 0.5) * 100,
            y: cy + (Math.random() - 0.5) * 100,
            radius: 24,
            color: ['#ffffff','#ef4444','#f59e0b','#22c55e','#06b6d4','#ec4899','#8b5cf6','#f97316'][Math.floor(Math.random() * 8)]
        };
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
        showToast(`"${label}" ajoute !`, 'success');
    });
});

document.getElementById('grapheAttacher')?.addEventListener('click', function() {
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

document.getElementById('grapheSauvegarder')?.addEventListener('click', () => {
    const nodes = window.grapheNodes || [];
    const edges = window.grapheEdges || [];
    const data = { name: 'Mon graphe', nodes: nodes, edges: edges };
    localStorage.setItem('marauder_graphe', JSON.stringify(data));
    fetch(`${API_URL}/api/graphes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(data)
    }).then(r => r.ok ? showToast('Sauvegarde sur le serveur !', 'success') : showToast('Sauvegarde locale', 'info'))
      .catch(() => showToast('Sauvegarde locale', 'info'));
});

document.getElementById('grapheMesGraphes')?.addEventListener('click', showGraphesModal);

document.getElementById('grapheEffacer').addEventListener('click', function() {
    if (window.grapheNodes.length === 0) {
        showToast('Deja vide', 'info');
        return;
    }
    showModal('Confirmation', '<p style="color:var(--text-secondary);">Effacer tout le graphe ?</p>', 'Effacer', () => {
        window.grapheNodes = [];
        window.grapheEdges = [];
        renderGraphe();
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
        const response = await fetch(`${API_URL}/api/graphes/all`, { headers: { 'Authorization': `Bearer ${token}` } });
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
        list.innerHTML = graphes.map((g, i) => {
            const isLocalIcon = g.isLocal ? '<span style="color:#6b6b6b;font-size:14px;">📁</span>' : '';
            return `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;background:#111;border:1px solid #2a2a2a;border-radius:10px;margin-bottom:8px;">
                <div>
                    <div style="font-weight:600;color:#fff;">${g.name || 'Sans nom'} ${isLocalIcon}</div>
                    <div style="font-size:12px;color:#6b6b6b;">${g.nodes?.length || 0} personnes · ${new Date(g.created_at).toLocaleDateString()}</div>
                </div>
                <div style="display:flex;gap:6px;">
                    <button onclick="loadGrapheFromList(${i}, ${!!g.isLocal})" style="padding:4px 12px;background:transparent;border:1px solid #2a2a2a;border-radius:6px;color:#a0a0a0;cursor:pointer;">Charger</button>
                    ${!g.isLocal ? `<button onclick="deleteGrapheFromList(${g.id})" style="padding:4px 12px;background:transparent;border:1px solid #2a2a2a;border-radius:6px;color:#ef4444;cursor:pointer;">Supprimer</button>` : ''}
                </div>
            </div>
        `}).join('');
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
            if (window.grapheNodes) window.grapheNodes = data.nodes || [];
            if (window.grapheEdges) window.grapheEdges = data.edges || [];
            document.getElementById('graphesModal').style.display = 'none';
            if (typeof window.renderGraphe === 'function') window.renderGraphe();
            showToast('Graphe charge !', 'success');
        }
    } catch (error) { showToast('Erreur de chargement', 'error'); }
}

async function deleteGrapheFromList(grapheId) {
    // Remplacer confirm() par showModal()
    showModal('Confirmation', '<p style="color:var(--text-secondary);">Supprimer ce graphe ?</p>', 'Supprimer', async () => {
        try {
            const response = await fetch(`${API_URL}/api/graphes/${grapheId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                showToast('Graphe supprime !', 'success');
                showGraphesModal();
            }
        } catch (error) { showToast('Erreur', 'error'); }
    });
}

// ============ SUPPORT TOGGLE ============
document.addEventListener('DOMContentLoaded', function() {
    const supportToggle = document.getElementById('supportToggle');
    const supportSubmenu = document.getElementById('supportSubmenu');
    const supportArrow = supportToggle ? supportToggle.querySelector('.support-arrow') : null;

    if (supportToggle && supportSubmenu) {
        supportToggle.addEventListener('click', function(e) {
            e.stopPropagation();
            e.preventDefault();
            
            const isOpen = supportSubmenu.style.display === 'block';
            supportSubmenu.style.display = isOpen ? 'none' : 'block';
            if (supportArrow) {
                supportArrow.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
            }
        });
    }

    // Fermer le submenu en cliquant ailleurs
    document.addEventListener('click', function(e) {
        if (supportToggle && supportSubmenu) {
            if (!supportToggle.contains(e.target) && !supportSubmenu.contains(e.target)) {
                supportSubmenu.style.display = 'none';
                if (supportArrow) {
                    supportArrow.style.transform = 'rotate(0deg)';
                }
            }
        }
    });
});

// ============ INIT ============
verifyToken();
loadProfile();

// Initialiser les tickets
initTicketCreation();

console.log('Dashboard charge');

// ============================================
// TICKET - FONCTION GLOBALE AVEC ONCLICK
// ============================================

console.log('🔵 Enregistrement de openCreateTicket');

// Fonction globale accessible par onclick
window.openCreateTicket = function() {
    console.log('🔵 openCreateTicket appelee !');
    
    showModal('Nouveau ticket', `
        <div class="form-group">
            <label>Sujet</label>
            <input type="text" id="ticketSubject" placeholder="Resume de votre probleme" style="width:100%;padding:10px;background:#1e1e1e;border:1px solid #2a2a2a;border-radius:8px;color:#fff;font-size:14px;">
        </div>
        <div class="form-group">
            <label>Message</label>
            <textarea id="ticketMessage" rows="5" placeholder="Decrivez votre probleme..." style="width:100%;padding:10px;background:#1e1e1e;border:1px solid #2a2a2a;border-radius:8px;color:#fff;font-family:Arial;font-size:14px;resize:vertical;"></textarea>
        </div>
    `, 'Envoyer', async function() {
        console.log('🔵 Envoi du ticket');
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
            
            const data = await response.json();
            console.log('🔵 Reponse:', data);
            
            if (response.ok && data.success) {
                showToast('Ticket cree !', 'success');
                loadTickets();
                closeModal();
            } else {
                showToast(data.error || 'Erreur', 'error');
            }
        } catch (error) {
            console.error('❌ Erreur:', error);
            showToast('Erreur reseau', 'error');
        }
    });
};

console.log('✅ openCreateTicket enregistree');