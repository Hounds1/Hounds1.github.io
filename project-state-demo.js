(() => {
  'use strict';

  const mounted = new WeakMap();
  const steps = [
    { title: '현재 스냅샷 · v12', detail: '진단 등급과 마지막 계측값 확인', status: '현재 파일은 HIGH · v12입니다. 이 예시의 메모리 사용률은 88.1%입니다.' },
    { title: '새 평가 · 임시 파일', detail: '현재 값 갱신 후 write / flush', status: '5초 뒤 현재 사용률이 87.6%로 바뀌었습니다. 진단 상태는 같아 v12를 유지하며, 새 평가 시각과 관측값으로 임시 파일을 작성·flush합니다.' },
    { title: 'state.json 원자적 교체', detail: '같은 버전에도 새 스냅샷 반영', status: '완성된 임시 파일로 state.json을 교체했습니다. v12와 진단 근거는 유지되고, evaluatedAt과 observations가 새 평가를 반영합니다.' },
    { title: '읽는 쪽에서 최신성 확인', detail: '평가 시각의 경과·관측 상태 확인', status: '읽는 쪽은 현재 값을 observations에서 확인합니다. 에이전트가 멈추면 마지막 FRESH 파일이 남을 수 있으므로 evaluatedAt이 얼마나 오래됐는지도 검사해야 합니다.' }
  ];
  // Selected README fields; the second evaluation is explicitly illustrative.
  const evaluations = [
    { evaluatedAt: 1788526810000, usage: 88.1 },
    { evaluatedAt: 1788526815000, usage: 87.6 }
  ];
  const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const snapshotJson = evaluation => `{
  "severity": "HIGH",
  "resource": "HOST_MEMORY",
  "version": 12,
  "since": 1788526800000,
  "evaluatedAt": ${evaluation.evaluatedAt},
  "observationStatus": "FRESH",
  "observations": {"HOST_MEMORY": {
    "status": "FRESH",
    "lastSampleAt": ${evaluation.evaluatedAt},
    "metrics": [{"metric": "HOST_MEMORY_USAGE", "value": ${evaluation.usage}, "unit": "%"}]
  }},
  "evidence": [{"metric": "usage", "value": 88.1, "unit": "%"}]
}`;

  function render(projectId, caseIndex) {
    if (projectId !== '20' || caseIndex !== 2) return '';
    return `<section class="project-state-demo" data-state-demo="20" aria-labelledby="state-demo-title">
      <header class="state-demo-heading"><div><h5 id="state-demo-title">JSON 발행 흐름</h5><span>로컬 파일 · 설명용 예시</span></div><button type="button" class="state-demo-play" data-state-play>발행 흐름 재생 <span aria-hidden="true">▶</span></button></header>
      <div class="state-demo-layout">
        <div class="state-demo-steps" role="group" aria-label="JSON 발행 단계 선택">${steps.map((step, index) => `<button type="button" class="state-demo-step${index === 0 ? ' is-active' : ''}" data-state-step="${index}" aria-pressed="${index === 0}"><span class="state-demo-number" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span><span><strong>${escape(step.title)}</strong><small>${escape(step.detail)}</small></span></button>`).join('')}</div>
        <div class="state-demo-preview"><div class="state-demo-code-label"><span data-state-code-label>현재 JSON · v12</span><span>README 구조 기반 · 필드 일부</span></div><pre class="state-demo-code" aria-label="상태 스냅샷 JSON 예시"><code>${escape(snapshotJson(evaluations[0]))}</code></pre></div>
      </div>
      <div class="state-demo-file" data-state-file><div><span>현재 파일 · 기본 경로</span><code>/run/bullseye/state.json</code></div><span class="state-demo-version" data-state-version>v12 <small>이전 평가</small></span></div>
      <p class="state-demo-status" data-state-status role="status" aria-live="polite" aria-atomic="true">${escape(steps[0].status)}</p>
      <p class="state-demo-note">스냅샷은 매 평가마다 갱신됩니다. 버전은 등급·주요 자원·자원 상태·원인 워크로드·신뢰도·원인 식별 상태가 바뀔 때 증가합니다. 표시된 값은 README 구조로 재구성한 설명용 예시입니다.</p>
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
    const code = panel.querySelector('.state-demo-code code');
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
      version.innerHTML = published ? 'v12 <small>새 평가 · 버전 유지</small>' : 'v12 <small>이전 평가</small>';
      codeLabel.textContent = published ? '교체된 JSON · v12' : index === 0 ? '현재 JSON · v12' : '발행할 JSON · v12';
      code.textContent = snapshotJson(evaluations[index === 0 ? 0 : 1]);
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
