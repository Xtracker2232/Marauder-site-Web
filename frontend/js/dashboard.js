// ========================================
// INVESTIGATION
// ========================================
let investigationData = null;
let investigationMap = null;
let investigationMarker = null;

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
    const grid = document.getElementById('investigationInfoGrid');
    if (grid) {
        let html = '';
        const excludedKeys = ['_confidence', '_sources', '_source_db', 'famille'];
        const importantKeys = ['nom_famille', 'prenom', 'nom_naissance', 'email', 'telephone', 'adresse', 'ville', 'code_postal', 'date_naissance', 'profession', 'societe', 'fonction', 'nir', 'genre'];
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
    setTimeout(() => {
        initInvestigationMap(ville);
    }, 400);
}

function initInvestigationMap(ville) {
    const container = document.getElementById('investigationLeafletMap');
    if (!container) return;
    if (investigationMap) {
        investigationMap.remove();
        investigationMap = null;
        investigationMarker = null;
    }
    const cityCoords = {
        'paris': [48.8566, 2.3522], 'lyon': [45.7640, 4.8357], 'marseille': [43.2965, 5.3698],
        'toulouse': [43.6047, 1.4442], 'bordeaux': [44.8378, -0.5792], 'lille': [50.6292, 3.0573],
        'nice': [43.7102, 7.2620], 'nantes': [47.2184, -1.5536], 'strasbourg': [48.5734, 7.7521],
        'montpellier': [43.6108, 3.8767], 'rennes': [48.1173, -1.6778], 'grenoble': [45.1885, 5.7245],
        'toulon': [43.1242, 5.9280], 'angers': [47.4784, -0.5632], 'dijon': [47.3220, 5.0415],
        'le havre': [49.4944, 0.1079], 'reims': [49.2583, 4.0317], 'saint-etienne': [45.4397, 4.3872],
        'limoges': [45.8336, 1.2611], 'clermont-ferrand': [45.7772, 3.0870], 'amiens': [49.8941, 2.2957],
        'perpignan': [42.6976, 2.8954], 'caen': [49.1829, -0.3707], 'orleans': [47.9029, 1.9092],
        'metz': [49.1193, 6.1757], 'besancon': [47.2378, 6.0241], 'mulhouse': [47.7500, 7.3400],
        'valence': [44.9334, 4.8924], 'nimes': [43.8367, 4.3601], 'avignon': [43.9493, 4.8055],
        'poitiers': [46.5802, 0.3404], 'la rochelle': [46.1603, -1.1511], 'le tignet': [43.6193, 6.8443],
        'cannes': [43.5513, 7.0128], 'antibes': [43.5804, 7.1251], 'grasse': [43.6588, 6.9254],
        'monaco': [43.7384, 7.4246], 'saint-tropez': [43.2693, 6.6388], 'frejus': [43.4333, 6.7333],
        'draguignan': [43.5402, 6.4665], 'brignoles': [43.4056, 6.0627], 'aix-en-provence': [43.5297, 5.4474]
    };
    let coords = null;
    const villeLower = ville.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    for (const [key, value] of Object.entries(cityCoords)) {
        if (villeLower.includes(key) || key.includes(villeLower)) {
            coords = value;
            break;
        }
    }
    if (!coords) coords = [46.6034, 1.8883];
    investigationMap = L.map(container, {
        center: coords,
        zoom: 13,
        zoomControl: false,
        attributionControl: false
    });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(investigationMap);
    L.control.zoom({ position: 'topright' }).addTo(investigationMap);
    const customIcon = L.divIcon({
        className: 'investigation-marker',
        html: `
            <div style="width:32px;height:32px;background:#ffffff;border-radius:50%;border:3px solid rgba(255,255,255,0.8);box-shadow:0 0 30px rgba(255,255,255,0.4);display:flex;align-items:center;justify-content:center;animation:pulseMarker 2s ease-out infinite;">
                <div style="width:10px;height:10px;background:#ffffff;border-radius:50%;box-shadow:0 0 20px rgba(255,255,255,0.6);"></div>
            </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
    });
    investigationMarker = L.marker(coords, { icon: customIcon }).addTo(investigationMap);
    const pulseCircle = L.circle(coords, {
        radius: 300,
        color: 'rgba(255,255,255,0.2)',
        fillColor: 'rgba(255,255,255,0.04)',
        fillOpacity: 1,
        weight: 1
    }).addTo(investigationMap);
    let radius = 300;
    let growing = true;
    setInterval(() => {
        if (!investigationMap) return;
        if (growing) { radius += 8; if (radius > 600) growing = false; }
        else { radius -= 8; if (radius < 200) growing = true; }
        pulseCircle.setRadius(radius);
        const opacity = 1 - (radius - 200) / 400;
        pulseCircle.setStyle({
            fillOpacity: 0.04 * opacity,
            color: `rgba(255,255,255,${0.15 * opacity})`
        });
    }, 50);
    setTimeout(() => { if (investigationMap) investigationMap.invalidateSize(); }, 500);
}

function closeInvestigation() {
    const overlay = document.getElementById('investigationOverlay');
    if (overlay) {
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    }
    if (investigationMap) {
        investigationMap.remove();
        investigationMap = null;
        investigationMarker = null;
    }
}

// BOUTONS INVESTIGATION
document.getElementById('investigationBack')?.addEventListener('click', closeInvestigation);
document.getElementById('investigationClose')?.addEventListener('click', closeInvestigation);

document.getElementById('investigationAddFiche')?.addEventListener('click', function() {
    if (!investigationData) { showToast('Aucune donnee', 'error'); return; }
    if (fichesData.length === 0) { showToast('Aucune fiche existante', 'warning'); return; }
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
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
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
    if (!investigationData) { showToast('Aucune donnee', 'error'); return; }
    const person = investigationData;
    let text = '=== Marauder Investigation ===\n\n';
    Object.entries(person).filter(([key]) => !key.startsWith('_') && key !== 'famille').forEach(([key, value]) => {
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
    if (!investigationData) { showToast('Aucune donnee', 'error'); return; }
    if (typeof window.addPersonToGrapheWithFamily === 'function') {
        window.addPersonToGrapheWithFamily(investigationData);
        closeInvestigation();
        const grapheLi = document.querySelector('[data-page="graphe"]');
        if (grapheLi) grapheLi.click();
    } else {
        showToast('Module graphe indisponible', 'warning');
    }
});