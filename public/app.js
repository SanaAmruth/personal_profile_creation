const authSection = document.getElementById('auth-section');
const formSection = document.getElementById('form-section');
const templatesSection = document.getElementById('templates-section');
const authBar = document.getElementById('auth-bar');
const navHome = document.getElementById('nav-home');

const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const showRegisterBtn = document.getElementById('show-register');
const showLoginBtn = document.getElementById('show-login');
const authMessage = document.getElementById('auth-message');
const templateGallery = document.getElementById('template-gallery');
const githubConnect = document.getElementById('github-connect');
const githubCancel = document.getElementById('github-cancel');
const editInfoBtn = document.getElementById('edit-info');
const hostBtn = document.getElementById('host-btn');
const hostStatus = document.getElementById('host-status');

const saveProfileBtn = document.getElementById('save-profile');
const selectorButtons = document.querySelectorAll('.selector-btn');
const detailPanels = document.querySelectorAll('.detail-panel');
const builderLayout = document.getElementById('builder-layout');
const basicsInputs = {
  name: document.getElementById('basic-name'),
  headline: document.getElementById('basic-headline'),
  email: document.getElementById('basic-email'),
  phone: document.getElementById('basic-phone'),
  location: document.getElementById('basic-location'),
  website: document.getElementById('basic-website'),
  bio: document.getElementById('basic-bio'),
  photo: document.getElementById('basic-photo'),
  resume: document.getElementById('basic-resume')
};
const photoPreview = document.getElementById('basic-photo-preview');
const resumeName = document.getElementById('basic-resume-name');

const modal = document.getElementById('entry-modal');
const modalFields = document.getElementById('modal-fields');
const modalTitle = document.getElementById('modal-title');
const modalForm = document.getElementById('entry-form');
const modalClose = document.getElementById('modal-close');
const modalCancel = document.getElementById('modal-cancel');
const modalBackdrop = document.getElementById('modal-backdrop');
const skillsInput = document.getElementById('skills-input');
const skillsChips = document.getElementById('skills-chips');

const templates = [
  { id: 'profile', name: 'Signature Profile' }
];

const sectionDefs = {
  education: {
    label: 'Education',
    fields: [
      { key: 'degree', label: 'Degree' },
      { key: 'school', label: 'School' },
      { key: 'startDate', label: 'Start Date', type: 'month' },
      { key: 'endDate', label: 'End Date', type: 'month' },
      { key: 'location', label: 'Location' },
      { key: 'link', label: 'Link' },
      { key: 'description', label: 'Description', type: 'textarea' }
    ]
  },
  experience: {
    label: 'Work Experience',
    fields: [
      { key: 'title', label: 'Title' },
      { key: 'company', label: 'Company' },
      { key: 'startDate', label: 'Start Date', type: 'month' },
      { key: 'endDate', label: 'End Date', type: 'month' },
      { key: 'location', label: 'Location' },
      { key: 'skills', label: 'Skills used', type: 'chips', placeholder: 'Add a skill and press Enter' },
      { key: 'description', label: 'Description', type: 'textarea' }
    ]
  },
  projects: {
    label: 'Projects',
    fields: [
      { key: 'name', label: 'Project name' },
      { key: 'link', label: 'Link' },
      { key: 'skills', label: 'Skills used', type: 'chips', placeholder: 'Add a skill and press Enter' },
      { key: 'description', label: 'Description', type: 'textarea' }
    ]
  },
  skills: {
    label: 'Skills',
    fields: [{ key: 'name', label: 'Skill' }]
  },
  achievements: {
    label: 'Achievements',
    fields: [{ key: 'name', label: 'Achievement' }]
  },
  links: {
    label: 'Links',
    fields: [
      { key: 'label', label: 'Label' },
      { key: 'url', label: 'URL' }
    ]
  }
};

let currentProfile = null;
let profileState = emptyProfile();
let favorites = new Set();
let selectedTemplate = null;
let githubReady = false;
let activeSection = null;
let activeIndex = null;

function emptyProfile() {
  return {
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
}

function normalizeProfile(profile) {
  if (!profile) return emptyProfile();
  if (profile.basics) return profile;
  return {
    basics: {
      name: profile.name || '',
      headline: profile.bio || '',
      email: '',
      phone: '',
      location: '',
      website: '',
      bio: profile.bio || ''
    },
    education: [],
    experience: Array.isArray(profile.experience) ? profile.experience.map((e) => ({ title: e })) : [],
    projects: Array.isArray(profile.projects) ? profile.projects.map((p) => ({ name: p })) : [],
    skills: [],
    achievements: [],
    links: Array.isArray(profile.links) ? profile.links.map((l) => ({ url: l, label: l })) : []
  };
}

function show(section) {
  [authSection, formSection, templatesSection].forEach((el) => el.classList.add('hidden'));
  section.classList.remove('hidden');
}

function renderAuthBar(user) {
  authBar.innerHTML = '';
  if (user) {
    const span = document.createElement('span');
    span.textContent = user.email;
    const btn = document.createElement('button');
    btn.textContent = 'Logout';
    btn.className = 'secondary';
    btn.onclick = async () => {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.reload();
    };
    authBar.append(span, btn);
  }
}

navHome?.addEventListener('click', () => {
  window.location.href = '/';
});

async function init() {
  const me = await fetch('/api/me').then((r) => r.json());
  renderAuthBar(me.user);

  if (!me.user) {
    show(authSection);
    return;
  }

  const profileRes = await fetch('/api/profile').then((r) => r.json());
  currentProfile = profileRes.profile;

  const favRes = await fetch('/api/favorites').then((r) => r.json());
  favorites = new Set(favRes.favorites || []);

  if (!currentProfile) {
    show(formSection);
    initBuilder(emptyProfile());
  } else {
    profileState = normalizeProfile(currentProfile);
    show(templatesSection);
    renderTemplates();
  }

  const ghStatus = await fetch('/api/github/status').then((r) => r.json());
  githubReady = Boolean(ghStatus.connected);
  if (githubReady) {
    const ghLabel = ghStatus.login ? `GitHub connected (${ghStatus.login}). Select a template and host.` : 'GitHub connected. Select a template and host.';
    hostStatus.textContent = ghLabel;
    githubConnect.textContent = 'GitHub Connected';
    githubConnect.disabled = true;
    githubCancel.classList.remove('hidden');
  } else {
    hostStatus.textContent = 'Connect GitHub to host your site.';
    githubConnect.textContent = 'Connect GitHub';
    githubConnect.disabled = false;
    githubCancel.classList.add('hidden');
    hostBtn.disabled = true;
  }

  if (window.location.hash === '#host-ready') {
    history.replaceState(null, '', window.location.pathname);
  }
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(loginForm);
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: formData.get('email'), password: formData.get('password') })
  });
  if (res.ok) {
    window.location.reload();
  } else {
    const json = await res.json().catch(() => ({}));
    showAuthMessage(json.error || 'Login failed');
  }
});

registerForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(registerForm);
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: formData.get('email'), password: formData.get('password') })
  });
  if (res.ok) {
    registerForm.classList.add('hidden');
    loginForm.classList.remove('hidden');
    showAuthMessage('Account created. Please log in.');
  } else {
    const json = await res.json().catch(() => ({}));
    showAuthMessage(json.error || 'Registration failed');
  }
});

showRegisterBtn?.addEventListener('click', () => {
  loginForm.classList.add('hidden');
  registerForm.classList.remove('hidden');
  hideAuthMessage();
});

showLoginBtn?.addEventListener('click', () => {
  registerForm.classList.add('hidden');
  loginForm.classList.remove('hidden');
  hideAuthMessage();
});

function showAuthMessage(text) {
  if (!authMessage) return;
  authMessage.textContent = text;
  authMessage.classList.remove('hidden');
}

function hideAuthMessage() {
  if (!authMessage) return;
  authMessage.textContent = '';
  authMessage.classList.add('hidden');
}

editInfoBtn.addEventListener('click', () => {
  initBuilder(normalizeProfile(currentProfile));
  show(formSection);
});

githubConnect.addEventListener('click', () => {
  window.location.href = '/auth/github';
});

githubCancel.addEventListener('click', async () => {
  await fetch('/api/github/disconnect', { method: 'POST' });
  githubReady = false;
  hostStatus.textContent = 'Connect GitHub to host your site.';
  githubConnect.textContent = 'Connect GitHub';
  githubConnect.disabled = false;
  githubCancel.classList.add('hidden');
  hostBtn.disabled = true;
});

hostBtn.addEventListener('click', async () => {
  if (!selectedTemplate) return;
  hostBtn.disabled = true;
  hostStatus.textContent = 'Creating repo and deploying...';
  const res = await fetch('/api/host', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ templateId: selectedTemplate })
  });
  const json = await res.json();
  if (res.ok) {
    hostStatus.innerHTML = `Live: <a href="${json.pagesUrl}" target="_blank">${json.pagesUrl}</a>`;
  } else {
    hostStatus.textContent = json.error || 'Hosting failed';
  }
  hostBtn.disabled = false;
});

function initBuilder(profile) {
  profileState = profile;
  setBasicsInputs(profile.basics || {});
  renderSections();
  setActivePanel(null);
}

function setBasicsInputs(basics) {
  Object.keys(basicsInputs).forEach((key) => {
    if (key === 'photo') {
      if (basics.photo) {
        if (basics.photo.length > 1_000_000) {
          basicsInputs.photo.dataset.value = '';
          if (photoPreview) photoPreview.classList.add('hidden');
          return;
        }
        basicsInputs.photo.dataset.value = basics.photo;
        if (photoPreview) {
          photoPreview.src = basics.photo;
          photoPreview.classList.remove('hidden');
        }
      }
      return;
    }
    if (key === 'resume') {
      if (basics.resume) {
        basicsInputs.resume.dataset.value = basics.resume;
        if (resumeName) {
          resumeName.textContent = basics.resumeName || 'resume.pdf';
          resumeName.classList.remove('hidden');
        }
      }
      return;
    }
    basicsInputs[key].value = basics[key] || '';
  });
}

function readBasicsInputs() {
  const basics = {};
  Object.keys(basicsInputs).forEach((key) => {
    if (key === 'photo') {
      basics.photo = basicsInputs.photo.dataset.value || '';
      return;
    }
    if (key === 'resume') {
      basics.resume = basicsInputs.resume.dataset.value || '';
      basics.resumeName = basicsInputs.resume.dataset.name || '';
      return;
    }
    basics[key] = basicsInputs[key].value.trim();
  });
  return basics;
}

basicsInputs.photo?.addEventListener('change', (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    alert('Please upload an image file (JPG/PNG).');
    event.target.value = '';
    basicsInputs.photo.dataset.value = '';
    if (photoPreview) photoPreview.classList.add('hidden');
    return;
  }
  if (file.size > 5_000_000) {
    alert('Image is too large (max 5MB). Please choose a smaller photo.');
    event.target.value = '';
    basicsInputs.photo.dataset.value = '';
    if (photoPreview) photoPreview.classList.add('hidden');
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      const maxSize = 320;
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
      if (dataUrl.length > 1_000_000) {
        alert('Image is too large. Please use a smaller photo.');
        event.target.value = '';
        basicsInputs.photo.dataset.value = '';
        if (photoPreview) photoPreview.classList.add('hidden');
        return;
      }
      basicsInputs.photo.dataset.value = dataUrl;
      if (photoPreview) {
        photoPreview.src = dataUrl;
        photoPreview.classList.remove('hidden');
      }
    };
    img.src = String(reader.result || '');
  };
  reader.readAsDataURL(file);
});

basicsInputs.resume?.addEventListener('change', (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  if (file.type !== 'application/pdf') {
    alert('Please upload a PDF file.');
    event.target.value = '';
    basicsInputs.resume.dataset.value = '';
    basicsInputs.resume.dataset.name = '';
    if (resumeName) resumeName.classList.add('hidden');
    return;
  }
  if (file.size > 2_000_000) {
    alert('Resume file is too large (max 2MB).');
    event.target.value = '';
    basicsInputs.resume.dataset.value = '';
    basicsInputs.resume.dataset.name = '';
    if (resumeName) resumeName.classList.add('hidden');
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    const dataUrl = String(reader.result || '');
    basicsInputs.resume.dataset.value = dataUrl;
    basicsInputs.resume.dataset.name = file.name;
    if (resumeName) {
      resumeName.textContent = file.name;
      resumeName.classList.remove('hidden');
    }
  };
  reader.readAsDataURL(file);
});

function renderSections() {
  Object.keys(sectionDefs).forEach((sectionId) => {
    const container = document.getElementById(`section-${sectionId}`);
    const items = profileState[sectionId] || [];
    if (sectionId !== 'skills') {
      container.innerHTML = '';
    }

    if (!items.length) {
      if (sectionId !== 'skills') {
        const empty = document.createElement('div');
        empty.className = 'entry-item';
        empty.textContent = 'No entries yet.';
        container.appendChild(empty);
        return;
      }
    }

    if (sectionId === 'skills') {
      renderSkillChips();
      return;
    }

    const list = document.createElement('div');
    list.className = 'entry-list';

    items.forEach((item, index) => {
      const entry = document.createElement('div');
      entry.className = 'entry-item';

      const info = document.createElement('div');
      const title = document.createElement('div');
      title.className = 'entry-title';
      const meta = document.createElement('div');
      meta.className = 'entry-meta';

      const summary = getEntrySummary(sectionId, item);
      title.textContent = summary.title;
      meta.textContent = summary.meta;

      info.append(title, meta);
      if ((sectionId === 'projects' || sectionId === 'experience') && Array.isArray(item.skills) && item.skills.length) {
        const chipRow = document.createElement('div');
        chipRow.className = 'chip-row';
        item.skills.forEach((skill) => {
          const chip = document.createElement('span');
          chip.className = 'chip';
          chip.textContent = skill?.name || skill;
          chipRow.appendChild(chip);
        });
        info.appendChild(chipRow);
      }

      const actions = document.createElement('div');
      actions.className = 'entry-actions';

      const editBtn = document.createElement('button');
      editBtn.className = 'ghost';
      editBtn.textContent = 'Edit';
      editBtn.onclick = () => openModal(sectionId, index);

      const delBtn = document.createElement('button');
      delBtn.className = 'secondary';
      delBtn.textContent = 'Remove';
      delBtn.onclick = () => {
        profileState[sectionId].splice(index, 1);
        renderSections();
      };

      actions.append(editBtn, delBtn);
      entry.append(info, actions);
      list.appendChild(entry);
    });

    container.appendChild(list);
  });
}


function getEntrySummary(sectionId, item) {
  if (!item) return { title: 'Untitled', meta: '' };
  switch (sectionId) {
    case 'education':
      return {
        title: [item.degree, item.school].filter(Boolean).join(' · ') || 'Education entry',
        meta: [item.location, dateRange(item.startDate, item.endDate)].filter(Boolean).join(' · ')
      };
    case 'experience':
      return {
        title: [item.title, item.company].filter(Boolean).join(' · ') || 'Experience entry',
        meta: [item.location, dateRange(item.startDate, item.endDate)].filter(Boolean).join(' · ')
      };
    case 'projects':
      return {
        title: item.name || 'Project',
        meta: item.link || ''
      };
    case 'skills':
      return {
        title: item.name || 'Skill',
        meta: ''
      };
    case 'achievements':
      return {
        title: item.name || 'Achievement',
        meta: ''
      };
    case 'links':
      return {
        title: item.label || item.url || 'Link',
        meta: item.url || ''
      };
    default:
      return { title: 'Entry', meta: '' };
  }
}

function dateRange(start, end) {
  if (!start && !end) return '';
  const startFmt = formatMonth(start);
  const endFmt = formatMonth(end);
  if (start && end) return `${startFmt} — ${endFmt}`;
  return startFmt || endFmt;
}

function openModal(sectionId, index = null) {
  activeSection = sectionId;
  activeIndex = index;
  modalFields.innerHTML = '';
  const def = sectionDefs[sectionId];
  const item = index !== null ? profileState[sectionId][index] : {};

  modalTitle.textContent = index !== null ? `Edit ${def.label}` : `Add ${def.label}`;

  def.fields.forEach((field) => {
    const wrapper = document.createElement('div');
    const label = document.createElement('label');
    label.textContent = field.label;

    let input;
    if (field.type === 'textarea') {
      if (field.key === 'description') {
        const toolbar = buildRteToolbar();
        input = document.createElement('div');
        input.className = 'rte';
        input.contentEditable = 'true';
        input.innerHTML = item?.[field.key] || '';
        input.dataset.rte = 'true';
        wrapper.append(label, toolbar, input);
        modalFields.appendChild(wrapper);
        return;
      }
      input = document.createElement('textarea');
      input.rows = 3;
      input.name = field.key;
      input.value = item?.[field.key] || '';
      wrapper.append(label, input);
      modalFields.appendChild(wrapper);
      return;
    }
    if (field.type === 'chips') {
      const chips = Array.isArray(item?.[field.key]) ? item[field.key] : [];
      const chipItems = chips.map((c) => (typeof c === 'string' ? c : c?.name)).filter(Boolean);
      input = document.createElement('input');
      input.name = field.key;
      input.placeholder = field.placeholder || 'Add a value and press Enter';
      input.dataset.chips = JSON.stringify(chipItems);
      const row = document.createElement('div');
      row.className = 'skill-input-row';
      const chipRow = document.createElement('div');
      chipRow.className = 'chip-row';

      const syncChipItems = (nextItems) => {
        input.dataset.chips = JSON.stringify(nextItems);
      };

      const renderChips = () => {
        chipRow.innerHTML = '';
        const items = JSON.parse(input.dataset.chips || '[]');
        items.forEach((value, idx) => {
          const chip = document.createElement('span');
          chip.className = 'chip';
          chip.textContent = value;
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.textContent = '×';
          btn.onclick = () => {
            const next = items.filter((_, i) => i !== idx);
            syncChipItems(next);
            renderChips();
          };
          chip.appendChild(btn);
          chipRow.appendChild(chip);
        });
      };

      const addChipFromInput = () => {
        const value = input.value.trim();
        if (!value) return;
        const items = JSON.parse(input.dataset.chips || '[]');
        if (!items.includes(value)) items.push(value);
        syncChipItems(items);
        input.value = '';
        renderChips();
      };

      const onEnter = (event) => {
        if (event.key !== 'Enter') return;
        event.preventDefault();
        event.stopPropagation();
        addChipFromInput();
      };
      input.addEventListener('keydown', onEnter);
      input.addEventListener('keypress', onEnter);

      input.addEventListener('blur', () => {
        addChipFromInput();
      });

      renderChips();
      row.append(input, chipRow);
      wrapper.append(label, row);
      modalFields.appendChild(wrapper);
      return;
    }
    input = document.createElement('input');
    if (field.type) input.type = field.type;
    input.name = field.key;
    input.value = item?.[field.key] || '';

    if (field.type === 'month') {
      const row = document.createElement('div');
      row.className = 'month-row';
      input.type = 'text';
      input.readOnly = true;
      input.className = 'month-input';
      input.placeholder = 'MM/YY';
      input.dataset.value = input.value;
      const inputWrap = document.createElement('div');
      inputWrap.className = 'month-input-wrap';
      const icon = document.createElement('span');
      icon.className = 'calendar-icon';
      icon.textContent = '📅';
      inputWrap.append(input, icon);
      const picker = buildMonthPicker(input, inputWrap);
      row.append(inputWrap);
      wrapper.append(label, row, picker);
    } else {
      wrapper.append(label, input);
    }
    modalFields.appendChild(wrapper);
  });

  modal.classList.remove('hidden');
}

function buildMonthPicker(input, anchor) {
  const picker = document.createElement('div');
  picker.className = 'month-picker';
  picker.classList.add('hidden');

  const body = document.createElement('div');
  body.className = 'month-body';

  const monthList = document.createElement('div');
  monthList.className = 'month-list';
  const yearList = document.createElement('div');
  yearList.className = 'year-list';

  body.append(monthList, yearList);
  picker.append(body);

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  let year = new Date().getFullYear();
  let selectedMonth = null;

  const updateInputDisplay = () => {
    if (selectedMonth === null) {
      input.value = '';
      input.dataset.value = '';
      return;
    }
    const monthIndex = selectedMonth + 1;
    const monthValue = String(monthIndex).padStart(2, '0');
    input.dataset.value = `${year}-${monthValue}`;
    const shortYear = String(year).slice(-2);
    input.value = `${monthValue}/${shortYear}`;
  };

  const renderGrid = () => {
    monthList.innerHTML = '';
    months.forEach((label, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'month-btn';
      if (idx === selectedMonth) btn.classList.add('selected');
      btn.textContent = label;
      btn.onclick = () => {
        selectedMonth = idx;
        updateInputDisplay();
        renderGrid();
        setTimeout(() => btn.scrollIntoView({ block: 'nearest' }), 0);
      };
      monthList.appendChild(btn);
    });
    renderYearGrid();
  };

  const setFromValue = () => {
    const value = input.dataset.value || input.value || '';
    const [y, m] = value.split('-');
    if (y) year = Number(y);
    if (m) selectedMonth = Number(m) - 1;
    updateInputDisplay();
    renderGrid();
  };

  const renderYearGrid = () => {
    yearList.innerHTML = '';
    const currentYear = new Date().getFullYear();
    const start = currentYear - 60;
    const end = currentYear + 5;
    for (let y = end; y >= start; y -= 1) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'year-btn';
      btn.textContent = String(y);
      if (y === year) btn.classList.add('selected');
      btn.onclick = () => {
        year = y;
        updateInputDisplay();
        renderGrid();
        setTimeout(() => btn.scrollIntoView({ block: 'nearest' }), 0);
      };
      yearList.appendChild(btn);
    }
  };

  const toggle = () => {
    picker.classList.toggle('hidden');
  };
  input.addEventListener('click', toggle);
  anchor?.addEventListener('click', (event) => {
    if (event.target === input) return;
    toggle();
  });

  document.addEventListener('click', (event) => {
    if (picker.classList.contains('hidden')) return;
    if (picker.contains(event.target) || input.contains(event.target) || anchor?.contains(event.target)) return;
    picker.classList.add('hidden');
  });

  setFromValue();
  return picker;
}

function closeModal() {
  modal.classList.add('hidden');
  activeSection = null;
  activeIndex = null;
}

modalForm.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!activeSection) return;

  const chipInputs = modalFields.querySelectorAll('input[data-chips]');
  chipInputs.forEach((input) => {
    const value = input.value.trim();
    if (!value) return;
    const items = JSON.parse(input.dataset.chips || '[]');
    if (!items.includes(value)) items.push(value);
    input.dataset.chips = JSON.stringify(items);
    input.value = '';
  });

  const def = sectionDefs[activeSection];
  const data = {};
  def.fields.forEach((field) => {
    if (field.key === 'description') {
      const rte = modalFields.querySelector('.rte');
      data[field.key] = sanitizeHtml(rte?.innerHTML || '');
      return;
    }
    if (field.type === 'chips') {
      const input = modalFields.querySelector(`[name="${field.key}"]`);
      const items = JSON.parse(input?.dataset?.chips || '[]');
      data[field.key] = items.map((name) => ({ name }));
      return;
    }
    const input = modalFields.querySelector(`[name="${field.key}"]`);
    if (field.type === 'month') {
      data[field.key] = input.dataset.value || '';
    } else {
      data[field.key] = input.value.trim();
    }
  });

  if (data.startDate && data.endDate && data.endDate < data.startDate) {
    alert('End date must be after start date.');
    return;
  }

  if (activeIndex !== null) {
    profileState[activeSection][activeIndex] = data;
  } else {
    profileState[activeSection].push(data);
  }

  renderSections();
  closeModal();
});

modalForm.addEventListener('keydown', (event) => {
  const target = event.target;
  if (event.key !== 'Enter') return;
  const isContentEditable = target && target.isContentEditable;
  const isTextarea = target && target.tagName === 'TEXTAREA';
  const isChipInput = target && target.dataset && target.dataset.chips !== undefined;
  if (!isTextarea && !isContentEditable && !isChipInput) {
    event.preventDefault();
    event.stopPropagation();
  }
}, true);

modalClose.addEventListener('click', closeModal);
modalCancel.addEventListener('click', closeModal);
modalBackdrop.addEventListener('click', closeModal);

saveProfileBtn.addEventListener('click', async () => {
  const basics = readBasicsInputs();
  if (!basics.name) {
    alert('Name is required.');
    return;
  }
  if (basics.photo && basics.photo.length > 1_000_000) {
    alert('Profile photo is too large. Please upload a smaller image.');
    basics.photo = '';
  }

  const payload = {
    basics,
    education: profileState.education,
    experience: profileState.experience,
    projects: profileState.projects,
    skills: profileState.skills,
    achievements: profileState.achievements,
    links: profileState.links
  };

  const res = await fetch('/api/profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (res.ok) {
    currentProfile = payload;
    show(templatesSection);
    renderTemplates();
  } else {
    alert('Save failed');
  }
});

skillsInput.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter') return;
  event.preventDefault();
  const value = skillsInput.value.trim();
  if (!value) return;
  profileState.skills.push({ name: value });
  skillsInput.value = '';
  renderSkillChips();
});

function renderSkillChips() {
  if (!skillsChips) return;
  skillsChips.innerHTML = '';
  const items = profileState.skills || [];
  items.forEach((skill, index) => {
    const chip = document.createElement('span');
    chip.className = 'chip';
    const text = document.createElement('span');
    text.textContent = skill.name || skill;
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.textContent = '×';
    remove.onclick = () => {
      profileState.skills.splice(index, 1);
      renderSkillChips();
    };
    chip.append(text, remove);
    skillsChips.appendChild(chip);
  });
}

function buildRteToolbar() {
  const toolbar = document.createElement('div');
  toolbar.className = 'rte-toolbar';

  const makeBtn = (label, cmd, arg, svg) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    if (svg) {
      btn.innerHTML = svg;
      btn.setAttribute('aria-label', label);
      btn.title = label;
    } else {
      btn.textContent = label;
    }
    btn.onclick = () => {
      if (cmd === 'createLink') {
        const url = prompt('Enter URL');
        if (url) document.execCommand(cmd, false, url);
        return;
      }
      document.execCommand(cmd, false, arg || null);
    };
    return btn;
  };

  const icons = {
    bold: '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M7 4h6a4 4 0 0 1 0 8H7V4zm0 8h7a4 4 0 0 1 0 8H7v-8z"/></svg>',
    italic: '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M10 4h8v2h-3l-4 12h3v2H6v-2h3l4-12h-3z"/></svg>',
    underline: '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M6 3h2v7a4 4 0 0 0 8 0V3h2v7a6 6 0 0 1-12 0V3zM5 20h14v2H5z"/></svg>',
    ul: '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M9 5h12v2H9V5zm0 6h12v2H9v-2zm0 6h12v2H9v-2z"/><circle cx="5" cy="6" r="1.5" fill="currentColor"/><circle cx="5" cy="12" r="1.5" fill="currentColor"/><circle cx="5" cy="18" r="1.5" fill="currentColor"/></svg>',
    ol: '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M9 5h12v2H9V5zm0 6h12v2H9v-2zm0 6h12v2H9v-2z"/><path fill="currentColor" d="M4 5h2v2H4V5zm0 6h2v2H4v-2zm0 6h2v2H4v-2z"/></svg>',
    link: '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M7.5 12a4.5 4.5 0 0 1 4.5-4.5h3v2h-3a2.5 2.5 0 0 0 0 5h3v2h-3A4.5 4.5 0 0 1 7.5 12zm3-1h3v2h-3v-2zm6-5.5h-3v2h3a2.5 2.5 0 0 1 0 5h-3v2h3a4.5 4.5 0 0 0 0-9z"/></svg>',
    left: '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M4 5h16v2H4V5zm0 6h10v2H4v-2zm0 6h16v2H4v-2z"/></svg>',
    center: '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M4 5h16v2H4V5zm3 6h10v2H7v-2zm-3 6h16v2H4v-2z"/></svg>',
    right: '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M4 5h16v2H4V5zm6 6h10v2H10v-2zm-6 6h16v2H4v-2z"/></svg>'
  };

  toolbar.append(
    makeBtn('Bold', 'bold', null, icons.bold),
    makeBtn('Italic', 'italic', null, icons.italic),
    makeBtn('Underline', 'underline', null, icons.underline),
    makeBtn('Bullets', 'insertUnorderedList', null, icons.ul),
    makeBtn('Numbered', 'insertOrderedList', null, icons.ol),
    makeBtn('Link', 'createLink', null, icons.link),
    makeBtn('Align Left', 'justifyLeft', null, icons.left),
    makeBtn('Align Center', 'justifyCenter', null, icons.center),
    makeBtn('Align Right', 'justifyRight', null, icons.right)
  );
  return toolbar;
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

function formatMonth(value) {
  if (!value) return '';
  const [year, month] = value.split('-').map(Number);
  if (!year || !month) return value;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[month - 1]} ${year}`;
}

Array.from(document.querySelectorAll('.add-entry')).forEach((btn) => {
  btn.addEventListener('click', () => openModal(btn.dataset.section));
});

selectorButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.target;
    setActivePanel(target);
  });
});

function renderTemplates() {
  templateGallery.innerHTML = '';
  templates.forEach((tpl) => {
    const card = document.createElement('div');
    card.className = 'template-card';

    const head = document.createElement('div');
    head.className = 'template-head';

    const title = document.createElement('h3');
    title.textContent = tpl.name;

    const like = document.createElement('button');
    like.className = favorites.has(tpl.id) ? 'liked' : 'secondary';
    like.textContent = favorites.has(tpl.id) ? 'Saved' : 'Save';
    like.onclick = async (e) => {
      e.stopPropagation();
      const action = favorites.has(tpl.id) ? 'remove' : 'add';
      const res = await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId: tpl.id, action })
      });
      const json = await res.json();
      favorites = new Set(json.favorites || []);
      renderTemplates();
    };

    head.append(title, like);

    const preview = document.createElement('iframe');
    preview.src = `/preview.html?template=${tpl.id}`;
    preview.title = `${tpl.name} preview`;

    card.append(head, preview);
    card.onclick = () => {
      selectedTemplate = tpl.id;
      document.querySelectorAll('.template-card').forEach((c) => c.classList.remove('selected'));
      card.classList.add('selected');
      hostBtn.disabled = !githubReady;
      if (!githubReady) {
        hostStatus.textContent = 'Connect GitHub to host your site.';
      } else {
        hostStatus.textContent = `Ready to host ${tpl.name}.`;
      }
    };

    templateGallery.appendChild(card);
  });

  syncPreview();
}

function syncPreview() {
  const previews = document.querySelectorAll('iframe');
  previews.forEach((frame) => {
    frame.contentWindow?.postMessage({ type: 'profile', profile: currentProfile }, '*');
  });
  setTimeout(() => {
    previews.forEach((frame) => {
      frame.contentWindow?.postMessage({ type: 'profile', profile: currentProfile }, '*');
    });
  }, 500);
  setTimeout(() => {
    previews.forEach((frame) => {
      frame.contentWindow?.postMessage({ type: 'profile', profile: currentProfile }, '*');
    });
  }, 1500);
}

window.addEventListener('message', (event) => {
  if (event.data?.type === 'ready') {
    event.source?.postMessage({ type: 'profile', profile: currentProfile }, '*');
  }
});

init();
function setActivePanel(panelId) {
  const hasSelection = Boolean(panelId);
  builderLayout?.classList.toggle('builder-empty', !hasSelection);
  detailPanels.forEach((panel) => {
    panel.classList.toggle('hidden', panel.dataset.panel !== panelId);
  });
  selectorButtons.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.target === panelId);
  });
}
