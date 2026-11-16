(() => {
  'use strict';

  const mounted = new WeakMap();
  const speed = 4;
  const dataUrl = 'assets/data/bullseye-cpu-replay.json';
  const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const finite = value => typeof value === 'number' && Number.isFinite(value);
  const percent = value => finite(value) ? value.toFixed(2) : '—';
  const clock = (value, precise = false) => {
    const seconds = Math.max(0, value) / 1000;
    const whole = Math.floor(seconds);
    return `${String(Math.floor(whole / 60)).padStart(2, '0')}:${String(whole % 60).padStart(2, '0')}${precise ? `.${Math.floor((seconds - whole) * 10)}` : ''}`;
  };
  const evidenceValue = (transition, name) => transition?.evidence?.find(item => item.metric === name)?.value;
  const usesGradualWorkload = capture => capture.workloadProfile === 'gradual-duty-cycle';
  const phaseLabel = (label, capture) => (usesGradualWorkload(capture)
    ? { baseline: '평시 부하', 'ramp-up': '부하 증가', 'elevated-load': '압력 지속', 'high-load': '압력 심화', 'critical-load': '포화 접근', 'ramp-down': '부하 완화', recovery: '평시 수준·복구 확인' }
    : { baseline: '대기', 'one-cpu-worker': 'CPU 부하 ×1', 'two-cpu-workers': 'CPU 부하 ×2', 'saturated-cpu': 'CPU 포화 부하', recovery: '부하 해제·회복' })[label] || label;
  const usesDefaultProfile = capture => capture.configProfile === 'isolated-vm-defaults';
  const cpuScope = capture => usesDefaultProfile(capture)
    ? `${capture.logicalCpus} vCPU Linux 게스트 전체`
    : `${capture.logicalCpus} 논리 CPU Linux VM 전체`;

  function render(projectId) {
    if (projectId !== '20') return '';
    return `<section class="project-log-demo" data-log-demo="20" aria-labelledby="log-demo-title">
      <header class="log-demo-heading"><div><span class="log-demo-indicator" aria-hidden="true"></span><h3 id="log-demo-title">진단 기록 재생</h3></div><span data-replay-environment>실측 데이터 재생</span></header>
      <div class="replay-loading" data-replay-loading>실측 기록을 불러오는 중입니다.</div>
      <div class="replay-error" data-replay-error hidden><p>실측 기록을 불러오지 못했습니다. 연결 상태를 확인하고 다시 시도해주세요.</p><button type="button" class="replay-retry" data-replay-action="retry">다시 불러오기</button></div>
      <div class="replay-body" data-replay-body hidden>
        <div class="replay-summary">
          <div class="replay-stat"><span class="replay-kicker" data-replay-cpu-label>CPU 사용률 · 보조 /proc 계측</span><strong class="replay-value"><span data-replay-cpu>—</span><small>%</small></strong><span class="replay-stat-note" data-replay-sample-note>첫 계측 대기</span></div>
          <div class="replay-stat replay-diagnostic"><span class="replay-kicker">기록된 Bullseye 진단 상태</span><strong class="replay-severity" data-replay-severity data-severity="WAITING">수집 대기</strong><span class="replay-stat-note" data-replay-state-note>첫 상태 파일 대기</span><span class="replay-recovery-note" data-replay-recovery-note hidden></span></div>
        </div>
        <figure class="replay-chart"><figcaption><span>CPU 사용률 <small>실측 샘플</small></span><span data-replay-chart-caption></span></figcaption><div data-replay-chart></div></figure>
        <div class="replay-phase-track" data-replay-phases role="group" aria-label="부하 테스트 단계 선택"></div>
        <div class="replay-controls"><button type="button" class="replay-toggle" data-replay-action="toggle">일시정지</button><button type="button" class="replay-restart" data-replay-action="restart">다시 재생 <span aria-hidden="true">↺</span></button><span class="replay-speed" data-replay-speed>4배속 재생</span></div>
        <div class="replay-scrubber"><input type="range" data-replay-range min="0" max="1" step="1" value="0" aria-label="실측 기록 재생 위치"><output class="replay-clock" data-replay-clock>00:00 / 00:00</output></div>
        <section class="replay-terminal" aria-labelledby="replay-terminal-title">
          <header><h4 id="replay-terminal-title"><span aria-hidden="true">&gt;_</span> 실행 로그</h4><span>실제 출력 · 타이핑 재생</span></header>
          <div class="replay-terminal-output" data-replay-terminal tabindex="0" role="region" aria-label="Bullseye 실제 실행 로그" aria-live="off"><p class="replay-terminal-wait" data-replay-log-wait>첫 로그를 기다리는 중<span aria-hidden="true"> ▌</span></p><ol data-replay-logs></ol></div>
          <p class="replay-terminal-note"><span>그래프와 같은 재생 위치를 따릅니다. 구간을 선택하면 그 시점까지의 로그를 표시합니다.</span><span data-replay-prelude-note hidden></span></p>
        </section>
        <div class="replay-record"><header><h4>상태 전환</h4><span>state.json 요약 · 근거는 전환 시점</span></header><ol class="replay-events" data-replay-events aria-label="실제로 관측한 진단 상태 전환"></ol><p class="replay-observation" data-replay-observation></p></div>
        <p class="replay-source-note"><span data-replay-source-scope></span> 진단 상태와 판단 근거는 Bullseye 상태 파일에서 가져왔으며, 실시간 서버에 연결되지 않습니다.<br><span data-replay-source-version></span></p>
        <details class="replay-provenance"><summary>수집 환경과 판정 기준</summary><dl class="replay-capture-facts" data-replay-facts></dl><p>전환 사이에는 마지막으로 기록된 진단 상태를 표시합니다. 수치 변화마다 새 진단이 발생한 것은 아닙니다. <span data-replay-provenance-note></span></p></details>
      </div>
      <p class="log-demo-sr-only" data-replay-status role="status" aria-live="polite" aria-atomic="true"></p>
    </section>`;
  }

  function validate(data) {
    if (data?.schemaVersion !== 1 || !finite(data.capture?.durationMs) || data.capture.durationMs <= 0
      || !Array.isArray(data.metrics) || !data.metrics.length || !Array.isArray(data.transitions) || !data.transitions.length
      || !Array.isArray(data.phases) || !Array.isArray(data.logs) || !data.logs.length) throw new Error('Invalid replay data');
    const duration = data.capture.durationMs;
    for (const list of [data.metrics, data.transitions, data.phases, data.logs]) {
      let previous = -1;
      for (const entry of list) {
        if (!finite(entry.atMs) || entry.atMs < previous || entry.atMs > duration) throw new Error('Invalid replay timeline');
        previous = entry.atMs;
      }
    }
    for (const sample of data.metrics) {
      if (sample.cpuUsagePct !== null && (!finite(sample.cpuUsagePct) || sample.cpuUsagePct < 0 || sample.cpuUsagePct > 100)) throw new Error('Invalid CPU sample');
    }
    for (const entry of data.transitions) {
      if (!['NORMAL', 'ELEVATED', 'HIGH', 'CRITICAL'].includes(entry.severity) || !Array.isArray(entry.evidence)) throw new Error('Invalid diagnostic state');
      for (const item of entry.evidence) if (!finite(item.value)) throw new Error('Invalid diagnostic evidence');
    }
    for (const entry of data.logs) {
      if (typeof entry.text !== 'string' || !entry.text.startsWith('[BULLSEYE] ')
        || !['ready', 'pressure', 'recovery', 'shutdown'].includes(entry.tone)) throw new Error('Invalid recorded log');
    }
    if (data.preludeLogs !== undefined) {
      if (!usesGradualWorkload(data.capture) || !Array.isArray(data.preludeLogs)) throw new Error('Invalid warmup logs');
      let previous = -Infinity;
      for (const entry of data.preludeLogs) {
        if (!finite(entry.atMs) || entry.atMs >= 0 || entry.atMs < previous || entry.tone !== 'ready'
          || typeof entry.text !== 'string' || !entry.text.startsWith('[BULLSEYE] ')) throw new Error('Invalid warmup log');
        previous = entry.atMs;
      }
    }
    return data;
  }

  function chartMarkup(data) {
    const left = 40, right = 700, top = 15, bottom = 145;
    const peak = Math.max(...data.metrics.map(sample => sample.cpuUsagePct || 0));
    const ceiling = usesDefaultProfile(data.capture) ? 100 : Math.max(10, Math.ceil(peak / 5) * 5);
    const x = at => left + at / data.capture.durationMs * (right - left);
    const y = value => bottom - value / ceiling * (bottom - top);
    let penDown = false;
    const path = data.metrics.map(sample => {
      if (!finite(sample.cpuUsagePct)) { penDown = false; return ''; }
      const point = `${penDown ? 'L' : 'M'}${x(sample.atMs).toFixed(2)},${y(sample.cpuUsagePct).toFixed(2)}`;
      penDown = true;
      return point;
    }).join(' ');
    const grid = [0, ceiling / 2, ceiling].map(value => `<line class="replay-gridline" x1="${left}" x2="${right}" y1="${y(value)}" y2="${y(value)}"/><text class="replay-axis-label" x="31" y="${y(value) + 3}" text-anchor="end">${value}%</text>`).join('');
    const axis = [0, .25, .5, .75, 1].map(fraction => `<text class="replay-axis-label" x="${x(fraction * data.capture.durationMs)}" y="169" text-anchor="${fraction === 0 ? 'start' : fraction === 1 ? 'end' : 'middle'}">${clock(fraction * data.capture.durationMs)}</text>`).join('');
    const threshold = data.capture.thresholds?.cpuElevatedPercent;
    const thresholdLabel = usesDefaultProfile(data.capture) ? '기본 ELEVATED 기준' : '설정된 ELEVATED 기준';
    const thresholdLine = finite(threshold) && threshold <= ceiling ? `<line class="replay-threshold" x1="${left}" x2="${right}" y1="${y(threshold)}" y2="${y(threshold)}"/><text class="replay-threshold-label" x="${right - 4}" y="${y(threshold) - 5}" text-anchor="end">${thresholdLabel} ${threshold}%</text>` : '';
    const criticalThreshold = data.capture.thresholds?.cpuCriticalPercent;
    const criticalLine = usesDefaultProfile(data.capture) && finite(criticalThreshold) && criticalThreshold > threshold && criticalThreshold <= ceiling
      ? `<line class="replay-threshold replay-threshold-critical" x1="${left}" x2="${right}" y1="${y(criticalThreshold)}" y2="${y(criticalThreshold)}"/><text class="replay-threshold-label replay-threshold-label-critical" x="${right - 4}" y="${y(criticalThreshold) - 5}" text-anchor="end">기본 CRITICAL 기준 ${criticalThreshold}%</text>`
      : '';
    const gradual = usesGradualWorkload(data.capture);
    const thresholdEntries = gradual ? [
      { severity: 'ELEVATED', percent: threshold, seconds: data.capture.thresholds?.cpuElevatedDurationSeconds },
      { severity: 'HIGH', percent: data.capture.thresholds?.cpuHighPercent, seconds: data.capture.thresholds?.cpuHighDurationSeconds },
      { severity: 'CRITICAL', percent: criticalThreshold, seconds: data.capture.thresholds?.cpuCriticalDurationSeconds },
    ].filter(entry => finite(entry.percent) && entry.percent >= 0 && entry.percent <= ceiling) : [];
    const gradualLines = thresholdEntries.map(entry => `<line class="replay-threshold replay-threshold-${entry.severity.toLowerCase()}" x1="${left}" x2="${right}" y1="${y(entry.percent)}" y2="${y(entry.percent)}"/>`).join('');
    const legend = gradual ? `<ul class="replay-threshold-legend" aria-label="기본 CPU 사용률 기준">${thresholdEntries.map(entry => `<li data-severity="${entry.severity}"><span aria-hidden="true"></span>${entry.severity} ${entry.percent}% · ${finite(entry.seconds) ? `${entry.seconds}초` : '—'}</li>`).join('')}</ul>` : '';
    const shades = data.phases.map((phase, index) => `<rect class="replay-phase-shade" x="${x(phase.atMs)}" y="${top}" width="${Math.max(0, x(data.phases[index + 1]?.atMs ?? data.capture.durationMs) - x(phase.atMs))}" height="${bottom - top}" opacity="${index % 2 ? '.04' : '.015'}"/>`).join('');
    return {
      x, y,
      html: `<svg class="replay-chart-svg" viewBox="0 0 720 180" role="img" aria-label="${escape(cpuScope(data.capture))}에서 계측한 CPU 사용률. 최대 ${peak.toFixed(2)}퍼센트. 밝은 선은 현재 재생 위치까지의 기록입니다."><defs><clipPath id="bullseye-replay-progress"><rect data-replay-clip x="${left}" y="0" width="0" height="180"/></clipPath></defs>${shades}${grid}${axis}${gradual ? gradualLines : thresholdLine + criticalLine}<path class="replay-line-background" d="${path}"/><path class="replay-line-played" clip-path="url(#bullseye-replay-progress)" d="${path}"/><line class="replay-cursor" data-replay-cursor x1="${left}" x2="${left}" y1="${top}" y2="${bottom}"/><circle class="replay-dot" data-replay-dot cx="${left}" cy="${bottom}" r="3.5" visibility="hidden"/></svg>${legend}`
    };
  }

  function mount(container, projectId) {
    if (projectId !== '20' || !container?.querySelector) return () => {};
    const selector = '.project-log-demo[data-log-demo="20"]';
    const panel = container.matches?.(selector) ? container : container.querySelector(selector);
    if (!panel) return () => {};
    mounted.get(panel)?.();
    const find = selector => panel.querySelector(selector);
    const body = find('[data-replay-body]');
    const loading = find('[data-replay-loading]');
    const error = find('[data-replay-error]');
    const status = find('[data-replay-status]');
    const toggle = find('[data-replay-action="toggle"]');
    const restart = find('[data-replay-action="restart"]');
    const range = find('[data-replay-range]');
    const elapsed = find('[data-replay-clock]');
    const cpu = find('[data-replay-cpu]');
    const sampleNote = find('[data-replay-sample-note]');
    const severity = find('[data-replay-severity]');
    const stateNote = find('[data-replay-state-note]');
    const recoveryNote = find('[data-replay-recovery-note]');
    const phases = find('[data-replay-phases]');
    const events = find('[data-replay-events]');
    const terminal = find('[data-replay-terminal]');
    const logList = find('[data-replay-logs]');
    const logWait = find('[data-replay-log-wait]');
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    // The page's motion toggle owns this visit's explicit playback preference.
    let reduced = window.portfolioMotion?.isReduced() ?? media.matches;
    let visible = !('IntersectionObserver' in window);
    let disposed = false;
    let userPaused = false;
    let data = null;
    let chart = null;
    let position = 0;
    let rafId = null;
    let lastWall = null;
    let lastPaint = 0;
    let fetchController = null;
    let observer = null;
    let currentStateIndex = -2;
    let lastSampleIndex = -2;
    let logRows = [];
    let instantLogsThrough = -1;

    function paintLogs(forceFollow = false) {
      const follow = forceFollow || terminal.scrollHeight - terminal.clientHeight - terminal.scrollTop < 36;
      let shown = 0;
      let changed = false;
      for (const item of logRows) {
        const available = position >= item.entry.atMs;
        const full = reduced || position >= data.capture.durationMs || (instantLogsThrough >= 0 && item.entry.atMs <= instantLogsThrough);
        const length = !available ? 0 : full ? item.entry.text.length : Math.min(item.entry.text.length, Math.max(0, Math.floor((position - item.typingStart) / 100)));
        if (length !== item.length) {
          item.text.textContent = item.entry.text.slice(0, length);
          item.row.hidden = length === 0;
          item.row.classList.toggle('is-typing', length > 0 && length < item.entry.text.length);
          item.length = length;
          changed = true;
        }
        if (length > 0) shown++;
      }
      logWait.hidden = shown > 0;
      if (follow && (changed || forceFollow)) terminal.scrollTop = terminal.scrollHeight;
    }

    function running() {
      return !disposed && data && !reduced && !userPaused && visible && !document.hidden && position < data.capture.durationMs;
    }

    function cancelFrame() {
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = null;
      lastWall = null;
    }

    function syncControls() {
      const complete = data && position >= data.capture.durationMs;
      toggle.disabled = !data || reduced;
      toggle.textContent = complete ? '처음부터 재생' : userPaused ? '재생' : '일시정지';
      toggle.setAttribute('aria-pressed', String(Boolean(data && !userPaused && !complete && !reduced)));
      restart.textContent = reduced ? '처음으로 ↺' : '다시 재생 ↺';
      find('[data-replay-speed]').textContent = reduced ? '모션 줄임 · 위치를 직접 선택하세요' : complete ? '재생 완료 · 4배속' : '4배속 재생';
      panel.classList.toggle('is-playing', Boolean(running()));
      panel.classList.toggle('is-complete', Boolean(complete));
    }

    function paint(announce = false, followLogs = false) {
      if (!data || !chart || disposed) return;
      let sampleIndex = -1;
      for (let index = 0; index < data.metrics.length && data.metrics[index].atMs <= position; index++) sampleIndex = index;
      const sample = data.metrics[sampleIndex];
      if (sampleIndex !== lastSampleIndex) {
        cpu.textContent = percent(sample?.cpuUsagePct);
        sampleNote.textContent = sample ? `계측 시점 ${clock(sample.atMs, true)} · CPU PSI ${percent(sample.psiCpuSomeAvg10)}%` : '첫 계측 대기';
        lastSampleIndex = sampleIndex;
      }
      let stateIndex = -1;
      for (let index = 0; index < data.transitions.length && data.transitions[index].atMs <= position; index++) stateIndex = index;
      if (stateIndex !== currentStateIndex) {
        const transition = data.transitions[stateIndex];
        severity.textContent = transition?.severity || '수집 대기';
        severity.dataset.severity = transition?.severity || 'WAITING';
        stateNote.textContent = transition ? `마지막 전환 ${clock(transition.atMs, true)} · v${transition.version}` : '첫 상태 파일 대기';
        currentStateIndex = stateIndex;
      }
      [...events.children].forEach((row, index) => {
        row.classList.toggle('is-current', index === stateIndex);
        row.classList.toggle('is-future', data.transitions[index].atMs > position);
        row.querySelector('button').setAttribute('aria-current', index === stateIndex ? 'step' : 'false');
      });
      let phaseIndex = -1;
      data.phases.forEach((phase, index) => { if (phase.atMs <= position) phaseIndex = index; });
      const currentSeverity = data.transitions[stateIndex]?.severity;
      const recoveryPending = usesGradualWorkload(data.capture) && ['ramp-down', 'recovery'].includes(data.phases[phaseIndex]?.label)
        && currentSeverity && currentSeverity !== 'NORMAL';
      recoveryNote.hidden = !recoveryPending;
      recoveryNote.textContent = recoveryPending ? `부하 감소 · 정상화 확인 중. 복구 조건을 충족할 때까지 ${currentSeverity} 상태를 유지합니다.` : '';
      [...phases.children].forEach((button, index) => {
        button.classList.toggle('is-active', phaseIndex === index);
        button.setAttribute('aria-pressed', String(phaseIndex === index));
      });
      const ratio = position / data.capture.durationMs;
      range.value = String(position);
      range.style.setProperty('--replay-progress', `${ratio * 100}%`);
      range.setAttribute('aria-valuetext', `${clock(position)} / ${clock(data.capture.durationMs)}`);
      elapsed.textContent = `${clock(position, true)} / ${clock(data.capture.durationMs, true)}`;
      find('[data-replay-clip]').setAttribute('width', String(Math.max(0, chart.x(position) - chart.x(0))));
      const cursor = find('[data-replay-cursor]');
      cursor.setAttribute('x1', String(chart.x(position)));
      cursor.setAttribute('x2', String(chart.x(position)));
      const dot = find('[data-replay-dot]');
      dot.setAttribute('visibility', finite(sample?.cpuUsagePct) ? 'visible' : 'hidden');
      if (finite(sample?.cpuUsagePct)) {
        dot.setAttribute('cx', String(chart.x(sample.atMs)));
        dot.setAttribute('cy', String(chart.y(sample.cpuUsagePct)));
      }
      paintLogs(followLogs);
      if (announce) status.textContent = `${clock(position)} 위치. ${data.transitions[stateIndex]?.severity || '첫 상태 파일 수집 대기'}.${recoveryPending ? ' 부하 감소, 정상화 확인 중.' : ''}`;
    }

    function frame(now) {
      rafId = null;
      if (!running()) { lastWall = null; syncControls(); return; }
      if (lastWall !== null) position = Math.min(data.capture.durationMs, position + Math.min(now - lastWall, 1000) * speed);
      lastWall = now;
      if (now - lastPaint >= 50 || position >= data.capture.durationMs) { paint(); lastPaint = now; }
      if (position >= data.capture.durationMs) {
        userPaused = true;
        lastWall = null;
        syncControls();
        status.textContent = `실측 기록 재생이 완료됐습니다. 마지막으로 기록된 진단 상태는 ${data.transitions[data.transitions.length - 1].severity}입니다.`;
      } else rafId = requestAnimationFrame(frame);
    }

    function schedule() {
      cancelFrame();
      syncControls();
      if (running()) rafId = requestAnimationFrame(frame);
    }

    function seek(value, announce = true) {
      if (!data || disposed) return;
      position = Math.min(data.capture.durationMs, Math.max(0, value));
      userPaused = true;
      instantLogsThrough = position;
      paint(announce, true);
      schedule();
    }

    function populate() {
      const capture = data.capture;
      const thresholds = capture.thresholds || {};
      const defaultProfile = usesDefaultProfile(capture);
      const gradual = usesGradualWorkload(capture);
      find('[data-replay-environment]').textContent = defaultProfile
        ? `실측 데이터 재생 · 격리 Linux VM ${capture.logicalCpus} vCPU`
        : `실측 데이터 재생 · ${capture.environment}`;
      find('[data-replay-cpu-label]').textContent = `CPU 사용률 · ${cpuScope(capture)}`;
      find('[data-replay-source-scope]').textContent = `CPU 곡선은 ${cpuScope(capture)}의 /proc를 별도로 계측한 기록입니다.`;
      chart = chartMarkup(data);
      find('[data-replay-chart]').innerHTML = chart.html;
      find('[data-replay-chart-caption]').textContent = `${(capture.durationMs / 1000).toFixed(1)}초 기록 · ${data.metrics.length}개 샘플`;
      phases.classList.toggle('is-gradual', gradual);
      phases.innerHTML = data.phases.map((phase, index) => `<button type="button" class="replay-phase" data-replay-phase="${index}" aria-pressed="false"><span>${clock(phase.atMs)}</span><strong>${escape(phaseLabel(phase.label, capture))}</strong></button>`).join('');
      events.innerHTML = data.transitions.map((transition, index) => {
        const previous = data.transitions[index - 1];
        const title = previous ? `${previous.severity} → ${transition.severity}` : `초기 상태 · ${transition.severity}`;
        const usage = evidenceValue(transition, 'usage');
        const psi = evidenceValue(transition, 'psi.some.avg10');
        const duration = evidenceValue(transition, 'duration');
        const trend = evidenceValue(transition, 'trend');
        const evidence = [finite(usage) ? `CPU ${percent(usage)}%` : '', finite(psi) ? `PSI some ${percent(psi)}%` : '', finite(trend) ? `상승 ${trend >= 0 ? '+' : ''}${trend.toFixed(2)}pp/${duration}초` : finite(duration) ? `지속 ${duration}초` : ''].filter(Boolean).join(' · ') || '초기 상태 파일';
        return `<li data-severity="${escape(transition.severity)}"><button type="button" class="replay-event" data-replay-event="${index}" aria-current="false"><time>${clock(transition.atMs, true)}</time><span class="replay-event-copy"><strong>${escape(title)}</strong><small>${escape(evidence)}</small></span><span class="replay-event-version">v${escape(transition.version)}</span></button></li>`;
      }).join('');
      let typingEnd = 0;
      logList.replaceChildren();
      const preludeLogs = gradual ? (data.preludeLogs || []) : [];
      const timelineLogs = [...preludeLogs.map(entry => ({ ...entry, prelude: true })), ...data.logs];
      const preludeNote = find('[data-replay-prelude-note]');
      preludeNote.hidden = preludeLogs.length === 0;
      preludeNote.textContent = preludeLogs.length
        ? ` ‘예열’ ${preludeLogs.length}줄은 그래프 기록을 시작하기 전 에이전트의 실제 출력입니다. 그래프는 예열 후의 부하 구간을 보여줍니다.`
        : '';
      logRows = timelineLogs.map(entry => {
        const row = document.createElement('li');
        row.className = `replay-terminal-line replay-terminal-${entry.tone}`;
        const loggedSeverity = entry.text.match(/\bcurrent=(ELEVATED|HIGH|CRITICAL)\b/);
        if (loggedSeverity) row.dataset.severity = loggedSeverity[1];
        row.hidden = true;
        const timing = entry.prelude ? `재생 시작 ${(-entry.atMs / 1000).toFixed(1)}초 전` : clock(entry.atMs, true);
        row.setAttribute('aria-label', `${timing} ${entry.text}`);
        const time = document.createElement('time');
        time.textContent = entry.prelude ? '예열' : clock(entry.atMs, true);
        if (entry.prelude) time.title = timing;
        time.setAttribute('aria-hidden', 'true');
        const text = document.createElement('span');
        text.setAttribute('aria-hidden', 'true');
        row.append(time, text);
        logList.append(row);
        const typingStart = Math.max(entry.atMs, typingEnd);
        typingEnd = typingStart + entry.text.length * 100;
        return { entry, row, text, typingStart, length: 0 };
      });
      instantLogsThrough = -1;
      const noHigh = !data.transitions.some(transition => ['HIGH', 'CRITICAL'].includes(transition.severity));
      const recoveryPhase = data.phases.find(phase => phase.label === 'recovery');
      const pressureIndex = data.transitions.findIndex(transition => transition.severity !== 'NORMAL');
      const recovered = pressureIndex >= 0 && recoveryPhase && data.transitions.some((transition, index) =>
        index > pressureIndex && transition.severity === 'NORMAL' && transition.atMs >= recoveryPhase.atMs);
      const psiSamples = data.metrics.map(sample => sample.psiCpuSomeAvg10).filter(finite);
      const corroboration = thresholds.cpuPsiCorroborationPercent;
      const observations = [];
      if (recovered) observations.push(gradual ? '부하 증가에 따른 진단 상승과, 부하를 평시 수준으로 낮춘 뒤 NORMAL 복귀가 실제 상태 파일에 기록됐습니다.' : '진단 상승과 부하 해제 후 NORMAL 복귀가 실제 상태 파일에 기록됐습니다.');
      if (gradual) observations.push('하강 구간에서는 중간 등급으로 낮추지 않고 복구 조건을 충족할 때까지 마지막 등급을 유지합니다.');
      if (noHigh && psiSamples.length && finite(corroboration) && Math.max(...psiSamples) < corroboration) {
        observations.push(`HIGH 전환은 관측되지 않았고, CPU PSI는 보강 기준(${corroboration}%)보다 낮았습니다.`);
      }
      find('[data-replay-observation]').textContent = observations.join(' ') || '표시된 상태 전환과 판단 근거는 이 실행에서 실제로 기록된 값입니다.';
      find('[data-replay-source-version]').textContent = `${defaultProfile ? '기본 CPU 진단 임계값을 변경하지 않고 수집했습니다.' : '수집용으로 변경한 CPU 진단 임계값을 사용했습니다.'} ${capture.agentWorkingTreeDirty ? '에이전트는 미커밋 변경을 포함한 로컬 개발 버전입니다.' : '에이전트는 아래 소스 기준 버전으로 실행했습니다.'}`;
      find('[data-replay-provenance-note]').textContent = defaultProfile
        ? `${gradual ? 'CPU 작업의 실행 비율을 조절한 부하 시나리오입니다. 실제 서비스의 HTTP 요청량을 재현한 것은 아닙니다. ' : ''}QEMU TCG로 격리한 Linux 게스트의 부하·복구 실험이며, 물리 서버의 성능·용량 벤치마크는 아닙니다.`
        : '수집용 임계값을 사용한 기록이며 운영 환경의 성능·용량 벤치마크는 아닙니다.';
      const limits = capture.limits || {};
      const loadRange = defaultProfile
        ? `게스트 안에서 최대 ${limits.workerCountMax ?? '—'}개 작업 · VM 메모리 ${limits.vmMemoryMb ?? '—'} MiB`
        : `최대 ${limits.workerCountMax ?? '—'}개 worker · 각각 ${limits.workerCpusEach ?? '—'} CPU / ${limits.workerMemoryMbEach ?? '—'} MiB 제한`;
      const facts = [
        ['환경', `${capture.environment} · ${capture.logicalCpus} ${defaultProfile ? 'vCPU' : '논리 CPU'}`],
        ['부하 범위', loadRange],
        ['계측과 진단', `그래프는 약 1초 간격의 별도 /proc 계측 · 에이전트는 ${thresholds.samplingIntervalSeconds ?? '—'}초 간격으로 수집·판단`],
        [defaultProfile ? '기본 CPU 기준' : '수집용 CPU 기준', `ELEVATED ${thresholds.cpuElevatedPercent ?? '—'}% / ${thresholds.cpuElevatedDurationSeconds ?? '—'}초 · HIGH ${thresholds.cpuHighPercent ?? '—'}% / ${thresholds.cpuHighDurationSeconds ?? '—'}초 · CRITICAL ${thresholds.cpuCriticalPercent ?? '—'}% / ${thresholds.cpuCriticalDurationSeconds ?? '—'}초`],
        ['PSI 보강 기준', `CPU PSI some ${thresholds.cpuPsiCorroborationPercent ?? '—'}%`],
        ['NORMAL 복귀 기준', `CPU ${thresholds.cpuRecoveryPercent ?? '—'}% 이하와 CPU PSI some ${thresholds.cpuPsiRecoveryPercent ?? '—'}% 이하를 각각 ${thresholds.cpuRecoveryDurationSeconds ?? '—'}초 유지`],
        ['소스 기준', `${capture.agentRevision?.slice(0, 7) || '미기록'}${capture.agentWorkingTreeDirty ? ' · 미커밋 변경 포함' : ''}`],
      ];
      find('[data-replay-facts]').innerHTML = facts.map(([label, value]) => `<div><dt>${escape(label)}</dt><dd>${escape(value)}</dd></div>`).join('');
      range.max = String(capture.durationMs);
      position = reduced ? capture.durationMs : 0;
      userPaused = Boolean(reduced);
      currentStateIndex = -2;
      lastSampleIndex = -2;
      body.hidden = false;
      loading.hidden = true;
      error.hidden = true;
      paint();
      schedule();
    }

    async function load() {
      if (disposed) return;
      fetchController?.abort();
      fetchController = new AbortController();
      const controller = fetchController;
      loading.hidden = false;
      error.hidden = true;
      body.hidden = true;
      status.textContent = '';
      try {
        const response = await fetch(dataUrl, { signal: controller.signal, cache: 'no-cache' });
        if (!response.ok) throw new Error('Replay request failed');
        const payload = validate(await response.json());
        if (disposed || controller !== fetchController) return;
        data = payload;
        populate();
      } catch (failure) {
        if (disposed || controller.signal.aborted || controller !== fetchController) return;
        data = null;
        cancelFrame();
        loading.hidden = true;
        error.hidden = false;
        status.textContent = '실측 기록을 불러오지 못했습니다. 다시 불러오기 버튼으로 재시도할 수 있습니다.';
      }
    }

    function onClick(event) {
      const button = event.target.closest('button');
      if (!button || !panel.contains(button) || disposed) return;
      if (button.dataset.replayAction === 'retry') { load(); return; }
      if (!data) return;
      if (button.dataset.replayPhase !== undefined) { seek(data.phases[Number(button.dataset.replayPhase)].atMs); return; }
      if (button.dataset.replayEvent !== undefined) { seek(data.transitions[Number(button.dataset.replayEvent)].atMs); return; }
      if (button.dataset.replayAction === 'restart') {
        position = 0;
        instantLogsThrough = -1;
        userPaused = Boolean(reduced);
        paint(true, true);
        schedule();
      } else if (button.dataset.replayAction === 'toggle' && !reduced) {
        if (position >= data.capture.durationMs) { position = 0; instantLogsThrough = -1; userPaused = false; paint(false, true); }
        else userPaused = !userPaused;
        status.textContent = userPaused ? '실측 기록 재생을 일시정지했습니다.' : '실측 기록을 4배속으로 재생합니다.';
        schedule();
      }
    }

    function onRangeInput() { seek(Number(range.value), false); }
    function onRangeChange() { paint(true); }
    function onMotionChange(event) {
      const requested = typeof event.detail?.reduced === 'boolean' ? event.detail.reduced : window.portfolioMotion?.isReduced();
      reduced = requested ?? media.matches;
      if (reduced && data) { position = data.capture.durationMs; userPaused = true; paint(); }
      schedule();
    }

    panel.addEventListener('click', onClick);
    range.addEventListener('input', onRangeInput);
    range.addEventListener('change', onRangeChange);
    window.addEventListener('portfolio-motion-change', onMotionChange);
    media.addEventListener('change', onMotionChange);
    document.addEventListener('visibilitychange', schedule);
    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver(entries => {
        visible = entries[entries.length - 1].isIntersecting;
        schedule();
      }, { root: panel.closest('dialog'), rootMargin: '-60px 0px 0px', threshold: 0 });
      observer.observe(panel);
    }
    load();

    const cleanup = () => {
      if (disposed) return;
      disposed = true;
      cancelFrame();
      fetchController?.abort();
      observer?.disconnect();
      panel.removeEventListener('click', onClick);
      range.removeEventListener('input', onRangeInput);
      range.removeEventListener('change', onRangeChange);
      window.removeEventListener('portfolio-motion-change', onMotionChange);
      media.removeEventListener('change', onMotionChange);
      document.removeEventListener('visibilitychange', schedule);
      panel.classList.remove('is-playing');
      mounted.delete(panel);
    };
    mounted.set(panel, cleanup);
    return cleanup;
  }

  window.portfolioLogDemo = { render, mount };
})();
