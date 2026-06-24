const { EventEmitter } = require('events');

const STATE = { STOPPED: 'STOPPED', RUNNING: 'RUNNING', IDLE: 'IDLE' };

class TimerEngine extends EventEmitter {
  constructor() {
    super();
    this.state = STATE.STOPPED;
    this.startedAt = null;
    this.accumulatedMs = 0;
    this.project = '';
    this.task = '';
    this._interval = null;
    this._idleStartedAt = null;
  }

  start(project, task) {
    if (this.state !== STATE.STOPPED) return;
    this.project = project || '';
    this.task = task || '';
    this.accumulatedMs = 0;
    this.startedAt = Date.now();
    this.state = STATE.RUNNING;
    this._startInterval();
    this._emit();
  }

  stop(discardIdleMs = 0) {
    if (this.state === STATE.STOPPED) return null;
    this._stopInterval();
    const durationMs = Math.max(0, this.getElapsedMs() - discardIdleMs);
    const entry = {
      project: this.project,
      task: this.task,
      startedAt: new Date(Date.now() - this.getElapsedMs()).toISOString(),
      stoppedAt: new Date().toISOString(),
      durationMs
    };
    this.state = STATE.STOPPED;
    this.accumulatedMs = 0;
    this.startedAt = null;
    this._idleStartedAt = null;
    this._emit();
    return entry;
  }

  idle() {
    if (this.state !== STATE.RUNNING) return;
    this._idleStartedAt = Date.now();
    if (this.startedAt) {
      this.accumulatedMs += Date.now() - this.startedAt;
      this.startedAt = null;
    }
    this._stopInterval();
    this.state = STATE.IDLE;
    this._emit();
  }

  resume() {
    if (this.state !== STATE.IDLE) return;
    this.startedAt = Date.now();
    this.state = STATE.RUNNING;
    this._idleStartedAt = null;
    this._startInterval();
    this._emit();
  }

  getIdleMs() {
    if (!this._idleStartedAt) return 0;
    return Date.now() - this._idleStartedAt;
  }

  getElapsedMs() {
    if (this.state === STATE.RUNNING && this.startedAt) {
      return this.accumulatedMs + (Date.now() - this.startedAt);
    }
    return this.accumulatedMs;
  }

  getSnapshot() {
    return {
      state: this.state,
      elapsedMs: this.getElapsedMs(),
      project: this.project,
      task: this.task
    };
  }

  _emit() {
    this.emit('changed', this.getSnapshot());
  }

  _startInterval() {
    this._stopInterval();
    this._interval = setInterval(() => this._emit(), 1000);
  }

  _stopInterval() {
    if (this._interval) { clearInterval(this._interval); this._interval = null; }
  }
}

module.exports = { TimerEngine, STATE };
