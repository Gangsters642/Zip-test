let currentApps = [];
document.addEventListener('DOMContentLoaded', () => { checkAuth(); setupLogin(); setupLogout(); setupTabs(); setupSettings(); setupUploadModal(); setupEditModal(); });

async function checkAuth() {
    try {
        const res = await fetch('/admin/api/stats', { credentials: 'include' });
        if (res.ok) { showDashboard(); loadStats(); loadApps(); }
        else showLogin();
    } catch { showLogin(); }
}
function showLogin() { document.getElementById('loginContainer').style.display = 'block'; document.getElementById('dashboardContainer').style.display = 'none'; }
function showDashboard() { document.getElementById('loginContainer').style.display = 'none'; document.getElementById('dashboardContainer').style.display = 'block'; }
function setupLogin() {
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const pwd = document.getElementById('adminPassword').value;
        const err = document.getElementById('loginError');
        try {
            const res = await fetch('/admin/login', { method: 'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({password:pwd}), credentials:'include' });
            if (res.ok) { showDashboard(); loadStats(); loadApps(); }
            else err.textContent = 'Invalid password';
        } catch { err.textContent = 'Login failed'; }
    });
}
function setupLogout() { document.getElementById('logoutBtn').addEventListener('click', async () => { await fetch('/admin/logout', { method:'POST', credentials:'include' }); showLogin(); }); }
function setupTabs() {
    document.querySelectorAll('.sidebar li').forEach(tab => {
        tab.addEventListener('click', () => {
            const id = tab.dataset.tab;
            document.querySelectorAll('.sidebar li').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            document.getElementById(`${id}Tab`).classList.add('active');
            if (id === 'dashboard') loadStats();
            if (id === 'apps') loadApps();
            if (id === 'requests') loadRequests();
        });
    });
}
async function loadStats() {
    try {
        const res = await fetch('/admin/api/stats', { credentials:'include' });
        const s = await res.json();
        document.getElementById('totalApps').innerText = s.totalApps;
        document.getElementById('approvedApps').innerText = s.approvedApps;
        document.getElementById('pendingApps').innerText = s.pendingApps;
        document.getElementById('totalRequests').innerText = s.totalRequests;
        document.getElementById('pendingRequests').innerText = s.pendingRequests;
    } catch(e) {}
}
async function loadApps() {
    const container = document.getElementById('appsListAdmin');
    try {
        const res = await fetch('/admin/api/apps', { credentials:'include' });
        currentApps = await res.json();
        if (!currentApps.length) { container.innerHTML = '<p>No apps.</p>'; return; }
        let html = '<div class="apps-table-wrapper"><table class="apps-table"><thead><tr><th>Icon</th><th>Name</th><th>Version</th><th>Status</th><th>Price</th><th>Actions</th></tr></thead><tbody>';
        currentApps.forEach(app => {
            html += `<tr><td>${app.image ? `<img src="${app.image}" class="table-icon">` : '<i class="fas fa-mobile-alt"></i>'}</td><td><strong>${escapeHtml(app.name)}</strong><br><small>${escapeHtml(app.description.substring(0,50))}</small></td><td>${escapeHtml(app.version)}</td><td><span class="status-badge ${app.status}">${app.status}</span></td><td>${app.isPaid ? `PKR ${app.price}` : 'Free'}</td><td class="actions">${app.status==='pending'?`<button class="approve-btn" data-id="${app.id}">Approve</button><button class="reject-btn" data-id="${app.id}">Reject</button>`:''}<button class="edit-btn" data-id="${app.id}">Edit</button><button class="delete-btn" data-id="${app.id}">Delete</button></td></tr>`;
        });
        html += '</tbody></table></div>';
        container.innerHTML = html;
        document.querySelectorAll('.approve-btn').forEach(btn => btn.addEventListener('click', () => approveApp(btn.dataset.id)));
        document.querySelectorAll('.reject-btn').forEach(btn => btn.addEventListener('click', () => rejectApp(btn.dataset.id)));
        document.querySelectorAll('.edit-btn').forEach(btn => btn.addEventListener('click', () => openEditModal(btn.dataset.id)));
        document.querySelectorAll('.delete-btn').forEach(btn => btn.addEventListener('click', () => deleteApp(btn.dataset.id)));
    } catch(e) { container.innerHTML = '<p>Error loading apps</p>'; }
}
async function approveApp(id) { if(!confirm('Approve this app?')) return; await fetch(`/admin/api/app/${id}/approve`, { method:'POST', credentials:'include' }); loadApps(); loadStats(); }
async function rejectApp(id) { if(!confirm('Reject and delete?')) return; await fetch(`/admin/api/app/${id}/reject`, { method:'POST', credentials:'include' }); loadApps(); loadStats(); }
async function deleteApp(id) { if(!confirm('Permanently delete?')) return; await fetch(`/admin/api/app/${id}`, { method:'DELETE', credentials:'include' }); loadApps(); loadStats(); }

function setupUploadModal() {
    const modalHtml = `<div id="uploadModal" class="modal"><div class="modal-content glass-card"><span class="close-modal">&times;</span><h2>Upload New App</h2><form id="uploadForm" enctype="multipart/form-data"><div class="form-group"><label>App Name *</label><input type="text" name="name" required></div><div class="form-group"><label>Description *</label><textarea name="description" required></textarea></div><div class="form-group"><label>Version *</label><input type="text" name="version" required></div><div class="form-group"><label>Tags (comma)</label><input type="text" name="tags"></div><div class="form-group"><label>APK File *</label><input type="file" name="apkFile" accept=".apk" required></div><div class="form-group"><label>Icon Image</label><input type="file" name="iconImage" accept="image/*"></div><div class="form-group"><label><input type="checkbox" name="isPaid" value="true"> Paid App</label></div><div class="form-group"><label>Price (PKR)</label><input type="number" name="price" step="0.01" value="0"></div><button type="submit" class="primary-btn">Upload</button></form><div id="uploadMsg"></div></div></div>`;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modal = document.getElementById('uploadModal');
    document.getElementById('uploadAppBtn').onclick = () => modal.style.display = 'flex';
    modal.querySelector('.close-modal').onclick = () => modal.style.display = 'none';
    document.getElementById('uploadForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const res = await fetch('/admin/api/upload', { method:'POST', body:fd, credentials:'include' });
        const data = await res.json();
        const msg = document.getElementById('uploadMsg');
        if (res.ok) { msg.innerHTML = '<span style="color:#4caf50;">✅ Uploaded (pending approval)</span>'; loadApps(); loadStats(); setTimeout(()=>modal.style.display='none',2000); }
        else msg.innerHTML = `<span style="color:#ff6584;">❌ ${data.error}</span>`;
    });
}
function setupEditModal() {
    const modalHtml = `<div id="editModal" class="modal"><div class="modal-content glass-card"><span class="close-modal">&times;</span><h2>Edit App</h2><form id="editForm" enctype="multipart/form-data"><input type="hidden" id="editAppId"><div class="form-group"><label>Name</label><input type="text" id="editName" name="name"></div><div class="form-group"><label>Description</label><textarea id="editDesc" name="description"></textarea></div><div class="form-group"><label>Version</label><input type="text" id="editVersion" name="version"></div><div class="form-group"><label>Tags</label><input type="text" id="editTags" name="tags"></div><div class="form-group"><label>New APK (optional)</label><input type="file" name="apkFile" accept=".apk"></div><div class="form-group"><label>New Icon (optional)</label><input type="file" name="iconImage" accept="image/*"></div><div class="form-group"><label><input type="checkbox" id="editIsPaid" name="isPaid"> Paid App</label></div><div class="form-group"><label>Price</label><input type="number" id="editPrice" name="price" step="0.01"></div><button type="submit" class="primary-btn">Save Changes</button></form><div id="editMsg"></div></div></div>`;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modal = document.getElementById('editModal');
    modal.querySelector('.close-modal').onclick = () => modal.style.display = 'none';
    document.getElementById('editForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('editAppId').value;
        const fd = new FormData(e.target);
        const res = await fetch(`/admin/api/app/${id}`, { method:'PUT', body:fd, credentials:'include' });
        const data = await res.json();
        const msg = document.getElementById('editMsg');
        if (res.ok) { msg.innerHTML = '<span style="color:#4caf50;">✅ Updated</span>'; loadApps(); loadStats(); setTimeout(()=>modal.style.display='none',1500); }
        else msg.innerHTML = `<span style="color:#ff6584;">❌ ${data.error}</span>`;
    });
}
function openEditModal(id) {
    const app = currentApps.find(a => a.id === id);
    if (!app) return;
    document.getElementById('editAppId').value = app.id;
    document.getElementById('editName').value = app.name;
    document.getElementById('editDesc').value = app.description;
    document.getElementById('editVersion').value = app.version;
    document.getElementById('editTags').value = app.tags.join(',');
    document.getElementById('editIsPaid').checked = app.isPaid;
    document.getElementById('editPrice').value = app.price;
    document.getElementById('editModal').style.display = 'flex';
}
async function loadRequests() {
    const container = document.getElementById('requestsList');
    try {
        const res = await fetch('/admin/api/requests', { credentials:'include' });
        const reqs = await res.json();
        if (!reqs.length) { container.innerHTML = '<p>No requests.</p>'; return; }
        let html = '<div class="apps-table-wrapper"><table class="apps-table"><thead><tr><th>User</th><th>Email</th><th>App</th><th>Paid</th><th>Proof</th><th>Status</th><th>Actions</th></tr></thead><tbody>';
        reqs.forEach(r => {
            html += `<tr><td>${escapeHtml(r.userName)}</td><td>${escapeHtml(r.userEmail)}</td><td>${escapeHtml(r.appName)}</td><td>${r.isPaid?'Yes':'No'}</td><td>${r.proofImage ? `<a href="${r.proofImage}" target="_blank">View</a>` : '-'}</td><td><span class="status-badge ${r.status}">${r.status}</span></td><td class="actions">${r.status==='pending' ? `<button class="approve-request" data-id="${r.id}">Approve</button><button class="reject-request" data-id="${r.id}">Reject</button>` : ''}</td></tr>`;
        });
        html += '</tbody></table></div>';
        container.innerHTML = html;
        document.querySelectorAll('.approve-request').forEach(btn => btn.addEventListener('click', () => approveRequest(btn.dataset.id)));
        document.querySelectorAll('.reject-request').forEach(btn => btn.addEventListener('click', () => rejectRequest(btn.dataset.id)));
    } catch(e) { container.innerHTML = '<p>Error loading requests</p>'; }
}
async function approveRequest(id) { if(!confirm('Approve this request?')) return; await fetch(`/admin/api/request/${id}/approve`, { method:'POST', credentials:'include' }); loadRequests(); loadStats(); }
async function rejectRequest(id) { if(!confirm('Reject this request?')) return; await fetch(`/admin/api/request/${id}/reject`, { method:'POST', credentials:'include' }); loadRequests(); loadStats(); }
function setupSettings() {
    fetch('/admin/api/settings', { credentials:'include' }).then(r=>r.json()).then(s => {
        document.getElementById('websiteToggle').checked = s.websiteActive;
        document.getElementById('shutdownMessage').value = s.shutdownMessage;
        document.getElementById('siteTitle').value = s.siteTitle;
    });
    document.getElementById('settingsForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = { websiteActive: document.getElementById('websiteToggle').checked, shutdownMessage: document.getElementById('shutdownMessage').value, siteTitle: document.getElementById('siteTitle').value };
        const res = await fetch('/admin/api/settings', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data), credentials:'include' });
        const result = await res.json();
        const msg = document.getElementById('settingsMsg');
        if (result.success) msg.innerHTML = '<span style="color:#4caf50;">Saved</span>';
        else msg.innerHTML = '<span style="color:#ff6584;">Error</span>';
        setTimeout(()=>msg.innerHTML='',3000);
    });
}
function escapeHtml(s) { if(!s)return ''; return s.replace(/[&<>]/g,function(m){if(m==='&')return'&amp;';if(m==='<')return'&lt;';if(m==='>')return'&gt;';return m;}); }