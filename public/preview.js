const root = document.getElementById('root');

const defaultProfile = {
  basics: {
    name: 'Sana Amruth Harsha',
    headline: 'Machine Learning & Deep Learning Researcher',
    email: 'amruthharshasana@gmail.com',
    location: 'IIT Bhubaneswar',
    website: 'https://example.com',
    bio: 'I build reliable ML systems and bring research to production with care for detail.'
  },
  experience: [
    {
      title: 'ML Processor Design Intern',
      company: 'Ceremorphic',
      startDate: '2023-06',
      endDate: '2023-12',
      location: 'Remote',
      description: 'Led model optimization experiments with VGG16/VGG19 and ResNet50.'
    }
  ],
  projects: [
    { name: 'Handwritten Digit Recognition', link: 'https://example.com', description: 'CNN/ANN models reaching 98.7% accuracy.' },
    { name: 'Bank Customer Segmentation', link: 'https://example.com', description: 'KMeans clustering to guide market strategy.' }
  ],
  skills: [{ name: 'Python' }, { name: 'TensorFlow' }, { name: 'PyTorch' }, { name: 'Scikit-learn' }],
  achievements: [{ name: 'Kaggle Competition Finalist' }],
  links: [
    { label: 'GitHub', url: 'https://github.com' },
    { label: 'LinkedIn', url: 'https://linkedin.com' }
  ]
};

let currentProfile = defaultProfile;
let renderScheduled = null;

function getProfileState(p) {
  const basics = p.basics || {};
  return {
    basics,
    hasAbout: Boolean((basics.bio && basics.bio.trim()) || (p.skills && p.skills.length) || basics.resume),
    hasEducation: p.education && p.education.length,
    hasProjects: p.projects && p.projects.length,
    hasExperience: p.experience && p.experience.length,
    hasAchievements: p.achievements && p.achievements.length,
    hasContact: Boolean(basics.email || basics.phone || basics.location),
    hasBasics: Boolean(
      (basics.name && basics.name.trim()) ||
      (basics.headline && basics.headline.trim()) ||
      (basics.email && basics.email.trim()) ||
      (basics.phone && basics.phone.trim()) ||
      (basics.location && basics.location.trim()) ||
      (basics.website && basics.website.trim()) ||
      (basics.bio && basics.bio.trim()) ||
      basics.photo ||
      basics.resume ||
      (basics.linkedin && basics.linkedin.trim()) ||
      (basics.github && basics.github.trim())
    ),
    navItems: (() => {
      const hasAbout = Boolean((basics.bio && basics.bio.trim()) || (p.skills && p.skills.length) || basics.resume);
      const hasEducation = p.education && p.education.length;
      const hasProjects = p.projects && p.projects.length;
      const hasExperience = p.experience && p.experience.length;
      const hasAchievements = p.achievements && p.achievements.length;
      const hasContact = Boolean(basics.email || basics.phone || basics.location);
      return [
        hasAbout ? '<li><a href="#about" class="nav__link">About</a></li>' : '',
        hasEducation ? '<li><a href="#education" class="nav__link">Education</a></li>' : '',
        hasProjects ? '<li><a href="#work" class="nav__link">Projects</a></li>' : '',
        hasExperience ? '<li><a href="#experi" class="nav__link">Experience</a></li>' : '',
        hasAchievements ? '<li><a href="#achievements" class="nav__link">Achievements</a></li>' : '',
        hasContact ? '<li><a href="#contact" class="nav__link">Contact</a></li>' : ''
      ].filter(Boolean).join('');
    })()
  };
}

/** Section ID in the DOM for each list section (education, experience, projects, achievements). */
const SECTION_IDS = { education: 'education', experience: 'experi', projects: 'work', achievements: 'achievements' };

function renderSectionEducation(p) {
  const list = (p.education || []).filter(e => !e.hidden);
  if (!list.length) return '';
  return `<div class="row">
    <h2>Education</h2>
    ${list.map((e) => `
    <div class="card fade-up delay-2">
      <h3>${escapeHtml([safeStr(e.degree), safeStr(e.school)].filter(Boolean).join(' · ') || 'Education')}</h3>
      <p>${escapeHtml([e.location, dateRange(e.startDate, e.endDate)].filter(Boolean).join(' · '))}</p>
      ${e.description ? `<p>${escapeHtml(e.description)}</p>` : ''}
    </div>
    `).join('')}
  </div>`;
}

function renderSectionExperience(p) {
  const list = (p.experience || []).filter(e => !e.hidden);
  if (!list.length) return '';
  return `<div class="row">
    <h2>Experience</h2>
    ${list.map((e) => `
    <div class="card fade-up delay-1">
      <h3>${escapeHtml([safeStr(e.title), safeStr(e.company)].filter(Boolean).join(' · ') || 'Role')}</h3>
      <p>${escapeHtml([e.location, dateRange(e.startDate, e.endDate)].filter(Boolean).join(' · '))}</p>
      <p>${sanitizeHtml(e.description || '')}</p>
      ${Array.isArray(e.skills) && e.skills.length ? `<ul class="work__list">${e.skills.map((s) => `<li>${escapeHtml(typeof s === 'string' ? s : s?.name)}</li>`).join('')}</ul>` : ''}
    </div>
    `).join('')}
  </div>`;
}

function renderSectionProjects(p) {
  const list = (p.projects || []).filter(e => !e.hidden);
  if (!list.length) return '';
  return `<div class="row">
    <h2>My Projects</h2>
    <div class="work__boxes">
      ${list.map((proj) => {
    const name = escapeHtml(safeStr(proj.name) || 'Project');
    const titleHtml = proj.link
      ? `<a class="nav__link" href="${escapeAttr(proj.link)}" target="_blank" rel="noopener noreferrer">${name}</a>`
      : name;
    const desc = proj.description && proj.description.trim();
    return `
      <div class="work__box fade-up delay-1">
        <h3>${titleHtml}</h3>
        ${desc ? `<p>${sanitizeHtml(desc)}</p>` : ''}
        ${Array.isArray(proj.skills) && proj.skills.length ? `<ul class="work__list">${proj.skills.map((s) => `<li>${escapeHtml(typeof s === 'string' ? s : s?.name)}</li>`).join('')}</ul>` : ''}
      </div>
      `;
  }).join('')}
    </div>
  </div>`;
}

function renderSectionAchievements(p) {
  const list = (p.achievements || []).filter(e => !e.hidden);
  if (!list.length) return '';
  return `<div class="row">
    <h2>Achievements</h2>
    ${list.map((a) => `
    <div class="card fade-up delay-2">
      <h3>${escapeHtml(safeStr(a.name) || safeStr(a) || 'Achievement')}</h3>
      ${a.description ? `<p>${sanitizeHtml(a.description)}</p>` : ''}
    </div>
    `).join('')}
  </div>`;
}

/** Patch section in-place (update text, add/remove cards) so there’s no full replace flash. */
function updateOnlySection(sectionKey) {
  const id = SECTION_IDS[sectionKey];
  if (!id) return false;
  const section = root.querySelector('#' + id);
  if (!section) return false;
  const p = normalizeProfile(currentProfile);
  const row = section.querySelector('.row');
  if (!row) {
    section.innerHTML = sectionKey === 'education' ? renderSectionEducation(p) : sectionKey === 'experience' ? renderSectionExperience(p) : sectionKey === 'projects' ? renderSectionProjects(p) : renderSectionAchievements(p);
    return true;
  }

  if (sectionKey === 'education') {
    const list = (p.education || []).filter(e => !e.hidden);
    const cards = row.querySelectorAll('.card');
    list.forEach((e, i) => {
      const title = [safeStr(e.degree), safeStr(e.school)].filter(Boolean).join(' · ') || 'Education';
      const meta = [safeStr(e.location), dateRange(e.startDate, e.endDate)].filter(Boolean).join(' · ');
      const desc = e.description ? escapeHtml(e.description) : '';
      if (cards[i]) {
        const h3 = cards[i].querySelector('h3');
        const ps = cards[i].querySelectorAll('p');
        if (h3 && h3.textContent !== title) h3.textContent = title;
        if (ps[0] && ps[0].textContent !== meta) ps[0].textContent = meta;
        if (ps[1]) {
          if (desc) { if (ps[1].textContent !== desc) ps[1].textContent = desc; }
          else ps[1].remove();
        } else if (desc) {
          const pEl = document.createElement('p');
          pEl.textContent = desc;
          cards[i].appendChild(pEl);
        }
      } else {
        const card = document.createElement('div');
        card.className = 'card fade-up delay-2';
        card.innerHTML = `<h3>${escapeHtml(title)}</h3><p>${escapeHtml(meta)}</p>${desc ? `<p>${desc}</p>` : ''}`;
        row.appendChild(card);
      }
    });
    for (let i = cards.length - 1; i >= list.length; i--) cards[i].remove();
    return true;
  }

  if (sectionKey === 'experience') {
    const list = (p.experience || []).filter(e => !e.hidden);
    const cards = row.querySelectorAll('.card');
    list.forEach((e, i) => {
      const title = [safeStr(e.title), safeStr(e.company)].filter(Boolean).join(' · ') || 'Role';
      const meta = [safeStr(e.location), dateRange(e.startDate, e.endDate)].filter(Boolean).join(' · ');
      const desc = sanitizeHtml(e.description || '');
      const skillsHtml = Array.isArray(e.skills) && e.skills.length ? `<ul class="work__list">${e.skills.map((s) => `<li>${escapeHtml(typeof s === 'string' ? s : s?.name)}</li>`).join('')}</ul>` : '';
      if (cards[i]) {
        const h3 = cards[i].querySelector('h3');
        const ps = cards[i].querySelectorAll('p');
        const ul = cards[i].querySelector('.work__list');
        if (h3 && h3.textContent !== title) h3.textContent = title;
        if (ps[0] && ps[0].textContent !== meta) ps[0].textContent = meta;
        if (ps[1] && ps[1].innerHTML !== desc) ps[1].innerHTML = desc;
        if (skillsHtml) {
          const ulHtml = ul ? ul.outerHTML : '';
          if (!ul || ulHtml !== skillsHtml) {
            if (ul) ul.outerHTML = skillsHtml;
            else cards[i].insertAdjacentHTML('beforeend', skillsHtml);
          }
        } else if (ul) ul.remove();
      } else {
        const card = document.createElement('div');
        card.className = 'card fade-up delay-2';
        card.innerHTML = `<h3>${escapeHtml(title)}</h3><p>${escapeHtml(meta)}</p><p>${desc}</p>${skillsHtml}`;
        row.appendChild(card);
      }
    });
    for (let i = cards.length - 1; i >= list.length; i--) cards[i].remove();
    return true;
  }

  if (sectionKey === 'projects') {
    const list = (p.projects || []).filter(e => !e.hidden);
    const boxes = row.querySelectorAll('.work__boxes')[0];
    if (!boxes) {
      section.innerHTML = renderSectionProjects(p);
      return true;
    }
    const existing = boxes.querySelectorAll('.work__box');
    list.forEach((proj, i) => {
      const name = safeStr(proj.name) || 'Project';
      const nameEsc = escapeHtml(name);
      const titleHtml = proj.link
        ? `<a class="nav__link" href="${escapeAttr(proj.link)}" target="_blank" rel="noopener noreferrer">${nameEsc}</a>`
        : nameEsc;
      const hasDesc = proj.description && proj.description.trim();
      const desc = hasDesc ? sanitizeHtml(proj.description.trim()) : '';
      const skillsHtml = Array.isArray(proj.skills) && proj.skills.length ? `<ul class="work__list">${proj.skills.map((s) => `<li>${escapeHtml(typeof s === 'string' ? s : s?.name)}</li>`).join('')}</ul>` : '';
      if (existing[i]) {
        const h3 = existing[i].querySelector('h3');
        const pEl = existing[i].querySelector(':scope > p');
        const ul = existing[i].querySelector('.work__list');
        if (h3 && h3.innerHTML !== titleHtml) h3.innerHTML = titleHtml;
        if (hasDesc) {
          if (pEl && pEl.innerHTML !== desc) pEl.innerHTML = desc;
          else if (!pEl) {
            const pNew = document.createElement('p');
            pNew.innerHTML = desc;
            h3.nextSibling ? existing[i].insertBefore(pNew, h3.nextSibling) : existing[i].appendChild(pNew);
          }
        } else if (pEl) pEl.remove();
        if (skillsHtml) {
          const ulHtml = ul ? ul.outerHTML : '';
          if (!ul || ulHtml !== skillsHtml) {
            if (ul) ul.outerHTML = skillsHtml;
            else existing[i].insertAdjacentHTML('beforeend', skillsHtml);
          }
        } else if (ul) ul.remove();
      } else {
        const box = document.createElement('div');
        box.className = 'work__box fade-up delay-1';
        box.innerHTML = `<h3>${titleHtml}</h3>${hasDesc ? `<p>${desc}</p>` : ''}${skillsHtml}`;
        boxes.appendChild(box);
      }
    });
    for (let i = existing.length - 1; i >= list.length; i--) existing[i].remove();
    return true;
  }

  if (sectionKey === 'achievements') {
    const list = (p.achievements || []).filter(e => !e.hidden);
    const cards = row.querySelectorAll('.card');
    list.forEach((a, i) => {
      const name = safeStr(a.name) || safeStr(a) || 'Achievement';
      const desc = a.description ? sanitizeHtml(a.description) : '';
      if (cards[i]) {
        const h3 = cards[i].querySelector('h3');
        const pEl = cards[i].querySelector('p');
        if (h3 && h3.textContent !== name) h3.textContent = name;
        if (desc) {
          if (pEl && pEl.innerHTML !== desc) pEl.innerHTML = desc;
          else if (!pEl) { const pNew = document.createElement('p'); pNew.innerHTML = desc; cards[i].appendChild(pNew); }
        } else if (pEl) pEl.remove();
      } else {
        const card = document.createElement('div');
        card.className = 'card fade-up delay-2';
        card.innerHTML = `<h3>${escapeHtml(name)}</h3>${desc ? `<p>${desc}</p>` : ''}`;
        row.appendChild(card);
      }
    });
    for (let i = cards.length - 1; i >= list.length; i--) cards[i].remove();
    return true;
  }

  return false;
}

function render() {
  try {
    const p = normalizeProfile(currentProfile);
    const basics = p.basics || {};
    const state = getProfileState(p);
    const { hasAbout, hasEducation, hasProjects, hasExperience, hasAchievements, hasContact, navItems } = state;
    const isEmptyProfile = !state.hasBasics && !hasEducation && !hasProjects && !hasExperience && !hasAchievements && !hasContact && (!p.skills || p.skills.length === 0);

    if (isEmptyProfile) {
      root.innerHTML = `
      <header class="header" id="top"></header>
      <footer class="footer">
        <div class="row">
          <p>© ${new Date().getFullYear()}</p>
        </div>
      </footer>
    `;
      return;
    }

    root.innerHTML = `
    <header class="header" id="top">
      <div class="row header__top">
        ${basics.photo ? `<div class="header__avatar"><img src="${escapeAttr(basics.photo)}" alt="Profile photo" /></div>` : ''}
        <nav class="nav">
          <ul class="nav__items">
            ${navItems}
          </ul>
        </nav>
      </div>
      <div class="row">
        <div class="header__text fade-up">
          <h1 class="heading-primary"><span>${escapeHtml(basics.name || 'Your Name')}</span></h1>
          <p>${escapeHtml(basics.headline || basics.bio || '')}</p>
        </div>
      </div>
    </header>

    <main>
      ${hasAbout ? `<section class="section about" id="about">
        <div class="row">
          <h2>About Me</h2>
          <div class="about__content">
            <div class="card fade-up delay-1">
              <p>${sanitizeHtml(basics.bio || 'Add a short bio about your work and values.')}</p>
              <div class="work__list">
                ${(p.skills || []).map((s) => `<li>${escapeHtml(s.name || s)}</li>`).join('')}
              </div>
              ${basics.resume ? `<a class="nav__link resume-link" href="${escapeAttr(basics.resume)}" download="resume.pdf">Download Resume</a>` : ''}
            </div>
          </div>
        </div>
      </section>` : ''}

      ${hasEducation ? `<section class="section contact" id="education">
        ${renderSectionEducation(p)}
      </section>` : ''}

      ${hasProjects ? `<section class="section work" id="work">
        ${renderSectionProjects(p)}
      </section>` : ''}

      ${hasExperience ? `<section class="section contact" id="experi">
        ${renderSectionExperience(p)}
      </section>` : ''}

      ${hasAchievements ? `<section class="section contact" id="achievements">
        ${renderSectionAchievements(p)}
      </section>` : ''}

      ${hasContact ? `<section class="section contact" id="contact">
        <div class="row">
          <h2>Get in Touch</h2>
          <div class="contact__info">
            <div class="contact-chips">
              ${[basics.email, basics.phone, basics.location].filter(Boolean).map((m) => `<span>${escapeHtml(m)}</span>`).join('')}
            </div>
            <a class="btn" href="mailto:${escapeAttr(basics.email || '')}">Email me</a>
          </div>
        </div>
      </section>` : ''}
    </main>

    <footer class="footer">
      <div class="row">
        <div class="footer__links">
          ${basics.linkedin ? `<a class="social-link" href="${escapeAttr(basics.linkedin)}" target="_blank" rel="noreferrer" aria-label="LinkedIn">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M4.98 3.5a2.5 2.5 0 1 1 0 5a2.5 2.5 0 0 1 0-5ZM3.5 9h3v11h-3V9Zm6 0h2.9v1.5h.1c.4-.8 1.5-1.6 3.1-1.6c3.3 0 3.9 2.2 3.9 5v6.1h-3v-5.4c0-1.3 0-3-1.8-3s-2.1 1.4-2.1 2.9V20h-3V9Z"/></svg>
          </a>` : ''}
          ${basics.github ? `<a class="social-link" href="${escapeAttr(basics.github)}" target="_blank" rel="noreferrer" aria-label="GitHub">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2C6.48 2 2 6.58 2 12.26c0 4.55 2.87 8.41 6.84 9.77c.5.1.68-.22.68-.48c0-.24-.01-.87-.01-1.7c-2.78.62-3.37-1.38-3.37-1.38c-.45-1.2-1.1-1.52-1.1-1.52c-.9-.63.07-.62.07-.62c1 .07 1.52 1.06 1.52 1.06c.9 1.57 2.36 1.12 2.94.86c.09-.67.35-1.12.63-1.38c-2.22-.26-4.56-1.13-4.56-5.04c0-1.11.39-2.02 1.03-2.74c-.1-.26-.45-1.32.1-2.75c0 0 .84-.27 2.75 1.05c.8-.23 1.65-.34 2.5-.34c.85 0 1.7.12 2.5.34c1.9-1.32 2.74-1.05 2.74-1.05c.55 1.43.2 2.49.1 2.75c.64.72 1.03 1.63 1.03 2.74c0 3.92-2.35 4.77-4.58 5.02c.36.32.68.95.68 1.92c0 1.39-.01 2.5-.01 2.84c0 .27.18.59.69.48C19.14 20.67 22 16.81 22 12.26C22 6.58 17.52 2 12 2Z"/></svg>
          </a>` : ''}
        </div>
        <p>© ${new Date().getFullYear()} ${escapeHtml(basics.name || 'Your Name')}</p>
      </div>
    </footer>
  `;
  } catch (err) {
    root.innerHTML = `<div style="padding:24px;color:#fff;">Preview error: ${escapeHtml(err.message || 'Unknown')}</div>`;
  }
}

function normalizeLinks(basics, links) {
  const items = [];
  if (basics?.website) items.push({ label: basics.website, url: basics.website });
  if (basics?.linkedin) items.push({ label: 'LinkedIn', url: basics.linkedin });
  if (basics?.github) items.push({ label: 'GitHub', url: basics.github });
  (Array.isArray(links) ? links : []).forEach((l) => {
    if (typeof l === 'string') {
      if (l.trim()) items.push({ label: l, url: l });
      return;
    }
    const url = l?.url || l?.link || '';
    const label = l?.label || url;
    if (url) items.push({ label, url });
  });
  return items;
}

function normalizeProfile(profile) {
  if (!profile) return defaultProfile;
  const base = {
    basics: {
      name: '',
      headline: '',
      email: '',
      phone: '',
      location: '',
      website: '',
      bio: ''
    },
    education: [],
    experience: [],
    projects: [],
    skills: [],
    achievements: [],
    links: []
  };

  if (!profile.basics) {
    return {
      ...base,
      basics: {
        ...base.basics,
        name: profile.name || 'Your Name',
        headline: profile.bio || '',
        bio: profile.bio || ''
      },
      experience: Array.isArray(profile.experience) ? profile.experience.map((e) => ({ title: e })) : [],
      projects: Array.isArray(profile.projects) ? profile.projects.map((p) => ({ name: p })) : [],
      links: Array.isArray(profile.links) ? profile.links.map((l) => ({ url: l, label: l })) : []
    };
  }

  return {
    ...base,
    ...profile,
    basics: { ...base.basics, ...profile.basics },
    education: Array.isArray(profile.education) ? profile.education : [],
    experience: Array.isArray(profile.experience) ? profile.experience : [],
    projects: Array.isArray(profile.projects) ? profile.projects : [],
    skills: Array.isArray(profile.skills) ? profile.skills : [],
    achievements: Array.isArray(profile.achievements) ? profile.achievements : [],
    links: Array.isArray(profile.links) ? profile.links : []
  };
}

function safeStr(val) {
  if (val != null && typeof val === 'string') return val;
  if (val && typeof val.name === 'string') return val.name;
  return '';
}

function escapeHtml(str) {
  const s = (str != null && typeof str === 'string') ? str : (str && typeof str.name === 'string' ? str.name : '');
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function escapeAttr(str) {
  return escapeHtml(str).replace(/\s/g, '');
}

function sanitizeHtml(html) {
  const allowed = new Set(['B', 'I', 'EM', 'STRONG', 'UL', 'OL', 'LI', 'A', 'BR', 'P']);
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const walker = document.createTreeWalker(doc.body, NodeFilter.SHOW_ELEMENT, null);
  const nodesToRemove = [];
  while (walker.nextNode()) {
    const el = walker.currentNode;
    if (!allowed.has(el.tagName)) {
      nodesToRemove.push(el);
      continue;
    }
    [...el.attributes].forEach((attr) => {
      if (el.tagName === 'A' && attr.name === 'href') return;
      el.removeAttribute(attr.name);
    });
  }
  nodesToRemove.forEach((el) => {
    el.replaceWith(...el.childNodes);
  });
  return doc.body.innerHTML.trim();
}

function dateRange(start, end) {
  if (!start && !end) return '';
  const startFmt = formatMonth(start);
  const endFmt = formatMonth(end);
  if (start && end) return `${startFmt} — ${endFmt}`;
  return startFmt || endFmt;
}

function formatMonth(value) {
  if (!value) return '';
  const parts = String(value).split('-');
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  if (!year || !month) return value;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[month - 1]} ${year}`;
}

window.addEventListener('message', (event) => {
  if (event.data?.type !== 'profile' || !event.data.profile) return;
  const { profile, onlyUpdateSection } = event.data;
  currentProfile = profile;

  if (onlyUpdateSection && SECTION_IDS[onlyUpdateSection]) {
    const id = SECTION_IDS[onlyUpdateSection];
    const el = root.querySelector('#' + id);
    if (el) {
      updateOnlySection(onlyUpdateSection);
      return;
    }
  }

  if (renderScheduled != null) return;
  renderScheduled = requestAnimationFrame(() => {
    renderScheduled = null;
    render();
  });
});

render();
window.parent.postMessage({ type: 'ready' }, '*');
