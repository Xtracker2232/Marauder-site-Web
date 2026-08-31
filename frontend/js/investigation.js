// ============================================
// INVESTIGATION MODULE - COMPLET
// ============================================
console.log('🔍 Investigation module chargé');

let investigationData = null;

// ============ COORDONNEES DES VILLES ============
const CITY_COORDS = {
    'paris': { x: 300, y: 190 },
    'lyon': { x: 320, y: 310 },
    'marseille': { x: 340, y: 420 },
    'toulouse': { x: 260, y: 380 },
    'bordeaux': { x: 190, y: 360 },
    'lille': { x: 240, y: 120 },
    'nice': { x: 390, y: 390 },
    'nantes': { x: 170, y: 280 },
    'strasbourg': { x: 400, y: 180 },
    'montpellier': { x: 300, y: 380 },
    'rennes': { x: 160, y: 230 },
    'grenoble': { x: 350, y: 330 },
    'toulon': { x: 360, y: 410 },
    'angers': { x: 190, y: 260 },
    'dijon': { x: 350, y: 240 },
    'reims': { x: 320, y: 160 },
    'clermont-ferrand': { x: 270, y: 290 },
    'caen': { x: 190, y: 190 },
    'orleans': { x: 270, y: 230 },
    'metz': { x: 370, y: 170 },
    'avignon': { x: 310, y: 400 },
    'poitiers': { x: 210, y: 290 }
};

// ============ GENERER LA CARTE FRANCE AVEC UNE VRAIE CARTE ============
function generateFranceMap() {
    return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 700" width="100%" height="100%">
        <rect width="600" height="700" fill="#151515" rx="8" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>
        
        <!-- Carte France -->
        <g stroke="rgba(255,255,255,0.2)" stroke-width="1.5" fill="none">
            <!-- Contour hexagonal -->
            <polygon points="300,80 480,180 520,350 420,500 180,500 80,350 120,180" stroke="rgba(255,255,255,0.3)" fill="rgba(255,255,255,0.02)"/>
            
            <!-- Lignes de régions -->
            <line x1="300" y1="80" x2="300" y2="500" stroke="rgba(255,255,255,0.05)"/>
            <line x1="120" y1="180" x2="480" y2="350" stroke="rgba(255,255,255,0.05)"/>
            <line x1="80" y1="350" x2="520" y2="350" stroke="rgba(255,255,255,0.05)"/>
            <line x1="180" y1="500" x2="420" y2="500" stroke="rgba(255,255,255,0.05)"/>
            
            <!-- Contours régionaux simplifiés -->
            <path d="M300,80 L120,180 L80,350 L180,500 L300,500 L420,500 L520,350 L480,180 Z" stroke="rgba(255,255,255,0.15)" fill="none"/>
            
            <!-- Découpage Nord-Sud -->
            <path d="M120,180 L300,350 L480,350" stroke="rgba(255,255,255,0.05)" fill="none"/>
            <path d="M180,500 L300,350 L420,500" stroke="rgba(255,255,255,0.05)" fill="none"/>
        </g>
        
        <!-- Noms des régions -->
        <g fill="rgba(255,255,255,0.08)" font-size="11" font-family="Arial, sans-serif" text-anchor="middle">
            <text x="300" y="140">Île-de-France</text>
            <text x="380" y="210">Grand Est</text>
            <text x="220" y="160">Hauts-de-France</text>
            <text x="160" y="230">Normandie</text>
            <text x="150" y="290">Bretagne</text>
            <text x="200" y="340">Nouvelle-Aquitaine</text>
            <text x="300" y="340">Auvergne-Rhône-Alpes</text>
            <text x="250" y="290">Centre-Val de Loire</text>
            <text x="300" y="420">Occitanie</text>
            <text x="370" y="400">Provence-Alpes-Côte d'Azur</text>
            <text x="380" y="310">Bourgogne-Franche-Comté</text>
        </g>
        
        <!-- Points des villes -->
        <g fill="rgba(255,255,255,0.3)">
            <circle cx="300" cy="190" r="4" fill="rgba(255,255,255,0.8)"/>
            <circle cx="320" cy="310" r="3"/>
            <circle cx="340" cy="420" r="3"/>
            <circle cx="260" cy="380" r="3"/>
            <circle cx="190" cy="360" r="3"/>
            <circle cx="240" cy="120" r="3"/>
            <circle cx="390" cy="390" r="3"/>
            <circle cx="170" cy="280" r="3"/>
            <circle cx="400" cy="180" r="3"/>
            <circle cx="300" cy="380" r="3"/>
            <circle cx="160" cy="230" r="3"/>
            <circle cx="350" cy="330" r="3"/>
            <circle cx="190" cy="260" r="3"/>
            <circle cx="350" cy="240" r="3"/>
            <circle cx="320" cy="160" r="3"/>
            <circle cx="270" cy="290" r="3"/>
            <circle cx="190" cy="190" r="3"/>
            <circle cx="270" cy="230" r="3"/>
            <circle cx="370" cy="170" r="3"/>
            <circle cx="310" cy="400" r="3"/>
            <circle cx="210" cy="290" r="3"/>
        </g>
        
        <!-- Pin d'investigation -->
        <circle id="investigationMapPin" cx="300" cy="190" r="14" fill="none" stroke="#ffffff" stroke-width="2.5"/>
        <circle id="investigationMapPinDot" cx="300" cy="190" r="5" fill="#ffffff"/>
        <circle cx="300" cy="190" r="20" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>
        
        <!-- Grille -->
        <g stroke="rgba(255,255,255,0.02)" stroke-width="0.5">
            <line x1="0" y1="100" x2="600" y2="100"/>
            <line x1="0" y1="200" x2="600" y2="200"/>
            <line x1="0" y1="300" x2="600" y2="300"/>
            <line x1="0" y1="400" x2="600" y2="400"/>
            <line x1="0" y1="500" x2="600" y2="500"/>
            <line x1="0" y1="600" x2="600" y2="600"/>
            <line x1="100" y1="0" x2="100" y2="700"/>
            <line x1="200" y1="0" x2="200" y2="700"/>
            <line x1="300" y1="0" x2="300" y2="700"/>
            <line x1="400" y1="0" x2="400" y2="700"/>
            <line x1="500" y1="0" x2="500" y2="700"/>
        </g>
    </svg>
    `;
}

// ============ INITIALISER LA CARTE ============
function initFranceMap() {
    const container = document.getElementById('investigationMapContainer');
    if (container) {
        container.innerHTML = generateFranceMap();
        console.log('✅ Carte France initialisee');
    }
}

// ============ METTRE A JOUR LE POINT ============
function updateMapPin(ville) {
    const pin = document.getElementById('investigationMapPin');
    const pinDot = document.getElementById('investigationMapPinDot');
    if (!pin) return;

    const cityKey = ville.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    let found = false;
    for (const [key, pos] of Object.entries(CITY_COORDS)) {
        if (cityKey.includes(key) || key.includes(cityKey)) {
            pin.setAttribute('cx', pos.x);
            pin.setAttribute('cy', pos.y);
            if (pinDot) {
                pinDot.setAttribute('cx', pos.x);
                pinDot.setAttribute('cy', pos.y);
            }
            found = true;
            break;
        }
    }
    if (!found) {
        pin.setAttribute('cx', 300);
        pin.setAttribute('cy', 190);
        if (pinDot) {
            pinDot.setAttribute('cx', 300);
            pinDot.setAttribute('cy', 190);
        }
    }
}

// ============ FORMAT PHONE ============
function formatPhoneInvestigation(phone) {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
        return cleaned.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5');
    }
    return phone;
}

// ============ OUVRIR INVESTIGATION ============
function openInvestigation(index) {
    const data = window._resultsData;
    if (!data || !data[index]) {
        if (typeof showToast === 'function') showToast('Personne introuvable', 'error');
        return;
    }

    investigationData = data[index];
    const person = investigationData;
    const overlay = document.getElementById('investigationOverlay');
    if (!overlay) return;

    const fullName = (person.prenom || '') + ' ' + (person.nom_famille || 'Inconnu');
    const nameEl = document.getElementById('investigationName');
    if (nameEl) nameEl.textContent = 'Investigation - ' + fullName;

    const ville = person.ville || person.ville_naissance || person.adresse?.split(',').pop()?.trim() || 'Localisation inconnue';
    const cityLabel = document.getElementById('investigationCityLabel');
    if (cityLabel) cityLabel.textContent = ville;

    updateMapPin(ville);

    const confidence = person._confidence || 0;
    const confEl = document.getElementById('investigationConfidence');
    if (confEl) {
        confEl.textContent = confidence + '%';
        confEl.className = 'investigation-confidence ' + (confidence >= 70 ? 'high' : confidence >= 40 ? 'medium' : 'low');
    }

    const grid = document.getElementById('investigationInfoGrid');
    if (grid) {
        let html = '';
        const importantKeys = ['nom_famille', 'prenom', 'nom_naissance', 'email', 'telephone', 'adresse', 'ville', 'code_postal', 'date_naissance'];
        
        Object.entries(person)
            .filter(([key]) => !key.startsWith('_') && key !== 'famille')
            .forEach(([key, value]) => {
                if (!value) return;
                const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                const isImportant = importantKeys.includes(key);
                let displayValue = value;
                if (key === 'telephone' || key === 'mobile') displayValue = formatPhoneInvestigation(value);
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
                        ${person.famille.map(m => `
                            <span style="background:rgba(255,255,255,0.04);border:1px solid #2a2a2a;border-radius:6px;padding:4px 12px;font-size:13px;color:#a0a0a0;">
                                ${m.prenom || ''} ${m.nom_famille || ''} ${m.lien ? ' · ' + m.lien : ''}
                            </span>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        if (person._sources && person._sources.length > 0) {
            html += `
                <div class="investigation-info-item" style="grid-column:1/-1;border-top:1px solid #2a2a2a;padding-top:12px;margin-top:4px;">
                    <span class="investigation-info-label" style="color:#6b6b6b;font-weight:600;">Sources</span>
                    <div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:6px;">
                        ${person._sources.map(s => `
                            <span style="font-size:11px;color:#6b6b6b;background:rgba(255,255,255,0.02);border:1px solid #2a2a2a;padding:2px 10px;border-radius:12px;">${s}</span>
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

// ============ FERMER ============
function closeInvestigation() {
    const overlay = document.getElementById('investigationOverlay');
    if (overlay) {
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// ============ COPIER ============
function copyInvestigationData() {
    if (!investigationData) {
        if (typeof showToast === 'function') showToast('Aucune donnee', 'error');
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
            if (key === 'telephone' || key === 'mobile') displayValue = formatPhoneInvestigation(value);
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
    
    navigator.clipboard.writeText(text).then(() => {
        if (typeof showToast === 'function') showToast('Copie !', 'success');
    });
}

// ============ AJOUTER A UNE FICHE ============
function addInvestigationToFiche() {
    if (!investigationData) {
        if (typeof showToast === 'function') showToast('Aucune donnee', 'error');
        return;
    }
    if (typeof fichesData !== 'undefined' && fichesData.length === 0) {
        if (typeof showToast === 'function') showToast('Aucune fiche existante', 'warning');
        return;
    }
    
    const selectOptions = fichesData.map(f => `<option value="${f.id}">${f.name} (${f.persons?.length || 0}/10)</option>`).join('');
    
    if (typeof showModal === 'function') {
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
                if (!name) {
                    if (typeof showToast === 'function') showToast('Veuillez donner un nom', 'warning');
                    return;
                }
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
                        if (typeof loadFiches === 'function') loadFiches();
                        if (typeof showToast === 'function') showToast('Personne ajoutee !', 'success');
                    }
                } catch (error) {
                    if (typeof showToast === 'function') showToast('Erreur', 'error');
                }
            } else {
                await addPersonToFiche(parseInt(ficheId), investigationData);
                if (typeof loadFiches === 'function') loadFiches();
                if (typeof showToast === 'function') showToast('Personne ajoutee !', 'success');
            }
        });
        
        document.getElementById('ficheSelectInvestigation')?.addEventListener('change', function() {
            const container = document.getElementById('newFicheNameContainerInvestigation');
            if (container) container.style.display = this.value === 'new' ? 'block' : 'none';
        });
    }
}

// ============ AJOUTER AU GRAPHE ============
function addInvestigationToGraphe() {
    if (!investigationData) {
        if (typeof showToast === 'function') showToast('Aucune donnee', 'error');
        return;
    }
    if (typeof window.addPersonToGrapheWithFamily === 'function') {
        window.addPersonToGrapheWithFamily(investigationData);
        closeInvestigation();
        document.querySelector('[data-page="graphe"]')?.click();
    } else {
        if (typeof showToast === 'function') showToast('Graphe en developpement', 'info');
    }
}

// ============ AJOUTER PERSONNE A UNE FICHE ============
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
            if (typeof showToast === 'function') showToast(data.error || 'Erreur', 'error');
        }
    } catch (error) {
        if (typeof showToast === 'function') showToast('Erreur reseau', 'error');
    }
}

// ============ BOUTONS ============
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('investigationBack')?.addEventListener('click', closeInvestigation);
    document.getElementById('investigationClose')?.addEventListener('click', closeInvestigation);
    document.getElementById('investigationCopy')?.addEventListener('click', copyInvestigationData);
    document.getElementById('investigationGraphe')?.addEventListener('click', addInvestigationToGraphe);
    document.getElementById('investigationAddFiche')?.addEventListener('click', addInvestigationToFiche);
    
    initFranceMap();
});

// ============ EXPOSER ============
window.openInvestigation = openInvestigation;
window.closeInvestigation = closeInvestigation;

console.log('✅ Investigation module pret');