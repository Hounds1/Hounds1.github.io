(() => {
  'use strict';
  const mounted = new WeakMap();
  const epoch = Date.UTC(2026, 10, 22);
  const runId = '974f2bea-2972-4e48-a954-b671e78fe729';
  const steps = [
    {
      title: '현재 진단', label: 'STATE · v12', detail: '대표 상태와 자원별 상태',
      status: '대표 진단은 메모리 HIGH입니다. resources에는 CPU·메모리·I/O의 상태와 각 상태가 시작된 since를 따로 보관합니다.',
      change: '대표 MEMORY · HIGH / CPU와 I/O는 NORMAL',
      codeLabel: '로컬 상태 파일 · 주요 필드', stage: 0
    },
    {
      title: '새 관측 반영', label: 'STATE · v12', detail: '값은 바뀌고 버전은 유지',
      status: '5초 뒤 메모리 사용률이 88.1%에서 87.6%로 바뀌어도 진단 결과가 같으면 v12를 유지합니다. evaluatedAt과 observations는 새 평가를 반영하며, 완성된 임시 파일을 원자적으로 교체합니다.',
      change: '관측값 갱신 · version 12 유지 · since 유지',
      codeLabel: '새 평가를 반영한 로컬 파일', stage: 0
    },
    {
      title: '보조 자원 전환', label: 'STATE · v13', detail: 'CPU 변화도 버전에 반영',
      status: 'CPU가 NORMAL에서 ELEVATED로 바뀌면 대표 진단이 여전히 메모리 HIGH여도 v13이 됩니다. 대표 상태의 since는 유지하고, CPU의 since만 이번 전환 시각으로 바꿉니다.',
      change: 'version 12 → 13 · CPU since 갱신 · 대표 since 유지',
      codeLabel: '자원별 전환을 반영한 로컬 파일', stage: 0
    },
    {
      title: '스냅샷 전송', label: 'SEND · #43', detail: '진단 버전과 전송 순서 분리',
      status: '전송을 켜면 승인된 연결을 통해 UOG의 수신 모듈(TCC)에 스냅샷을 보냅니다. 앞선 두 평가도 전송했다는 예시에서 sequence는 41 → 42 → 43, 진단 version은 12 → 12 → 13입니다. 같은 전송 건의 재시도에는 동일한 sequence와 내용을 사용합니다.',
      change: 'nodeId + runId + sequence로 전송 건 식별',
      codeLabel: 'TCC v1 전송 봉투 · snapshot 일부', stage: 1
    },
    {
      title: '저장 후 응답', label: 'ACK · ACCEPTED', detail: '수신 저장과 장기 보관 분리',
      status: '수신 모듈(TCC)이 최신 상태를 로컬에 저장한 뒤 ACCEPTED를 응답합니다. 장기 보관은 별도 모듈(AMC)이 맡습니다. 보관소가 실패해도 로컬 저장이 가능한 동안 미전달 데이터를 남기고 다시 전달합니다.',
      change: 'ACCEPTED = 최신 상태 저장 완료 · AMC 보관 완료와는 별개',
      codeLabel: 'UOG가 수신한 전송 건 · 주요 필드', stage: 2
    }
  ];
  const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

  // Illustrative values, selected fields only. These are not captured telemetry.
  function snapshot(index) {
    const evaluation = Math.min(index, 2);
    const evaluatedAt = epoch + 10000 + evaluation * 5000;
    return {
      severity: 'HIGH', resource: 'HOST_MEMORY', version: evaluation < 2 ? 12 : 13,
      since: epoch, evaluatedAt, wallClockAt: evaluatedAt,
      resources: {
        HOST_CPU: { severity: evaluation < 2 ? 'NORMAL' : 'ELEVATED', since: evaluation < 2 ? epoch - 30000 : evaluatedAt },
        HOST_MEMORY: { severity: 'HIGH', since: epoch },
        DISK_IO: { severity: 'NORMAL', since: epoch - 30000 }
      },
      observationStatus: 'FRESH',
      observations: {
        HOST_MEMORY: {
          status: 'FRESH', lastSampleAt: evaluatedAt,
          metrics: [{ metric: 'HOST_MEMORY_USAGE', value: [88.1, 87.6, 87.3][evaluation], unit: '%' }]
        }
      }
    };
  }
  function codeFor(index) {
    const state = snapshot(index);
    const selected = index < 3 ? state : {
      schemaVersion: 1, nodeId: 'demo-node', runId, sequence: 43,
      snapshot: {
        version: state.version, severity: state.severity, resource: state.resource,
        since: state.since, evaluatedAt: state.evaluatedAt, wallClockAt: state.wallClockAt,
        resources: state.resources
      }
    };
    return JSON.stringify(selected, null, 2);
  }

  function render(projectId, caseIndex, caseStudy) {
    if (projectId !== '20' || caseStudy?.demo !== 'state') return '';
    return `<section class="project-state-demo" data-state-demo="20" aria-labelledby="state-demo-title">
      <header class="state-demo-heading"><div><span class="state-demo-eyebrow">SNAPSHOT TO DELIVERY</span><h5 id="state-demo-title">하나의 진단이 전달되는 과정</h5></div><button type="button" class="state-demo-play" data-state-play aria-pressed="false">흐름 재생</button></header>
      <div class="state-demo-steps" role="group" aria-label="스냅샷 전달 단계 선택">${steps.map((step, index) => `<button type="button" class="state-demo-step${index === 0 ? ' is-active' : ''}" data-state-step="${index}" aria-pressed="${index === 0}" aria-controls="state-demo-body"><span class="state-demo-step-label">${escape(step.label)}</span><strong>${escape(step.title)}</strong><small>${escape(step.detail)}</small></button>`).join('')}</div>
      <div class="state-demo-body" id="state-demo-body">
        <div class="state-demo-route" aria-label="Core 진단, 스냅샷 전송, UOG 수신과 보관"><span class="is-active" data-state-stage="0">Core · 진단</span><i aria-hidden="true">→</i><span data-state-stage="1">스냅샷 전송</span><i aria-hidden="true">→</i><span data-state-stage="2">UOG · 수신·보관</span></div>
        <p class="state-demo-status" data-state-status role="status" aria-live="polite" aria-atomic="true">${escape(steps[0].status)}</p>
        <p class="state-demo-change" data-state-change>${escape(steps[0].change)}</p>
        <div class="state-demo-resources" aria-label="예시 스냅샷의 자원별 진단"><span>Memory <strong>HIGH</strong></span><span>CPU <strong data-state-cpu>NORMAL</strong></span><span>I/O <strong>NORMAL</strong></span><span class="state-demo-version" data-state-version>version 12</span></div>
        <details class="state-demo-preview"><summary>JSON 주요 필드 보기 <span data-state-code-label>${escape(steps[0].codeLabel)}</span></summary><pre class="state-demo-code" tabindex="0" aria-label="현재 단계의 JSON 예시"><code>${escape(codeFor(0))}</code></pre></details>
      </div>
      <details class="state-demo-clock"><summary>평가 시각과 실제 시각을 나눈 이유</summary><p><code>evaluatedAt</code>·<code>since</code>는 시작 시각에 단조 증가하는 경과 시간을 더한 진단 시간축입니다. 시스템 시계가 보정돼도 지속 시간 계산이 흔들리지 않습니다. <code>wallClockAt</code>은 수집 당시 실제 UTC 시각을 별도로 남깁니다.</p><p>읽는 쪽은 <code>evaluatedAt</code>의 갱신이 멈췄는지 자신의 단조 시계로 시간을 재야 합니다. 현재 벽시계와 값을 단순히 빼서 최신성을 판단하지 않습니다. 에이전트가 종료돼도 마지막 파일의 <code>FRESH</code> 표시는 남을 수 있습니다.</p></details>
      <p class="state-demo-note">스냅샷의 주요 필드를 발췌한 설명용 예시입니다. Core와 서버 양쪽에서 전송을 허용해야 동작하며, 대기 중 새 상태가 들어오면 최신 상태를 우선합니다.</p>
    </section>`;
  }

  function mount(container, projectId) {
    if (projectId !== '20' || !container?.querySelector) return () => {};
    const selector = '.project-state-demo[data-state-demo="20"]';
    const panel = container.matches?.(selector) ? container : container.querySelector(selector);
    if (!panel) return () => {};
    mounted.get(panel)?.();
    const buttons = [...panel.querySelectorAll('[data-state-step]')];
    const playButton = panel.querySelector('[data-state-play]');
    const codeLabel = panel.querySelector('[data-state-code-label]');
    const code = panel.querySelector('.state-demo-code code');
    const status = panel.querySelector('[data-state-status]');
    const change = panel.querySelector('[data-state-change]');
    const cpu = panel.querySelector('[data-state-cpu]');
    const version = panel.querySelector('[data-state-version]');
    const route = [...panel.querySelectorAll('[data-state-stage]')];
    let selected = 0;
    let playing = false;
    let reduced = Boolean(window.portfolioMotion?.isReduced());
    let visible = !('IntersectionObserver' in window);
    let disposed = false;
    let timer = null;
    let observer;
    function cancelTick() {
      if (timer !== null) clearTimeout(timer);
      timer = null;
    }
    function syncControls() {
      panel.classList.toggle('is-playing', playing && visible && !document.hidden && !reduced);
      panel.classList.toggle('state-motion-reduced', reduced);
      playButton.setAttribute('aria-pressed', String(playing));
      playButton.textContent = reduced ? '다음 단계' : playing ? '일시정지' : selected === steps.length - 1 ? '다시 재생' : '흐름 재생';
    }
    function selectStep(index) {
      if (!Number.isInteger(index) || index < 0 || index >= steps.length) return;
      selected = index;
      buttons.forEach((button, buttonIndex) => {
        button.setAttribute('aria-pressed', String(buttonIndex === index));
        button.classList.toggle('is-active', buttonIndex === index);
        button.classList.toggle('is-done', buttonIndex < index);
      });
      route.forEach((item, itemIndex) => item.classList.toggle('is-active', itemIndex === steps[index].stage));
      cpu.textContent = index < 2 ? 'NORMAL' : 'ELEVATED';
      cpu.classList.toggle('is-elevated', index >= 2);
      version.textContent = `version ${index < 2 ? 12 : 13}`;
      codeLabel.textContent = steps[index].codeLabel;
      code.textContent = codeFor(index);
      status.textContent = steps[index].status;
      change.textContent = steps[index].change;
      syncControls();
    }
    function finish() {
      cancelTick();
      playing = false;
      syncControls();
    }
    function schedule() {
      cancelTick();
      syncControls();
      if (!disposed && playing && visible && !document.hidden && !reduced) timer = setTimeout(tick, 3600);
    }
    function tick() {
      timer = null;
      if (disposed || !playing) return;
      if (!visible || document.hidden) { schedule(); return; }
      if (selected === steps.length - 1) { finish(); return; }
      selectStep(selected + 1);
      if (selected === steps.length - 1) finish();
      else schedule();
    }
    function onStepClick(event) {
      const button = event.target.closest('[data-state-step]');
      if (!button || !panel.contains(button) || disposed) return;
      finish();
      selectStep(Number(button.dataset.stateStep));
    }
    function onPlay() {
      if (disposed) return;
      if (playing) { finish(); return; }
      if (reduced) { selectStep((selected + 1) % steps.length); return; }
      if (selected === steps.length - 1) selectStep(0);
      playing = true;
      schedule();
    }
    function onMotionChange(event) {
      reduced = typeof event.detail?.reduced === 'boolean' ? event.detail.reduced : Boolean(window.portfolioMotion?.isReduced());
      if (reduced) finish();
      else schedule();
    }
    panel.addEventListener('click', onStepClick);
    playButton.addEventListener('click', onPlay);
    document.addEventListener('visibilitychange', schedule);
    window.addEventListener('portfolio-motion-change', onMotionChange);
    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver(entries => {
        visible = entries[entries.length - 1].isIntersecting;
        schedule();
      }, { root: panel.closest('dialog'), rootMargin: '-60px 0px 0px', threshold: 0 });
      observer.observe(panel);
    }
    syncControls();
    const cleanup = () => {
      if (disposed) return;
      disposed = true;
      playing = false;
      cancelTick();
      observer?.disconnect();
      panel.removeEventListener('click', onStepClick);
      playButton.removeEventListener('click', onPlay);
      document.removeEventListener('visibilitychange', schedule);
      window.removeEventListener('portfolio-motion-change', onMotionChange);
      panel.classList.remove('is-playing');
      mounted.delete(panel);
    };
    mounted.set(panel, cleanup);
    return cleanup;
  }
  window.portfolioStateDemo = { render, mount };
})();
