(() => {
  'use strict';

  const mounted = new WeakMap();
  const supported = new Set(['01', '03']);

  function render(projectId) {
    if (!supported.has(projectId)) return '';
    const isRtls = projectId === '01';
    const stage = isRtls ? `
      <div class="sim-equipment">
        <span class="sim-stage-caption">경광등 표시</span>
        <div class="sim-lamp" aria-hidden="true"><div class="sim-lamp-lens"></div><div class="sim-lamp-base"></div></div>
        <strong class="sim-stage-result" data-sim-field="lamp">대피 표시 점등</strong>
      </div>
      <dl class="sim-facts">
        <div><dt>대피 상태</dt><dd data-sim-field="evacuation">대피 중</dd></div>
        <div><dt>SOS 상태</dt><dd data-sim-field="sos">없음</dd></div>
      </dl>` : `
      <div class="sim-call-board">
        <span class="sim-stage-caption">호출 응답</span>
        <div class="sim-responders">
          <div class="sim-responder" data-sim-person="A" data-response="waiting"><span class="sim-person-mark" aria-hidden="true">A</span><strong>A 직원</strong><span data-sim-field="employee-a">아직 응답 전</span></div>
          <div class="sim-responder" data-sim-person="B" data-response="waiting"><span class="sim-person-mark" aria-hidden="true">B</span><strong>B 직원</strong><span data-sim-field="employee-b">아직 응답 전</span></div>
        </div>
      </div>
      <dl class="sim-facts">
        <div><dt>호출 상태</dt><dd data-sim-field="call">응답 대기</dd></div>
        <div><dt>추가 전파</dt><dd data-sim-field="propagation">종료 전</dd></div>
      </dl>`;
    const actions = isRtls ? `
      <button type="button" data-sim-action="sos" aria-disabled="false">SOS 발생</button>
      <button type="button" data-sim-action="release" aria-disabled="false">대피 해제</button>` : `
      <button type="button" data-sim-action="respond-a" aria-disabled="false">A 직원 응답</button>
      <button type="button" data-sim-action="respond-b" aria-disabled="false">B 직원 응답</button>`;
    const instruction = isRtls
      ? 'SOS를 켠 뒤 대피를 해제해 보세요. 바로 해제했을 때와도 비교할 수 있습니다.'
      : '한 직원이 먼저 응답한 뒤 다른 직원도 응답해 보세요. 순서를 바꿔 비교할 수 있습니다.';

    return `<section class="project-simulation" data-simulation-project="${projectId}" aria-labelledby="sim-heading-${projectId}">
      <header class="sim-heading"><h3 id="sim-heading-${projectId}">직접 실행해 보기</h3><span>설명용 시뮬레이션</span></header>
      <p class="sim-intro">${instruction}</p>
      <div class="sim-layout">
        <div class="sim-stage" data-sim-lamp="evacuation">${stage}</div>
        <div class="sim-controls">
          <div class="sim-actions">${actions}<button type="button" class="sim-reset" data-sim-action="reset">처음부터 <span aria-hidden="true">↺</span></button></div>
          <p class="sim-status" role="status" aria-live="polite" aria-atomic="true" data-sim-status></p>
          <div class="sim-log"><h4>최근 동작</h4><ol data-sim-log aria-label="최근 동작 기록"></ol></div>
        </div>
      </div>
      <p class="sim-disclaimer">실제 장비나 호출 시스템에 연결되지 않는 설명용 예시입니다.</p>
    </section>`;
  }

  function mount(container, projectId) {
    if (!supported.has(projectId) || !container?.querySelector) return () => {};
    const selector = `.project-simulation[data-simulation-project="${projectId}"]`;
    const root = container.matches?.(selector) ? container : container.querySelector(selector);
    if (!root) return () => {};
    mounted.get(root)?.();

    const stage = root.querySelector('.sim-stage');
    const status = root.querySelector('[data-sim-status]');
    const log = root.querySelector('[data-sim-log]');
    const fields = new Map([...root.querySelectorAll('[data-sim-field]')].map(node => [node.dataset.simField, node]));
    const buttons = new Map([...root.querySelectorAll('[data-sim-action]')].map(node => [node.dataset.simAction, node]));
    const people = new Map([...root.querySelectorAll('[data-sim-person]')].map(node => [node.dataset.simPerson, node]));
    let alive = true;
    let state;
    let events;
    let message;

    const setField = (name, value) => { const node = fields.get(name); if (node) node.textContent = value; };
    const addEvent = text => { events.push(text); events = events.slice(-3); };

    function reset() {
      state = { evacuating: true, sos: false, accepted: null, attempted: new Set() };
      events = [projectId === '01' ? '대피 중 · SOS 없는 상태로 시작' : '호출 생성 · 두 직원의 응답 대기'];
      message = projectId === '01'
        ? '대피 중이라 표시가 켜져 있습니다. SOS 유무에 따른 해제 결과를 비교해 보세요.'
        : '아직 확정된 응답이 없습니다. A 또는 B 직원의 응답을 선택해 보세요.';
    }

    function update() {
      if (projectId === '01') {
        stage.dataset.simLamp = state.sos ? 'sos' : state.evacuating ? 'evacuation' : 'off';
        setField('lamp', state.sos ? (state.evacuating ? 'SOS 표시 점등' : 'SOS 표시 유지') : state.evacuating ? '대피 표시 점등' : '소등');
        setField('evacuation', state.evacuating ? '대피 중' : '해제됨');
        setField('sos', state.sos ? '활성 SOS 있음' : '없음');
        // Each run ends with release; reset compares the other SOS condition.
        buttons.get('sos').setAttribute('aria-disabled', String(state.sos || !state.evacuating));
        buttons.get('release').setAttribute('aria-disabled', String(!state.evacuating));
      } else {
        setField('call', state.accepted ? `${state.accepted} 직원 응답 확정` : '응답 대기');
        setField('propagation', state.accepted ? '종료' : '종료 전');
        for (const person of ['A', 'B']) {
          const response = state.accepted === person ? 'accepted' : state.attempted.has(person) ? 'rejected' : 'waiting';
          people.get(person).dataset.response = response;
          setField(`employee-${person.toLowerCase()}`, response === 'accepted' ? '첫 응답 확정' : response === 'rejected' ? '후속 응답 정리' : '아직 응답 전');
          buttons.get(`respond-${person.toLowerCase()}`).setAttribute('aria-disabled', String(state.attempted.has(person)));
        }
      }
      status.textContent = message;
      const entries = events.map(text => {
        const item = root.ownerDocument.createElement('li');
        item.textContent = text;
        return item;
      });
      log.replaceChildren(...entries);
    }

    function onClick(event) {
      const button = event.target.closest?.('[data-sim-action]');
      if (!alive || !button || !root.contains(button) || button.getAttribute('aria-disabled') === 'true') return;
      const action = button.dataset.simAction;
      if (action === 'reset') {
        reset();
      } else if (projectId === '01' && action === 'sos' && state.evacuating && !state.sos) {
        state.sos = true;
        addEvent('SOS 발생 · 해당 장비의 SOS 표시 점등');
        message = 'SOS가 활성화됐습니다. 이제 대피를 해제해도 이 표시가 유지되는지 확인해 보세요.';
      } else if (projectId === '01' && action === 'release' && state.evacuating) {
        state.evacuating = false;
        addEvent(state.sos ? '대피 해제 · 활성 SOS 장비는 소등에서 제외' : '대피 해제 · 활성 SOS가 없어 소등');
        message = state.sos
          ? '대피는 해제됐지만 활성 SOS가 있어 표시를 유지합니다.'
          : '활성 SOS가 없어 대피 표시를 껐습니다. 처음부터 눌러 SOS가 있는 경우도 비교해 보세요.';
      } else if (projectId === '03' && (action === 'respond-a' || action === 'respond-b')) {
        const person = action === 'respond-a' ? 'A' : 'B';
        if (state.attempted.has(person)) return;
        state.attempted.add(person);
        if (!state.accepted) {
          state.accepted = person;
          addEvent(`${person} 직원의 첫 응답 확정 · 추가 전파 종료`);
          message = `${person} 직원의 응답으로 호출을 확정하고 추가 전파를 종료했습니다. 다른 직원의 응답도 눌러보세요.`;
        } else {
          addEvent(`${person} 직원의 후속 응답 정리 · ${state.accepted} 직원 확정 유지`);
          message = `${person} 직원의 후속 응답을 정리합니다. ${state.accepted} 직원으로 확정된 호출과 전파 종료 상태는 유지됩니다.`;
        }
      } else return;
      update();
    }

    reset();
    update();
    root.addEventListener('click', onClick);
    function cleanup() {
      if (!alive) return;
      alive = false;
      root.removeEventListener('click', onClick);
      if (mounted.get(root) === cleanup) mounted.delete(root);
    }
    mounted.set(root, cleanup);
    return cleanup;
  }

  window.portfolioSimulations = { render, mount };
})();
