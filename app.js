const SUPABASE_URL = 'https://lslgaqazifpgiyeppoou.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzbGdhcWF6aWZwZ2l5ZXBwb291Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNzU0NTMsImV4cCI6MjA4OTk1MTQ1M30.5NG9t9_AKpJQLNTbzPxXdRNMdczIvdHTQvDrflyG0Uo';
const API = `${SUPABASE_URL}/rest/v1/todos`;
const AUTH = `${SUPABASE_URL}/auth/v1`;

// DOM
const authContainer = document.getElementById('auth-container');
const appContainer = document.getElementById('app-container');
const authMessage = document.getElementById('auth-message');
const authTabs = document.querySelectorAll('.auth-tab');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const form = document.getElementById('todo-form');
const input = document.getElementById('todo-input');
const list = document.getElementById('todo-list');
const footer = document.getElementById('footer');
const countEl = document.getElementById('count');
const clearBtn = document.getElementById('clear-completed');
const filterBtns = document.querySelectorAll('.filter-btn');
const userEmailEl = document.getElementById('user-email');
const logoutBtn = document.getElementById('logout-btn');

let todos = [];
let currentFilter = 'all';
let session = null;

// ---- Auth ----

function getAuthHeaders() {
    return {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
    };
}

function showMessage(text, type) {
    authMessage.textContent = text;
    authMessage.className = 'auth-message ' + type;
}

function clearMessage() {
    authMessage.className = 'auth-message';
    authMessage.textContent = '';
}

function saveSession(s) {
    session = s;
    localStorage.setItem('supabase_session', JSON.stringify(s));
}

function loadSession() {
    const stored = localStorage.getItem('supabase_session');
    if (stored) {
        session = JSON.parse(stored);
        return true;
    }
    return false;
}

function clearSession() {
    session = null;
    localStorage.removeItem('supabase_session');
}

async function refreshToken() {
    if (!session?.refresh_token) return false;
    try {
        const res = await fetch(`${AUTH}/token?grant_type=refresh_token`, {
            method: 'POST',
            headers: { 'apikey': SUPABASE_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: session.refresh_token })
        });
        if (!res.ok) return false;
        const data = await res.json();
        saveSession(data);
        return true;
    } catch {
        return false;
    }
}

function showApp() {
    authContainer.classList.add('hidden');
    appContainer.classList.remove('hidden');
    userEmailEl.textContent = session.user.email;
    fetchTodos();
}

function showAuth() {
    appContainer.classList.add('hidden');
    authContainer.classList.remove('hidden');
    clearMessage();
}

// E-posta onay token'ını URL'den yakala
function handleEmailConfirmation() {
    const hash = window.location.hash;
    if (hash && hash.includes('access_token')) {
        const params = new URLSearchParams(hash.substring(1));
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        const type = params.get('type');

        if (accessToken && type === 'signup') {
            // Token'dan kullanıcı bilgisi al
            fetch(`${AUTH}/user`, {
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${accessToken}`
                }
            }).then(r => r.json()).then(user => {
                saveSession({ access_token: accessToken, refresh_token: refreshToken, user });
                window.location.hash = '';
                showApp();
            });
            return true;
        }
    }
    return false;
}

// Kayıt
registerForm.addEventListener('submit', async e => {
    e.preventDefault();
    clearMessage();
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;

    const res = await fetch(`${AUTH}/signup`, {
        method: 'POST',
        headers: { 'apikey': SUPABASE_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email,
            password,
            data: {},
            gotrue_meta_security: {}
        })
    });

    const data = await res.json();

    if (!res.ok) {
        showMessage(data.msg || data.error_description || 'Kayıt başarısız.', 'error');
        return;
    }

    // Supabase e-posta onayı gerektiğinde identities boş döner veya confirmed_at null olur
    if (data.identities && data.identities.length === 0) {
        showMessage('Bu e-posta zaten kayıtlı.', 'error');
    } else {
        showMessage('Kayıt başarılı! E-postanıza gelen onay bağlantısına tıklayın.', 'success');
        registerForm.reset();
    }
});

// Giriş
loginForm.addEventListener('submit', async e => {
    e.preventDefault();
    clearMessage();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    const res = await fetch(`${AUTH}/token?grant_type=password`, {
        method: 'POST',
        headers: { 'apikey': SUPABASE_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (!res.ok) {
        if (data.error === 'email_not_confirmed') {
            showMessage('E-postanız henüz onaylanmadı. Gelen kutunuzu kontrol edin.', 'error');
        } else {
            showMessage(data.error_description || 'Giriş başarısız.', 'error');
        }
        return;
    }

    saveSession(data);
    showApp();
});

// Tab değiştirme
authTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        authTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        clearMessage();
        if (tab.dataset.tab === 'login') {
            loginForm.classList.remove('hidden');
            registerForm.classList.add('hidden');
        } else {
            loginForm.classList.add('hidden');
            registerForm.classList.remove('hidden');
        }
    });
});

// Çıkış
logoutBtn.addEventListener('click', async () => {
    if (session) {
        await fetch(`${AUTH}/logout`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${session.access_token}`
            }
        }).catch(() => {});
    }
    clearSession();
    todos = [];
    showAuth();
});

// ---- Todo CRUD ----

async function fetchTodos() {
    const res = await fetch(`${API}?select=*&order=created_at.asc`, { headers: getAuthHeaders() });
    if (res.status === 401) {
        const refreshed = await refreshToken();
        if (refreshed) return fetchTodos();
        clearSession();
        showAuth();
        return;
    }
    todos = await res.json();
    render();
}

async function addTodo(text) {
    const res = await fetch(API, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ text, completed: false, user_id: session.user.id })
    });
    if (res.status === 401) {
        const refreshed = await refreshToken();
        if (refreshed) return addTodo(text);
        return;
    }
    const [newTodo] = await res.json();
    todos.push(newTodo);
    render();
}

async function updateTodo(id, completed) {
    await fetch(`${API}?id=eq.${id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ completed })
    });
    const todo = todos.find(t => t.id === id);
    if (todo) todo.completed = completed;
    render();
}

async function deleteTodo(id) {
    await fetch(`${API}?id=eq.${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
    });
    todos = todos.filter(t => t.id !== id);
    render();
}

async function clearCompleted() {
    await fetch(`${API}?completed=eq.true`, {
        method: 'DELETE',
        headers: getAuthHeaders()
    });
    todos = todos.filter(t => !t.completed);
    render();
}

function render() {
    list.innerHTML = '';

    const filtered = todos.filter(t => {
        if (currentFilter === 'active') return !t.completed;
        if (currentFilter === 'completed') return t.completed;
        return true;
    });

    filtered.forEach(todo => {
        const li = document.createElement('li');
        li.className = 'todo-item' + (todo.completed ? ' completed' : '');

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = todo.completed;
        checkbox.addEventListener('change', () => updateTodo(todo.id, checkbox.checked));

        const span = document.createElement('span');
        span.textContent = todo.text;

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.textContent = '\u00D7';
        deleteBtn.addEventListener('click', () => deleteTodo(todo.id));

        li.append(checkbox, span, deleteBtn);
        list.appendChild(li);
    });

    const activeCount = todos.filter(t => !t.completed).length;
    countEl.textContent = `${activeCount} görev kaldı`;
    footer.className = todos.length ? 'footer' : 'footer hidden';
}

form.addEventListener('submit', e => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    addTodo(text);
});

filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.filter;
        render();
    });
});

clearBtn.addEventListener('click', clearCompleted);

// ---- Başlangıç ----

if (!handleEmailConfirmation()) {
    if (loadSession()) {
        showApp();
    } else {
        showAuth();
    }
}
