/**
 * Simple To-Do List Application
 * CRUD operations with persistent storage via localStorage
 *
 * @author GitHub Bootcamp
 * @version 1.0.0
 */

// ========================================
// State Management
// ========================================

/**
 * Application state
 * @type {Object}
 */
const state = {
    todos: [],
    currentFilter: 'all',
    editingId: null
};

// Local Storage key
const STORAGE_KEY = 'simple-todo-list';

// ========================================
// Task Priority
// ========================================

// Allowed priority values in urgency order (used for select options)
const PRIORITIES = ['high', 'medium', 'low'];

// Priority assigned to new tasks and to legacy data that has none
const DEFAULT_PRIORITY = 'medium';

// Presentation metadata: visible label + decorative symbol per priority
const PRIORITY_META = {
    high: { label: 'High', symbol: '!!' },
    medium: { label: 'Medium', symbol: '!' },
    low: { label: 'Low', symbol: '↓' }
};

/**
 * Returns a valid priority, falling back to the default for missing/invalid values
 * @param {*} value - Stored or selected priority
 * @returns {string} One of PRIORITIES
 */
const normalizePriority = (value) => (
    typeof value === 'string' && PRIORITIES.includes(value) ? value : DEFAULT_PRIORITY
);

/**
 * Builds the option list for a priority select, preselecting the given value
 * @param {string} selectedValue - Priority to preselect
 * @returns {string} HTML string
 */
const priorityOptionsHTML = (selectedValue) => PRIORITIES
    .map((value) => `<option value="${value}"${value === selectedValue ? ' selected' : ''}>${PRIORITY_META[value].label}</option>`)
    .join('');

// ========================================
// DOM Elements
// ========================================

const elements = {
    todoForm: document.getElementById('todoForm'),
    todoInput: document.getElementById('todoInput'),
    todoPriority: document.getElementById('todoPriority'),
    todoList: document.getElementById('todoList'),
    todoCount: document.getElementById('todoCount'),
    emptyState: document.getElementById('emptyState'),
    clearCompleted: document.getElementById('clearCompleted'),
    filterButtons: document.querySelectorAll('.filter-btn')
};

// ========================================
// Local Storage Functions
// ========================================

/**
 * Loads data from localStorage
 * @returns {Array} Todo list
 */
const loadFromStorage = () => {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        const parsed = data ? JSON.parse(data) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.error('LocalStorage read error:', error);
        return [];
    }
};

/**
 * Normalizes the priority of every todo, defaulting invalid or missing
 * values to medium while leaving all other task data and the order untouched
 * @param {Array} todos - Todo list
 * @returns {{todos: Array, changed: boolean}} Normalized list and whether anything changed
 */
const normalizeTodoPriorities = (todos) => {
    let changed = false;

    const normalized = todos.map((todo) => {
        if (!todo || typeof todo !== 'object') return todo;
        const priority = normalizePriority(todo.priority);
        if (priority === todo.priority) return todo;
        changed = true;
        return { ...todo, priority };
    });

    return { todos: normalized, changed };
};

/**
 * Saves data to localStorage
 * @param {Array} todos - Todo list
 */
const saveToStorage = (todos) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
    } catch (error) {
        console.error('LocalStorage write error:', error);
    }
};

// ========================================
// CRUD Operations
// ========================================

/**
 * Generates a unique ID
 * @returns {string} Unique ID
 */
const generateId = () => {
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
};

/**
 * Adds a new todo
 * @param {string} text - Todo text
 * @param {string} priority - Selected priority
 * @returns {boolean} True if the todo was created
 */
const addTodo = (text, priority) => {
    const trimmedText = text.trim();
    if (!trimmedText) return false;

    const newTodo = {
        id: generateId(),
        text: trimmedText,
        completed: false,
        createdAt: new Date().toISOString(),
        priority: normalizePriority(priority)
    };

    state.todos.unshift(newTodo);
    saveToStorage(state.todos);
    renderTodos();
    updateStats();
    return true;
};

/**
 * Deletes a todo
 * @param {string} id - ID of the todo to delete
 */
const deleteTodo = (id) => {
    const todoElement = document.querySelector(`[data-id="${id}"]`);

    if (todoElement) {
        todoElement.style.animation = 'slideOut 0.3s ease forwards';

        setTimeout(() => {
            state.todos = state.todos.filter(todo => todo.id !== id);
            saveToStorage(state.todos);
            renderTodos();
            updateStats();
        }, 300);
    }
};

/**
 * Toggles a todo's completed state
 * @param {string} id - Todo ID
 */
const toggleTodo = (id) => {
    const todo = state.todos.find(t => t.id === id);
    if (todo) {
        todo.completed = !todo.completed;
        saveToStorage(state.todos);
        renderTodos();
        updateStats();
    }
};

/**
 * Enters edit mode for a todo
 * @param {string} id - Todo ID
 */
const startEditTodo = (id) => {
    state.editingId = id;
    renderTodos();

    // Focus the edit input
    const editInput = document.querySelector('.todo-edit-input');
    if (editInput) {
        editInput.focus();
        editInput.setSelectionRange(editInput.value.length, editInput.value.length);
    }
};

/**
 * Moves focus back to a todo's Edit button after leaving edit mode,
 * so keyboard position is not lost when the list re-renders
 * @param {string} id - Todo ID
 */
const focusEditButton = (id) => {
    if (!id) return;
    const editButton = elements.todoList.querySelector(`[data-id="${id}"] .todo-action-btn.edit`);
    if (editButton) editButton.focus();
};

/**
 * Saves a todo edit
 * @param {string} id - Todo ID
 * @param {string} newText - New text
 * @param {string} newPriority - Newly selected priority
 */
const saveEditTodo = (id, newText, newPriority) => {
    const trimmedText = newText.trim();
    if (!trimmedText) {
        cancelEditTodo();
        return;
    }

    const todo = state.todos.find(t => t.id === id);
    if (todo) {
        todo.text = trimmedText;
        todo.priority = normalizePriority(newPriority);
        saveToStorage(state.todos);
    }

    state.editingId = null;
    renderTodos();
    focusEditButton(id);
};

/**
 * Cancels a todo edit
 */
const cancelEditTodo = () => {
    const editedId = state.editingId;
    state.editingId = null;
    renderTodos();
    focusEditButton(editedId);
};

/**
 * Removes all completed todos
 */
const clearCompleted = () => {
    const completedItems = document.querySelectorAll('.todo-item.completed');

    completedItems.forEach((item, index) => {
        setTimeout(() => {
            item.style.animation = 'slideOut 0.3s ease forwards';
        }, index * 50);
    });

    setTimeout(() => {
        state.todos = state.todos.filter(todo => !todo.completed);
        saveToStorage(state.todos);
        renderTodos();
        updateStats();
    }, completedItems.length * 50 + 300);
};

// ========================================
// Filter Functions
// ========================================

/**
 * Changes the active filter
 * @param {string} filter - Filter type (all, active, completed)
 */
const setFilter = (filter) => {
    state.currentFilter = filter;

    elements.filterButtons.forEach(btn => {
        const isActive = btn.dataset.filter === filter;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-selected', isActive);
    });

    renderTodos();
    updateStats();
};

/**
 * Returns the filtered todos
 * @returns {Array} Filtered todo list
 */
const getFilteredTodos = () => {
    switch (state.currentFilter) {
        case 'active':
            return state.todos.filter(todo => !todo.completed);
        case 'completed':
            return state.todos.filter(todo => todo.completed);
        default:
            return state.todos;
    }
};

// ========================================
// Drag and Drop Functions
// ========================================

// ID of the dragged todo (we use the ID instead of the DOM index so that
// the correct item is moved even when a filter is active)
let draggedId = null;

/**
 * Clears the visual feedback on the dragged-over item
 */
const clearDragIndicators = () => {
    elements.todoList.querySelectorAll('.drag-over-top, .drag-over-bottom').forEach(item => {
        item.classList.remove('drag-over-top', 'drag-over-bottom');
    });
};

/**
 * Fired when dragging starts
 * @param {DragEvent} event
 */
const handleDragStart = (event) => {
    const todoItem = event.target.closest('.todo-item');
    if (!todoItem) return;

    draggedId = todoItem.dataset.id;
    todoItem.classList.add('dragging');
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', draggedId);
};

/**
 * Fired while dragging over an element
 * @param {DragEvent} event
 */
const handleDragOver = (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';

    const todoItem = event.target.closest('.todo-item');
    if (!todoItem || todoItem.dataset.id === draggedId) return;

    const rect = todoItem.getBoundingClientRect();
    const isAbove = event.clientY < rect.top + rect.height / 2;

    todoItem.classList.toggle('drag-over-top', isAbove);
    todoItem.classList.toggle('drag-over-bottom', !isAbove);
};

/**
 * Fired when leaving an element during drag
 * @param {DragEvent} event
 */
const handleDragLeave = (event) => {
    const todoItem = event.target.closest('.todo-item');
    if (todoItem) {
        todoItem.classList.remove('drag-over-top', 'drag-over-bottom');
    }
};

/**
 * Fired on drop - reorders state.todos using IDs
 * @param {DragEvent} event
 */
const handleDrop = (event) => {
    event.preventDefault();

    const todoItem = event.target.closest('.todo-item');
    if (!todoItem) return;

    const targetId = todoItem.dataset.id;
    if (!targetId || targetId === draggedId) return;

    const rect = todoItem.getBoundingClientRect();
    const insertAfter = event.clientY > rect.top + rect.height / 2;

    const draggedPos = state.todos.findIndex(todo => todo.id === draggedId);
    if (draggedPos === -1) return;

    const [draggedTodo] = state.todos.splice(draggedPos, 1);

    const targetPos = state.todos.findIndex(todo => todo.id === targetId);
    if (targetPos === -1) {
        state.todos.push(draggedTodo);
    } else {
        state.todos.splice(insertAfter ? targetPos + 1 : targetPos, 0, draggedTodo);
    }

    saveToStorage(state.todos);
    renderTodos();
    clearDragIndicators();
};

/**
 * Fired when dragging ends - clears all visual states
 */
const handleDragEnd = () => {
    const draggedItem = elements.todoList.querySelector('.dragging');
    if (draggedItem) {
        draggedItem.classList.remove('dragging');
    }
    clearDragIndicators();
    draggedId = null;
};

// ========================================
// Render Functions
// ========================================

/**
 * Builds the HTML for a todo item
 * @param {Object} todo - Todo object
 * @returns {string} HTML string
 */
const createTodoItemHTML = (todo) => {
    const isEditing = state.editingId === todo.id;
    const priorityValue = normalizePriority(todo.priority);
    const priorityMeta = PRIORITY_META[priorityValue];

    if (isEditing) {
        return `
            <li class="todo-item editing ${todo.completed ? 'completed' : ''}" data-id="${todo.id}">
                <div class="todo-edit-content">
                    <input
                        type="text"
                        class="todo-edit-input"
                        value="${escapeHtml(todo.text)}"
                        aria-label="Edit task"
                    >
                    <label class="todo-edit-priority-field">
                        <span class="todo-priority-label">Priority</span>
                        <select class="todo-priority-select todo-edit-priority-select">
                            ${priorityOptionsHTML(priorityValue)}
                        </select>
                    </label>
                </div>
                <div class="todo-actions">
                    <button class="todo-action-btn save" data-action="save" aria-label="Save">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                    </button>
                    <button class="todo-action-btn cancel" data-action="cancel" aria-label="Cancel">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
            </li>
        `;
    }

    return `
        <li class="todo-item ${todo.completed ? 'completed' : ''}"
            data-id="${todo.id}"
            draggable="true"
            aria-label="Priority: ${priorityMeta.label}, ${escapeHtml(todo.text)}, ${todo.completed ? 'completed' : 'active'}">
            <div class="drag-handle" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="9" cy="5" r="1"></circle>
                    <circle cx="9" cy="12" r="1"></circle>
                    <circle cx="9" cy="19" r="1"></circle>
                    <circle cx="15" cy="5" r="1"></circle>
                    <circle cx="15" cy="12" r="1"></circle>
                    <circle cx="15" cy="19" r="1"></circle>
                </svg>
            </div>
            <label class="todo-checkbox">
                <input
                    type="checkbox"
                    ${todo.completed ? 'checked' : ''}
                    data-action="toggle"
                    aria-label="${todo.completed ? 'Mark as not completed' : 'Mark as completed'}"
                >
                <span class="checkmark">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                </span>
            </label>
            <div class="todo-content">
                <span class="priority-badge priority-${priorityValue}" aria-hidden="true">
                    <span class="priority-badge-symbol">${priorityMeta.symbol}</span>${priorityMeta.label}
                </span>
                <span class="todo-text">${escapeHtml(todo.text)}</span>
            </div>
            <div class="todo-actions">
                <button class="todo-action-btn edit" data-action="edit" aria-label="Edit">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                </button>
                <button class="todo-action-btn delete" data-action="delete" aria-label="Delete">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
                        <line x1="10" y1="11" x2="10" y2="17"></line>
                        <line x1="14" y1="11" x2="14" y2="17"></line>
                    </svg>
                </button>
            </div>
        </li>
    `;
};

/**
 * Escapes HTML characters (XSS protection)
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
const escapeHtml = (text) => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
};

/**
 * Renders the todo list
 */
const renderTodos = () => {
    const filteredTodos = getFilteredTodos();

    if (filteredTodos.length === 0) {
        elements.todoList.innerHTML = '';
        elements.emptyState.classList.add('show');
    } else {
        elements.emptyState.classList.remove('show');
        elements.todoList.innerHTML = filteredTodos.map(createTodoItemHTML).join('');

        // Attach drag and drop event listeners
        elements.todoList.querySelectorAll('.todo-item').forEach(item => {
            item.addEventListener('dragstart', handleDragStart);
            item.addEventListener('dragend', handleDragEnd);
        });
    }
};

/**
 * Updates the statistics
 */
const updateStats = () => {
    const total = state.todos.length;
    const active = state.todos.filter(t => !t.completed).length;
    const completed = state.todos.filter(t => t.completed).length;

    // Update the task count
    let countText = '';
    switch (state.currentFilter) {
        case 'active':
            countText = `${active} active`;
            break;
        case 'completed':
            countText = `${completed} completed`;
            break;
        default:
            countText = `${total} ${total === 1 ? 'task' : 'tasks'}`;
    }
    elements.todoCount.textContent = countText;

    // Show/hide the "Clear Completed" button
    if (completed > 0) {
        elements.clearCompleted.classList.add('show');
    } else {
        elements.clearCompleted.classList.remove('show');
    }
};

// ========================================
// Event Handlers
// ========================================

/**
 * Form submit handler
 * @param {Event} event
 */
const handleFormSubmit = (event) => {
    event.preventDefault();
    const added = addTodo(elements.todoInput.value, elements.todoPriority.value);

    if (added) {
        // Reset the form only on success so a rejected (blank) submission
        // keeps the user's selected priority
        elements.todoInput.value = '';
        elements.todoPriority.value = DEFAULT_PRIORITY;
    }
    elements.todoInput.focus();
};

/**
 * Todo list click handler (event delegation)
 * @param {Event} event
 */
const handleTodoListClick = (event) => {
    const target = event.target;
    const todoItem = target.closest('.todo-item');
    if (!todoItem) return;

    const todoId = todoItem.dataset.id;
    const action = target.closest('[data-action]')?.dataset.action;

    switch (action) {
        case 'toggle':
            toggleTodo(todoId);
            break;
        case 'delete':
            deleteTodo(todoId);
            break;
        case 'edit':
            startEditTodo(todoId);
            break;
        case 'save': {
            const editInput = todoItem.querySelector('.todo-edit-input');
            const editPrioritySelect = todoItem.querySelector('.todo-edit-priority-select');
            if (editInput) {
                saveEditTodo(
                    todoId,
                    editInput.value,
                    editPrioritySelect ? editPrioritySelect.value : DEFAULT_PRIORITY
                );
            }
            break;
        }
        case 'cancel':
            cancelEditTodo();
            break;
    }
};

/**
 * Edit controls keyboard handler
 * Enter in the text input saves; Escape from the text input or the
 * priority select cancels the whole edit
 * @param {KeyboardEvent} event
 */
const handleEditKeydown = (event) => {
    const target = event.target;
    const isEditText = target.classList.contains('todo-edit-input');
    const isEditPriority = target.classList.contains('todo-edit-priority-select');
    if (!isEditText && !isEditPriority) return;

    const todoItem = target.closest('.todo-item');
    const todoId = todoItem?.dataset.id;

    if (event.key === 'Enter' && isEditText) {
        event.preventDefault();
        const editPrioritySelect = todoItem?.querySelector('.todo-edit-priority-select');
        saveEditTodo(
            todoId,
            target.value,
            editPrioritySelect ? editPrioritySelect.value : DEFAULT_PRIORITY
        );
    } else if (event.key === 'Escape') {
        event.preventDefault();
        cancelEditTodo();
    }
};

/**
 * Filter button click handler
 * @param {Event} event
 */
const handleFilterClick = (event) => {
    const filter = event.target.dataset.filter;
    if (filter) {
        setFilter(filter);
    }
};

// ========================================
// Initialization
// ========================================

/**
 * Initializes the application
 */
const init = () => {
    // Load data from localStorage and normalize priorities
    // (legacy tasks without a priority default to medium)
    state.todos = loadFromStorage();
    const { todos, changed } = normalizeTodoPriorities(state.todos);
    state.todos = todos;
    if (changed) {
        // Persist the migration once so upgraded priorities survive reloads
        saveToStorage(state.todos);
    }

    // Initial render
    renderTodos();
    updateStats();

    // Attach event listeners
    elements.todoForm.addEventListener('submit', handleFormSubmit);
    elements.todoList.addEventListener('click', handleTodoListClick);
    elements.todoList.addEventListener('keydown', handleEditKeydown);
    elements.todoList.addEventListener('dragover', handleDragOver);
    elements.todoList.addEventListener('dragleave', handleDragLeave);
    elements.todoList.addEventListener('drop', handleDrop);
    elements.clearCompleted.addEventListener('click', clearCompleted);

    // Filter buttons
    elements.filterButtons.forEach(btn => {
        btn.addEventListener('click', handleFilterClick);
    });

    // Focus the input
    elements.todoInput.focus();
};

// Initialize when the DOM is ready
document.addEventListener('DOMContentLoaded', init);
