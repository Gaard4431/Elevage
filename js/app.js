let audioCtx;
function initAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
}

function playBeep() {
    initAudio();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.5);
}

// ==========================================
// COLLECTION & ELEVAGE UI
// ==========================================
let collectionData = JSON.parse(localStorage.getItem('dofus_gen10_collection')) || { "Muldo": [], "Dragodinde": [], "Volkorne": [] };

function toggleCollection(species, color, isChecked) {
    if (isChecked) { if (!collectionData[species].includes(color)) collectionData[species].push(color); } 
    else { collectionData[species] = collectionData[species].filter(c => c !== color); }
    localStorage.setItem('dofus_gen10_collection', JSON.stringify(collectionData));
    renderCollectionTabs();
}

function getLuminance(hex) {
    if(!hex) return 255;
    let rgb = parseInt(hex.replace('#', ''), 16);
    return (((rgb >> 16) & 0xff) * 299 + ((rgb >> 8) & 0xff) * 587 + ((rgb >> 0) & 0xff) * 114) / 1000;
}

function getBackgroundStyle(colorName) {
    if(!colorName) return "#cccccc";
    let parts = colorName.split(" et ");
    let col1 = colorPalette[parts[0]] || "#cccccc";
    let col2 = parts.length > 1 ? (colorPalette[parts[1]] || "#cccccc") : col1;
    return parts.length === 1 ? col1 : `linear-gradient(135deg, ${col1} 50%, ${col2} 50%)`;
}

function applyStyleToPill(element, colorName) {
    element.style.background = getBackgroundStyle(colorName);
    let parts = colorName.split(" et ");
    let avgLum = (getLuminance(colorPalette[parts[0]]) + getLuminance(parts.length > 1 ? colorPalette[parts[1]] : colorPalette[parts[0]])) / 2;
    element.style.color = avgLum > 135 ? '#000000' : '#FFFFFF';
    if(parts.length > 1) element.style.textShadow = avgLum > 135 ? '0px 0px 4px rgba(255,255,255,0.9)' : '0px 0px 4px rgba(0,0,0,0.8)';
    element.innerText = colorName;
}

function createColorPill(colorName, isHoverable = true) {
    const pill = document.createElement('div');
    pill.className = 'color-pill' + (isHoverable ? '' : ' no-hover');
    applyStyleToPill(pill, colorName);
    return pill;
}

function switchMainTab(tab) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.main-tab-btn').forEach(el => el.classList.remove('active'));
    document.getElementById('tab-' + tab).classList.add('active');
    event.target.classList.add('active');
    if(tab === 'gen') { renderCollectionTabs(); }
    if(tab === 'renta') { renderRentaTable(); }
}

function switchSubTab(tab) {
    document.querySelectorAll('.sub-tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.sub-tab-btn').forEach(el => el.classList.remove('active'));
    document.getElementById('sub-tab-' + tab).classList.add('active');
    event.target.classList.add('active');
}

function changeSpecies() { initGenerations(); renderCollectionTabs(); }

function initGenerations() {
    const species = document.querySelector('input[name="species"]:checked').value;
    const currentData = speciesData[species];
    const allGens = Object.keys(currentData.colorsByGen).map(Number).sort((a,b)=>a-b);
    
    const babyGens = allGens.filter(g => g % 2 !== 0 && g > 1);
    const btnContainerBaby = document.getElementById('gen-buttons-baby');
    btnContainerBaby.innerHTML = '';
    babyGens.forEach((g, index) => {
        const btn = document.createElement('button');
        btn.className = 'gen-btn' + (index === 0 ? ' active' : '');
        btn.innerText = 'Gen ' + g;
        btn.onclick = () => {
            btnContainerBaby.querySelectorAll('.gen-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            loadColors('baby', g, currentData);
        };
        btnContainerBaby.appendChild(btn);
    });
    if (babyGens.length > 0) loadColors('baby', babyGens[0], currentData);

    const parentGens = allGens.filter(g => g % 2 === 0 && g < 10);
    const btnContainerParent = document.getElementById('gen-buttons-parent');
    btnContainerParent.innerHTML = '';
    parentGens.forEach((g, index) => {
        const btn = document.createElement('button');
        btn.className = 'gen-btn' + (index === 0 ? ' active' : '');
        btn.innerText = 'Gen ' + g;
        btn.onclick = () => {
            btnContainerParent.querySelectorAll('.gen-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            loadColors('parent', g, currentData);
        };
        btnContainerParent.appendChild(btn);
    });
    if (parentGens.length > 0) loadColors('parent', parentGens[0], currentData);
}

function loadColors(type, gen, currentData) {
    const container = document.getElementById(`color-results-${type}`);
    container.innerHTML = '';
    const colors = currentData.colorsByGen[gen] || [];
    colors.forEach(color => {
        const pill = createColorPill(color);
        pill.onclick = () => { type === 'baby' ? openBabyModal(color, currentData) : openParentModal(color, currentData); };
        container.appendChild(pill);
    });
}

function renderCollectionTabs() {
    const species = document.querySelector('input[name="species"]:checked').value;
    const currentData = speciesData[species];
    const g9Colors = currentData.colorsByGen["9"] || [];
    const g10Colors = currentData.colorsByGen["10"] || [];

    const groups = {};
    g9Colors.forEach(g9 => groups[g9] = []);
    groups["Autres"] = [];

    g10Colors.forEach(g10 => {
        let assigned = false;
        for (let g9 of g9Colors) { if (g10.startsWith(g9)) { groups[g9].push(g10); assigned = true; break; } }
        if (!assigned) { for (let g9 of g9Colors) { if (g10.includes(g9)) { groups[g9].push(g10); assigned = true; break; } } }
        if (!assigned) groups["Autres"].push(g10);
    });

    const collectionContainer = document.getElementById('collection-container');
    const missingContainer = document.getElementById('missing-container');
    collectionContainer.innerHTML = ''; missingContainer.innerHTML = '';

    for (const [groupName, colors] of Object.entries(groups)) {
        if (colors.length === 0) continue;

        const groupDiv = document.createElement('div'); groupDiv.className = 'collection-group';
        groupDiv.innerHTML = `<h4>${groupName}</h4>`;
        const gridDiv = document.createElement('div'); gridDiv.className = 'color-grid';
        
        const missingGroupDiv = document.createElement('div'); missingGroupDiv.className = 'missing-group';
        missingGroupDiv.innerHTML = `<h4>${groupName}</h4>`;
        const missingMiniGrid = document.createElement('div'); missingMiniGrid.className = 'missing-mini-grid';
        let missingCount = 0;

        colors.forEach(color => {
            const isChecked = collectionData[species].includes(color);
            const item = document.createElement('label');
            item.className = 'g10-item' + (isChecked ? ' checked' : '');
            
            const cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = isChecked;
            cb.onchange = (e) => toggleCollection(species, color, e.target.checked);

            const pill = createColorPill(color, false); pill.style.flex = "1"; pill.style.padding = "6px"; pill.style.fontSize = "12px";
            item.appendChild(cb); item.appendChild(pill); gridDiv.appendChild(item);

            if (!isChecked) {
                missingCount++;
                const missingItem = document.createElement('div');
                missingItem.style.display = 'flex';
                missingItem.style.alignItems = 'center';
                missingItem.style.gap = '4px';
                missingItem.style.background = '#f1f3f5';
                missingItem.style.padding = '2px 6px 2px 2px';
                missingItem.style.borderRadius = '6px';
                missingItem.style.border = '1px solid #ddd';

                const miniBox = document.createElement('div');
                miniBox.className = 'mini-box';
                miniBox.style.background = getBackgroundStyle(color);
                miniBox.title = color; // Infobulle au survol
                
                // Récupération de l'autre couleur pour l'abréviation
                let parts = color.split(" et ");
                let abbrevText = "";
                if (parts.length > 1) {
                    let otherColor = (parts[0] === groupName) ? parts[1] : parts[0];
                    abbrevText = colorAbbreviations[otherColor] || otherColor.substring(0, 2);
                } else {
                    abbrevText = colorAbbreviations[color] || color.substring(0, 2);
                }
                
                const abbrevSpan = document.createElement('span');
                abbrevSpan.style.fontSize = '12px';
                abbrevSpan.style.fontWeight = 'bold';
                abbrevSpan.style.color = '#555';
                abbrevSpan.innerText = abbrevText;

                missingItem.appendChild(miniBox);
                missingItem.appendChild(abbrevSpan);
                missingMiniGrid.appendChild(missingItem);
            }
        });

        groupDiv.appendChild(gridDiv); collectionContainer.appendChild(groupDiv);
        if (missingCount > 0) {
            missingGroupDiv.appendChild(missingMiniGrid); missingContainer.appendChild(missingGroupDiv);
        } else {
            missingGroupDiv.innerHTML += `<span style="font-size:12px; color:#28a745; font-weight:bold;">Complet ! ✅</span>`;
            missingContainer.appendChild(missingGroupDiv);
        }
    }
}

function openBabyModal(colorName, currentData) {
    document.getElementById('modal-title').innerText = "Obtenir ce bébé";
    applyStyleToPill(document.getElementById('modal-highlight'), colorName);
    document.getElementById('modal-subtitle').innerText = "Couples possibles :";
    const listDiv = document.getElementById('modal-list'); listDiv.innerHTML = '';
    const couples = currentData.bebeCouples[colorName];

    if (!couples || couples.length === 0) listDiv.innerHTML = `<div class="no-couples">Aucun croisement spécifique répertorié.</div>`;
    else {
        couples.forEach(c => {
            const row = document.createElement('div'); row.className = 'couple-row';
            const pillA = createColorPill(c.parentA, false); const pillB = createColorPill(c.parentB, false);
            const plus = document.createElement('span'); plus.className = 'symbol'; plus.innerText = '+';
            row.appendChild(pillA); row.appendChild(plus); row.appendChild(pillB); listDiv.appendChild(row);
        });
    }
    document.getElementById('modal').style.display = 'flex';
}

function openParentModal(colorName, currentData) {
    document.getElementById('modal-title').innerText = "Croiser ce parent";
    applyStyleToPill(document.getElementById('modal-highlight'), colorName);
    document.getElementById('modal-subtitle').innerText = "Donne les bébés suivants :";
    const listDiv = document.getElementById('modal-list'); listDiv.innerHTML = '';
    const couples = currentData.parentCouples[colorName];

    if (!couples || couples.length === 0) listDiv.innerHTML = `<div class="no-couples">Ce parent ne donne aucune race pure connue.</div>`;
    else {
        couples.forEach(c => {
            const row = document.createElement('div'); row.className = 'couple-row';
            const pillPartner = createColorPill(c.partner, false); 
            const pillResult = createColorPill(c.result, false);
            const arrow = document.createElement('span'); arrow.className = 'symbol'; arrow.innerText = '➔';
            row.appendChild(pillPartner); row.appendChild(arrow); row.appendChild(pillResult); listDiv.appendChild(row);
        });
    }
    document.getElementById('modal').style.display = 'flex';
}
function closeModal() { document.getElementById('modal').style.display = 'none'; }


// ==========================================
// RENTA CARBURANTS
// ==========================================
const rentaFuels = {
    'baffe': { name: 'Baffeur', color: '#4A4A4A', text: '#fff' },
    'caresse': { name: 'Caresseur', color: '#FF69B4', text: '#fff' },
    'foudre': { name: 'Foudroyeur', color: '#D4AF37', text: '#000' },
    'abreuvoir': { name: 'Abreuvoir', color: '#0056b3', text: '#fff' },
    'dragofesse': { name: 'Dragofesse', color: '#c82333', text: '#fff' },
    'mangeoire': { name: 'Mangeoire', color: '#28a745', text: '#fff' }
};
const rentaTiers = ['T1', 'T2', 'T3', 'T4'];
const rentaSizes = [
    { id: 'minuscule', name: 'Minuscule', cap: 1000 }, { id: 'petit', name: 'Petit', cap: 2000 },
    { id: 'normal', name: 'Normal', cap: 3000 }, { id: 'grand', name: 'Grand', cap: 4000 }, { id: 'gigantesque', name: 'Gigantesque', cap: 5000 }
];

let rentaData = JSON.parse(localStorage.getItem('dofus_renta_data')) || {};
Object.keys(rentaFuels).forEach(f => {
    if(!rentaData[f]) rentaData[f] = {};
    rentaTiers.forEach(t => {
        if(!rentaData[f][t]) rentaData[f][t] = {};
        rentaSizes.forEach(s => { if(typeof rentaData[f][t][s.id] === 'undefined') rentaData[f][t][s.id] = ''; });
    });
});

function updateRentaPrice(sizeId, inputEl) {
    const fuel = document.querySelector('input[name="r_fuel"]:checked').value;
    const tier = document.querySelector('input[name="r_tier"]:checked').value;
    const value = inputEl.value;
    
    rentaData[fuel][tier][sizeId] = value;
    localStorage.setItem('dofus_renta_data', JSON.stringify(rentaData));

    const tr = inputEl.closest('tr');
    const cap = rentaSizes.find(s => s.id === sizeId).cap;
    const price = parseFloat(value);
    const ratioCell = tr.cells[2];
    
    if (!isNaN(price) && price > 0) {
        const ratio = (price / cap) * 20000;
        ratioCell.innerText = Math.round(ratio).toLocaleString('fr-FR') + ' k';
    } else { ratioCell.innerText = '-'; }
    
    let bestRatio = Infinity; let bestSizeId = null; let validCount = 0;
    rentaSizes.forEach(s => {
        const p = parseFloat(rentaData[fuel][tier][s.id]);
        if (!isNaN(p) && p > 0) {
            validCount++;
            const r = (p / s.cap) * 20000;
            if (r < bestRatio) { bestRatio = r; bestSizeId = s.id; }
        }
    });

    const tbody = document.getElementById('renta-tbody');
    Array.from(tbody.rows).forEach(row => {
        const sName = row.cells[0].innerText; 
        const sId = rentaSizes.find(s => sName.startsWith(s.name)).id;
        if (validCount >= 2 && sId === bestSizeId) {
            row.className = 'best-renta-row'; row.cells[2].style.color = '#155724';
        } else {
            row.className = ''; row.cells[2].style.color = '#444';
        }
    });

    calculateComparison();
}

function renderRentaTable() {
    const fuel = document.querySelector('input[name="r_fuel"]:checked').value;
    const tier = document.querySelector('input[name="r_tier"]:checked').value;
    const tbody = document.getElementById('renta-tbody');
    
    document.querySelectorAll('.renta-color-header').forEach(el => {
        el.style.background = rentaFuels[fuel].color;
        el.style.color = rentaFuels[fuel].text;
    });

    tbody.innerHTML = '';
    let bestRatio = Infinity; let bestSizeId = null; let validCount = 0;
    const currentRatios = {};

    rentaSizes.forEach(s => {
        const price = parseFloat(rentaData[fuel][tier][s.id]);
        if (!isNaN(price) && price > 0) {
            validCount++;
            const ratio = (price / s.cap) * 20000;
            currentRatios[s.id] = ratio;
            if (ratio < bestRatio) { bestRatio = ratio; bestSizeId = s.id; }
        }
    });

    rentaSizes.forEach(s => {
        const price = rentaData[fuel][tier][s.id];
        const ratio = currentRatios[s.id];
        const tr = document.createElement('tr');
        if (validCount >= 2 && s.id === bestSizeId) tr.className = 'best-renta-row';
        let ratioText = ratio ? Math.round(ratio).toLocaleString('fr-FR') + ' k' : '-';

        tr.innerHTML = `
            <td style="font-weight:bold;">${s.name} (${s.cap})</td>
            <td><input type="number" class="renta-input" value="${price}" oninput="updateRentaPrice('${s.id}', this)" placeholder="Prix"></td>
            <td style="font-weight:bold; color: ${tr.className === 'best-renta-row' ? '#155724' : '#444'};">${ratioText}</td>
        `;
        tbody.appendChild(tr);
    });

    renderCompareCheckboxes(fuel, tier);
    calculateComparison();
}

function renderCompareCheckboxes(currentFuel, currentTier) {
    const container = document.getElementById('compare-checkboxes');
    container.innerHTML = '';
    
    rentaTiers.forEach(t => {
        if (t === currentTier) return;
        let hasData = false;
        rentaSizes.forEach(s => { if (rentaData[currentFuel][t][s.id] !== '') hasData = true; });

        const label = document.createElement('label');
        label.style.opacity = hasData ? '1' : '0.4'; label.style.cursor = hasData ? 'pointer' : 'not-allowed';
        const cb = document.createElement('input'); cb.type = 'checkbox'; cb.value = t;
        cb.disabled = !hasData; cb.className = 'compare-tier-cb'; cb.onchange = calculateComparison;

        label.appendChild(cb); label.appendChild(document.createTextNode(`Tier ${t.replace('T','')}`)); container.appendChild(label);
    });
}

function calculateComparison() {
    const fuel = document.querySelector('input[name="r_fuel"]:checked').value;
    const currentTier = document.querySelector('input[name="r_tier"]:checked').value;
    const resDiv = document.getElementById('compare-result');
    const checkedTiers = Array.from(document.querySelectorAll('.compare-tier-cb:checked')).map(cb => cb.value);
    
    if (checkedTiers.length === 0) { resDiv.style.display = 'none'; return; }

    const tiersToCompare = [currentTier, ...checkedTiers];
    let globalBestRatio = Infinity; let globalBestItem = null;

    tiersToCompare.forEach(t => {
        rentaSizes.forEach(s => {
            const price = parseFloat(rentaData[fuel][t][s.id]);
            if (!isNaN(price) && price > 0) {
                const ratio = (price / s.cap) * 20000;
                if (ratio < globalBestRatio) {
                    globalBestRatio = ratio; globalBestItem = { size: s.name, tier: t };
                }
            }
        });
    });

    if (globalBestItem) {
        resDiv.style.display = 'block';
        resDiv.innerHTML = `🏆 Le plus rentable : <b>${globalBestItem.size} ${rentaFuels[fuel].name} (Tier ${globalBestItem.tier.replace('T','')})</b> à <b>${Math.round(globalBestRatio).toLocaleString('fr-FR')} k / 20 000 pts</b>.`;
    } else { resDiv.style.display = 'none'; }
}


// ==========================================
// 5. SYSTÈME DE TIMERS AVANCÉS
// ==========================================
const colorTarget = { 'Jaune': 20000, 'Bleu': 20000, 'Rouge': 20000, 'Vert': 857582 };
const colorLabel = { 'Jaune': 'Endurance', 'Bleu': 'Abreuvoir', 'Rouge': 'Dragrofesse', 'Vert': 'XP' };

let activeTimers = JSON.parse(localStorage.getItem('dofus_timers_v2')) || [];
let activeIntervals = {};

function saveTimers() { localStorage.setItem('dofus_timers_v2', JSON.stringify(activeTimers)); }

function triggerNotification(title, body) {
    if ("Notification" in window && Notification.permission === 'granted') {
        new Notification(title, { body: body, icon: "https://cdn-icons-png.flaticon.com/512/3233/3233483.png" });
    }
}

function getJaugeFromRate(rate) {
    if(rate == 40) return 100000; if(rate == 30) return 90000; if(rate == 20) return 70000; if(rate == 10) return 40000;
    return 0;
}

function simulateXP(valInit, jaugeInit, elapsedSeconds) {
    let stat = valInit; let jauge = jaugeInit; let time = elapsedSeconds;
    while (time > 0 && jauge > 0 && stat < 857582) {
        let ratePerSec, jaugeThreshold;
        if (jauge > 90000) { ratePerSec = 4; jaugeThreshold = 90000; }
        else if (jauge > 70000) { ratePerSec = 3; jaugeThreshold = 70000; }
        else if (jauge > 40000) { ratePerSec = 2; jaugeThreshold = 40000; }
        else { ratePerSec = 1; jaugeThreshold = 0; }

        let jaugeToLose = jauge - jaugeThreshold;
        let statNeeded = 857582 - stat;
        let actualLoss = Math.min(jaugeToLose, statNeeded);
        let timeNeeded = actualLoss / ratePerSec;

        if (time >= timeNeeded) { time -= timeNeeded; jauge -= actualLoss; stat += actualLoss; } 
        else { let loss = time * ratePerSec; jauge -= loss; stat += loss; time = 0; }
    }
    return { stat, jauge };
}

function calculateXPTimeRemaining(stat, jauge) {
    let timeNeeded = 0;
    while (stat < 857582 && jauge > 0) {
        let ratePerSec, jaugeThreshold;
        if (jauge > 90000) { ratePerSec = 4; jaugeThreshold = 90000; }
        else if (jauge > 70000) { ratePerSec = 3; jaugeThreshold = 70000; }
        else if (jauge > 40000) { ratePerSec = 2; jaugeThreshold = 40000; }
        else { ratePerSec = 1; jaugeThreshold = 0; }

        let jaugeToLose = jauge - jaugeThreshold;
        let statNeeded = 857582 - stat;
        let actualLoss = Math.min(jaugeToLose, statNeeded);
        
        timeNeeded += actualLoss / ratePerSec;
        jauge -= actualLoss; stat += actualLoss;
    }
    if (stat < 857582 && jauge <= 0) return Infinity; 
    return timeNeeded;
}

function getTimeToNextTier(jauge) {
    if(jauge > 90000) return (jauge - 90000)/4;
    if(jauge > 70000) return (jauge - 70000)/3;
    if(jauge > 40000) return (jauge - 40000)/2;
    if(jauge > 0) return jauge / 1;
    return 0;
}

window.updateXPTimer = function(id, subKey) {
    const valInput = document.getElementById(`xp_val_${id}_${subKey}`);
    const rateInput = document.querySelector(`input[name="xp_rate_${id}_${subKey}"]:checked`);
    if(!valInput.value || !rateInput) return alert("Remplissez la valeur et cochez un gain.");
    
    let timer = activeTimers.find(t => t.id === id);
    if(timer && timer[subKey]) {
        timer[subKey].startTime = Date.now();
        timer[subKey].startVal = parseFloat(valInput.value);
        timer[subKey].startJauge = getJaugeFromRate(parseInt(rateInput.value));
        timer[subKey].notifiedTier = false; 
        saveTimers();
    }
}

function updateDoubleColors() {
    const colA = document.querySelector('input[name="colA"]:checked')?.value;
    const colB = document.querySelector('input[name="colB"]:checked')?.value;

    document.querySelectorAll('input[name="colA"]').forEach(el => {
        if(el.value === colB && colB && colB !== 'Vert') { el.disabled = true; el.checked = false; } 
        else { el.disabled = false; }
    });
    document.querySelectorAll('input[name="colB"]').forEach(el => {
        if(el.value === colA && colA && colA !== 'Vert') { el.disabled = true; el.checked = false; } 
        else { el.disabled = false; }
    });
}

function requestNotif() {
    if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission();
    }
}

function addTimerSimple() {
    initAudio(); requestNotif();
    const numEl = document.querySelector('input[name="num1"]:checked');
    const lettreEl = document.getElementById('lettre1').value.toUpperCase();
    if(!numEl) return alert("Sélectionnez un numéro.");
    const name = numEl.value + lettreEl;
    
    const valInitiale = parseFloat(document.getElementById('valeur1').value);
    const perteEl = document.querySelector('input[name="perte1"]:checked');
    if(isNaN(valInitiale)) return alert("Valeur initiale invalide.");
    if(!perteEl) return alert("Sélectionnez une perte.");
    
    const perte = parseFloat(perteEl.value);
    const visee2000 = document.getElementById('visee2000').checked;
    const cible = visee2000 ? 2000 : 0;
    const valeurAPerdre = valInitiale - cible;

    if (valeurAPerdre <= 0) return alert(`L'objectif de ${cible} est déjà atteint !`);

    const endTime = Date.now() + ((valeurAPerdre / perte) * 10 * 1000);
    const newTimer = { id: Date.now(), type: 'simple', name: name, endTime: endTime, label: 'Sérénité', notified: false };
    
    activeTimers.push(newTimer); saveTimers(); createTimerDOM(newTimer);
    numEl.checked = false; perteEl.checked = false; document.getElementById('valeur1').value = '';
}

function addTimerDouble() {
    initAudio(); requestNotif();
    const numEl = document.querySelector('input[name="num2"]:checked');
    const lettreEl = document.getElementById('lettre2').value.toUpperCase();
    if(!numEl) return alert("Sélectionnez un numéro de l'enclos.");
    const name = numEl.value + lettreEl;

    const valA_str = document.getElementById('valA').value; const valA = parseFloat(valA_str);
    const gainA_el = document.querySelector('input[name="perteA"]:checked');
    const colA_el = document.querySelector('input[name="colA"]:checked');
    
    const valB_str = document.getElementById('valB').value; const valB = parseFloat(valB_str);
    const gainB_el = document.querySelector('input[name="perteB"]:checked');
    const colB_el = document.querySelector('input[name="colB"]:checked');

    const hasA = valA_str !== '' && !isNaN(valA) && gainA_el && colA_el;
    const hasB = valB_str !== '' && !isNaN(valB) && gainB_el && colB_el;

    const partialA = (valA_str !== '' || !isNaN(valA) || gainA_el || colA_el) && !hasA;
    const partialB = (valB_str !== '' || !isNaN(valB) || gainB_el || colB_el) && !hasB;

    if (partialA) return alert("Veuillez remplir toutes les informations pour la Statistique 1, ou vider complètement la case.");
    if (partialB) return alert("Veuillez remplir toutes les informations pour la Statistique 2, ou vider complètement la case.");
    if (!hasA && !hasB) return alert("Veuillez remplir au moins une statistique entière.");

    const newTimer = { id: Date.now(), type: 'double', name: name, notifiedA: false, notifiedB: false };

    if (hasA) {
        if(valA >= colorTarget[colA_el.value]) return alert(`Statistique 1 : L'objectif de ${colorTarget[colA_el.value]} est déjà atteint !`);
        newTimer.subA = { col: colA_el.value, label: colorLabel[colA_el.value], startTime: Date.now(), startVal: valA, rate: parseFloat(gainA_el.value), startJauge: colA_el.value==='Vert' ? getJaugeFromRate(parseFloat(gainA_el.value)) : null };
    }

    if (hasB) {
        if(valB >= colorTarget[colB_el.value]) return alert(`Statistique 2 : L'objectif de ${colorTarget[colB_el.value]} est déjà atteint !`);
        newTimer.subB = { col: colB_el.value, label: colorLabel[colB_el.value], startTime: Date.now(), startVal: valB, rate: parseFloat(gainB_el.value), startJauge: colB_el.value==='Vert' ? getJaugeFromRate(parseFloat(gainB_el.value)) : null };
    }

    activeTimers.push(newTimer); saveTimers(); createTimerDOM(newTimer);

    numEl.checked = false;
    if(gainA_el) gainA_el.checked = false; if(gainB_el) gainB_el.checked = false;
    if(colA_el) colA_el.checked = false; if(colB_el) colB_el.checked = false;
    document.getElementById('valA').value = ''; document.getElementById('valB').value = '';
    updateDoubleColors();
}

function formatTime(ms) {
    if(ms <= 0) return "TERMINÉ";
    if(ms === Infinity) return "JAUGE VIDE";
    const totalSec = Math.round(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${h}h ${m}m ${s}s`;
}

function createTimerDOM(timerObj) {
    const list = document.getElementById('list');
    const timerEl = document.createElement('div');
    timerEl.className = 'timer-item'; timerEl.id = 'timer_' + timerObj.id;
    
    const infoDiv = document.createElement('div'); infoDiv.className = 'timer-info';
    
    if (timerObj.type === 'simple') {
        infoDiv.innerHTML = `
            <div style="color:#007bff; font-weight:bold;">#${timerObj.name} (${timerObj.label})</div>
            <div id="time_${timerObj.id}" style="text-align:right;"></div>
        `;
    } else {
        let html = `<div style="color:#007bff; font-weight:bold; border-bottom:1px solid #eee; padding-bottom:4px; margin-bottom:4px;">#${timerObj.name}</div>`;
        
        ['subA', 'subB'].forEach(subKey => {
            const sub = timerObj[subKey];
            if (sub) {
                html += `
                    <div class="timer-row">
                        <span style="font-weight:normal;">${sub.label}</span> 
                        <span id="time_${timerObj.id}_${subKey}"></span>
                    </div>`;
                if (sub.col === 'Vert') {
                    html += `
                    <div class="xp-edit-box">
                        <span style="font-weight:bold;">Maj XP:</span>
                        <input type="number" id="xp_val_${timerObj.id}_${subKey}" placeholder="XP">
                        <div class="radio-group">
                            <label><input type="radio" name="xp_rate_${timerObj.id}_${subKey}" value="10">10</label>
                            <label><input type="radio" name="xp_rate_${timerObj.id}_${subKey}" value="20">20</label>
                            <label><input type="radio" name="xp_rate_${timerObj.id}_${subKey}" value="30">30</label>
                            <label><input type="radio" name="xp_rate_${timerObj.id}_${subKey}" value="40">40</label>
                        </div>
                        <button onclick="updateXPTimer(${timerObj.id}, '${subKey}')">OK</button>
                    </div>`;
                }
            }
        });
        infoDiv.innerHTML = html;
    }

    const deleteBtn = document.createElement('button'); deleteBtn.className = 'delete-btn'; deleteBtn.innerHTML = '✖';
    deleteBtn.onclick = () => {
        clearInterval(activeIntervals[timerObj.id]); timerEl.remove();
        activeTimers = activeTimers.filter(t => t.id !== timerObj.id); saveTimers();
    };

    timerEl.appendChild(infoDiv); timerEl.appendChild(deleteBtn); list.prepend(timerEl);

    if(timerObj.type === 'double') {
        ['subA', 'subB'].forEach(subKey => {
            const sub = timerObj[subKey];
            if(sub && sub.col === 'Vert') {
                let rad = document.querySelector(`input[name="xp_rate_${timerObj.id}_${subKey}"][value="${sub.rate}"]`);
                if(rad) rad.checked = true;
            }
        });
    }

    function updateDisplay() {
        const now = Date.now();
        let isCompletelyFinished = false;

        if (timerObj.type === 'simple') {
            const remaining = timerObj.endTime - now;
            const tEl = document.getElementById(`time_${timerObj.id}`);
            if (remaining <= 0) {
                tEl.innerHTML = `<span style="color:#dc3545; font-weight:bold;">TERMINÉ</span>`; timerEl.style.borderLeftColor = '#dc3545'; isCompletelyFinished = true;
                if(!timerObj.notified) { triggerNotification("Chrono Terminé !", `Enclos #${timerObj.name} a fini sa ${timerObj.label}.`); playBeep(); timerObj.notified = true; saveTimers(); }
            } else { tEl.innerHTML = formatTime(remaining); }
        } 
        else if (timerObj.type === 'double') {
            let finishedA = !timerObj.subA; let finishedB = !timerObj.subB;

            ['subA', 'subB'].forEach(subKey => {
                const sub = timerObj[subKey];
                if (sub) {
                    const tEl = document.getElementById(`time_${timerObj.id}_${subKey}`);
                    let elapsedSec = (now - sub.startTime) / 1000;
                    let remMs = 1; 

                    if (sub.col === 'Vert') {
                        let sim = simulateXP(sub.startVal, sub.startJauge, elapsedSec);
                        
                        const inputVal = document.getElementById(`xp_val_${timerObj.id}_${subKey}`);
                        if(inputVal && document.activeElement !== inputVal) inputVal.value = Math.floor(sim.stat);

                        if (sim.stat >= 857582) {
                            remMs = 0; 
                            tEl.innerHTML = `<span style="color:#dc3545; font-weight:bold;">TERMINÉ</span>`;
                        } else if (sim.jauge <= 0) {
                            tEl.innerHTML = `<span style="color:#dc3545; font-weight:bold; font-size:11px;">JAUGE VIDE</span>`;
                        } else {
                            let ratePerSec = sim.jauge > 90000 ? 4 : sim.jauge > 70000 ? 3 : sim.jauge > 40000 ? 2 : 1;
                            let ttnSec = getTimeToNextTier(sim.jauge);
                            let totalSecMaintained = (857582 - sim.stat) / ratePerSec;

                            tEl.innerHTML = `<div style="font-size:11px; text-align:right; line-height:1.4;">
                                <span style="color:#555">Total (si maintenu):</span> <span style="font-weight:bold">${formatTime(totalSecMaintained * 1000)}</span><br>
                                <span style="color:#555">Baisse jauge dans:</span> <span style="font-weight:bold; color:#d39e00;">${formatTime(ttnSec * 1000)}</span>
                            </div>`;

                            if (ttnSec > 0 && ttnSec <= 300 && !sub.notifiedTier) {
                                triggerNotification("Attention: Jauge XP !", `L'enclos #${timerObj.name} va baisser de tier dans moins de 5 min.`);
                                sub.notifiedTier = true; saveTimers();
                            }
                            if (ttnSec > 300) sub.notifiedTier = false;
                        }
                    } else {
                        let currentVal = sub.startVal + elapsedSec * (sub.rate / 10);
                        remMs = ((20000 - currentVal) / (sub.rate / 10)) * 1000;
                        if (remMs <= 0) {
                            tEl.innerHTML = `<span style="color:#dc3545; font-weight:bold;">TERMINÉ</span>`;
                        } else {
                            tEl.innerHTML = formatTime(remMs);
                        }
                    }

                    if (remMs <= 0) {
                        if(subKey==='subA') finishedA = true; else finishedB = true;
                        if(!timerObj[`notified${subKey==='subA'?'A':'B'}`]) {
                            triggerNotification("Chrono Terminé !", `Enclos #${timerObj.name} : ${sub.label} est terminé.`); playBeep();
                            timerObj[`notified${subKey==='subA'?'A':'B'}`] = true; saveTimers();
                        }
                    }
                }
            });

            if (finishedA && finishedB) { timerEl.style.borderLeftColor = '#dc3545'; isCompletelyFinished = true; }
        }

        if(isCompletelyFinished) clearInterval(activeIntervals[timerObj.id]);
    }

    activeIntervals[timerObj.id] = setInterval(updateDisplay, 1000); updateDisplay();
}

window.onload = () => {
    initGenerations();
    renderCollectionTabs();
    
    if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission();
    }

    let missedAlerts = [];
    const now = Date.now();

    activeTimers.forEach(t => {
        if (t.type === 'simple') {
            if (t.endTime < now && !t.notified) { missedAlerts.push(`#${t.name} (${t.label})`); t.notified = true; }
        } else if (t.type === 'double') {
            if (t.subA && !t.notifiedA) {
                let isFinished = false;
                if (t.subA.col === 'Vert') {
                    let sim = simulateXP(t.subA.startVal, t.subA.startJauge, (now - t.subA.startTime)/1000);
                    if (sim.stat >= 857582) isFinished = true;
                } else {
                    let remMs = ((20000 - (t.subA.startVal + ((now - t.subA.startTime)/1000)*(t.subA.rate/10))) / (t.subA.rate/10))*1000;
                    if (remMs <= 0) isFinished = true;
                }
                if(isFinished) { missedAlerts.push(`#${t.name} (${t.subA.label})`); t.notifiedA = true; }
            }
            if (t.subB && !t.notifiedB) {
                let isFinished = false;
                if (t.subB.col === 'Vert') {
                    let sim = simulateXP(t.subB.startVal, t.subB.startJauge, (now - t.subB.startTime)/1000);
                    if (sim.stat >= 857582) isFinished = true;
                } else {
                    let remMs = ((20000 - (t.subB.startVal + ((now - t.subB.startTime)/1000)*(t.subB.rate/10))) / (t.subB.rate/10))*1000;
                    if (remMs <= 0) isFinished = true;
                }
                if(isFinished) { missedAlerts.push(`#${t.name} (${t.subB.label})`); t.notifiedB = true; }
            }
        }
        createTimerDOM(t);
    });
    saveTimers();

    if(missedAlerts.length > 0 && Notification.permission === 'granted') {
        new Notification("Chronos Dofus Terminés !", { 
            body: "Pendant votre absence, ces enclos ont terminé :\n" + missedAlerts.join(", "),
            silent: true,
            icon: "https://cdn-icons-png.flaticon.com/512/3233/3233483.png"
        });
    }
};
// ==========================================
// RÉCAP VENTES & OCR MULTI-LIGNES
// ==========================================
let recapStock = JSON.parse(localStorage.getItem('dofus_recap_stock')) || [];
let currentBatch = [];

// Liste de toutes les couleurs pour aider l'IA
let allMountNames = [];
for (let species in speciesData) {
    for (let gen in speciesData[species].colorsByGen) {
        allMountNames.push(...speciesData[species].colorsByGen[gen]);
    }
}
allMountNames = [...new Set(allMountNames)].sort((a, b) => b.length - a.length);
const cleanString = (str) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

async function processScreenshot(event) {
    const file = event.target.files[0];
    if (!file) return;

    const statusDiv = document.getElementById('ocr-status');
    statusDiv.innerHTML = "⏳ Analyse de toutes les lignes de l'image...";
    
    try {
        const worker = await Tesseract.createWorker("fra");
        const { data: { text } } = await worker.recognize(file);
        await worker.terminate();

        const lines = text.split('\n');
        let foundCount = 0;

        for (let line of lines) {
            let cleanedLine = cleanString(line);
            let foundName = allMountNames.find(n => cleanedLine.includes(cleanString(n)));
            
            if (foundName) {
                // Trouver le prix (le nombre le plus grand sur la ligne)
                let numbers = line.replace(/\s/g, '').match(/\d{3,}/g); 
                let price = numbers && numbers.length > 0 ? Math.max(...numbers.map(Number)) : 0;
                
                // Déterminer si c'est une mise en vente ou une vente conclue
                let type = 'sale';
                if (cleanedLine.includes('en vente') || cleanedLine.includes('(')) {
                    type = 'listing';
                }
                
                currentBatch.push({ type, name: foundName, price });
                foundCount++;
            }
        }

        statusDiv.innerHTML = foundCount > 0 
            ? `✅ ${foundCount} monture(s) détectée(s) ! Vérifiez le tableau ci-dessous.` 
            : "❌ Aucune monture trouvée. Ajoutez-les manuellement via le bouton ci-dessous.";
        
        console.log("Texte brut lu par l'IA :", text);
        renderBatchTable();
        
    } catch (err) {
        statusDiv.innerHTML = "❌ Erreur lors de la lecture de l'image.";
        console.error(err);
    }
    
    event.target.value = ""; // Réinitialise l'input pour pouvoir renvoyer la même image
}

function renderBatchTable() {
    document.getElementById('batch-container').style.display = 'block';
    const tbody = document.getElementById('batch-tbody');
    tbody.innerHTML = '';
    
    currentBatch.forEach((item, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <select onchange="updateBatchItem(${index}, 'type', this.value)" style="padding:4px; font-size:11px; border:1px solid #ccc; border-radius:4px;">
                    <option value="sale" ${item.type === 'sale' ? 'selected' : ''}>Vente</option>
                    <option value="listing" ${item.type === 'listing' ? 'selected' : ''}>Mise en vente</option>
                </select>
            </td>
            <td><input type="text" value="${item.name}" onchange="updateBatchItem(${index}, 'name', this.value)" style="width:100px; padding:4px; font-size:11px; border:1px solid #ccc; border-radius:4px;"></td>
            <td><input type="number" value="${item.price}" onchange="updateBatchItem(${index}, 'price', this.value)" style="width:70px; padding:4px; font-size:11px; border:1px solid #ccc; border-radius:4px;"></td>
            <td><button class="delete-btn" style="width:24px; height:24px; font-size:10px;" onclick="removeFromBatch(${index})">✖</button></td>
        `;
        tbody.appendChild(tr);
    });
}

function updateBatchItem(index, key, value) {
    if (key === 'price') value = parseInt(value) || 0;
    currentBatch[index][key] = value;
}

function removeFromBatch(index) {
    currentBatch.splice(index, 1);
    if(currentBatch.length === 0) {
        document.getElementById('batch-container').style.display = 'none';
        document.getElementById('ocr-status').innerHTML = "Tableau vidé.";
    } else {
        renderBatchTable();
    }
}

function addManualToBatch() {
    const type = document.getElementById('batch-add-type').value;
    const name = document.getElementById('batch-add-name').value.trim();
    const price = parseInt(document.getElementById('batch-add-price').value) || 0;
    
    if(!name || price <= 0) return alert("Veuillez remplir un nom de monture et un prix valide.");
    
    currentBatch.push({ type, name, price });
    renderBatchTable();
    
    document.getElementById('batch-add-name').value = '';
    document.getElementById('batch-add-price').value = '';
}

function confirmBatch() {
    if (currentBatch.length === 0) return alert("Le tableau est vide.");
    
    const now = Date.now();
    const autoList = document.getElementById('recap-auto-list').checked;

    currentBatch.forEach((item, index) => {
        // On rajoute l'index au Date.now() pour éviter que les IDs soient identiques si ça boucle trop vite
        const uniqueId = now + index; 

        if (item.type === 'listing') {
            recapStock.push({ id: uniqueId, name: item.name, listedAt: now, soldAt: null });
        } else {
            if (autoList) {
                recapStock.push({ id: uniqueId, name: item.name, listedAt: now, soldAt: now });
            } else {
                let oldestUnsold = recapStock.filter(s => s.name === item.name && s.soldAt === null)
                                             .sort((a, b) => a.listedAt - b.listedAt)[0];
                if (oldestUnsold) {
                    oldestUnsold.soldAt = now;
                } else {
                    recapStock.push({ id: uniqueId, name: item.name, listedAt: now, soldAt: now });
                }
            }
        }
    });

    localStorage.setItem('dofus_recap_stock', JSON.stringify(recapStock));
    renderRecapTable();
    
    currentBatch = [];
    document.getElementById('batch-container').style.display = 'none';
    document.getElementById('ocr-status').innerHTML = "✅ Données validées et ajoutées à vos statistiques !";
}

function renderRecapTable() {
    const tbody = document.getElementById('recap-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const stats = {};

    recapStock.forEach(item => {
        if (!stats[item.name]) {
            stats[item.name] = { listed: 0, sold: 0, totalSpeedMs: 0 };
        }
        
        stats[item.name].listed++;
        
        if (item.soldAt !== null) {
            stats[item.name].sold++;
            let diffMs = item.soldAt - item.listedAt;
            if (diffMs < 0) diffMs = 0;
            stats[item.name].totalSpeedMs += diffMs;
        }
    });

    for (const [name, data] of Object.entries(stats)) {
        const taux = Math.round((data.sold / data.listed) * 100);
        let speedDays = "-";
        
        if (data.sold > 0) {
            const avgSpeedMs = data.totalSpeedMs / data.sold;
            let days = avgSpeedMs / 86400000; // Millisecondes dans un jour
            speedDays = days < 1 ? "< 1 j" : Math.round(days) + " j";
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-weight: bold; font-size: 12px;">${name}</td>
            <td>${data.listed}</td>
            <td style="color: #28a745; font-weight: bold;">${data.sold}</td>
            <td>
                <div style="background:#e9ecef; border-radius:4px; width:100%; height:8px; overflow:hidden; margin-bottom:2px;">
                    <div style="background:${taux >= 50 ? '#28a745' : '#ffc107'}; height:100%; width:${taux}%;"></div>
                </div>
                <span style="font-size:11px;">${taux}%</span>
            </td>
            <td style="font-weight:bold; color:#0056b3;">${speedDays}</td>
        `;
        tbody.appendChild(tr);
    }
}

// Lancer le rendu du tableau global au chargement (sans casser les chronos)
const oldOnload = window.onload;
window.onload = () => {
    if(oldOnload) oldOnload();
    renderRecapTable();
};
