/* app.js - Core logic for Kanban Board */  
/* All interactive state, drag-and-drop, filtering, and localStorage persistence */  

document.addEventListener('DOMContentLoaded', () => {  
  // ==== STATE ====  
  let tasks = JSON.parse(localStorage.getItem('kanbanTasks')) || [];  
  const columns = ['todo', 'inProgress', 'completed'];  
  const priorityClasses = {  
    high: 'priority-high',  
    medium: 'priority-medium',  
    low: 'priority-low'  
  };  

  // ==== UTILITIES ====  
  const $ = (sel) => document.querySelector(sel);  
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));  

  const saveTasks = () => {  
    localStorage.setItem('kanbanTasks', JSON.stringify(tasks));  
  };  

  const updateCounters = () => {  
    const counters = {  
      todo: 0,  
      inProgress: 0,  
      completed: 0  
    };  
    tasks.forEach(t => {  
      if (columns.includes(t.column)) counters[t.column]++;  
    });  
    $('#todo-count').textContent = counters.todo;  
    $('#in-progress-count').textContent = counters.inProgress;  
    $('#completed-count').textContent = counters.completed;  
  };  

  const getFilteredTasks = (filter) => {  
    if (!filter || filter === 'all') return tasks;  
    return tasks.filter(t => t.priority === filter);  
  };  

  const renderTasks = (filter = 'all') => {  
    // Clear all columns  
    $$('.column ul').forEach(ul => ul.innerHTML = '');  

    // Filter tasks  
    const filtered = getFilteredTasks(filter);  

    // Render each task to its current column  
    filtered.forEach(task => {  
      const col = $(`#${task.column}-column ul`);  
      if (!col) return;  

      const card = document.createElement('li');  
      card.className = 'card';  
      card.draggable = true;  
      card.id = `task-${task.id}`;  

      card.innerHTML = `  
        <p>${task.description}</p>  
        <div class="meta">  
          <span class="${priorityClasses[task.priority]}">${task.priority.toUpperCase()}</span>  
          <span class="due-date">${task.dueDate || '—'}</span>  
        </div>  
      `;  

      // Attach drag events  
      card.addEventListener('dragstart', (e) => {  
        e.dataTransfer.setData('text/plain', task.id);  
        card.classList.add('dragging');  
      });  

      card.addEventListener('dragend', () => {  
        card.classList.remove('dragging');  
      });  

      // Drop into column  
      const allowDrop = (e) => e.preventDefault();  
      const drop = (e) => {  
        e.preventDefault();  
        const draggedId = e.dataTransfer.getData('text/plain');  
        const draggedTask = tasks.find(t => t.id === draggedId);  
        if (!draggedTask || draggedTask.column === task.column) return;  

        // Remove from old column  
        tasks = tasks.filter(t => t.id !== draggedId);  
        // Add to new column  
        draggedTask.column = task.column;  
        tasks.push(draggedTask);  
        saveTasks();  
        renderTasks(filter);  
        updateCounters();  
      };  

      // Bind drop to target column (only once)  
      const targetColumn = $(`#${task.column}-column`);  
      targetColumn.addEventListener('dragover', allowDrop, false);  
      targetColumn.addEventListener('drop', drop, false);  

      // Append card  
      col.appendChild(card);  
    });  
  };  

  // ==== EVENT LISTENERS ====  
  // Add task form  
  $('#task-form').addEventListener('submit', (e) => {  
    e.preventDefault();  
    const description = $('#task-input').value.trim();  
    const priority = $('#priority-select').value;  
    if (!description) return;  

    const newTask = {  
      id: Date.now().toString(),  
      description,  
      priority,  
      column: 'todo', // default column  
      dueDate: '—'  
    };  
    tasks.push(newTask);  
    saveTasks();  
    renderTasks();  
    updateCounters();  
    // Close modal  
    $('#task-modal').classList.remove('active');  
    $('#task-form').reset();  
  });  

  // Open modal  
  $('#add-task-btn').addEventListener('click', () => {  
    $('#task-modal').classList.add('active');  
  });  

  // Close modal (click outside content)  
  $('#task-modal').addEventListener('click', (e) => {  
    if (e.target === $('#task-modal')) {  
      $('#task-modal').classList.remove('active');  
    }  
  });  

  // Priority filter  
  const filterSelect = document.createElement('select');  
  filterSelect.id = 'priority-filter';  
  ['all', 'high', 'medium', 'low'].forEach(p => {  
    const opt = document.createElement('option');  
    opt.value = p;  
    opt.textContent = p === 'all' ? 'All' : p.charAt(0).toUpperCase() + p.slice(1);  
    filterSelect.appendChild(opt);  
  });  
  filterSelect.style.marginLeft = '1rem';  
  filterSelect.style.padding = '0.5rem';  
  filterSelect.style.borderRadius = 'var(--border-radius)';  
  filterSelect.style.border = '1px solid var(--text-secondary)';  
  filterSelect.style.backgroundColor = 'var(--bg-secondary)';  
  filterSelect.style.color = 'var(--text-primary)';  
  $('#task-counters').appendChild(filterSelect);  

  filterSelect.addEventListener('change', (e) => {  
    renderTasks(e.target.value);  
  });  

  // Initial render  
  renderTasks();  
  updateCounters();  

  // ==== DRAG-AND-DROP HANDLING (global) ====  
  // Re‑bind drop events for newly added cards (delegated)  
  document.addEventListener('dragstart', (e) => {  
    if (e.target.classList.contains('card')) {  
      e.dataTransfer.setData('text/plain', e.target.id.split('-')[1]); // task id  
      e.target.classList.add('dragging');  
    }  
  });  

  document.addEventListener('dragend', (e) => {  
    if (e.target.classList.contains('card')) {  
      e.target.classList.remove('dragging');  
    }  
  });  

  // Handle drop on columns (delegated)  
  document.addEventListener('dragover', (e) => e.preventDefault(), false);  
  document.addEventListener('drop', (e) => {  
    const target = e.target.closest('.column');  
    if (!target) return;  
    const columnId = target.id.replace('-column', '');  
    e.dataTransfer.setData('target-column', columnId);  
  }, false);  

  document.addEventListener('drop', (e) => {  
    const targetColumn = e.dataTransfer.getData('target-column');  
    if (!targetColumn) return;  
    const draggedId = e.dataTransfer.getData('text/plain');  
    const draggedTask = tasks.find(t => t.id === draggedId);  
    if (!draggedTask) return;  

    // Update column in task data  
    tasks = tasks.filter(t => t.id !== draggedId);  
    draggedTask.column = targetColumn;  
    tasks.push(draggedTask);  
    saveTasks();  
    renderTasks();  
    updateCounters();  
  }, false);  
});