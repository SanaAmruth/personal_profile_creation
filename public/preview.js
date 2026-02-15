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

function render() {
  try {
  const p = normalizeProfile(currentProfile);
  const basics = p.basics || {};
  const links = normalizeLinks(basics, p.links);

  root.innerHTML = `
    <header class="header" id="top">
      <div class="row header__top">
        <div class="header__avatar">
          ${basics.photo ? `<img src="${escapeAttr(basics.photo)}" alt="Profile photo" />` : '<div class="avatar__placeholder">Photo</div>'}
        </div>
        <nav class="nav">
          <ul class="nav__items">
            <li><a href="#about" class="nav__link">About</a></li>
            <li><a href="#education" class="nav__link">Education</a></li>
            <li><a href="#work" class="nav__link">Projects</a></li>
            <li><a href="#experi" class="nav__link">Experience</a></li>
            <li><a href="#achievements" class="nav__link">Achievements</a></li>
            <li><a href="#contact" class="nav__link">Contact</a></li>
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
      <section class="section about" id="about">
        <div class="row">
          <h2>About Me</h2>
          <div class="about__content">
            <div class="card fade-up delay-1">
              <p>${sanitizeHtml(basics.bio || 'Add a short bio about your work and values.')}</p>
              <div class="work__list">
                ${p.skills.map((s) => `<li>${escapeHtml(s.name || s)}</li>`).join('')}
              </div>
              ${basics.resume ? `<a class="nav__link resume-link" href="${escapeAttr(basics.resume)}" download="resume.pdf">Download Resume</a>` : ''}
            </div>
          </div>
        </div>
      </section>

      <section class="section contact" id="education">
        <div class="row">
          <h2>Education</h2>
          ${p.education.map((e) => `
            <div class="card fade-up delay-2">
              <h3>${escapeHtml([e.degree, e.school].filter(Boolean).join(' · ') || 'Education')}</h3>
              <p>${escapeHtml([e.location, dateRange(e.startDate, e.endDate)].filter(Boolean).join(' · '))}</p>
              ${e.description ? `<p>${escapeHtml(e.description)}</p>` : ''}
            </div>
          `).join('')}
        </div>
      </section>

      <section class="section work" id="work">
        <div class="row">
          <h2>My Projects</h2>
          <div class="work__boxes">
            ${p.projects.map((proj) => `
              <div class="work__box fade-up delay-1">
                <h3>${escapeHtml(proj.name || 'Project')}</h3>
                <p>${sanitizeHtml(proj.description || '')}</p>
                ${Array.isArray(proj.skills) && proj.skills.length ? `
                  <ul class="work__list">
                    ${proj.skills.map((s) => `<li>${escapeHtml(s.name || s)}</li>`).join('')}
                  </ul>
                ` : ''}
                ${proj.link ? `<a class="nav__link" href="${escapeAttr(proj.link)}">Visit</a>` : ''}
              </div>
            `).join('')}
          </div>
        </div>
      </section>

      <section class="section contact" id="experi">
        <div class="row">
          <h2>Experience</h2>
          ${p.experience.map((e) => `
            <div class="card fade-up delay-2">
              <h3>${escapeHtml([e.title, e.company].filter(Boolean).join(' · ') || 'Role')}</h3>
              <p>${escapeHtml([e.location, dateRange(e.startDate, e.endDate)].filter(Boolean).join(' · '))}</p>
              <p>${sanitizeHtml(e.description || '')}</p>
              ${Array.isArray(e.skills) && e.skills.length ? `
                <ul class="work__list">
                  ${e.skills.map((s) => `<li>${escapeHtml(s.name || s)}</li>`).join('')}
                </ul>
              ` : ''}
            </div>
          `).join('')}
        </div>
      </section>

      <section class="section contact" id="achievements">
        <div class="row">
          <h2>Achievements</h2>
          ${p.achievements.map((a) => `
            <div class="card fade-up delay-2">
              <h3>${escapeHtml(a.name || a || 'Achievement')}</h3>
              ${a.description ? `<p>${sanitizeHtml(a.description)}</p>` : ''}
            </div>
          `).join('')}
        </div>
      </section>

      <section class="section contact" id="contact">
        <div class="row">
          <h2>Get in Touch</h2>
          <div class="contact__info">
            <div class="contact-chips">
              ${[basics.email, basics.phone, basics.location].filter(Boolean).map((m) => `<span>${escapeHtml(m)}</span>`).join('')}
            </div>
            <a class="btn" href="mailto:${escapeAttr(basics.email || '')}">Email me</a>
          </div>
        </div>
      </section>
    </main>

    <footer class="footer">
      <div class="row">
        <div class="footer__links">
          ${links.map((l) => `<a href="${escapeAttr(l.url)}">${escapeHtml(l.label)}</a>`).join('')}
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

function escapeHtml(str) {
  return String(str)
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
  if (event.data?.type === 'profile' && event.data.profile) {
    currentProfile = event.data.profile;
    render();
  }
});

render();
window.parent.postMessage({ type: 'ready' }, '*');
