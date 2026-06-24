const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  startTimer: (project, task) => ipcRenderer.invoke('timer:start', { project, task }),
  stopTimer: () => ipcRenderer.invoke('timer:stop'),
  getTimerState: () => ipcRenderer.invoke('timer:get-state'),
  getTodayEntries: () => ipcRenderer.invoke('entries:get-today'),
  getEntriesInRange: (from, to) => ipcRenderer.invoke('entries:get-range', { from, to }),
  deleteEntry: (id) => ipcRenderer.invoke('entries:delete', id),
  updateEntry: (id, data) => ipcRenderer.invoke('entries:update', { id, ...data }),
  addManualEntry: (data) => ipcRenderer.invoke('entries:add-manual', data),
  getProjects: () => ipcRenderer.invoke('projects:get'),
  deleteProject: (name) => ipcRenderer.invoke('projects:delete', name),
  renameProject: (oldName, newName) => ipcRenderer.invoke('projects:rename', { oldName, newName }),
  getTasksForProject: (project) => ipcRenderer.invoke('projects:get-tasks', project),
  deleteTask: (project, task) => ipcRenderer.invoke('projects:delete-task', { project, task }),
  resolveIdle: (action) => ipcRenderer.invoke('idle:resolved', { action }),
  exportReport: (format, from, to, clientFilter) => ipcRenderer.invoke('report:export', { format, from, to, clientFilter }),
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setSettings: (s) => ipcRenderer.invoke('settings:set', s),
  onTimerStateChanged: (cb) => ipcRenderer.on('timer:state-changed', (_, data) => cb(data)),
  onIdleDetected: (cb) => ipcRenderer.on('idle:detected', (_, data) => cb(data)),
  removeListener: (channel, cb) => ipcRenderer.removeListener(channel, cb),
});
