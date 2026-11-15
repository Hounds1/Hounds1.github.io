(() => {
  'use strict';

  const triggers = [...document.querySelectorAll('[data-credits-dialog]')];
  if (!triggers.length || typeof HTMLDialogElement === 'undefined' || !HTMLDialogElement.prototype.showModal) return;

  const components = [
    {
      name: 'Pretendard Variable', version: '1.3.9', license: 'OFL-1.1',
      description: '포트폴리오 전체에 사용한 글꼴입니다. 공식 배포본 그대로 사용합니다.',
      owner: '© 2021 Kil Hyung-jin · Reserved Font Name: Pretendard',
      url: 'https://github.com/orioncactus/pretendard', file: 'OFL.txt'
    },
    {
      name: 'Motion', version: '14.14.0', license: 'MIT',
      description: '화면 진입, 카드 반응과 프로젝트 상세 전환에 사용했습니다.',
      owner: '© 2024 Motion B.V.',
      url: 'https://motion.dev/', file: 'vendor/motion-LICENSE.txt'
    },
    {
      name: 'particles.js', version: '2.0.0', license: 'MIT',
      description: '첫 화면의 파티클 배경에 사용했습니다.',
      owner: '© 2015 Vincent Garreau',
      url: 'https://github.com/VincentGarreau/particles.js', file: 'vendor/particles-LICENSE.txt'
    },
    {
      name: 'Lucide Static', version: '1.73.0', license: 'ISC · MIT',
      description: '구름·터미널·잠금 아이콘 3종을 사용하고 색상과 선 두께를 조정했습니다.',
      owner: '© 2026 Lucide Icons and Contributors · Feather 파생 아이콘: © 2013–present Cole Bemis',
      url: 'https://lucide.dev/', file: 'assets/icons/lucide-LICENSE.txt'
    }
  ];

  const dialog = document.createElement('dialog');
  dialog.id = 'credits-dialog';
  dialog.className = 'credits-dialog';
  dialog.setAttribute('aria-labelledby', 'credits-title');
  dialog.setAttribute('aria-describedby', 'credits-intro');
  dialog.innerHTML = `
    <header class="credits-header">
      <div class="credits-heading"><p class="credits-kicker">CREDITS</p><h2 id="credits-title" tabindex="-1">출처·라이선스</h2></div>
      <button class="credits-close" type="button" aria-label="출처·라이선스 닫기">닫기 <span aria-hidden="true">✕</span></button>
    </header>
    <div class="credits-body">
      <p class="credits-intro" id="credits-intro">이 포트폴리오에 사용한 글꼴, 오픈소스와 이미지의 출처입니다.</p>
      <section class="credits-section" aria-labelledby="credits-components-title">
        <h3 class="credits-section-title" id="credits-components-title">글꼴과 오픈소스</h3>
        ${components.map(component => `
          <article class="credits-entry">
            <div class="credits-entry-top"><h4>${component.name} <span>${component.version}</span></h4><span class="credits-license">${component.license}</span></div>
            <p class="credits-description">${component.description}</p>
            <p class="credits-owner">${component.owner}</p>
            <div class="credits-links"><a href="${component.url}" target="_blank" rel="noopener noreferrer" aria-label="${component.name} 공식 사이트 (새 탭)">공식 사이트 <span aria-hidden="true">↗</span></a></div>
            <details class="credits-detail" data-license-file="${component.file}">
              <summary>${component.name} 라이선스 전문</summary>
              <div class="credits-license-content"></div>
            </details>
          </article>`).join('')}
      </section>
      <section class="credits-section" aria-labelledby="credits-original-title">
        <h3 class="credits-section-title" id="credits-original-title">직접 만든 시각 자료</h3>
        <div class="credits-originals">
          <article class="credits-entry"><div class="credits-entry-top"><h4>기술 아이콘 <span>11종</span></h4><span class="credits-license">자체 제작</span></div><p class="credits-description">AI 코딩 도움을 받아 제작한 기능 기호입니다. 서버·데이터·배포 역할을 표현하며, 브랜드 로고를 사용하지 않습니다.</p></article>
          <article class="credits-entry"><div class="credits-entry-top"><h4>프로젝트 이미지 <span>19종</span></h4><span class="credits-license">AI 생성</span></div><p class="credits-description">OpenAI 이미지 생성 도구로 만든 콘셉트 이미지입니다. 실제 현장 사진이나 프로젝트 스크린샷이 아닙니다.</p></article>
        </div>
      </section>
      <details class="credits-detail credits-record" data-license-file="THIRD-PARTY.txt">
        <summary>전체 출처 기록</summary><div class="credits-license-content"></div>
      </details>
      <div class="credits-links"><a href="THIRD-PARTY.txt" download>출처 기록 내려받기 <span aria-hidden="true">↓</span></a><a href="asset-sources.json" download>파일별 출처 내려받기 <span aria-hidden="true">↓</span></a></div>
      <p class="credits-trademark">HAProxy®는 HAProxy Technologies SAS의 등록 상표입니다. 이 포트폴리오는 HAProxy와 제휴 관계가 없으며 후원이나 보증을 받지 않습니다. <a href="https://www.haproxy.com/legal/haproxy-trademark-policy" target="_blank" rel="noopener noreferrer">상표 안내 ↗</a></p>
    </div>`;
  document.body.append(dialog);

  const title = dialog.querySelector('#credits-title');
  const content = dialog.querySelector('.credits-body');
  const loaded = new Map();
  let opener;
  let pointerStartedOutside = false;

  async function loadLicense(detail) {
    if (detail.dataset.state === 'loading' || detail.dataset.state === 'loaded') return;
    const file = detail.dataset.licenseFile;
    const container = detail.querySelector('.credits-license-content');
    detail.dataset.state = 'loading';
    container.setAttribute('aria-busy', 'true');
    const status = document.createElement('p');
    status.setAttribute('role', 'status');
    status.textContent = '전문을 불러오고 있습니다.';
    container.replaceChildren(status);

    try {
      let text = loaded.get(file);
      if (text === undefined) {
        const response = await fetch(file);
        if (!response.ok) throw new Error('License unavailable');
        text = await response.text();
        loaded.set(file, text);
      }
      const pre = document.createElement('pre');
      pre.lang = 'en';
      pre.textContent = text;
      container.replaceChildren(pre);
      detail.dataset.state = 'loaded';
    } catch (_) {
      detail.dataset.state = 'error';
      status.textContent = '전문을 불러오지 못했습니다.';
      const retry = document.createElement('button');
      retry.type = 'button';
      retry.textContent = '다시 시도';
      retry.addEventListener('click', () => loadLicense(detail));
      const download = document.createElement('a');
      download.href = file;
      download.download = '';
      download.textContent = '원문 내려받기';
      container.append(retry, download);
    } finally {
      container.removeAttribute('aria-busy');
    }
  }

  dialog.querySelectorAll('[data-license-file]').forEach(detail => {
    detail.addEventListener('toggle', () => { if (detail.open) loadLicense(detail); });
  });

  triggers.forEach(trigger => {
    trigger.setAttribute('aria-haspopup', 'dialog');
    trigger.setAttribute('aria-controls', dialog.id);
    trigger.addEventListener('click', event => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      if (dialog.open) return;
      opener = trigger;
      dialog.showModal();
      document.documentElement.classList.add('has-credits-dialog');
      content.scrollTop = 0;
      title.focus({ preventScroll: true });
    });
  });

  dialog.querySelector('.credits-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('keydown', event => {
    if (event.key !== 'Tab') return;
    const controls = [...dialog.querySelectorAll('a[href], button:not([disabled]), summary')]
      .filter(element => element.getClientRects().length > 0);
    const first = controls[0];
    const last = controls[controls.length - 1];
    const active = document.activeElement;
    if (active === title || (event.shiftKey && active === first) || (!event.shiftKey && active === last)) {
      event.preventDefault();
      (event.shiftKey ? last : first)?.focus();
    }
  });
  const isOutside = event => {
    const rect = dialog.getBoundingClientRect();
    return event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom);
  };
  dialog.addEventListener('pointerdown', event => { pointerStartedOutside = isOutside(event); });
  dialog.addEventListener('pointercancel', () => { pointerStartedOutside = false; });
  dialog.addEventListener('click', event => {
    if (pointerStartedOutside && isOutside(event)) dialog.close();
    pointerStartedOutside = false;
  });
  dialog.addEventListener('close', () => {
    document.documentElement.classList.remove('has-credits-dialog');
    pointerStartedOutside = false;
    if (opener?.isConnected) opener.focus({ preventScroll: true });
  });
})();
