const { ipcMain, dialog, Notification } = require('electron');
const store = require('./store');
const { deleteProject, renameProject, getTasksForProject, updateEntry } = store;
const { exportCsv, exportTxt } = require('./reportExporter');

let reminderInterval = null;
let reminderMinutes = 30;
let idleDetectorRef = null;

function startReminder(project, minutes) {
  stopReminder();
  if (!minutes || minutes <= 0) return;
  reminderInterval = setInterval(() => {
    if (Notification.isSupported()) {
      new Notification({
        title: 'Időmérő emlékeztető',
        body: `Még mindig "${project || 'névtelen ügyfél'}" munkáján dolgozol?`,
        silent: false
      }).show();
    }
  }, minutes * 60 * 1000);
}

function stopReminder() {
  if (reminderInterval) { clearInterval(reminderInterval); reminderInterval = null; }
}

function registerHandlers({ timerEngine, mainWindow, idleDetector }) {
  idleDetectorRef = idleDetector;
  ipcMain.handle('timer:start', (_, { project, task }) => {
    timerEngine.start(project, task);
    startReminder(project, reminderMinutes);
    return timerEngine.getSnapshot();
  });

  ipcMain.handle('timer:stop', () => {
    stopReminder();
    const entry = timerEngine.stop(0);
    if (entry && entry.durationMs > 0) store.saveEntry(entry);
    return entry;
  });

  ipcMain.handle('settings:get', () => ({
    reminderMinutes,
    idleSeconds: idleDetectorRef ? idleDetectorRef.getThreshold() / 1000 : 300
  }));

  ipcMain.handle('settings:set', (_, { reminderMinutes: m, idleSeconds: s }) => {
    if (m !== undefined) {
      reminderMinutes = m;
      const snap = timerEngine.getSnapshot();
      if (snap.state === 'RUNNING') startReminder(snap.project, reminderMinutes);
    }
    if (s !== undefined && idleDetectorRef) {
      idleDetectorRef.setThreshold(s * 1000);
    }
    return { reminderMinutes, idleSeconds: idleDetectorRef ? idleDetectorRef.getThreshold() / 1000 : 300 };
  });

  ipcMain.handle('timer:get-state', () => timerEngine.getSnapshot());

  ipcMain.handle('entries:get-today', () => store.getTodayEntries());

  ipcMain.handle('entries:get-range', (_, { from, to }) => {
    return store.getEntriesInRange(new Date(from), new Date(to));
  });

  ipcMain.handle('entries:delete', (_, id) => {
    store.deleteEntry(id);
    return true;
  });

  ipcMain.handle('entries:update', (_, { id, project, task, startedAt, stoppedAt }) => {
    return updateEntry(id, { project, task, startedAt, stoppedAt });
  });

  ipcMain.handle('entries:add-manual', (_, { project, task, startedAt, stoppedAt }) => {
    const durationMs = Math.max(0, new Date(stoppedAt).getTime() - new Date(startedAt).getTime());
    return store.saveEntry({ project, task, startedAt, stoppedAt, durationMs });
  });

  ipcMain.handle('projects:get', () => store.getProjects());
  ipcMain.handle('projects:delete', (_, name) => store.deleteProject(name));
  ipcMain.handle('projects:rename', (_, { oldName, newName }) => store.renameProject(oldName, newName));
  ipcMain.handle('projects:get-tasks', (_, project) => store.getTasksForProject(project));
  ipcMain.handle('projects:delete-task', (_, { project, task }) => store.deleteTask(project, task));

  ipcMain.handle('idle:resolved', (_, { action }) => {
    const idleMs = timerEngine.getIdleMs();
    if (action === 'discard') {
      stopReminder();
      const entry = timerEngine.stop(idleMs);
      if (entry && entry.durationMs > 0) store.saveEntry(entry);
      mainWindow.webContents.send('timer:state-changed', timerEngine.getSnapshot());
      return entry;
    } else {
      timerEngine.resume();
      if (idleDetectorRef) idleDetectorRef.reset();
      startReminder(timerEngine.getSnapshot().project, reminderMinutes);
      mainWindow.webContents.send('timer:state-changed', timerEngine.getSnapshot());
      return null;
    }
  });


  ipcMain.handle('report:export', async (_, { format, from, to, clientFilter }) => {
    let entries = store.getEntriesInRange(new Date(from), new Date(to));
    if (clientFilter) {
      const f = clientFilter.toLowerCase();
      entries = entries.filter(e => (e.project || '').toLowerCase().includes(f));
    }
    const isCsv = format === 'csv';
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Riport mentése',
      defaultPath: `idomeroe-riport.${isCsv ? 'csv' : 'txt'}`,
      filters: isCsv
        ? [{ name: 'CSV', extensions: ['csv'] }]
        : [{ name: 'Szöveges fájl', extensions: ['txt'] }]
    });
    if (result.canceled || !result.filePath) return { canceled: true };
    if (isCsv) exportCsv(entries, result.filePath);
    else exportTxt(entries, result.filePath);
    return { filepath: result.filePath };
  });
}

module.exports = { registerHandlers };
