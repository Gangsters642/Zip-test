let currentSearchQuery = '';

document.addEventListener('DOMContentLoaded', () => {
    setupSearch();
    fetchAndDisplayApps();
    setupModal();
    setupRequestForm();
    loadTrendingRecommendations();
    // Hidden admin link (double-click footer hint)
    document.querySelector('.admin-hint')?.addEventListener('dblclick', () => {
        const link = document.getElementById('hiddenAdminLink');
        if (link) { link.style.display = 'inline-block'; link.href = window.location.origin + '/super-secret-admin'; link.textContent = '🔐 Admin Panel'; }
    });
});

async function fetchAndDisplayApps(query = '') {
    const container = document.getElementById('appList');
    const sectionTitle = document.getElementById('sectionTitle');
    const didYouMeanDiv = document.getElementById('didYouMeanBanner');
    const clearBtn = document.getElementById('searchClearBtn');
    container.innerHTML = '<div class="loading-skeleton"><div class="skeleton-card"></div></div>';
    try {
        let url = '/api/apps';
        if (query && query.trim() !== '') {
            url = `/api/search?q=${encodeURIComponent(query)}`;
            sectionTitle.innerHTML = `<i class="fas fa-search"></i> Search results for "${escapeHtml(query)}"`;
            clearBtn.style.display = 'block';
        } else {
            sectionTitle.innerHTML = '<i class="fas fa-th-large"></i> Available Apps';
            clearBtn.style.display = 'none';
            didYouMeanDiv.style.display = 'none';
        }
        const res = await fetch(url);
        if (!res.ok) throw new Error();
        let apps, didYouMean = null, suggestions = [];
        if (query && query.trim() !== '') {
            const data = await res.json();
            apps = data.results;
            didYouMean = data.didYouMean;
            suggestions = data.suggestions;
            updateSuggestionsDropdown(suggestions);
            if (didYouMean) {
                didYouMeanDiv.innerHTML = `🔍 Did you mean: <span id="didYouMeanLink">${escapeHtml(didYouMean)}</span>?`;
                didYouMeanDiv.style.display = 'flex';
                document.getElementById('didYouMeanLink').onclick = () => { document.getElementById('searchInput').value = didYouMean; fetchAndDisplayApps(didYouMean); };
            } else didYouMeanDiv.style.display = 'none';
        } else {
            apps = await res.json();
            updateSuggestionsDropdown([]);
        }
        if (apps.length === 0) { container.innerHTML = `<div class="empty-state">✨ No apps found.</div>`; return; }
        renderApps(apps, container, query);
    } catch (err) { container.innerHTML = '<div class="empty-state">⚠️ Error loading apps.</div>'; }
}

function renderApps(apps, container, highlight = '') {
    container.innerHTML = '';
    apps.forEach(app => container.appendChild(createAppCard(app, highlight)));
}

function createAppCard(app, highlight = '') {
    const card = document.createElement('div');
    card.className = 'app-card';
    let displayName = escapeHtml(app.name);
    let displayDesc = escapeHtml(app.description.substring(0,100)) + (app.description.length>100?'...':'');
    if (highlight && highlight.trim()) {
        const regex = new RegExp(`(${escapeRegex(highlight)})`, 'gi');
        displayName = displayName.replace(regex, '<span class="highlight">$1</span>');
        displayDesc = displayDesc.replace(regex, '<span class="highlight">$1</span>');
    }
    card.innerHTML = `
        <img src="${app.image || '/assets/default-icon.png'}" class="app-icon" onerror="this.src='/assets/default-icon.png'">
        <h3>${displayName}</h3>
        <p class="description">${displayDesc}</p>
        <div class="tags">${app.tags.map(t=>`<span class="tag">#${escapeHtml(t)}</span>`).join(' ')}</div>
        <div class="meta"><span>📦 v${escapeHtml(app.version)}</span>${app.isPaid ? `<span class="price">💰 PKR ${app.price}</span>` : '<span class="free">🎉 FREE</span>'}</div>
        <button class="download-btn" data-id="${app.id}" data-paid="${app.isPaid}" data-name="${escapeHtml(app.name)}">${app.isPaid ? '🔒 Request Access' : '⬇️ Download'}</button>
    `;
    const btn = card.querySelector('.download-btn');
    btn.addEventListener('click', (e) => {
        e.preventDefault();
        showRequestModal(btn.dataset.id, btn.dataset.name, btn.dataset.paid === 'true');
    });
    return card;
}

function escapeRegex(str) { return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

let debounceTimer;
function setupSearch() {
    const input = document.getElementById('searchInput');
    input.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        const q = e.target.value;
        if (q.trim() === '') fetchAndDisplayApps('');
        else debounceTimer = setTimeout(() => fetchAndDisplayApps(q), 300);
    });
    document.addEventListener('click', (e) => {
        const dropdown = document.getElementById('suggestionsDropdown');
        if (!input.contains(e.target) && !dropdown.contains(e.target)) dropdown.classList.remove('active');
    });
}
function updateSuggestionsDropdown(suggestions) {
    const dropdown = document.getElementById('suggestionsDropdown');
    if (!suggestions.length) { dropdown.classList.remove('active'); return; }
    dropdown.innerHTML = suggestions.map(s => `<div class="suggestion-item">${escapeHtml(s)}</div>`).join('');
    dropdown.classList.add('active');
    document.querySelectorAll('.suggestion-item').forEach(item => {
        item.addEventListener('click', () => {
            const val = item.textContent;
            document.getElementById('searchInput').value = val;
            fetchAndDisplayApps(val);
            dropdown.classList.remove('active');
        });
    });
}
document.getElementById('clearSearchBtn')?.addEventListener('click', () => {
    document.getElementById('searchInput').value = '';
    fetchAndDisplayApps('');
});

let currentModalApp = null;
function setupModal() {
    const modal = document.getElementById('requestModal');
    modal.querySelector('.close-modal').onclick = () => modal.style.display = 'none';
    window.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };
}
function showRequestModal(appId, appName, isPaid) {
    currentModalApp = { id: appId, name: appName, isPaid };
    const modal = document.getElementById('requestModal');
    document.getElementById('modalAppName').innerText = `Request: ${appName}`;
    document.getElementById('requestAppId').value = appId;
    document.getElementById('requestIsPaid').value = isPaid;
    const paymentDiv = document.getElementById('paymentMethods');
    const proofInput = document.querySelector('#requestForm input[name="proofImage"]');
    if (isPaid) { paymentDiv.style.display = 'block'; proofInput.required = true; }
    else { paymentDiv.style.display = 'none'; proofInput.required = false; }
    document.getElementById('requestForm').reset();
    document.getElementById('requestMsg').innerHTML = '';
    modal.style.display = 'flex';
}
function setupRequestForm() {
    const form = document.getElementById('requestForm');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const msgDiv = document.getElementById('requestMsg');
        msgDiv.innerHTML = 'Submitting...';
        const formData = new FormData(form);
        try {
            const res = await fetch('/api/request-download', { method: 'POST', body: formData });
            const data = await res.json();
            if (res.ok) {
                msgDiv.innerHTML = '<span style="color:#4caf50;">✅ Request submitted! Admin will review.</span>';
                setTimeout(() => document.getElementById('requestModal').style.display = 'none', 3000);
            } else msgDiv.innerHTML = `<span style="color:#ff6584;">❌ Error: ${data.error}</span>`;
        } catch (err) { msgDiv.innerHTML = '<span style="color:#ff6584;">Network error.</span>'; }
    });
}

async function loadTrendingRecommendations() {
    const container = document.getElementById('recommendList');
    container.innerHTML = '<div class="loading-skeleton"><div class="skeleton-card"></div></div>';
    try {
        const res = await fetch('/api/recommend?limit=4');
        const data = await res.json();
        if (!data.recommendations.length) { container.innerHTML = '<div class="empty-state">No trending apps yet.</div>'; return; }
        container.innerHTML = '';
        data.recommendations.forEach(app => {
            const card = createRecommendationCard(app);
            container.appendChild(card);
        });
    } catch (err) { container.innerHTML = '<div class="empty-state">Could not load recommendations.</div>'; }
}
function createRecommendationCard(app) {
    const card = document.createElement('div');
    card.className = 'app-card recommendation-card';
    card.innerHTML = `
        <img src="${app.image || '/assets/default-icon.png'}" class="app-icon" onerror="this.src='/assets/default-icon.png'">
        <h3>${escapeHtml(app.name)}</h3>
        <p class="description">${escapeHtml(app.description.substring(0,80))}...</p>
        <div class="meta"><span>📦 v${escapeHtml(app.version)}</span>${app.isPaid ? `<span class="price">💰 PKR ${app.price}</span>` : '<span class="free">🎉 FREE</span>'}</div>
        <button class="download-btn rec-download" data-id="${app.id}" data-paid="${app.isPaid}" data-name="${escapeHtml(app.name)}">${app.isPaid ? '🔒 Request' : '⬇️ Download'}</button>
    `;
    const btn = card.querySelector('.rec-download');
    btn.addEventListener('click', () => showRequestModal(btn.dataset.id, btn.dataset.name, btn.dataset.paid === 'true'));
    return card;
}
function escapeHtml(s) { if(!s)return ''; return s.replace(/[&<>]/g,function(m){if(m==='&')return'&amp;';if(m==='<')return'&lt;';if(m==='>')return'&gt;';return m;}); }