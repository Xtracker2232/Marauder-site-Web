// ============================================
// INVESTIGATION MODULE - TOUT EST ICI
// ============================================
console.log('🔍 Investigation module chargé');

// ============ DONNEES ============
let investigationData = null;

// ============ COORDONNEES DES VILLES ============
const CITY_COORDS = {
    'paris': { cx: 300, cy: 190 },
    'lyon': { cx: 320, cy: 310 },
    'marseille': { cx: 340, cy: 420 },
    'toulouse': { cx: 260, cy: 380 },
    'bordeaux': { cx: 190, cy: 360 },
    'lille': { cx: 240, cy: 120 },
    'nice': { cx: 390, cy: 390 },
    'nantes': { cx: 170, cy: 280 },
    'strasbourg': { cx: 400, cy: 180 },
    'montpellier': { cx: 300, cy: 380 },
    'rennes': { cx: 160, cy: 230 },
    'grenoble': { cx: 350, cy: 330 },
    'toulon': { cx: 360, cy: 410 },
    'angers': { cx: 190, cy: 260 },
    'dijon': { cx: 350, cy: 240 },
    'le havre': { cx: 210, cy: 170 },
    'reims': { cx: 320, cy: 160 },
    'saint-etienne': { cx: 310, cy: 320 },
    'limoges': { cx: 220, cy: 310 },
    'clermont-ferrand': { cx: 270, cy: 290 },
    'amiens': { cx: 260, cy: 140 },
    'perpignan': { cx: 290, cy: 430 },
    'caen': { cx: 190, cy: 190 },
    'orleans': { cx: 270, cy: 230 },
    'metz': { cx: 370, cy: 170 },
    'besancon': { cx: 380, cy: 220 },
    'mulhouse': { cx: 410, cy: 210 },
    'valence': { cx: 330, cy: 340 },
    'nimes': { cx: 290, cy: 370 },
    'avignon': { cx: 310, cy: 400 },
    'poitiers': { cx: 210, cy: 290 },
    'la rochelle': { cx: 160, cy: 300 }
};

// ============ GENERER LA CARTE SVG ============
function generateFranceMap() {
    return `
        <svg class="france-map" viewBox="0 0 600 700" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="600" height="700" fill="#151515" rx="12" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>
            
            <!-- Carte France -->
            <g stroke="rgba(255,255,255,0.2)" stroke-width="1.5" fill="none">
                <path d="M80,280 L70,300 L60,320 L50,340 L45,360 L50,380 L60,400 L75,415 L90,425 L105,435 L120,440 L135,445 L150,450 L165,455 L180,460 L195,465 L210,470 L225,475 L240,480 L255,485 L270,490"/>
                <path d="M270,490 L285,495 L300,500 L315,505 L330,510 L345,515 L360,520 L375,525 L390,530 L405,535 L420,540 L435,545 L450,550 L465,555 L480,560 L495,565 L510,570 L525,575 L540,580 L555,585 L570,590"/>
                <path d="M80,280 L90,260 L100,240 L110,220 L120,200 L130,180 L140,160 L150,140 L160,125 L170,115 L185,110 L200,105 L215,100 L230,95 L250,90 L270,85 L290,82 L310,80 L330,82 L350,85 L370,90 L390,95 L410,100 L430,105 L445,110 L460,115 L470,125 L480,140 L490,160 L500,180 L510,200 L520,220 L530,240 L540,260 L550,280"/>
                <path d="M550,280 L560,300 L565,320 L570,340 L572,360 L570,380 L565,400 L560,420 L555,440 L550,460 L545,480 L540,500 L535,520 L530,540 L525,560 L520,580 L515,590 L505,595 L495,600 L485,605 L475,610 L465,615 L455,620 L445,625 L435,630 L425,635 L415,640 L405,645 L395,650"/>
                <path d="M395,650 L380,655 L365,660 L350,662 L335,660 L320,655 L305,650 L290,645 L275,640 L260,635 L245,630 L230,625 L215,620 L200,615 L185,610 L170,605 L155,600 L140,595 L125,590 L110,585 L95,580 L80,575 L65,570 L50,565 L35,560 L25,555 L20,545 L25,535 L35,525 L50,515 L65,505 L80,495 L95,485 L110,475 L125,465 L140,455 L155,445 L170,435 L185,425 L200,415 L215,405 L230,395 L245,385 L260,375 L275,365 L290,355 L305,345 L320,335 L335,325 L350,315 L365,305 L380,295 L395,285 L410,275 L425,265 L440,255 L455,245 L470,235 L485,225 L500,215 L515,205 L530,195 L545,185 L555,175"/>
                <path d="M555,175 L545,165 L530,155 L515,145 L500,135 L485,125 L470,115 L455,105 L440,95 L425,85 L410,75 L395,65 L380,55 L365,45 L350,40 L335,38 L320,40 L305,45 L290,55 L275,65 L260,75 L245,85 L230,95 L215,105 L200,115 L185,125 L170,135 L155,145 L140,155 L125,165 L110,175 L95,185 L80,195 L70,205 L60,215 L55,225 L55,240 L60,255 L70,270 L80,280 Z"/>
            </g>

            <!-- Points des villes -->
            <g fill="#ffffff" stroke="none">
                <circle cx="300" cy="190" r="5" fill="#ffffff"/>
                <circle cx="300" cy="190" r="12" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>
                ${Object.values(CITY_COORDS).map(c => `<circle cx="${c.cx}" cy="${c.cy}" r="2.5" fill="rgba(255,255,255,0.25)"/>`).join('')}
            </g>

            <!-- Noms des régions -->
            <g fill="rgba(255,255,255,0.06)" font-size="11" font-family="Arial" text-anchor="middle">
                <text x="300" y="240">Île-de-France</text>
                <text x="340" y="370">Auvergne-Rhône-Alpes</text>
                <text x="240" y="420">Occitanie</text>
                <text x="200" y="340">Nouvelle-Aquitaine</text>
                <text x="260" y="160">Hauts-de-France</text>
                <text x="370" y="460">Provence-Alpes-Côte d'Azur</text>
                <text x="180" y="260">Pays de la Loire</text>
                <text x="380" y="210">Grand Est</text>
                <text x="250" y="280">Centre-Val de Loire</text>
                <text x="330" y="260">Bourgogne-Franche-Comté</text>
            </g>

            <!-- Grille -->
            <g stroke="rgba(255,255,255,0.015)" stroke-width="0.5">
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

            <!-- Pin (point d'investigation) -->
            <circle id="investigationMapPin" cx="300" cy="300" r="14" fill="none" stroke="#ffffff" stroke-width="3"/>
            <circle cx="300" cy="300" r="6" fill="#ffffff"/>
            <circle cx="300" cy="300" r="22" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>
        </svg>
    `;
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

    // Nom
    const fullName = (person.prenom || '') + ' ' + (person.nom_famille || 'Inconnu');
    const nameEl = document.getElementById('investigationName');
    if (nameEl) nameEl.textContent = 'Investigation - ' + fullName;

    // Ville
    const ville = person.ville || person.ville_naissance || person.adresse?.split(',').pop()?.trim() || 'Localisation inconnue';
    const cityLabel = document.getElementById('investigationCityLabel');
    if (cityLabel) cityLabel.textContent = ville;

    // Mettre à jour le point sur la carte
    updateMapPin(ville);

    // Confiance
    const confidence = person._confidence || 0;
    const confEl = document.getElementById('investigationConfidence');
    if (confEl) {
        confEl.textContent = confidence + '%';
        confEl.className = 'investigation-confidence ' + (confidence >= 70 ? 'high' : confidence >= 40 ? 'medium' : 'low');
    }

    // Grille d'informations
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

// ============ METTRE A JOUR LE POINT SUR LA CARTE ============
function updateMapPin(ville) {
    const pin = document.getElementById('investigationMapPin');
    if (!pin) return;

    const cityKey = ville.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    let found = false;
    for (const [key, pos] of Object.entries(CITY_COORDS)) {
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

// ============ FERMER INVESTIGATION ============
function closeInvestigation() {
    const overlay = document.getElementById('investigationOverlay');
    if (overlay) {
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// ============ COPIER LES DONNEES ============
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

// ============ INITIALISER LA CARTE AU CHARGEMENT ============
function initInvestigationModule() {
    const mapContainer = document.getElementById('investigationMapContainer');
    if (mapContainer) {
        mapContainer.innerHTML = generateFranceMap();
    }
    console.log('✅ Carte France initialisee');
}

// ============ BOUTONS ============
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('investigationBack')?.addEventListener('click', closeInvestigation);
    document.getElementById('investigationClose')?.addEventListener('click', closeInvestigation);
    document.getElementById('investigationCopy')?.addEventListener('click', copyInvestigationData);
    document.getElementById('investigationGraphe')?.addEventListener('click', addInvestigationToGraphe);
    document.getElementById('investigationAddFiche')?.addEventListener('click', addInvestigationToFiche);
    
    // Initialiser la carte
    initInvestigationModule();
});

// ============ EXPOSER ============
window.openInvestigation = openInvestigation;
window.closeInvestigation = closeInvestigation;
window.generateFranceMap = generateFranceMap;
window.updateMapPin = updateMapPin;

console.log('✅ Investigation module pret - Carte France integree');