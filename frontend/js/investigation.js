// ============================================
// INVESTIGATION MODULE - COMPLET
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

// ============ GENERER LA CARTE FRANCE ============
function generateFranceMap() {
    return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 700" width="100%" height="100%">
    <rect width="600" height="700" fill="#151515" rx="8" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>
    
    <g stroke="rgba(255,255,255,0.3)" stroke-width="1.5" fill="none">
        <path d="M80,280 L70,300 L60,320 L55,340 L50,360 L55,380 L65,400 L80,415 L95,425 L110,435 L125,440 L140,445 L155,450 L170,455 L185,460 L200,465 L215,470 L230,475 L245,480 L260,485 L275,490 L290,495 L305,500 L320,505 L335,510 L350,515 L365,520 L380,525 L395,530 L410,535 L425,540 L440,545 L455,550 L470,555 L485,560 L500,565 L515,570 L530,575 L545,580 L560,585 L575,590"/>
        <path d="M575,590 L580,570 L585,550 L590,530 L592,510 L590,490 L585,470 L580,450 L575,430 L570,410 L565,390 L560,370 L555,350 L550,330 L545,310 L540,290 L535,270 L530,250 L525,230 L520,210 L515,190 L510,170 L505,150 L500,130 L495,110 L490,95 L480,85 L465,80 L450,75 L435,72 L420,70 L405,72 L390,75 L375,80 L360,85 L345,90 L330,95 L315,100 L300,105 L285,110 L270,115 L255,120 L240,125 L225,130 L210,135 L195,140 L180,145 L165,150 L150,155 L135,160 L120,165 L105,170 L90,175 L75,180 L65,190 L60,200 L55,215 L55,230 L60,245 L65,260 L75,275 L80,280 Z"/>
    </g>

    <g fill="rgba(255,255,255,0.4)">
        <circle cx="300" cy="190" r="4"/>
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
        <circle cx="360" cy="410" r="3"/>
        <circle cx="190" cy="260" r="3"/>
        <circle cx="350" cy="240" r="3"/>
        <circle cx="210" cy="170" r="3"/>
        <circle cx="320" cy="160" r="3"/>
        <circle cx="310" cy="320" r="3"/>
        <circle cx="220" cy="310" r="3"/>
        <circle cx="270" cy="290" r="3"/>
        <circle cx="260" cy="140" r="3"/>
        <circle cx="290" cy="430" r="3"/>
        <circle cx="190" cy="190" r="3"/>
        <circle cx="270" cy="230" r="3"/>
        <circle cx="370" cy="170" r="3"/>
        <circle cx="380" cy="220" r="3"/>
        <circle cx="410" cy="210" r="3"/>
        <circle cx="330" cy="340" r="3"/>
        <circle cx="290" cy="370" r="3"/>
        <circle cx="310" cy="400" r="3"/>
        <circle cx="210" cy="290" r="3"/>
        <circle cx="160" cy="300" r="3"/>
    </g>

    <g fill="rgba(255,255,255,0.06)" font-size="10" font-family="Arial" text-anchor="middle">
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
        <text x="220" y="150">Normandie</text>
        <text x="430" y="150">Grand Est</text>
    </g>

    <circle id="investigationMapPin" cx="300" cy="190" r="14" fill="none" stroke="#ffffff" stroke-width="3"/>
    <circle id="investigationMapPinDot" cx="300" cy="190" r="6" fill="#ffffff"/>
    <circle cx="300" cy="190" r="22" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>

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
    } else {
        console.warn('⚠️ Conteneur investigationMapContainer non trouve');
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

// ============ METTRE A JOUR LE POINT SUR LA CARTE ============
function updateMapPin(ville) {
    const pin = document.getElementById('investigationMapPin');
    const pinDot = document.getElementById('investigationMapPinDot');
    if (!pin) return;

    const cityKey = ville.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    let found = false;
    for (const [key, pos] of Object.entries(CITY_COORDS)) {
        if (cityKey.includes(key) || key.includes(cityKey)) {
            pin.setAttribute('cx', pos.cx);
            pin.setAttribute('cy', pos.cy);
            if (pinDot) {
                pinDot.setAttribute('cx', pos.cx);
                pinDot.setAttribute('cy', pos.cy);
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

// ============ AJOUTER PERSONNE A UNE FICHE (helper) ============
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
    
    // Initialiser la carte
    initFranceMap();
});

// ============ EXPOSER ============
window.openInvestigation = openInvestigation;
window.closeInvestigation = closeInvestigation;
window.generateFranceMap = generateFranceMap;
window.updateMapPin = updateMapPin;
window.initFranceMap = initFranceMap;

console.log('✅ Investigation module pret - Carte France incluse');