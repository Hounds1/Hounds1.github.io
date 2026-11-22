(() => {
  'use strict';

  const fieldWork = { title: '실무 프로젝트 모아보기', project: '산업 현장 서비스', body: '프로젝트별 담당 기능과 문제 해결 과정을 살펴볼 수 있습니다.', href: 'projects.html' };
  const cases = {
    'Java': {
      summary: '현장 서비스의 업무 로직부터 독립 실행형 Linux 진단 에이전트까지 구현했습니다.',
      items: [
        { id: '01', title: '대피와 SOS 상태 분리', project: '선박 작업자 안전관제', body: '대피 해제가 진행 중인 SOS 경보에 영향을 주지 않도록 상태를 구분했습니다.' },
        { id: '20', title: '진단과 수신·보관의 책임 분리', project: 'Bullseye', body: 'Java 25 기반 Core의 Linux 진단과 UOG의 접속 승인·수신·보관을 나누고, 느린 원인 조사와 보관소 장애가 앞단을 막지 않도록 구성했습니다.' }
      ]
    },
    'Spring': {
      summary: '업무 API와 인증을 구현하고, 실패 시 함께 되돌려야 하는 작업의 경계를 정리했습니다.',
      items: [
        { id: '18', title: '초기화 실패와 트랜잭션 경계', project: '공통 백엔드 설계', body: '초기화를 별도 서비스로 나누고 중간 실패 시 DB 변경이 함께 되돌아가도록 구성했습니다.' },
        { id: '19', title: '협업 API와 인증된 알림 연결', project: 'Flowit', body: '회원가입·JWT 인증과 협업 API를 구현하고 사용자별 WebSocket 알림으로 연결했습니다.' }
      ]
    },
    'MyBatis': {
      summary: '회사 프로젝트의 데이터 접근에 사용하며, 실제로 필요한 조회와 집계 범위를 정리했습니다.',
      items: [
        { id: '09', title: '당일 입장 인원의 건수 조회', project: '작업자 안전·인원 집계', body: '당일 입장 인원의 식별자 목록을 읽는 대신 저장소에서 건수를 직접 조회하도록 바꿨습니다.' },
        { id: '17', title: '일일 집계와 중복 저장 확인', project: '자산 측위·일일 집계', body: '일일 집계용 요약 자료의 생성·저장과 기존 자료 확인을 구현했습니다.' }
      ]
    },
    'JPA': {
      summary: 'Flowit의 도메인 저장과 조회를 구현하는 데 Spring Data JPA를 사용했습니다.',
      items: [{ id: '19', title: '협업 서비스의 데이터 접근', project: 'Flowit', body: '사용자·파일 도메인 저장과 회원가입 API를 구현하고 QueryDSL·커스텀 JPA 저장소를 구성했습니다.' }]
    },
    'MariaDB': {
      summary: '회사 프로젝트의 업무 데이터와 상태, 이력을 저장하는 관계형 데이터베이스로 사용했습니다.',
      items: [
        { id: '04', title: '실물 단위의 상태와 사용 이력', project: '화학물질 자산 관리', body: '같은 물질도 실물마다 상태·위치·사용 이력을 구분해 관리했습니다.' },
        { id: '17', title: '측위 데이터의 일일 요약', project: '자산 측위·일일 집계', body: '일일 집계용 요약 자료의 생성·저장과 기존 자료 확인을 구현했습니다.' }
      ]
    },
    'Redis': {
      summary: '공통 저장소 조회를 보완하고 여러 실행 주체의 알림 발송 경합을 처리하는 데 사용했습니다.',
      items: [
        { id: '18', title: 'Redis 키 분할 탐색', project: '공통 백엔드 설계', body: 'Redis 키를 나누어 탐색하도록 개선하고 빈 키와 여러 키 조회의 처리 조건을 보완했습니다.' },
        { id: '19', title: '수신자별 알림 발송 경합 처리', project: 'Flowit', body: '분산 잠금과 ZSET 재시도 큐로 같은 수신자의 알림 발송 경합을 보정했습니다.' }
      ]
    },
    'Nginx': { context: '개발·운영 환경', summary: '산업 현장 서비스의 개발 서버와 운영 환경에서 Nginx를 사용했습니다.', items: [fieldWork] },
    'HAProxy': { title: 'HAProxy® 로드 밸런서', context: '일부 프로젝트의 운영 환경', summary: '프로젝트별 구성에 맞춰 일부 서비스의 개발·운영 환경에 HAProxy 로드 밸런서를 사용했습니다.', items: [fieldWork] },
    'Rocky Linux': { context: '개발·운영 환경', summary: '회사 서비스의 개발 서버와 운영 환경에서 Rocky Linux를 사용했습니다.', items: [fieldWork] },
    'Ubuntu': { context: '개발·운영 환경', summary: '회사 서비스의 개발 서버와 운영 환경에서 Ubuntu를 사용했습니다.', items: [fieldWork] },
    'Docker': {
      summary: '로컬 개발 환경을 구성하고 진단 에이전트의 실행과 상태 출력을 확인하는 데 사용했습니다.',
      items: [
        { id: '19', title: '로컬 JDK 없이 실행하는 개발 환경', project: 'Flowit', body: 'Docker 실행 환경과 소스 해시 기반 재빌드 흐름을 구성했습니다.' },
        { id: '20', title: '진단 에이전트 smoke 환경', project: 'Bullseye', body: '컨테이너 실행, 상태 파일 갱신과 종료를 확인하는 개발 검증 환경을 구성했습니다.' }
      ]
    },
    'Naver Cloud Platform': { title: 'NCP', context: '개발·운영 환경', summary: '회사 서비스의 개발·운영 서버를 위한 클라우드 환경으로 Naver Cloud Platform을 사용했습니다.', items: [fieldWork] },
    'SSH': { context: '개발·운영 환경', summary: '개발 서버와 운영 서버에 접속하고 관리하는 과정에서 SSH를 사용했습니다.', items: [fieldWork] },
    'SSL': { context: '개발·운영 환경', summary: '개발·운영 환경에서 암호화 통신을 구성하는 데 SSL을 사용했습니다.', items: [fieldWork] },
    'Maven': { context: '공통 개발 환경', summary: '회사 프로젝트의 빌드와 의존성 관리에 Maven을 사용했습니다.', items: [fieldWork] }
  };

  const stack = document.getElementById('stack');
  if (!stack) return;
  const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const groups = [...stack.querySelectorAll('.stack-group')];
  let activeButton = null;
  let activePanel = null;
  let animation;

  function close(restoreFocus = false) {
    animation?.complete();
    animation = null;
    activeButton?.setAttribute('aria-expanded', 'false');
    if (activePanel) activePanel.hidden = true;
    if (restoreFocus) activeButton?.focus({ preventScroll: true });
    activeButton = null;
    activePanel = null;
  }

  groups.forEach((group, groupIndex) => {
    const panel = document.createElement('section');
    panel.className = 'stack-case-panel';
    panel.id = `stack-case-panel-${groupIndex}`;
    panel.hidden = true;
    group.append(panel);

    group.querySelectorAll('li.tech-item').forEach(item => {
      const name = item.getAttribute('aria-label');
      const entry = cases[name];
      if (!entry) { item.removeAttribute('tabindex'); return; }
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'tech-item';
      button.setAttribute('aria-label', name);
      button.setAttribute('aria-expanded', 'false');
      button.setAttribute('aria-controls', panel.id);
      button.append(...item.childNodes);
      const indicator = document.createElement('span');
      indicator.className = 'tech-case-indicator';
      indicator.setAttribute('aria-hidden', 'true');
      indicator.textContent = '↗';
      button.querySelector('.tech-icon').append(indicator);
      item.className = 'stack-tech';
      item.removeAttribute('aria-label');
      item.removeAttribute('tabindex');
      item.append(button);
      button.addEventListener('click', () => {
        const wasOpen = activeButton === button;
        close();
        if (wasOpen) return;
        const title = entry.title || name;
        panel.setAttribute('aria-label', `${title} 사용 경험`);
        panel.innerHTML = `<div class="stack-case-intro"><p class="stack-case-kicker">${escape(entry.context || '실제 사용 사례')}</p><h4>${escape(title)}</h4><p class="stack-case-summary">${escape(entry.summary)}</p></div>
          <ul class="stack-case-links">${entry.items.map(link => `<li><a href="${escape(link.href || `projects.html#project-${link.id}`)}"><span class="stack-case-project">${escape(link.project)}</span><strong>${escape(link.title)}<span aria-hidden="true">↗</span></strong><p>${escape(link.body)}</p></a></li>`).join('')}</ul>
          <button class="stack-case-close" type="button" aria-label="사용 사례 닫기">✕</button>`;
        panel.querySelector('.stack-case-close').addEventListener('click', () => close(true));
        panel.hidden = false;
        button.setAttribute('aria-expanded', 'true');
        activeButton = button;
        activePanel = panel;
        animation = window.portfolioMotion?.animate(panel, { opacity: [0, 1], y: [8, 0] }, { duration: .23 });
      });
    });
  });

  stack.addEventListener('keydown', event => {
    if (event.key === 'Escape' && activePanel && (activePanel.contains(event.target) || event.target === activeButton)) {
      event.preventDefault();
      close(true);
    }
  });
})();
