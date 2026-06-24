const Store = require('electron-store');
const { randomUUID } = require('crypto');

const store = new Store({
  name: 'entries',
  defaults: { entries: [], projects: [], tasks: {} }
});

function getTodayEntries() {
  const today = new Date().toDateString();
  return store.get('entries').filter(e => new Date(e.startedAt).toDateString() === today);
}

function saveEntry({ project, task, startedAt, stoppedAt, durationMs }) {
  const entries = store.get('entries');
  const entry = {
    id: randomUUID(),
    project: project || '',
    task: task || '',
    startedAt,
    stoppedAt,
    durationMs
  };
  entries.push(entry);
  store.set('entries', entries);

  if (project) {
    const projects = store.get('projects');
    if (!projects.find(p => p.toLowerCase() === project.toLowerCase())) {
      projects.push(project);
      store.set('projects', projects);
    }
    // feladatok mentése ügyfélenként
    if (task) {
      const tasks = store.get('tasks');
      const key = project.toLowerCase();
      if (!tasks[key]) tasks[key] = [];
      if (!tasks[key].find(t => t.toLowerCase() === task.toLowerCase())) {
        tasks[key].push(task);
        store.set('tasks', tasks);
      }
    }
  }
  return entry;
}

function deleteEntry(id) {
  const entries = store.get('entries').filter(e => e.id !== id);
  store.set('entries', entries);
}

function getProjects() {
  return store.get('projects');
}

function deleteProject(name) {
  const projects = store.get('projects').filter(p => p.toLowerCase() !== name.toLowerCase());
  store.set('projects', projects);
  const tasks = store.get('tasks');
  delete tasks[name.toLowerCase()];
  store.set('tasks', tasks);
}

function renameProject(oldName, newName) {
  // projektek listájában átnevez
  const projects = store.get('projects').map(p =>
    p.toLowerCase() === oldName.toLowerCase() ? newName : p
  );
  store.set('projects', projects);
  // bejegyzésekben átnevez
  const entries = store.get('entries').map(e =>
    e.project.toLowerCase() === oldName.toLowerCase() ? { ...e, project: newName } : e
  );
  store.set('entries', entries);
  // feladatok kulcsát átnevezi
  const tasks = store.get('tasks');
  const oldKey = oldName.toLowerCase();
  if (tasks[oldKey]) {
    tasks[newName.toLowerCase()] = tasks[oldKey];
    delete tasks[oldKey];
    store.set('tasks', tasks);
  }
}

function getTasksForProject(project) {
  const tasks = store.get('tasks');
  return tasks[project.toLowerCase()] || [];
}

function deleteTask(project, task) {
  const tasks = store.get('tasks');
  const key = project.toLowerCase();
  if (tasks[key]) {
    tasks[key] = tasks[key].filter(t => t !== task);
    store.set('tasks', tasks);
  }
}

function updateEntry(id, { project, task, startedAt, stoppedAt }) {
  const entries = store.get('entries');
  const idx = entries.findIndex(e => e.id === id);
  if (idx === -1) return null;
  const newStart = startedAt ?? entries[idx].startedAt;
  const newStop  = stoppedAt ?? entries[idx].stoppedAt;
  const durationMs = Math.max(0, new Date(newStop).getTime() - new Date(newStart).getTime());
  entries[idx] = {
    ...entries[idx],
    project: project !== undefined ? project : entries[idx].project,
    task:    task    !== undefined ? task    : entries[idx].task,
    startedAt: newStart,
    stoppedAt: newStop,
    durationMs
  };
  store.set('entries', entries);
  const p = entries[idx].project;
  const t = entries[idx].task;
  if (p) {
    const projects = store.get('projects');
    if (!projects.find(pr => pr.toLowerCase() === p.toLowerCase())) {
      projects.push(p); store.set('projects', projects);
    }
    if (t) {
      const tasks = store.get('tasks');
      const key = p.toLowerCase();
      if (!tasks[key]) tasks[key] = [];
      if (!tasks[key].find(tk => tk.toLowerCase() === t.toLowerCase())) {
        tasks[key].push(t); store.set('tasks', tasks);
      }
    }
  }
  return entries[idx];
}

function getEntriesInRange(from, to) {
  const fromTs = from instanceof Date ? from.getTime() : new Date(from).getTime();
  const toTs = to instanceof Date ? to.getTime() : new Date(to).getTime();
  return store.get('entries').filter(e => {
    const t = new Date(e.startedAt).getTime();
    return t >= fromTs && t <= toTs;
  });
}

module.exports = {
  getTodayEntries, saveEntry, updateEntry, deleteEntry,
  getProjects, deleteProject, renameProject,
  getTasksForProject, deleteTask, getEntriesInRange
};
