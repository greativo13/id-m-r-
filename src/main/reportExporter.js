const fs = require('fs');

function groupByProject(entries) {
  const map = {};
  for (const e of entries) {
    const key = (e.project || '(nincs ügyfél)').toLowerCase();
    const display = e.project || '(nincs ügyfél)';
    if (!map[key]) map[key] = { display, items: [] };
    map[key].items.push(e);
  }
  return map;
}

function fmtDuration(ms) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}ó ${m}p ${sec}mp`;
  if (m > 0) return `${m}p ${sec}mp`;
  return `${sec}mp`;
}

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('hu-HU');
}

function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function exportCsv(entries, filepath) {
  const BOM = '﻿';
  const header = 'Ügyfél;Feladat;Dátum;Kezdés;Befejezés;Időtartam\n';
  const rows = entries.map(e => {
    const dur = fmtDuration(e.durationMs);
    const start = fmtTime(e.startedAt);
    const end = fmtTime(e.stoppedAt);
    return [e.project || '', e.task || '', fmtDate(e.startedAt), start, end, dur].join(';');
  });
  fs.writeFileSync(filepath, BOM + header + rows.join('\n'), 'utf8');
}

function exportTxt(entries, filepath) {
  const grouped = groupByProject(entries);
  const lines = [];
  lines.push('IDŐMÉRŐ RIPORT');
  lines.push('='.repeat(40));
  lines.push('');

  for (const { display, items } of Object.values(grouped)) {
    const total = items.reduce((s, e) => s + e.durationMs, 0);
    lines.push(`ÜGYFÉL: ${display}`);
    lines.push(`Összesen: ${fmtDuration(total)}`);
    lines.push('-'.repeat(30));
    for (const e of items) {
      const date = fmtDate(e.startedAt);
      lines.push(`  ${date}  ${e.task || '(nincs leírás)'}  →  ${fmtDuration(e.durationMs)}`);
    }
    lines.push('');
  }

  const grand = entries.reduce((s, e) => s + e.durationMs, 0);
  lines.push('='.repeat(40));
  lines.push(`MINDÖSSZESEN: ${fmtDuration(grand)}`);

  fs.writeFileSync(filepath, lines.join('\r\n'), 'utf8');
}

module.exports = { exportCsv, exportTxt };
