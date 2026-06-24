const { EventEmitter } = require('events');
const { powerMonitor } = require('electron');
const { IDLE_THRESHOLD_MS } = require('./constants');

class IdleDetector extends EventEmitter {
  constructor() {
    super();
    this._threshold = IDLE_THRESHOLD_MS;
    this._timer = null;
    this._wasIdle = false;
    this._uiohook = null;
  }

  getThreshold() { return this._threshold; }
  setThreshold(ms) { this._threshold = ms; this._scheduleIdle(); }

  reset() {
    this._wasIdle = false;
    this._scheduleIdle();
  }

  start() {
    try {
      const { uIOhook } = require('uiohook-napi');
      this._uiohook = uIOhook;
      uIOhook.on('mousemove', () => this._reset());
      uIOhook.on('mousedown', () => this._reset());
      uIOhook.on('keydown', () => this._reset());
      uIOhook.start();
    } catch (err) {
      console.error('[IdleDetector] uiohook-napi betöltési hiba:', err.message);
    }

    powerMonitor.on('suspend', () => this._onIdle());
    powerMonitor.on('lock-screen', () => this._onIdle());

    this._scheduleIdle();
  }

  stop() {
    clearTimeout(this._timer);
    if (this._uiohook) {
      try { this._uiohook.stop(); } catch (_) {}
    }
  }

  _scheduleIdle() {
    clearTimeout(this._timer);
    this._timer = setTimeout(() => this._onIdle(), this._threshold);
  }

  _reset() {
    if (this._wasIdle) {
      this._wasIdle = false;
      this.emit('resumed');
    }
    this._scheduleIdle();
  }

  _onIdle() {
    if (this._wasIdle) return;
    this._wasIdle = true;
    this.emit('idle');
  }
}

module.exports = { IdleDetector };
