const { app, BrowserWindow, powerMonitor } = require('electron');
const path = require('path');
const os = require('os');
const { TimerEngine } = require('./timerEngine');
const { IdleDetector } = require('./idleDetector');
const { TrayManager } = require('./tray');
const { registerHandlers } = require('./ipcHandlers');

let mainWindow;
let timerEngine;
let idleDetector;
let trayManager;

app.disableHardwareAcceleration();
app.commandLine.appendSwitch('disk-cache-dir', path.join(os.tmpdir(), 'idomeroe-cache'));
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 460,
    height: 680,
    minWidth: 420,
    minHeight: 580,
    title: 'Időmérő',
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  mainWindow.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });
}

app.whenReady().then(() => {
  timerEngine = new TimerEngine();
  idleDetector = new IdleDetector();

  createWindow();

  trayManager = new TrayManager(app, timerEngine);
  trayManager.init(mainWindow);

  registerHandlers({ timerEngine, mainWindow, idleDetector });

  timerEngine.on('changed', (snapshot) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('timer:state-changed', snapshot);
    }
  });

  idleDetector.on('idle', () => {
    if (timerEngine.getSnapshot().state !== 'RUNNING') return;
    timerEngine.idle();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
      mainWindow.focus();
      mainWindow.webContents.send('idle:detected', { idleSince: Date.now() });
    }
  });

  idleDetector.on('resumed', () => {});

  idleDetector.start();
});

app.on('before-quit', () => {
  app.isQuitting = true;
  idleDetector.stop();
});

app.on('activate', () => {
  if (mainWindow) mainWindow.show();
});
