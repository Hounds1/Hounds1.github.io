(() => {
  'use strict';

  const mounted = new WeakMap();
  const steps = [
    { title: '진단 상태 준비', detail: '현재 진단 결과를 JSON으로 구성', status: '발행할 v12를 준비합니다. 현재 파일은 아직 예시 버전 v11입니다.' },
    { title: '임시 파일 write / flush', detail: '같은 디렉터리의 임시 파일에 완성', status: '임시 형제 파일에 JSON을 쓰고 flush합니다. 현재 state.json은 계속 v11입니다.' },
    { title: 'state.json 원자적 교체', detail: '완성한 임시 파일을 현재 파일로 이동', status: '완성된 임시 파일로 state.json을 원자적으로 교체했습니다. 이제 현재 파일은 v12입니다.' },
    { title: '외부 소비자 · 읽기 예시', detail: '완성된 로컬 스냅샷을 읽는 쪽의 예시', status: '읽는 쪽의 예시입니다. 외부 도구는 교체된 로컬 state.json에서 완성된 v12 스냅샷을 읽을 수 있습니다.' }
  ];
  // Selected fields from the README's State output example; v11 below is illustrative.
  const snapshot = {
    host: 'was-01',
    severity: 'HIGH',
    resource: 'HOST_MEMORY',
    state: 'SATURATION_RISK',
    primaryWorkload: 'order-api.service',
    evidence: [
      { metric: 'usage', value: 88.1, unit: '%' },
      { metric: 'psi.some.avg10', value: 24.3, unit: '%' }
    ],
    version: 12
  };
  const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const json = `{
  "host": "${snapshot.host}",
  "severity": "${snapshot.severity}",
  "resource": "${snapshot.resource}",
  "state": "${snapshot.state}",
  "primaryWorkload": "${snapshot.primaryWorkload}",
  "evidence": [
    {"metric": "usage", "value": 88.1, "unit": "%"},
    {"metric": "psi.some.avg10", "value": 24.3, "unit": "%"}
  ],
  "version": ${snapshot.version}
}`;

  function render(projectId, caseIndex) {
    if (projectId !== '20' || caseIndex !== 2) return '';
    return `<section class="project-state-demo" data-state-demo="20" aria-labelledby="state-demo-title">
      <header class="state-demo-heading"><div><h5 id="state-demo-title">JSON 발행 흐름</h5><span>로컬 파일 · 설명용 예시</span></div><button type="button" class="state-demo-play" data-state-play>발행 흐름 재생 <span aria-hidden="true">▶</span></button></header>
      <div class="state-demo-layout">
        <div class="state-demo-steps" role="group" aria-label="JSON 발행 단계 선택">${steps.map((step, index) => `<button type="button" class="state-demo-step${index === 0 ? ' is-active' : ''}" data-state-step="${index}" aria-pressed="${index === 0}"><span class="state-demo-number" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span><span><strong>${escape(step.title)}</strong><small>${escape(step.detail)}</small></span></button>`).join('')}</div>
        <div class="state-demo-preview"><div class="state-demo-code-label"><span data-state-code-label>발행할 JSON · v12</span><span>README 발췌</span></div><pre class="state-demo-code" aria-label="발행할 JSON 예시"><code>${escape(json)}</code></pre></div>
      </div>
      <div class="state-demo-file" data-state-file><div><span>현재 파일 · 기본 경로</span><code>/run/bullseye/state.json</code></div><span class="state-demo-version" data-state-version>v11 <small>이전 값 예시</small></span></div>
      <p class="state-demo-status" data-state-status role="status" aria-live="polite" aria-atomic="true">${escape(steps[0].status)}</p>
      <p class="state-demo-note">버전은 등급·주요 자원·자원 상태·주요 워크로드가 바뀔 때 증가합니다. 이전 v11과 외부 소비자는 흐름 설명을 위한 예시입니다.</p>
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
    const file = panel.querySelector('[data-state-file]');
    const version = panel.querySelector('[data-state-version]');
    const codeLabel = panel.querySelector('[data-state-code-label]');
    const status = panel.querySelector('[data-state-status]');
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
      playButton.setAttribute('aria-disabled', String(playing));
      playButton.innerHTML = playing ? '재생 중 <span aria-hidden="true">·</span>' : '발행 흐름 재생 <span aria-hidden="true">▶</span>';
    }

    function selectStep(index) {
      selected = index;
      buttons.forEach((button, buttonIndex) => {
        button.setAttribute('aria-pressed', String(buttonIndex === index));
        button.classList.toggle('is-active', buttonIndex === index);
        button.classList.toggle('is-done', buttonIndex < index);
      });
      const published = index >= 2;
      file.classList.toggle('is-published', published);
      version.innerHTML = published ? 'v12 <small>교체된 스냅샷</small>' : 'v11 <small>이전 값 예시</small>';
      codeLabel.textContent = published ? '교체된 JSON · v12' : '발행할 JSON · v12';
      status.textContent = steps[index].status;
    }

    function finish() {
      cancelTick();
      playing = false;
      syncControls();
    }

    function schedule() {
      cancelTick();
      syncControls();
      if (!disposed && playing && visible && !document.hidden && !reduced) timer = setTimeout(tick, 1100);
    }

    function tick() {
      timer = null;
      if (disposed || !playing) return;
      if (!visible || document.hidden) { schedule(); return; }
      if (selected === steps.length - 1) { finish(); return; }
      selectStep(selected + 1);
      schedule();
    }

    function onStepClick(event) {
      const button = event.target.closest('[data-state-step]');
      if (!button || !panel.contains(button) || disposed) return;
      finish();
      selectStep(Number(button.dataset.stateStep));
    }

    function onPlay() {
      if (disposed || playing) return;
      if (reduced) {
        selectStep(steps.length - 1);
        return;
      }
      playing = true;
      selectStep(0);
      schedule();
    }

    function onMotionChange(event) {
      reduced = typeof event.detail?.reduced === 'boolean' ? event.detail.reduced : Boolean(window.portfolioMotion?.isReduced());
      if (reduced && playing) {
        selectStep(steps.length - 1);
        finish();
      } else schedule();
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
