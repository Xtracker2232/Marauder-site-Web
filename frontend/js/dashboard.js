const API_URL = window.location.origin;

// Vérification token
const token = localStorage.getItem('token');
if (!token) {
    window.location.href = '/';
}

// Vérification token à chaque chargement
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

// ============ RECHERCHE ============
document.getElementById('searchBtn').addEventListener('click', async () => {
    const query = {
        nom_famille: document.getElementById('searchNom').value || undefined,
        prenom: document.getElementById('searchPrenom').value || undefined,
        email: document.getElementById('searchEmail').value || undefined,
        telephone: document.getElementById('searchPhone').value || undefined,
        ville: document.getElementById('searchVille').value || undefined,
        code_postal: document.getElementById('searchCp').value || undefined,
        flexible: document.getElementById('searchFlexible').checked,
        per_page: 20
    };

    // Remove undefined values
    Object.keys(query).forEach(key => query[key] === undefined && delete query[key]);

    if (Object.keys(query).length <= 1) {
        alert('Veuillez remplir au moins un critère de recherche');
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
        container.innerHTML = '<div class="empty-state">Erreur de recherche</div>';
    }
});

// ============ LOOKUP ============
document.getElementById('lookupBtn').addEventListener('click', async () => {
    const type = document.getElementById('lookupType').value;
    const value = document.getElementById('lookupValue').value.trim();

    if (!value) {
        alert('Veuillez entrer une valeur');
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
        container.innerHTML = '<div class="empty-state">Erreur de lookup</div>';
    }
});

// ============ DISPLAY FUNCTIONS ============
function displayResults(container, results) {
    container.innerHTML = results.map(person => {
        const confidence = person._confidence || 0;
        const confidenceClass = confidence >= 70 ? 'high' : confidence >= 40 ? 'medium' : 'low';
        
        return `
            <div class="result-card">
                <div class="result-header">
                    <div class="result-name">${person.prenom || ''} ${person.nom_famille || 'Inconnu'}</div>
                    <span class="confidence-badge confidence-${confidenceClass}">${confidence}%</span>
                </div>
                <div class="result-details">
                    ${person.email ? `<div><span class="label">Email</span> ${person.email}</div>` : ''}
                    ${person.telephone ? `<div><span class="label">Téléphone</span> ${person.telephone}</div>` : ''}
                    ${person.ville ? `<div><span class="label">Ville</span> ${person.ville}</div>` : ''}
                    ${person.code_postal ? `<div><span class="label">Code postal</span> ${person.code_postal}</div>` : ''}
                    ${person.date_naissance ? `<div><span class="label">Date naissance</span> ${person.date_naissance}</div>` : ''}
                    ${person.societe ? `<div><span class="label">Société</span> ${person.societe}</div>` : ''}
                </div>
                ${person._sources ? `
                    <div class="result-sources">
                        Sources : ${person._sources.map(s => `<span>${s}</span>`).join('')}
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
}

function displayLookupResults(container, results) {
    container.innerHTML = results.map(row => {
        const details = Object.entries(row)
            .filter(([key]) => !key.startsWith('_'))
            .map(([key, value]) => {
                const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                return `<div><span class="label">${label}</span> ${value}</div>`;
            }).join('');
        
        return `
            <div class="result-card">
                <div class="result-details">${details}</div>
                ${row._source_db ? `
                    <div class="result-sources">Source : <span>${row._source_db}</span></div>
                ` : ''}
            </div>
        `;
    }).join('');
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
        container.innerHTML = '<div class="empty-state">Erreur de chargement</div>';
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
                        <span class="label">Email</span>
                        <span class="value">${data.user.email}</span>
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
        container.innerHTML = '<div class="empty-state">Erreur de chargement</div>';
    }
}

// ============ INIT ============
verifyToken();
loadProfile(); // Load profile by default