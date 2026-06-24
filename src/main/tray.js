const { Tray, Menu, nativeImage } = require('electron');
const path = require('path');

function createIcon(color, timeStr) {
  if (!timeStr) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16">
      <circle cx="8" cy="8" r="7" fill="${color}" />
    </svg>`;
    return nativeImage.createFromDataURL(`data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`);
  }
  const w = 72;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="16">
    <circle cx="8" cy="8" r="7" fill="${color}" />
    <text x="18" y="12" font-family="'Segoe UI',Arial,sans-serif" font-size="11" font-weight="600" fill="#ffffff">${timeStr}</text>
  </svg>`;
  return nativeImage.createFromDataURL(`data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`);
}

class TrayManager {
  constructor(app, timerEngine) {
    this.app = app;
    this.timerEngine = timerEngine;
    this.tray = null;
    this.mainWindow = null;
  }

  init(mainWindow) {
    this.mainWindow = mainWindow;
    this.tray = new Tray(createIcon('#6b7280'));
    this.tray.setToolTip('Időmérő');
    this.tray.on('double-click', () => this._showWindow());
    this._updateMenu('STOPPED', '00:00:00');

    this.timerEngine.on('changed', ({ state, elapsedMs, project }) => {
      const timeStr = formatMs(elapsedMs);
      if (state === 'RUNNING' || state === 'IDLE') {
        this.tray.setImage(createIcon('#10b981', timeStr));
        const label = project ? `${timeStr} — ${project}` : timeStr;
        this.tray.setToolTip(`Időmérő: ${label}`);
      } else {
        this.tray.setImage(createIcon('#6b7280'));
        this.tray.setToolTip('Időmérő');
      }
      this._updateMenu(state, timeStr);
    });
  }

  _showWindow() {
    if (this.mainWindow) {
      this.mainWindow.show();
      this.mainWindow.focus();
    }
  }

  hideMini(fn) {
    this._hideMini = fn;
  }

  _updateMenu(state, timeStr) {
    const isActive = state === 'RUNNING' || state === 'IDLE';
    const template = isActive ? [
      { label: timeStr, enabled: false },
      { type: 'separator' },
      { label: '⏹  Megállítás', click: () => this.timerEngine.stop() },
      { type: 'separator' },
      { label: 'Megnyitás', click: () => this._showWindow() },
      { label: 'Kilépés', click: () => this.app.quit() }
    ] : [
      { label: 'Megnyitás', click: () => this._showWindow() },
      { type: 'separator' },
      { label: 'Kilépés', click: () => this.app.quit() }
    ];
    this.tray.setContextMenu(Menu.buildFromTemplate(template));
  }
}

function formatMs(ms) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return [h, m, sec].map(n => String(n).padStart(2, '0')).join(':');
}

module.exports = { TrayManager };
