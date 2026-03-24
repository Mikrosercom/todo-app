const SUPABASE_URL = 'https://lslgaqazifpgiyeppoou.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzbGdhcWF6aWZwZ2l5ZXBwb291Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNzU0NTMsImV4cCI6MjA4OTk1MTQ1M30.5NG9t9_AKpJQLNTbzPxXdRNMdczIvdHTQvDrflyG0Uo';
const API = `${SUPABASE_URL}/rest/v1/todos`;
const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
};

const form = document.getElementById('todo-form');
const input = document.getElementById('todo-input');
const list = document.getElementById('todo-list');
const footer = document.getElementById('footer');
const countEl = document.getElementById('count');
const clearBtn = document.getElementById('clear-completed');
const filterBtns = document.querySelectorAll('.filter-btn');

let todos = [];
let currentFilter = 'all';

async function fetchTodos() {
    const res = await fetch(`${API}?select=*&order=created_at.asc`, { headers });
    todos = await res.json();
    render();
}

async function addTodo(text) {
    const res = await fetch(API, {
        method: 'POST',
        headers,
        body: JSON.stringify({ text, completed: false })
    });
    const [newTodo] = await res.json();
    todos.push(newTodo);
    render();
}

async function updateTodo(id, completed) {
    await fetch(`${API}?id=eq.${id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ completed })
    });
    const todo = todos.find(t => t.id === id);
    if (todo) todo.completed = completed;
    render();
}

async function deleteTodo(id) {
    await fetch(`${API}?id=eq.${id}`, {
        method: 'DELETE',
        headers
    });
    todos = todos.filter(t => t.id !== id);
    render();
}

async function clearCompleted() {
    await fetch(`${API}?completed=eq.true`, {
        method: 'DELETE',
        headers
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

fetchTodos();
