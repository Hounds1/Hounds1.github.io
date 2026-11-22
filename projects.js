(() => {
  const projects = window.portfolioProjects;
  const fx = window.portfolioMotion;
  const dialog = document.getElementById('project-dialog');
  const content = document.getElementById('dialog-content');
  const copyLinkButton = document.getElementById('copy-project-link');
  const linkFallback = document.getElementById('project-link-fallback');
  const linkInput = document.getElementById('project-link-input');
  const shareStatus = document.getElementById('project-share-status');
  const featuredGrid = document.getElementById('featured-grid');
  const archiveGrid = document.getElementById('archive-grid');
  const engineeringGrid = document.getElementById('engineering-grid');
  const personalGrid = document.getElementById('personal-grid');
  const categories = { personal: '개인 프로젝트', safety: '안전·관제', access: '호출·출입', assets: '자산·물질', engineering: '공통 백엔드 설계' };
  const artTypes = { '01': 'rtls', '02': 'evacuation', '03': 'call', '04': 'assets' };
  const personalArtTypes = { '19': 'flowit', '20': 'bullseye' };
  const projectOrder = [
    ...projects.filter(project => artTypes[project.id]),
    ...projects.filter(project => project.category === 'engineering'),
    ...projects.filter(project => project.category === 'personal'),
    ...projects.filter(project => !artTypes[project.id] && !['personal', 'engineering'].includes(project.category))
  ];
  let opener;
  let selectedId;
  let shareRequestId = 0;
  let copyingLink = false;
  let closing = false;
  let previousBodyOverflow = '';
  let clearCardMotion = () => {};
  let clearSimulation = () => {};
  let clearLogDemo = () => {};
  let clearStateDemo = () => {};
  let transitioning = false;
  let activeTransition;
  let pendingClose = null;
  let pendingLocationSync = false;
  let diagramObserver;
  let diagrams = [];
  const visibleDiagrams = new Set();
  const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

  function resetShare() {
    // Invalidate pending clipboard promises before a modal closes or changes project.
    shareRequestId += 1;
    copyingLink = false;
    copyLinkButton.textContent = '사례 링크 복사';
    copyLinkButton.setAttribute('aria-disabled', 'false');
    copyLinkButton.removeAttribute('aria-busy');
    linkFallback.hidden = true;
    linkInput.value = '';
    shareStatus.textContent = '';
  }

  async function copyProjectLink() {
    if (!dialog.open || !selectedId || closing || transitioning || copyingLink) return;
    const projectId = selectedId;
    const requestId = ++shareRequestId;
    const url = new URL(location.href);
    url.username = '';
    url.password = '';
    url.search = '';
    url.hash = `project-${projectId}`;
    const link = url.href;
    const isCurrent = () => requestId === shareRequestId && selectedId === projectId && dialog.open && !closing;
    copyingLink = true;
    copyLinkButton.textContent = '복사 중';
    copyLinkButton.setAttribute('aria-disabled', 'true');
    copyLinkButton.setAttribute('aria-busy', 'true');
    linkFallback.hidden = true;
    linkInput.value = '';
    shareStatus.textContent = '';
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(link);
      if (!isCurrent()) return;
      copyLinkButton.textContent = '복사됨';
      shareStatus.textContent = '현재 사례의 링크를 복사했습니다.';
    } catch (_) {
      if (!isCurrent()) return;
      copyLinkButton.textContent = '다시 복사';
      linkInput.value = link;
      linkFallback.hidden = false;
      shareStatus.textContent = '자동 복사를 사용할 수 없어 직접 복사할 주소를 표시했습니다.';
      linkInput.focus({ preventScroll: true });
      linkInput.select();
    } finally {
      if (isCurrent()) {
        copyingLink = false;
        copyLinkButton.setAttribute('aria-disabled', 'false');
        copyLinkButton.removeAttribute('aria-busy');
      }
    }
  }

  function sourceLinks(links, className, label) {
    const items = (links || []).flatMap(link => {
      try {
        const url = new URL(link.url);
        if (url.protocol !== 'https:' || url.username || url.password || !link.label) return [];
        return [`<a href="${escape(url.href)}" target="_blank" rel="noopener noreferrer">${escape(link.label)}<span aria-hidden="true">↗</span></a>`];
      } catch (_) { return []; }
    });
    return items.length ? `<div class="${className}" role="group" aria-label="${label}">${items.join('')}</div>` : '';
  }

  function art(project, context) {
    if (project.category === 'engineering') {
      return `<div class="project-art engineering-art" aria-hidden="true">
        <div class="engineering-blueprint">
          <div class="blueprint-top"><span>SHARED BACKEND</span><span>04 AREAS</span></div>
          <div class="blueprint-module"><span class="module-index">01</span><div><strong>운영 설정</strong><p>동적 조회 · 버전 관리 · 비밀값 보호</p></div><span class="module-symbol">{ }</span></div>
          <div class="blueprint-module"><span class="module-index">02</span><div><strong>데이터·통신 도구</strong><p>응답 변환 · 요청 검증 · 오류 구분</p></div><span class="module-symbol">↔</span></div>
          <div class="blueprint-module"><span class="module-index">03</span><div><strong>정보·화면·공통 조회</strong><p>정보 제공 · 화면 설정 · 알림 조치</p></div><span class="module-symbol">≡</span></div>
          <div class="blueprint-module"><span class="module-index">04</span><div><strong>초기화·실행 제어</strong><p>공유 잠금 · 소유자 확인 · 실패 복구</p></div><span class="module-symbol">⇄</span></div>
          <div class="blueprint-bottom"><span>Reusable tools</span><span>Consistent operations</span></div>
        </div>
      </div>`;
    }
    return `<div class="project-art" aria-hidden="true"><img class="project-cover-image" src="assets/images/project-${project.id}.png" alt="" width="1672" height="941" loading="${context === 'modal' ? 'eager' : 'lazy'}" decoding="async"></div>`;
  }

  function card(project) {
    if (project.category === 'engineering') {
      return `<button class="project-card engineering-card" type="button" data-project="${project.id}" data-art="engineering" aria-haspopup="dialog" aria-label="${escape(project.shortTitle)} 상세 보기"><div class="card-surface">
        <div class="engineering-card-copy"><div class="card-topline"><span>COMMON SYSTEMS</span><span>${escape(project.period)}</span></div><h3>${escape(project.shortTitle)}</h3><p class="card-hook">${escape(project.hook)}</p><div class="engineering-card-bottom"><div class="card-tags">${project.tags.map(tag => `<span>${escape(tag)}</span>`).join('')}</div><span class="card-open" aria-hidden="true">설계 사례 보기 <span>↗</span></span></div></div>
        ${art(project, 'card')}
      </div></button>`;
    }
    const personal = project.category === 'personal';
    const featured = personal || !!artTypes[project.id];
    const interactive = project.id === '01' || project.id === '03';
    return `<button class="project-card ${featured ? 'featured-card' : 'archive-card'}${personal ? ' personal-card' : ''}" type="button" data-project="${project.id}" data-art="${personalArtTypes[project.id] || artTypes[project.id] || 'archive'}" aria-haspopup="dialog" aria-label="${escape(project.shortTitle)} 상세 보기"><div class="card-surface">
      ${art(project, 'card')}
      <div class="card-info">
        <div class="card-topline"><span>${project.id} / ${escape(categories[project.category])}</span>${featured ? `<span>${escape(project.period)}</span>` : '<span class="archive-mark" aria-hidden="true">↗</span>'}</div>
        <div class="card-title-row"><h3>${escape(project.shortTitle)}</h3></div>
        <p class="card-hook">${escape(project.hook)}</p>
      </div>
      <div class="card-footer"><div class="card-tags">${project.tags.map(tag => `<span>${escape(tag)}</span>`).join('')}</div>${featured ? `<span class="card-open" aria-hidden="true">${interactive ? '상세 · 시뮬레이션' : '자세히 보기'} <span>↗</span></span>` : `<span class="archive-period">${escape(project.period)}</span>`}</div>
    </div></button>`;
  }

  function render(filter = 'all') {
    clearCardMotion();
    const filtered = projects.filter(project => filter === 'all' || project.category === filter);
    const personal = filtered.filter(project => project.category === 'personal');
    const featured = filtered.filter(project => artTypes[project.id] && project.category !== 'personal');
    const archive = filtered.filter(project => !artTypes[project.id] && !['personal', 'engineering'].includes(project.category));
    const engineering = filtered.filter(project => project.category === 'engineering');
    personalGrid.innerHTML = personal.map(card).join('');
    engineeringGrid.innerHTML = engineering.map(card).join('');
    featuredGrid.innerHTML = featured.map(card).join('');
    archiveGrid.innerHTML = archive.map(card).join('');
    document.getElementById('featured-section').hidden = !featured.length;
    document.getElementById('archive-section').hidden = !archive.length;
    document.getElementById('engineering-section').hidden = !engineering.length;
    document.getElementById('personal-section').hidden = !personal.length;
    document.getElementById('entry-count').textContent = projects.length;
    document.getElementById('filter-status').textContent = [featured.length + archive.length ? `${featured.length + archive.length} projects` : '', engineering.length ? `${engineering.length} engineering` : '', personal.length ? `${personal.length} personal` : ''].filter(Boolean).join(' · ');
    document.querySelectorAll('[data-filter]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === filter)));
    fx?.animate(document.querySelectorAll('.project-card'), { opacity: [.3, 1], y: [12, 0] }, { duration: .35, delay: index => Math.min(index * .035, .18) });
    clearCardMotion = window.bindProjectCardMotion?.(document.querySelectorAll('.project-card'), fx) || (() => {});
  }

  // Adapted from Motion's public App Store and shared-view examples.
  // Native dialog keeps its focus trap and Escape behavior during the morph.
  async function morph(update, from, to, fromArt, toArt, fromTitle, toTitle) {
    transitioning = true;
    let applied = false;
    const apply = () => { if (!applied) { applied = true; update(); } };
    try {
      let transition = window.Motion.animateView(apply, {
        type: window.Motion.spring, duration: .48, bounce: .1
      }).add(from, to)
        .old({ opacity: [1, 0] }, { duration: .1 })
        .new({ opacity: [0, 1] }, { duration: .2, delay: .05 });
      if (fromArt && toArt) transition = transition.add(fromArt, toArt).crop(false)
        .old({ opacity: [1, 0] }, { duration: .1 }).new({ opacity: [0, 1] }, { duration: .18 });
      if (fromTitle && toTitle) transition = transition.add(fromTitle, toTitle).crop(false)
        .old({ opacity: [1, 0] }, { duration: .1 }).new({ opacity: [0, 1] }, { duration: .18 });
      activeTransition = await transition;
      if (fx?.isReduced()) activeTransition.complete();
      await activeTransition.finished;
    } catch (_) {
      // Older browsers and interrupted snapshots still get the requested view.
      apply();
    } finally {
      activeTransition = null;
      transitioning = false;
      flushPendingNavigation();
    }
  }

  const canMorph = () => !!window.Motion?.animateView && !!document.startViewTransition && !fx?.isReduced();

  const flowArrow = '<span class="flow-link" aria-hidden="true"><svg viewBox="0 0 32 16" fill="none"><path d="M1 8h28m-6-5 6 5-6 5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/><circle class="flow-packet" cx="2" cy="8" r="1.7"/></svg></span>';

  function syncDiagramMotion() {
    const running = dialog.open && !document.hidden && !fx?.isReduced();
    diagrams.forEach(diagram => diagram.classList.toggle('diagram-flowing', running && visibleDiagrams.has(diagram)));
  }

  function stopDiagramMotion() {
    diagramObserver?.disconnect();
    diagramObserver = null;
    diagrams.forEach(diagram => diagram.classList.remove('diagram-flowing'));
    diagrams = [];
    visibleDiagrams.clear();
  }

  function watchDiagramMotion() {
    stopDiagramMotion();
    diagrams = [...content.querySelectorAll('.case-diagram')];
    if ('IntersectionObserver' in window) {
      diagramObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting && entry.intersectionRatio >= .2) visibleDiagrams.add(entry.target);
          else visibleDiagrams.delete(entry.target);
        });
        syncDiagramMotion();
      }, { root: dialog, rootMargin: '-56px 0px 0px', threshold: .2 });
      diagrams.forEach(diagram => diagramObserver.observe(diagram));
    } else {
      diagrams.forEach(diagram => visibleDiagrams.add(diagram));
      syncDiagramMotion();
    }
  }

  function diagramNode(node, badge, className, arrow = false) {
    return `<div class="flow-node ${className}"><span class="flow-badge">${badge}</span><strong>${escape(node.label)}</strong><span class="flow-detail">${escape(node.detail)}</span>${arrow ? flowArrow : ''}</div>`;
  }

  function caseDiagram(diagram) {
    let drawing;
    if (diagram.kind === 'branch') {
      drawing = `<div class="flow-branch" aria-hidden="true">
        ${diagramNode(diagram.start, '입력', 'flow-entry', true)}
        ${diagramNode(diagram.gate, '<span class="flow-diamond"></span> 판단', 'flow-gate')}
        <div class="flow-paths">${diagram.paths.map(path => `<div class="flow-path flow-path-${path.tone}">
          ${flowArrow}<span class="flow-condition">${escape(path.when)}</span><div class="flow-outcome"><strong>${escape(path.label)}</strong><span class="flow-detail">${escape(path.detail)}</span></div>
        </div>`).join('')}</div>
      </div>`;
    } else {
      drawing = `<div class="flow-sequence" aria-hidden="true">${diagram.steps.map((node, index) => diagramNode(node, String(index + 1).padStart(2, '0'), index === diagram.steps.length - 1 ? 'flow-finish' : '', index < diagram.steps.length - 1)).join('')}</div>`;
    }
    return `<figure class="case-diagram"><figcaption><span aria-hidden="true">↳</span> 처리 흐름</figcaption><div role="img" aria-label="${escape(diagram.summary)}">${drawing}</div></figure>`;
  }

  function renderCase(project, item, index) {
    const sources = sourceLinks(item.sources, 'case-sources', '관련 구현 기록');
    return `<article class="case-study${sources ? ' has-sources' : ''}">
      <header class="case-heading"><span class="case-number" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span><h4>${escape(item.title)}</h4></header>
      ${window.portfolioStateDemo?.render(project.id, index, item) || caseDiagram(item.diagram)}
      <dl class="case-flow">
        <div class="case-problem"><dt>문제</dt><dd>${escape(item.problem)}</dd></div>
        <div class="case-action"><dt>해결</dt><dd>${escape(item.action)}</dd></div>
        <div class="case-change"><dt><span aria-hidden="true">↳</span> 달라진 점</dt><dd>${escape(item.change)}</dd></div>
      </dl>${sources}
    </article>`;
  }

  function componentSections(project) {
    const { components, cases } = project.detail;
    const tabs = [...components.map(component => ({ id: component.id, title: component.name, subtitle: component.subtitle })), { id: 'replay', title: '실측 기록', subtitle: 'Core 로그·그래프' }];
    const prefix = `project-${project.id}-section`;
    return `<section class="system-overview" aria-label="Core와 UOG의 역할">
      <p class="system-overview-label">Linux 진단부터 수신·보관까지</p>
      <div class="system-overview-flow">
        <div><span>HOST AGENT</span><strong>Core</strong><p>지표 수집 · 압력 진단 · 원인 후보</p></div>
        <span class="system-transport">TLS 세션<br>스냅샷 전달</span>
        <div><span>RECEIVER & ARCHIVE</span><strong>UOG</strong><p>노드 접속 승인 · 상태 수신 · 장기 보관</p></div>
      </div>
    </section>
    <div class="component-tab-anchor" aria-hidden="true"></div>
    <div class="component-tabs" role="tablist" aria-label="Bullseye 구현 영역">
      ${tabs.map((tab, index) => `<button type="button" role="tab" id="${prefix}-tab-${tab.id}" aria-controls="${prefix}-${tab.id}" aria-selected="${index === 0}" tabindex="${index === 0 ? 0 : -1}" data-component-tab="${tab.id}"><strong>${escape(tab.title)}</strong><span>${escape(tab.subtitle)}</span></button>`).join('')}
    </div>
    ${components.map((component, componentIndex) => `<section class="component-panel" role="tabpanel" tabindex="0" id="${prefix}-${component.id}" aria-labelledby="${prefix}-tab-${component.id}" ${componentIndex ? 'hidden' : ''}>
      <header class="component-intro"><div><p class="component-eyebrow">${escape(component.name)}</p><h3>${escape(component.subtitle)}</h3><p>${escape(component.summary)}</p></div><div class="component-scope"><h4>직접 구현한 범위</h4><ul>${component.scope.map(item => `<li>${escape(item)}</li>`).join('')}</ul></div></header>
      <div class="case-studies">${cases.map((item, index) => item.component === component.id ? renderCase(project, item, index) : '').join('')}</div>
    </section>`).join('')}
    <section class="component-panel replay-panel" role="tabpanel" tabindex="0" id="${prefix}-replay" aria-labelledby="${prefix}-tab-replay" hidden>
      <header class="component-intro"><div><p class="component-eyebrow">CAPTURE ARCHIVE</p><h3>부하가 올라갔다 회복하는 실제 기록</h3><p>격리된 Linux 환경에서 수집한 Core 진단 로그와 그래프입니다. 수집 당시 버전의 판단 결과를 그대로 재생합니다.</p></div></header>
      ${window.portfolioLogDemo?.render(project.id) || ''}
    </section>`;
  }

  function standardSections(project) {
    const detail = project.detail;
    return `<section class="modal-section contribution-section" aria-labelledby="contributions-title">
      <div class="modal-section-heading"><h3 id="contributions-title">내가 한 일</h3><span>MY CONTRIBUTION</span></div>
      <ul class="contribution-list${detail.contributions.length > 3 ? ' contribution-list-grid' : ''}">${detail.contributions.map((item, index) => `<li><span class="contribution-number" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span><h4>${escape(item.title)}</h4><p>${escape(item.body)}</p></li>`).join('')}</ul>
    </section>
    ${window.portfolioSimulations?.render(project.id) || ''}
    ${window.portfolioLogDemo?.render(project.id) || ''}
    <section class="modal-section cases-section" aria-labelledby="solutions-title">
      <div class="modal-section-heading"><h3 id="solutions-title">문제를 푼 방식</h3><span>${String(detail.cases.length).padStart(2, '0')} CASES</span></div>
      <div class="case-studies">${detail.cases.map((item, index) => renderCase(project, item, index)).join('')}</div>
    </section>`;
  }

  function projectDetail(project, next) {
    const detail = project.detail;
    const scope = detail.scope;
    return `
      <header class="modal-cover${scope ? ' modal-cover-scoped' : ''}">
        <div class="modal-intro">
          <p class="modal-category">${escape(categories[project.category])}<span aria-hidden="true">/</span> ${project.category === 'engineering' ? 'ENGINEERING' : `PROJECT ${project.id}`}</p>
          <h2 id="dialog-title" class="modal-title" tabindex="-1">${escape(project.shortTitle)}</h2>
          ${detail.context ? `<p class="modal-context">${escape(detail.context)}</p>` : ''}
          ${scope ? `<section class="modal-scope" aria-labelledby="scope-title">
            <div class="scope-heading"><h3 id="scope-title">담당 범위</h3><span>${escape(scope.kind)}</span></div>
            <p id="dialog-lead" class="scope-summary">${escape(scope.summary)}</p>
            ${scope.note ? `<p class="scope-note"><span>참고</span>${escape(scope.note)}</p>` : ''}
          </section>` : `<p id="dialog-lead" class="modal-lead">${escape(detail.lead)}</p>`}
          <dl class="modal-facts">
            <div><dt>개발·개선</dt><dd>${escape(project.period)}</dd></div>
            ${scope ? '' : `<div><dt>담당</dt><dd>${escape(detail.role)}</dd></div>`}
          </dl>
          ${detail.planned?.length ? `<p class="modal-planned"><span>예정</span>${detail.planned.map(escape).join(' · ')}</p>` : ''}
          ${detail.stack?.length ? `<ul class="modal-stack" aria-label="사용 기술">${detail.stack.map(tech => `<li>${escape(tech)}</li>`).join('')}</ul>` : ''}
          ${sourceLinks(detail.links, 'modal-source-links', '프로젝트 저장소와 작업 기록')}
        </div>
        <div class="modal-art">${art(project, 'modal')}</div>
      </header>
      ${detail.components?.length ? componentSections(project) : standardSections(project)}
      <button type="button" class="modal-next" data-next="${next.id}"><span><small>다음 프로젝트</small><strong>${escape(next.shortTitle)}</strong></span><span aria-hidden="true">↗</span></button>`;
  }

  async function showProject(id, updateHistory = true) {
    if (transitioning || closing) return;
    const project = projects.find(item => item.id === id);
    if (!project) return;
    const next = projectOrder[(projectOrder.indexOf(project) + 1) % projectOrder.length];
    const wasOpen = dialog.open;
    const source = document.querySelector(`[data-project="${id}"]`);
    if (!wasOpen) {
      const focused = document.activeElement;
      opener = focused && focused !== document.body && focused !== document.documentElement ? focused : source;
      previousBodyOverflow = document.body.style.overflow;
    }
    const useMorph = !wasOpen && updateHistory && source && canMorph();
    const update = () => {
      resetShare();
      selectedId = id;
      dialog.dataset.art = project.category === 'engineering' ? 'engineering' : personalArtTypes[id] || artTypes[id] || 'archive';
      stopDiagramMotion();
      clearSimulation();
      clearLogDemo();
      clearStateDemo();
      content.innerHTML = projectDetail(project, next);
      document.body.style.overflow = 'hidden';
      if (!wasOpen) dialog.showModal();
      dialog.scrollTop = 0;
      document.getElementById('dialog-title').focus({ preventScroll: true });
      clearSimulation = window.portfolioSimulations?.mount(content, project.id) || (() => {});
      clearLogDemo = window.portfolioLogDemo?.mount(content, project.id) || (() => {});
      clearStateDemo = window.portfolioStateDemo?.mount(content, project.id) || (() => {});
      watchDiagramMotion();
      if (updateHistory) {
        if (wasOpen) history.replaceState(history.state, '', `#project-${id}`);
        else history.pushState({ projectDialog: true }, '', `#project-${id}`);
      }
    };
    if (useMorph) {
      await morph(update, source.querySelector('.card-surface'), dialog,
        source.querySelector('.project-art'), '.modal-art .project-art',
        source.querySelector('h3'), '#dialog-title');
    } else {
      update();
      fx?.animate(content, { opacity: [.2, 1], y: [10, 0] }, { duration: .3 });
    }
  }

  async function closeDialog(updateHistory = true) {
    if (!dialog.open || closing) return;
    if (transitioning) { pendingClose = updateHistory; pendingLocationSync = false; return; }
    closing = true;
    resetShare();
    const closingHash = location.hash;
    const source = document.querySelector(`[data-project="${selectedId}"]`);
    const rect = source?.getBoundingClientRect();
    const visible = rect && rect.bottom > 0 && rect.top < innerHeight;
    if (visible && canMorph()) {
      await morph(() => dialog.close(), dialog, source.querySelector('.card-surface'),
        content.querySelector('.project-art'), source.querySelector('.project-art'),
        content.querySelector('#dialog-title'), source.querySelector('h3'));
    } else {
      dialog.close();
    }
    closing = false;
    if (updateHistory && !pendingLocationSync && location.hash === closingHash && /^#project-\d{2}$/.test(location.hash)) {
      if (history.state?.projectDialog) history.back();
      else history.replaceState(null, '', location.pathname + location.search);
    }
    flushPendingNavigation();
  }

  document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => render(button.dataset.filter)));
  document.getElementById('main').addEventListener('click', event => {
    const button = event.target.closest('[data-project]');
    if (button) showProject(button.dataset.project);
  });
  content.addEventListener('click', event => {
    const tab = event.target.closest('[data-component-tab]');
    if (tab) selectComponentTab(tab);
    const next = event.target.closest('[data-next]');
    if (next) showProject(next.dataset.next);
  });
  function selectComponentTab(tab) {
    const tablist = tab.closest('[role="tablist"]');
    if (!tablist || !content.contains(tablist)) return;
    const toolbarHeight = dialog.querySelector('.modal-toolbar').getBoundingClientRect().height;
    const anchorTop = content.querySelector('.component-tab-anchor').getBoundingClientRect().top;
    const sectionTop = dialog.scrollTop + anchorTop - dialog.getBoundingClientRect().top - toolbarHeight;
    tablist.querySelectorAll('[role="tab"]').forEach(button => {
      const active = button === tab;
      button.setAttribute('aria-selected', String(active));
      button.tabIndex = active ? 0 : -1;
      document.getElementById(button.getAttribute('aria-controls')).hidden = !active;
    });
    // A sticky tab's own rectangle no longer indicates its normal flow position.
    // Return to the panel's start even when switching from a long scrolled section.
    dialog.scrollTop = Math.max(0, sectionTop);
    watchDiagramMotion();
  }
  content.addEventListener('keydown', event => {
    const tab = event.target.closest('[data-component-tab]');
    if (!tab || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const tabs = [...tab.closest('[role="tablist"]').querySelectorAll('[role="tab"]')];
    const index = tabs.indexOf(tab);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    tabs[next].focus({ preventScroll: true });
    selectComponentTab(tabs[next]);
  });
  if ('ResizeObserver' in window) {
    new ResizeObserver(entries => {
      dialog.style.setProperty('--modal-toolbar-height', `${entries[0].target.getBoundingClientRect().height}px`);
    }).observe(dialog.querySelector('.modal-toolbar'));
  }
  document.getElementById('close-dialog').addEventListener('click', () => closeDialog());
  copyLinkButton.addEventListener('click', copyProjectLink);
  dialog.addEventListener('cancel', event => { event.preventDefault(); closeDialog(); });
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeDialog();
  });
  dialog.addEventListener('close', () => {
    resetShare();
    stopDiagramMotion();
    clearSimulation();
    clearSimulation = () => {};
    clearLogDemo();
    clearLogDemo = () => {};
    clearStateDemo();
    clearStateDemo = () => {};
    selectedId = null;
    document.body.style.overflow = previousBodyOverflow;
    if (opener?.isConnected) opener.focus({ preventScroll: true });
  });

  function syncLocation() {
    if (transitioning || closing) {
      pendingLocationSync = true;
      pendingClose = null;
      return;
    }
    const match = location.hash.match(/^#project-(\d{2})$/);
    const id = match?.[1];
    if (id && projects.some(project => project.id === id)) {
      if (!dialog.open || selectedId !== id) showProject(id, false);
    } else if (dialog.open) closeDialog(false);
  }
  function flushPendingNavigation() {
    if (transitioning || closing) return;
    if (pendingLocationSync) {
      pendingLocationSync = false;
      pendingClose = null;
      syncLocation();
    } else if (pendingClose !== null) {
      const updateHistory = pendingClose;
      pendingClose = null;
      closeDialog(updateHistory);
    }
  }
  window.addEventListener('hashchange', syncLocation);
  window.addEventListener('portfolio-motion-change', event => {
    if (event.detail.reduced) activeTransition?.complete();
    syncDiagramMotion();
  });
  document.addEventListener('visibilitychange', syncDiagramMotion);
  render();
  syncLocation();
})();
