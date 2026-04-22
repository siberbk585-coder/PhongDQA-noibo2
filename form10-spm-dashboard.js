/**
 * Form 10 — Dashboard SPM 2026 (KRD & DQA).
 * Dữ liệu: GET https://iatzhxxuk.tino.page/webhook/cong2form10 (JSON theo NocoDB / mẫu Untitled-1.groovy).
 */
(function () {
  const P = 'f10-spm-';
  const $ = (id) => document.getElementById(P + id);

  const F10SPM_WEBHOOK_URL = 'https://iatzhxxuk.tino.page/webhook/cong2form10';

  let F10SPM_KRD = [];
  let F10SPM_DQA = [];
  let f10SpmChartsInited = false;

  const ttB = {
    'In Progress': '<span class="bd b-ip">In Progress</span>',
    Done: '<span class="bd b-done">Done</span>',
    'To Do': '<span class="bd b-todo">To Do</span>',
    Canceled: '<span class="bd b-cancel">Canceled</span>',
    Cancelled: '<span class="bd b-cancel">Cancelled</span>',
    PENDING: '<span class="bd b-pend">Pending</span>',
    Pending: '<span class="bd b-pend">Pending</span>'
  };
  const krdB = '<span class="bd b-krd">KRD</span>';
  const dqaB = '<span class="bd b-dqa">DQA</span>';

  function pick(row, ...keys) {
    if (!row) return undefined;
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      if (k in row && row[k] != null && row[k] !== '') return row[k];
    }
    return undefined;
  }

  function isMarkOn(v) {
    if (v === true || v === 1) return true;
    const s = String(v == null ? '' : v).trim().toLowerCase();
    return s === 'x' || s === '1' || s === 'yes' || s === 'có';
  }

  /** Link Jira dạng [🔗|https://...] hoặc URL thuần */
  function parseJiraUrl(raw) {
    if (!raw || typeof raw !== 'string') return '';
    const t = raw.trim();
    const m = t.match(/\[[^\]|]*\|\s*(https?:\/\/[^\]]+)\]/i);
    if (m) return m[1].trim();
    if (/^https?:\/\//i.test(t)) return t;
    return '';
  }

  function parseAnyUrl(raw) {
    if (!raw || typeof raw !== 'string') return '';
    const t = raw.trim();
    const m = t.match(/\[[^\]|]*\|\s*(https?:\/\/[^\]]+)\]/i);
    if (m) return m[1].trim();
    if (/^https?:\/\//i.test(t)) return t;
    return '';
  }

  function jiraLink(url) {
    if (!url) return '<span style="color:var(--text3);font-size:10px">—</span>';
    const m = url.match(/projectKey=([^&]+)/);
    const lbl = m ? m[1] : 'Jira';
    return `<a class="jira-link" href="${url}" target="_blank" rel="noopener noreferrer">↗ ${lbl}</a>`;
  }

  function escHtml(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function buildFmeaDisplay(row) {
    const pct = pick(row, 'Tỉ lệ rà soát FMEA +bổ sung FMEA', 'Tỉ lệ rà soát FMEA + bổ sung FMEA');
    if (pct != null && String(pct).trim() !== '') return String(pct).trim();
    const hm = pick(row, 'Hạng mục FMEA rà soát bổ sung');
    const tot = pick(row, 'Tổng hạng mục rà soát FMEA');
    if (hm != null && tot != null && String(tot).trim() !== '') return `${hm}/${tot}`;
    const tl = pick(row, 'Tỷ lệ đã cải tiến trên tổng lỗi');
    if (tl != null && String(tl).trim() !== '') return String(tl).trim();
    return '';
  }

  /** Chuẩn hóa một dòng webhook → model nội bộ (ma, ten, krd, dqa, …) */
  function mapWebhookRowToInternal(row) {
    const soLuongCaiTien = String(pick(row, 'Số lượng  cải tiến lỗi đánh giá LK + SP', 'Số lượng cải tiến lỗi đánh giá LK + SP') ?? '').trim();
    const tongLoi = String(pick(row, 'Tổng lỗi') ?? '').trim();
    const tiLeCaiTien = String(pick(row, 'Tỷ lệ đã cải tiến trên tổng lỗi') ?? '').trim();
    const hmFmea = String(pick(row, 'Hạng mục FMEA rà soát bổ sung') ?? '').trim();
    const tongHmFmea = String(pick(row, 'Tổng hạng mục rà soát FMEA') ?? '').trim();
    const ghiChu = String(pick(row, 'Ghi chú') ?? '').trim();
    const createdAt = String(pick(row, 'CreatedAt') ?? '').trim();
    const updatedAt = String(pick(row, 'UpdatedAt') ?? '').trim();
    const id = String(pick(row, 'Id') ?? '').trim();
    const ma = String(pick(row, 'Mã dự án', 'ma', 'Ma') ?? '').trim();
    const ten = String(pick(row, 'Tên dự án', 'ten') ?? '').trim();
    const cap = String(pick(row, 'Cấp độ', 'Cấp', 'cap') ?? '').trim();
    const pm = String(pick(row, 'PM', 'pm') ?? '').trim();
    const tt = String(pick(row, 'Tình trạng dự án', 'Tình trạng', 'tt') ?? '').trim();
    const pic = String(pick(row, 'PIC DQA', 'PIC') ?? '').trim();
    const krd = isMarkOn(row['KRD đang triển khai']) ? 1 : 0;
    const dqa = isMarkOn(row['DQA đang triển khai']) ? 1 : 0;
    const ph = String(pick(row, 'Giai đoạn nhận mẫu', 'ph') ?? '').trim();
    const okRaw = row['KQ ĐG OK'];
    const ok =
      okRaw === 'OK' || okRaw === 'ok' || okRaw === 'x' || okRaw === true || okRaw === 1 ? 'OK' : '';
    const ngRaw = row['KQ ĐG NG'];
    const ng = ngRaw === 'NG' || String(ngRaw || '').toUpperCase() === 'NG' ? 'NG' : '';
    const dd = String(pick(row, 'Đang đánh giá', 'dd') ?? '').trim();
    const jira = parseJiraUrl(String(pick(row, 'Link Jira', 'link jira', 'jira') ?? ''));
    const linkFmea = parseAnyUrl(String(pick(row, 'Link kết quả FMEA') ?? ''));
    const linkCaiTien = parseAnyUrl(String(pick(row, 'Link kết quả cải tiến lỗi') ?? ''));
    const fmea = buildFmeaDisplay(row);
    return {
      id,
      createdAt,
      updatedAt,
      ma,
      ten,
      cap,
      pm,
      tt,
      pic,
      krd,
      dqa,
      ph,
      ok,
      ng,
      dd,
      soLuongCaiTien,
      tongLoi,
      tiLeCaiTien,
      hmFmea,
      tongHmFmea,
      fmea,
      jira,
      linkFmea,
      linkCaiTien,
      ghiChu
    };
  }

  async function fetchForm10SpmData() {
    const resp = await fetch(F10SPM_WEBHOOK_URL, {
      method: 'GET',
      headers: { Accept: 'application/json' }
    });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    let body;
    const text = await resp.text();
    try {
      body = JSON.parse(text);
    } catch (_) {
      throw new Error('Phản hồi không phải JSON hợp lệ');
    }
    let rows = body;
    if (!Array.isArray(rows) && body && typeof body === 'object') {
      if (Array.isArray(body.data)) rows = body.data;
      else if (Array.isArray(body.results)) rows = body.results;
      else if (body.data && Array.isArray(body.data.results)) rows = body.data.results;
    }
    if (!Array.isArray(rows)) throw new Error('Dữ liệu không phải mảng');
    return rows.map(mapWebhookRowToInternal).filter((r) => r && r.ma);
  }

  function computeKrdStats(krd) {
    const total = krd.length;
    const ip = krd.filter((p) => p.tt === 'In Progress').length;
    const done = krd.filter((p) => p.tt === 'Done').length;
    const dqaJoin = krd.filter((p) => p.dqa === 1).length;
    const l1 = krd.filter((p) => p.cap === 'L1').length;
    const l2 = krd.filter((p) => p.cap === 'L2').length;
    const l3 = krd.filter((p) => p.cap === 'L3').length;
    const doneNames = krd.filter((p) => p.tt === 'Done').map((p) => p.ten).filter(Boolean);
    return { total, ip, done, dqaJoin, l1, l2, l3, doneHint: doneNames[0] || '—' };
  }

  function computeDqaStats(dqa) {
    const total = dqa.length;
    const doing = dqa.filter((p) => p.dd === 'Doing').length;
    const ng = dqa.filter((p) => p.ng === 'NG').length;
    const ok = dqa.filter((p) => p.ok === 'OK').length;
    const ngRate = total > 0 ? Math.round((ng / total) * 100) : 0;
    const fmeaCount = dqa.filter((p) => p.fmea && String(p.fmea).trim() !== '').length;
    return { total, doing, ng, ok, ngRate, fmeaCount };
  }

  function countPhase(dqa, ph) {
    return dqa.filter((p) => p.ph === ph).length;
  }

  function picWorkload(dqa) {
    const m = new Map();
    const known = new Set(['Hằng', 'Kỳ', 'Thịnh', 'Nghĩa', 'Huy', 'Hiền', 'Kiên', 'Sơn']);
    let other = 0;
    dqa.forEach((p) => {
      const name = (p.pic || '').trim();
      if (!name) return;
      if (known.has(name)) {
        m.set(name, (m.get(name) || 0) + 1);
      } else {
        other += 1;
      }
    });
    const order = ['Hằng', 'Kỳ', 'Thịnh', 'Nghĩa'];
    const labels = [];
    const data = [];
    const colors = [];
    const palette = ['#22c55e', '#3b82f6', '#7c3aed', '#f59e0b', '#64748b'];
    let i = 0;
    order.forEach((name) => {
      const c = m.get(name) || 0;
      if (c > 0) {
        labels.push(name);
        data.push(c);
        colors.push(palette[i % palette.length]);
        i++;
      }
    });
    if (other > 0) {
      labels.push('Khác');
      data.push(other);
      colors.push('#94a3b8');
    }
    return { labels, data, colors };
  }

  function repopulateFdPicSelect() {
    const sel = $('fdPic');
    if (!sel) return;
    const pics = [];
    const seen = new Set();
    F10SPM_DQA.forEach((p) => {
      const n = (p.pic || '').trim();
      if (n && !seen.has(n)) {
        seen.add(n);
        pics.push(n);
      }
    });
    pics.sort((a, b) => a.localeCompare(b, 'vi'));
    sel.innerHTML = '';
    const o0 = document.createElement('option');
    o0.value = '';
    o0.textContent = 'Tất cả PIC';
    sel.appendChild(o0);
    pics.forEach((n) => {
      const o = document.createElement('option');
      o.value = n;
      o.textContent = n;
      sel.appendChild(o);
    });
  }

  function destroyCharts() {
    ['ck1', 'ck2', 'cd1', 'cd2'].forEach((key) => {
      const el = $(key);
      if (el && el._f10SpmChart) {
        try {
          el._f10SpmChart.destroy();
        } catch (_) {}
        el._f10SpmChart = null;
      }
    });
  }

  function syncHeaderTags(allLen) {
    const now = new Date();
    const monthLabel = 'Tháng ' + (now.getMonth() + 1) + ' · ' + now.getFullYear();
    const elM = $('hdr-month');
    const elN = $('hdr-count');
    if (elM) elM.textContent = monthLabel;
    if (elN) elN.textContent = allLen + ' dự án';
  }

  function syncKrdKpis(stats) {
    const set = (id, val) => {
      const n = $(id);
      if (n) n.textContent = String(val);
    };
    const setBar = (id, pct, colorVar) => {
      const inner = $(id);
      if (inner) {
        inner.style.width = Math.min(100, Math.max(0, pct)) + '%';
        inner.style.background = colorVar;
      }
    };
    set('kpi-krd-total', stats.total);
    set('kpi-krd-ip', stats.ip);
    set('kpi-krd-done', stats.done);
    set('kpi-krd-done-hint', stats.doneHint);
    set('kpi-krd-dqa-join', stats.dqaJoin);
    set('kpi-krd-l1', stats.l1);
    set('kpi-krd-l2', stats.l2);
    set('kpi-krd-l3', stats.l3);
    setBar('bar-krd-total', 100, 'var(--blue)');
    const pctIp = stats.total ? Math.round((stats.ip / stats.total) * 100) : 0;
    setBar('bar-krd-ip', pctIp, 'var(--blue)');
    setBar('bar-krd-l1', stats.total ? (stats.l1 / stats.total) * 100 : 0, 'var(--blue)');
    setBar('bar-krd-l2', stats.total ? (stats.l2 / stats.total) * 100 : 0, 'var(--purple)');
    setBar('bar-krd-l3', stats.total ? (stats.l3 / stats.total) * 100 : 0, 'var(--near)');
  }

  function syncDqaKpis(s) {
    const set = (id, val) => {
      const n = $(id);
      if (n) n.textContent = String(val);
    };
    const setBar = (id, pct, colorVar) => {
      const inner = $(id);
      if (inner) {
        inner.style.width = Math.min(100, Math.max(0, pct)) + '%';
        inner.style.background = colorVar;
      }
    };
    set('kpi-dqa-total', s.total);
    set('kpi-dqa-doing', s.doing);
    set('kpi-dqa-ng', s.ng);
    set('kpi-dqa-ok', s.ok);
    set('kpi-dqa-ng-rate', s.ngRate + '%');
    set('kpi-dqa-fmea', s.fmeaCount);
    setBar('bar-dqa-total', 100, 'var(--purple)');
    setBar('bar-dqa-doing', s.total ? (s.doing / s.total) * 100 : 0, 'var(--green)');
    setBar('bar-dqa-ng', s.total ? (s.ng / s.total) * 100 : 0, 'var(--late)');
  }

  function syncLegendCounts(krd, dqa, stats, dqaStats) {
    const setHtml = (id, html) => {
      const el = $(id);
      if (el) el.innerHTML = html;
    };
    setHtml(
      'leg-krd-status',
      `<div class="li"><div class="ld" style="background:var(--blue)"></div>In Progress (${stats.ip})</div>
       <div class="li"><div class="ld" style="background:var(--green)"></div>Done (${stats.done})</div>`
    );
    setHtml(
      'leg-krd-level',
      `<div class="li"><div class="ld" style="background:var(--blue)"></div>L1 — SPM Core (${stats.l1})</div>
       <div class="li"><div class="ld" style="background:var(--purple)"></div>L2 — TUCP/SPM (${stats.l2})</div>
       <div class="li"><div class="ld" style="background:var(--near)"></div>L3 — LK/TUCP (${stats.l3})</div>`
    );
    const s0 = countPhase(dqa, 'S0');
    const s3 = countPhase(dqa, 'S3');
    const t0 = countPhase(dqa, 'T0');
    setHtml(
      'leg-dqa-phase',
      `<div class="li"><div class="ld" style="background:var(--green)"></div>S0 — Mẫu sơ bộ (${s0})</div>
       <div class="li"><div class="ld" style="background:var(--blue)"></div>S3 — Mẫu hoàn thiện (${s3})</div>
       <div class="li"><div class="ld" style="background:var(--purple)"></div>T0 — Thử sản xuất (${t0})</div>`
    );
    const w = picWorkload(dqa);
    let picHtml = '';
    w.labels.forEach((lb, idx) => {
      const col = w.colors[idx] || '#64748b';
      picHtml += `<div class="li"><div class="ld" style="background:${col}"></div>${lb} (${w.data[idx]})</div>`;
    });
    setHtml('leg-dqa-pic', picHtml || '<div class="li" style="color:var(--text2)">Chưa có PIC</div>');
  }

  function renderCharts(krd, dqa, stats) {
    if (typeof Chart === 'undefined') return;
    destroyCharts();
    const gc = 'rgba(15,23,42,.06)';
    const tOpts = {
      bodyColor: '#111827',
      backgroundColor: '#ffffff',
      borderColor: '#e5e7eb',
      borderWidth: 1,
      padding: 10
    };

    const el1 = $('ck1');
    if (el1) {
      el1._f10SpmChart = new Chart(el1, {
        type: 'doughnut',
        data: {
          labels: ['In Progress', 'Done'],
          datasets: [{ data: [stats.ip, stats.done], backgroundColor: ['#3b82f6', '#22c55e'], borderWidth: 0, hoverOffset: 4 }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '68%',
          plugins: {
            legend: { display: false },
            tooltip: { ...tOpts, callbacks: { label: (c) => '  ' + c.label + ': ' + c.raw + ' DA' } }
          }
        }
      });
    }

    const el2 = $('ck2');
    if (el2) {
      el2._f10SpmChart = new Chart(el2, {
        type: 'bar',
        data: {
          labels: ['L1', 'L2', 'L3'],
          datasets: [
            {
              data: [stats.l1, stats.l2, stats.l3],
              backgroundColor: ['#3b82f6', '#7c3aed', '#f59e0b'],
              borderRadius: 5,
              borderWidth: 0
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 11 } }, border: { display: false } },
            y: { grid: { color: gc }, ticks: { color: '#64748b', font: { size: 10 } }, border: { display: false }, beginAtZero: true }
          },
          plugins: {
            legend: { display: false },
            tooltip: { ...tOpts, callbacks: { label: (c) => '  ' + c.raw + ' dự án' } }
          }
        }
      });
    }

    const s0 = countPhase(dqa, 'S0');
    const s3 = countPhase(dqa, 'S3');
    const t0 = countPhase(dqa, 'T0');
    const el3 = $('cd1');
    if (el3) {
      el3._f10SpmChart = new Chart(el3, {
        type: 'doughnut',
        data: {
          labels: ['S0 — Mẫu sơ bộ', 'S3 — Mẫu hoàn thiện', 'T0 — Thử sản xuất'],
          datasets: [{ data: [s0, s3, t0], backgroundColor: ['#22c55e', '#3b82f6', '#7c3aed'], borderWidth: 0, hoverOffset: 4 }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '63%',
          plugins: {
            legend: { display: false },
            tooltip: { ...tOpts, callbacks: { label: (c) => '  ' + c.label + ': ' + c.raw + ' DA' } }
          }
        }
      });
    }

    const w = picWorkload(dqa);
    const el4 = $('cd2');
    if (el4 && w.labels.length) {
      el4._f10SpmChart = new Chart(el4, {
        type: 'bar',
        data: { labels: w.labels, datasets: [{ data: w.data, backgroundColor: w.colors, borderRadius: 5, borderWidth: 0 }] },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          indexAxis: 'y',
          scales: {
            x: { grid: { color: gc }, ticks: { color: '#64748b', font: { size: 10 } }, border: { display: false }, beginAtZero: true },
            y: { grid: { display: false }, ticks: { color: '#6b7280', font: { size: 12 } }, border: { display: false } }
          },
          plugins: {
            legend: { display: false },
            tooltip: { ...tOpts, callbacks: { label: (c) => '  ' + c.raw + ' dự án' } }
          }
        }
      });
    }
  }

  function rk() {
    const ft = $('fkT')?.value || '';
    const fc = $('fkC')?.value || '';
    const fd = $('fkD')?.value || '';
    const fq = (($('fkQ')?.value || '') + '').toLowerCase();
    const f = F10SPM_KRD.filter((p) => {
      if (ft && p.tt !== ft) return false;
      if (fc && p.cap !== fc) return false;
      if (fd === 'krd_only' && p.dqa !== 0) return false;
      if (fd === 'both' && p.dqa !== 1) return false;
      if (fq && !String(p.ten).toLowerCase().includes(fq) && !String(p.ma).toLowerCase().includes(fq)) return false;
      return true;
    });
    const cnt = $('cnt-k');
    if (cnt) cnt.textContent = f.length + ' / ' + F10SPM_KRD.length;
    const tb = $('tb-k');
    if (tb) {
      tb.innerHTML = f
        .map((p) => {
          const kq = p.ng === 'NG' ? '<span class="bd b-ng">NG</span>' : p.ok ? '<span class="bd b-ok">OK</span>' : '—';
          const ttCell = ttB[p.tt] || (p.tt ? String(p.tt) : '—');
          const ph = p.ph ? `<span class="bd b-ph">${p.ph}</span>` : '—';
          const dd = p.dd === 'Doing' ? '<span class="bd b-doing">Doing</span>' : p.dd || '—';
          const pic = p.pic ? `<span class="pic">${p.pic}</span>` : '—';
          const fmea = p.fmea ? `<span class="fmea-val">${p.fmea}</span>` : '—';
          return `<tr>
      <td class="mc">${p.id || '—'}</td>
      <td class="mc">${p.ma}</td>
      <td title="${String(p.ten).replace(/"/g, '&quot;')}" style="max-width:260px"><span class="proj-link" data-proj-ma="${escHtml(p.ma)}" data-proj-type="krd">${p.ten}</span></td>
      <td class="mc" style="color:var(--text2)">${p.pm || '—'}</td>
      <td><span class="bd b-lv">${p.cap}</span></td>
      <td>${ttCell}</td>
      <td>${p.krd ? krdB : '—'}</td>
      <td>${p.dqa ? dqaB : '—'}</td>
      <td>${ph}</td>
      <td>${kq}</td>
      <td>${dd}</td>
      <td>${pic}</td>
      <td>${p.soLuongCaiTien || '—'}</td>
      <td>${p.tongLoi || '—'}</td>
      <td>${p.tiLeCaiTien || '—'}</td>
      <td>${p.hmFmea || '—'}</td>
      <td>${p.tongHmFmea || '—'}</td>
      <td>${fmea}</td>
      <td>${jiraLink(p.jira)}</td>
      <td title="${String(p.ghiChu || '').replace(/"/g, '&quot;')}">${p.ghiChu || '—'}</td>
    </tr>`;
        })
        .join('');
    }
  }

  function rd() {
    const fp = $('fdP')?.value || '';
    const fk = $('fdK')?.value || '';
    const fpic = $('fdPic')?.value || '';
    const fc = $('fdC')?.value || '';
    const fq = (($('fdQ')?.value || '') + '').toLowerCase();
    const f = F10SPM_DQA.filter((p) => {
      if (fp && p.ph !== fp) return false;
      if (fk === 'NG' && p.ng !== 'NG') return false;
      if (fk === 'OK' && p.ok !== 'OK') return false;
      if (fk === 'doing' && p.dd !== 'Doing') return false;
      if (fpic && p.pic !== fpic) return false;
      if (fc && p.cap !== fc) return false;
      if (fq && !String(p.ten).toLowerCase().includes(fq) && !String(p.ma).toLowerCase().includes(fq)) return false;
      return true;
    });
    const cnt = $('cnt-d');
    if (cnt) cnt.textContent = f.length + ' / ' + F10SPM_DQA.length;
    const tb = $('tb-d');
    if (tb) {
      tb.innerHTML = f
        .map((p) => {
          const ph = p.ph ? `<span class="bd b-ph">${p.ph}</span>` : '—';
          const kq = p.ng === 'NG' ? '<span class="bd b-ng">NG</span>' : p.ok === 'OK' ? '<span class="bd b-ok">OK</span>' : '—';
          const dd = p.dd === 'Doing' ? '<span class="bd b-doing">Doing</span>' : '—';
          const pic = p.pic ? `<span class="pic">${p.pic}</span>` : '—';
          const fmea = p.fmea ? `<span class="fmea-val">${p.fmea}</span>` : '—';
          return `<tr>
      <td class="mc">${p.id || '—'}</td>
      <td class="mc">${p.ma}</td>
      <td title="${String(p.ten).replace(/"/g, '&quot;')}" style="max-width:240px"><span class="proj-link" data-proj-ma="${escHtml(p.ma)}" data-proj-type="dqa">${p.ten}</span></td>
      <td class="mc" style="color:var(--text2)">${p.pm || '—'}</td>
      <td><span class="bd b-lv">${p.cap}</span></td>
      <td>${ttB[p.tt] || (p.tt ? String(p.tt) : '—')}</td>
      <td>${p.krd ? krdB : '—'}</td>
      <td>${p.dqa ? dqaB : '—'}</td>
      <td>${ph}</td>
      <td>${kq}</td>
      <td>${dd}</td>
      <td>${pic}</td>
      <td>${p.soLuongCaiTien || '—'}</td>
      <td>${p.tongLoi || '—'}</td>
      <td>${p.tiLeCaiTien || '—'}</td>
      <td>${p.hmFmea || '—'}</td>
      <td>${p.tongHmFmea || '—'}</td>
      <td>${fmea}</td>
      <td>${jiraLink(p.jira)}</td>
      <td title="${String(p.ghiChu || '').replace(/"/g, '&quot;')}">${p.ghiChu || '—'}</td>
    </tr>`;
        })
        .join('');
    }
  }

  function openProjectDetailModal(project) {
    const modal = document.getElementById('f10-spm-detail-modal');
    const body = document.getElementById('f10-spm-detail-body');
    const sub = document.getElementById('f10-spm-detail-sub');
    if (!modal || !body || !sub || !project) return;
    const yn = (v) => (v ? 'Có' : 'Không');
    const overviewDetails = [
      ['Mã dự án', project.ma],
      ['Tên dự án', project.ten],
      ['PM', project.pm],
      ['PIC DQA', project.pic],
      ['Cấp độ', project.cap],
      ['Tình trạng dự án', project.tt],
      ['KRD đang triển khai', yn(project.krd)],
      ['DQA đang triển khai', yn(project.dqa)]
    ];
    const qualityDetails = [
      ['Giai đoạn nhận mẫu', project.ph],
      ['Đang đánh giá', project.dd],
      ['KQ ĐG OK', project.ok],
      ['KQ ĐG NG', project.ng],
      ['Số lượng cải tiến lỗi', project.soLuongCaiTien],
      ['Tổng lỗi', project.tongLoi],
      ['Tỷ lệ cải tiến trên tổng lỗi', project.tiLeCaiTien]
    ];
    const fmeaDetails = [
      ['Hạng mục FMEA rà soát bổ sung', project.hmFmea],
      ['Tổng hạng mục rà soát FMEA', project.tongHmFmea],
      ['Tỉ lệ rà soát FMEA', project.fmea]
    ];
    sub.textContent = `${project.ma || '—'} · ${project.ten || '—'}`;
    const itemGrid = (rows) =>
      `<div class="f10-spm-detail-grid">${rows
        .map(([lb, val]) => `<div class="f10-spm-detail-item"><div class="lb">${escHtml(lb)}</div><div class="val">${val ? val : '—'}</div></div>`)
        .join('')}</div>`;
    const subgroup = (title, rows, cls = '') =>
      `<div class="f10-spm-detail-subgroup ${cls}"><div class="f10-spm-detail-subtitle">${escHtml(title)}</div>${itemGrid(rows)}</div>`;
    const section = (title, htmlBody, cls = '') =>
      `<div class="f10-spm-detail-sec ${cls}">
        <div class="f10-spm-detail-sec-title">${escHtml(title)}</div>
        ${htmlBody}
      </div>`;

    const qualityHtml =
      subgroup('Trạng thái đánh giá', [
        ['Giai đoạn nhận mẫu', project.ph],
        ['Đang đánh giá', project.dd],
        ['KQ ĐG OK', project.ok],
        ['KQ ĐG NG', project.ng]
      ]);

    const improveHtml = subgroup('Cải tiến lỗi', [
      ['Số lượng cải tiến lỗi', project.soLuongCaiTien],
      ['Tổng lỗi', project.tongLoi],
      ['Tỷ lệ cải tiến trên tổng lỗi', project.tiLeCaiTien],
      ['Link kết quả cải tiến lỗi', project.linkCaiTien ? `<a class="jira-link" href="${escHtml(project.linkCaiTien)}" target="_blank" rel="noopener noreferrer">${escHtml(project.linkCaiTien)}</a>` : '—']
    ]);

    const fmeaHtml =
      subgroup('Chỉ số FMEA', [
        ['Hạng mục FMEA rà soát bổ sung', project.hmFmea],
        ['Tổng hạng mục rà soát FMEA', project.tongHmFmea]
      ]) +
      subgroup('Kết quả FMEA', [
        ['Tỉ lệ rà soát FMEA', project.fmea],
        ['Link kết quả FMEA', project.linkFmea ? `<a class="jira-link" href="${escHtml(project.linkFmea)}" target="_blank" rel="noopener noreferrer">${escHtml(project.linkFmea)}</a>` : '—']
      ]);

    const linksHtml =
      subgroup('Liên kết', [
        ['Link Jira', project.jira ? `<a class="jira-link" href="${escHtml(project.jira)}" target="_blank" rel="noopener noreferrer">${escHtml(project.jira)}</a>` : '—']
      ]) +
      subgroup('Ghi chú', [['Nội dung ghi chú', project.ghiChu ? escHtml(project.ghiChu) : '—']]);

    body.innerHTML =
      section('Tổng quan dự án', itemGrid(overviewDetails), 'sec-overview') +
      section('Chất lượng', qualityHtml, 'sec-quality') +
      section('Cải tiến lỗi', improveHtml, 'sec-improve') +
      section('FMEA', fmeaHtml, 'sec-fmea') +
      section('Liên kết và ghi chú', linksHtml, 'sec-links');
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
  }

  function closeProjectDetailModal() {
    const modal = document.getElementById('f10-spm-detail-modal');
    if (!modal) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
  }

  function sw(t) {
    document.querySelectorAll('#form10 .f10-spm-root .tab[data-tab]').forEach((el) => {
      el.classList.toggle('on', el.getAttribute('data-tab') === t);
    });
    const pk = $('panel-krd');
    const pd = $('panel-dqa');
    if (pk) pk.classList.toggle('on', t === 'krd');
    if (pd) pd.classList.toggle('on', t === 'dqa');
    if (t === 'krd') rk();
    else rd();
    if (f10SpmChartsInited) {
      requestAnimationFrame(() => {
        ['ck1', 'ck2', 'cd1', 'cd2'].forEach((key) => {
          const c = $(key)?._f10SpmChart;
          if (c) try { c.resize(); } catch (_) {}
        });
      });
    }
  }

  function bindFilters() {
    ['fkT', 'fkC', 'fkD'].forEach((id) => $(id)?.addEventListener('change', rk));
    $('fkQ')?.addEventListener('keyup', rk);
    ['fdP', 'fdK', 'fdPic', 'fdC'].forEach((id) => $(id)?.addEventListener('change', rd));
    $('fdQ')?.addEventListener('keyup', rd);
    document.querySelectorAll('#form10 .f10-spm-root .tab[data-tab]').forEach((el) => {
      el.addEventListener('click', () => sw(el.getAttribute('data-tab')));
    });
    $('refresh-btn')?.addEventListener('click', () => {
      void window.F10SpmDashboardInit();
    });
    document.getElementById('f10-spm-detail-close')?.addEventListener('click', closeProjectDetailModal);
    document.getElementById('f10-spm-detail-overlay')?.addEventListener('click', closeProjectDetailModal);
    document.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape') closeProjectDetailModal();
    });
    document.querySelector('#form10 .f10-spm-root')?.addEventListener('click', (ev) => {
      const target = ev.target;
      if (!(target instanceof HTMLElement)) return;
      const link = target.closest('.proj-link');
      if (!link) return;
      const ma = link.getAttribute('data-proj-ma') || '';
      if (!ma) return;
      const project = F10SPM_DQA.find((p) => p.ma === ma) || F10SPM_KRD.find((p) => p.ma === ma);
      if (project) openProjectDetailModal(project);
    });
  }

  function updateTabBadges() {
    document.querySelectorAll('#form10 .f10-spm-root .tab[data-tab] .tc').forEach((el) => {
      const tab = el.closest('.tab');
      const t = tab && tab.getAttribute('data-tab');
      if (t === 'krd') el.textContent = String(F10SPM_KRD.length);
      if (t === 'dqa') el.textContent = String(F10SPM_DQA.length);
    });
  }

  function runFullRefreshFromRows(DATA) {
    F10SPM_KRD = DATA.filter((p) => p.krd === 1);
    F10SPM_DQA = DATA.filter((p) => p.dqa === 1);
    syncHeaderTags(DATA.length);
    const kst = computeKrdStats(F10SPM_KRD);
    const dst = computeDqaStats(F10SPM_DQA);
    syncKrdKpis(kst);
    syncDqaKpis(dst);
    syncLegendCounts(F10SPM_KRD, F10SPM_DQA, kst, dst);
    repopulateFdPicSelect();
    updateTabBadges();
    rk();
    rd();
    renderCharts(F10SPM_KRD, F10SPM_DQA, kst);
    f10SpmChartsInited = true;
    window.F10SPM_DASHBOARD_DATA = DATA;
  }

  let f10SpmBound = false;

  window.F10SpmDashboardInit = async function () {
    const root = document.querySelector('#form10 .f10-spm-root');
    if (!root) return;
    if (!f10SpmBound) {
      f10SpmBound = true;
      bindFilters();
    }
    const hdr = $('hdr-month');
    if (hdr) hdr.textContent = 'Đang tải…';
    try {
      const DATA = await fetchForm10SpmData();
      runFullRefreshFromRows(DATA);
    } catch (err) {
      console.error('[Form10 SPM]', err);
      runFullRefreshFromRows([]);
      if (typeof showToast === 'function') showToast('Form 10: ' + (err.message || err), 'error');
    }
  };
})();
