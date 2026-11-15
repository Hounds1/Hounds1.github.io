(() => {
  'use strict';

  const lines = [
    '[BULLSEYE] Bullseye diagnostic system activated.',
    '[BULLSEYE] Host telemetry online.',
    '[BULLSEYE] cgroup v2 detected.',
    '[BULLSEYE] Memory pressure detected. usage=82.4% psi.some=13.1% sustained=10s previous=NORMAL current=ELEVATED resource=HOST_MEMORY',
    '[BULLSEYE] Warning. Memory saturation risk detected. usage=88.1% psi.some=24.3% rise=+6.1pp/10s previous=ELEVATED current=HIGH resource=HOST_MEMORY',
    '[BULLSEYE] Pressure source identified. resource=HOST_MEMORY workload=order-api.service confidence=HIGH'
  ];
  const tones = ['ready', 'ready', 'ready', 'pressure', 'warning', 'source'];
  const mounted = new WeakMap();
  const escape = value => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

  function render(projectId) {
    if (projectId !== '20') return '';
    return `<section class="project-log-demo" data-log-demo="20" aria-labelledby="log-demo-title">
      <header class="log-demo-heading"><div><span class="log-demo-indicator" aria-hidden="true"></span><h3 id="log-demo-title">Diagnostic log</h3></div><span>Linux host <span aria-hidden="true">/</span> 예시 로그</span></header>
      <div class="log-demo-output" aria-hidden="true">${lines.map((line, index) => `<div class="log-demo-row log-demo-${tones[index]}"><span class="log-demo-reserve">${escape(line)}</span><span class="log-demo-text" data-log-line="${index}"></span></div>`).join('')}</div>
      <ol class="log-demo-sr-only" aria-label="예시 로그 전체">${lines.map(line => `<li>${escape(line)}</li>`).join('')}</ol>
      <footer class="log-demo-footer">
        <div class="log-demo-controls"><span class="log-demo-progress" data-log-progress aria-hidden="true">재생 대기</span><button type="button" data-log-action="pause" aria-pressed="false">일시정지</button><button type="button" data-log-action="replay">다시 재생 <span aria-hidden="true">↺</span></button></div>
        <p class="log-demo-note">진단 흐름을 보여주는 예시로, 실제 서버와 연결되지 않습니다.</p>
        <p class="log-demo-sr-only" data-log-status role="status" aria-live="polite" aria-atomic="true"></p>
      </footer>
    </section>`;
  }

  function mount(container, projectId) {
    if (projectId !== '20' || !container?.querySelector) return () => {};
    const selector = '.project-log-demo[data-log-demo="20"]';
    const panel = container.matches?.(selector) ? container : container.querySelector(selector);
    if (!panel) return () => {};
    mounted.get(panel)?.();

    const rows = [...panel.querySelectorAll('.log-demo-row')];
    const output = [...panel.querySelectorAll('[data-log-line]')].map(element => {
      const node = document.createTextNode('');
      element.replaceChildren(node);
      return node;
    });
    const pauseButton = panel.querySelector('[data-log-action="pause"]');
    const replayButton = panel.querySelector('[data-log-action="replay"]');
    const progress = panel.querySelector('[data-log-progress]');
    const status = panel.querySelector('[data-log-status]');
    let reduced = Boolean(window.portfolioMotion?.isReduced());
    let visible = !('IntersectionObserver' in window);
    let userPaused = false;
    let disposed = false;
    let complete = false;
    let lineIndex = 0;
    let characterIndex = 0;
    let nextDelay = 30;
    let timer = null;
    let observer;

    function running() {
      return !disposed && !complete && !reduced && visible && !document.hidden && !userPaused;
    }

    function cancelTick() {
      if (timer !== null) clearTimeout(timer);
      timer = null;
    }

    function syncControls() {
      panel.classList.toggle('is-playing', running());
      panel.classList.toggle('is-complete', complete);
      pauseButton.setAttribute('aria-pressed', String(userPaused));
      pauseButton.setAttribute('aria-disabled', String(complete || reduced));
      pauseButton.textContent = userPaused ? '재생' : '일시정지';
      replayButton.setAttribute('aria-disabled', String(reduced));
      progress.textContent = reduced ? '전체 로그' : complete ? '재생 완료' : userPaused ? '일시정지' : running() ? '진단 흐름 재생 중' : '재생 대기';
      rows.forEach((row, index) => row.classList.toggle('is-current', !complete && index === lineIndex));
    }

    function finish(announce = true) {
      cancelTick();
      complete = true;
      syncControls();
      if (announce) status.textContent = '예시 로그 재생이 완료됐습니다.';
    }

    function showAll() {
      output.forEach((node, index) => { node.data = lines[index]; });
      finish(false);
    }

    function schedule() {
      cancelTick();
      syncControls();
      if (running()) timer = setTimeout(tick, nextDelay);
    }

    function tick() {
      timer = null;
      if (!running()) { syncControls(); return; }
      const line = lines[lineIndex];
      const chunk = line.slice(characterIndex, characterIndex + 2);
      // Append to the existing text node so selecting earlier lines stays intact.
      output[lineIndex].appendData(chunk);
      characterIndex += chunk.length;
      nextDelay = 30;
      if (characterIndex >= line.length) {
        lineIndex += 1;
        characterIndex = 0;
        if (lineIndex === lines.length) { finish(); return; }
        nextDelay = 280;
      }
      schedule();
    }

    function onPause() {
      if (complete || reduced || disposed) return;
      userPaused = !userPaused;
      schedule();
    }

    function onReplay() {
      if (reduced || disposed) return;
      cancelTick();
      output.forEach(node => { node.data = ''; });
      complete = false;
      userPaused = false;
      lineIndex = 0;
      characterIndex = 0;
      nextDelay = 30;
      status.textContent = '';
      schedule();
    }

    function onMotionChange(event) {
      reduced = typeof event.detail?.reduced === 'boolean' ? event.detail.reduced : Boolean(window.portfolioMotion?.isReduced());
      if (reduced) showAll();
      else schedule();
    }

    pauseButton.addEventListener('click', onPause);
    replayButton.addEventListener('click', onReplay);
    window.addEventListener('portfolio-motion-change', onMotionChange);
    document.addEventListener('visibilitychange', schedule);
    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver(entries => {
        const entry = entries[entries.length - 1];
        visible = entry.isIntersecting;
        schedule();
      }, { root: panel.closest('dialog'), rootMargin: '-60px 0px 0px', threshold: 0 });
      observer.observe(panel);
    }

    if (reduced) showAll();
    else schedule();

    const cleanup = () => {
      if (disposed) return;
      disposed = true;
      cancelTick();
      observer?.disconnect();
      pauseButton.removeEventListener('click', onPause);
      replayButton.removeEventListener('click', onReplay);
      window.removeEventListener('portfolio-motion-change', onMotionChange);
      document.removeEventListener('visibilitychange', schedule);
      panel.classList.remove('is-playing');
      mounted.delete(panel);
    };
    mounted.set(panel, cleanup);
    return cleanup;
  }

  window.portfolioLogDemo = { render, mount };
})();
