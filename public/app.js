const authSection = document.getElementById('auth-section');
const formSection = document.getElementById('form-section');
const templatesSection = document.getElementById('templates-section');
const livePreview = document.getElementById('live-preview');
const authBar = document.getElementById('auth-bar');
const navHome = document.getElementById('nav-home');


const authMessage = document.getElementById('auth-message');
const templateGallery = document.getElementById('template-gallery');
const githubConnect = document.getElementById('github-connect');
const githubCancel = document.getElementById('github-cancel');
const editInfoBtn = document.getElementById('edit-info');
const hostBtn = document.getElementById('host-btn');
const hostStatus = document.getElementById('host-status');

const deployBtn = document.getElementById('deploy-btn');
const deployStatus = document.getElementById('deploy-status');
const basicsInputs = {
  name: document.getElementById('basic-name'),
  headline: document.getElementById('basic-headline'),
  email: document.getElementById('basic-email'),
  phone: document.getElementById('basic-phone'),
  location: document.getElementById('basic-location'),
  website: document.getElementById('basic-website'),
  linkedin: document.getElementById('basic-linkedin'),
  github: document.getElementById('basic-github'),
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
  basics: {
    label: 'Basic info',
    fields: []
  },
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
let canAutoSave = false;
/** When set, the inline editor is open; draft data is merged into live preview until Save/Cancel. */
let currentInlineEditor = null;
let autosaveTimer = null;

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

const addContentBtn = document.getElementById('add-content-btn');
if (addContentBtn) {
  addContentBtn.addEventListener('click', () => {
    // Scroll to section selector or open a generic "Add" modal
    // For now, let's pulse the section headers or just scroll up
    const firstSection = document.querySelector('.section-card:not(.expanded)');
    if (firstSection) {
      firstSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
      firstSection.classList.add('pulse-glow');
      setTimeout(() => firstSection.classList.remove('pulse-glow'), 2000);
    }
  });
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
    show(formSection);
    initBuilder(profileState);
  }

  const ghStatus = await fetch('/api/github/status').then((r) => r.json());
  githubReady = Boolean(ghStatus.connected);
  if (githubReady) {
    githubConnect.textContent = ghStatus.login ? `GitHub connected (${ghStatus.login})` : 'GitHub connected';
    githubConnect.disabled = true;
    githubCancel.classList.remove('hidden');
    deployBtn.classList.remove('btn-disabled');
    deployBtn.setAttribute('aria-disabled', 'false');
    if (me.user?.deployed_url) {
      deployStatus.textContent = 'Live site';
      deployStatus.onclick = () => window.open(me.user.deployed_url, '_blank');
      deployStatus.style.cursor = 'pointer';
      deployStatus.classList.remove('hidden');
    } else {
      deployStatus.textContent = '';
      deployStatus.onclick = null;
      deployStatus.style.cursor = '';
      deployStatus.classList.add('hidden');
    }
  } else {
    githubConnect.textContent = 'Connect GitHub';
    githubConnect.disabled = false;
    githubCancel.classList.add('hidden');
    deployBtn.classList.add('btn-disabled');
    deployBtn.setAttribute('aria-disabled', 'true');
    deployStatus.textContent = 'Connect GitHub to deploy.';
    deployStatus.classList.remove('hidden');
  }

  if (window.location.hash === '#host-ready') {
    history.replaceState(null, '', window.location.pathname);
  }
}



function showAuthMessage(text) {
  const msg = document.getElementById('auth-message');
  if (!msg) return;
  msg.textContent = text;
  msg.classList.remove('hidden');
}

function hideAuthMessage() {
  const msg = document.getElementById('auth-message');
  if (!msg) return;
  msg.textContent = '';
  msg.classList.add('hidden');
}

// Auth Form Logic
const authForm = document.getElementById('auth-form');
const authSubmitBtn = document.getElementById('auth-submit-btn');
const authToggleBtn = document.getElementById('auth-toggle-btn');
const authTitle = document.getElementById('auth-title');
const authSwitchText = document.getElementById('auth-switch-text');
const authSubtitle = document.querySelector('.auth-subtitle');

let isLoginMode = true;

function setAuthMode(login) {
  isLoginMode = login;
  hideAuthMessage();
  if (isLoginMode) {
    authTitle.textContent = 'Welcome back';
    authSubtitle.textContent = 'Please enter your details';
    authSubmitBtn.textContent = 'Sign in';
    authSwitchText.textContent = "Don't have an account?";
    authToggleBtn.textContent = 'Sign up';
  } else {
    authTitle.textContent = 'Create an account';
    authSubtitle.textContent = 'Sign up to build your portfolio';
    authSubmitBtn.textContent = 'Sign up';
    authSwitchText.textContent = 'Already have an account?';
    authToggleBtn.textContent = 'Sign in';
  }
}

if (authToggleBtn) {
  authToggleBtn.addEventListener('click', () => {
    setAuthMode(!isLoginMode);
  });
}

if (authForm) {
  authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAuthMessage();
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    const rememberText = document.getElementById('remember-me').checked;

    const endpoint = isLoginMode ? '/api/auth/login' : '/api/auth/register';

    try {
      authSubmitBtn.disabled = true;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, rememberText })
      });
      const data = await res.json();

      if (!res.ok) {
        showAuthMessage(data.error || 'Authentication failed');
        authSubmitBtn.disabled = false;
        return;
      }

      if (isLoginMode) {
        window.location.reload();
      } else {
        showAuthMessage('Sign up successful! You can now sign in.');
        authForm.reset();
        setAuthMode(true);
        authSubmitBtn.disabled = false;
      }
    } catch (err) {
      showAuthMessage('Network error. Please try again.');
      authSubmitBtn.disabled = false;
    }
  });
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

deployBtn.addEventListener('click', async () => {
  if (!githubReady) {
    deployStatus.textContent = 'Connect GitHub to deploy.';
    return;
  }
  deployBtn.disabled = true;
  deployStatus.textContent = 'Saving and deploying...';

  const basics = readBasicsInputs();
  if (!basics.name) {
    alert('Name is required.');
    deployBtn.disabled = false;
    deployStatus.textContent = 'Name is required.';
    return;
  }

  const payload = buildProfilePayload();

  const saveRes = await fetch('/api/profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!saveRes.ok) {
    deployStatus.textContent = 'Save failed';
    deployBtn.disabled = false;
    return;
  }

  const res = await fetch('/api/host', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ templateId: 'profile' })
  });
  const json = await res.json();
  if (res.ok) {
    deployStatus.textContent = 'Live site';
    deployStatus.onclick = () => window.open(json.pagesUrl, '_blank');
    deployStatus.style.cursor = 'pointer';
    deployStatus.classList.remove('hidden');
    if (currentProfile) {
      currentProfile.deployed_url = json.pagesUrl;
    }
  } else {
    deployStatus.textContent = json.error || 'Deploy failed';
  }
  deployBtn.disabled = false;
});

function initBuilder(profile) {
  profileState = profile;
  setBasicsInputs(profile.basics || {});
  renderSections();
  initAccordion();
  syncLivePreview();
  canAutoSave = true;
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

function buildProfilePayload() {
  const basics = readBasicsInputs();
  return {
    basics,
    education: profileState.education,
    experience: profileState.experience,
    projects: profileState.projects,
    skills: profileState.skills,
    achievements: profileState.achievements,
    links: profileState.links
  };
}

function queueAutoSave() {
  if (!canAutoSave) return;
  if (autosaveTimer) clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(async () => {
    const payload = buildProfilePayload();
    try {
      await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (err) {
      console.error('Auto-save failed', err);
    }
  }, 700);
}

function buildLiveProfile() {
  const basics = readBasicsInputs();
  let education = profileState.education;
  let experience = profileState.experience;
  let projects = profileState.projects;
  let achievements = profileState.achievements;
  let links = profileState.links;

  if (currentInlineEditor?.element?.isConnected) {
    const def = sectionDefs[currentInlineEditor.sectionId];
    const draft = collectEntryData(def, currentInlineEditor.element);
    const arr = [...(profileState[currentInlineEditor.sectionId] || [])];
    if (currentInlineEditor.index !== null) {
      arr[currentInlineEditor.index] = draft;
    } else {
      arr.push(draft);
    }
    if (currentInlineEditor.sectionId === 'education') education = arr;
    else if (currentInlineEditor.sectionId === 'experience') experience = arr;
    else if (currentInlineEditor.sectionId === 'projects') projects = arr;
    else if (currentInlineEditor.sectionId === 'achievements') achievements = arr;
    else if (currentInlineEditor.sectionId === 'links') links = arr;
  } else if (currentInlineEditor) {
    currentInlineEditor = null;
  }

  return {
    basics,
    education,
    experience,
    projects,
    skills: profileState.skills,
    achievements,
    links
  };
}

let previewRafId = null;
let pendingPreviewSection = null;

/**
 * Sync profile to the live preview iframe.
 * @param {string|null} onlyUpdateSection - If set (e.g. 'education', 'experience'), the preview updates only that section's DOM. Otherwise full render.
 */
function syncLivePreview(onlyUpdateSection = null) {
  if (!livePreview) return;
  const payload = buildLiveProfile();
  livePreview.contentWindow?.postMessage({ type: 'profile', profile: payload, onlyUpdateSection: onlyUpdateSection || undefined }, '*');
}

/** Throttled sync while typing: one update per animation frame so the preview feels like a live text editor (FlowCV-style). */
function syncLivePreviewAfterTyping(onlyUpdateSection) {
  if (!livePreview) return;
  pendingPreviewSection = onlyUpdateSection;
  if (previewRafId != null) return;
  previewRafId = requestAnimationFrame(() => {
    previewRafId = null;
    const section = pendingPreviewSection ?? null;
    pendingPreviewSection = null;
    syncLivePreview(section);
  });
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
      syncLivePreview();
      queueAutoSave();
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
    syncLivePreview();
    queueAutoSave();
  };
  reader.readAsDataURL(file);
});

function renderSections() {
  Object.keys(sectionDefs).forEach((sectionId) => {
    const container = document.getElementById(`section-${sectionId}`);
    const items = profileState[sectionId] || [];

    if (sectionId === 'basics') return;

    if (sectionId !== 'skills' && container) {
      container.innerHTML = '';
    }

    if (sectionId === 'skills') {
      renderSkillChips();
      return;
    }

    if (!container || sectionId === 'links') return;
    const actionsRow = document.createElement('div');
    actionsRow.className = 'add-entry-wrap';
    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'add-entry-btn';
    addBtn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>
      </svg>
      <span>Add Entry</span>
    `;
    addBtn.onclick = () => openInlineEditor(sectionId);
    actionsRow.appendChild(addBtn);
    container.appendChild(actionsRow);
    if (!items.length) return;
    const list = document.createElement('div');
    list.className = 'entry-list';

    items.forEach((item, index) => {
      const entry = document.createElement('div');
      entry.className = `entry-item ${item.hidden ? 'hidden-entry' : ''}`;

      const dragHandle = document.createElement('div');
      dragHandle.className = 'entry-drag-handle';
      dragHandle.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecapround="round" stroke-linejoin="round"><circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/></svg>';

      const info = document.createElement('div');
      info.className = 'entry-info';
      const title = document.createElement('div');
      title.className = 'entry-title';
      const meta = document.createElement('div');
      meta.className = 'entry-meta';

      const summary = getEntrySummary(sectionId, item);
      title.textContent = summary.title;
      meta.textContent = summary.meta;

      info.append(title, meta);
      if (sectionId === 'projects' && Array.isArray(item.skills) && item.skills.length) {
        const chipRow = document.createElement('div');
        chipRow.className = 'chip-row';
        item.skills.forEach((skill) => {
          const chip = document.createElement('span');
          chip.className = 'chip';
          chip.textContent = typeof skill === 'string' ? skill : safeStr(skill?.name) || '';
          chipRow.appendChild(chip);
        });
        info.appendChild(chipRow);
      }

      const actions = document.createElement('div');
      actions.className = 'entry-actions';

      const visBtn = document.createElement('button');
      visBtn.type = 'button';
      visBtn.className = `entry-btn visibility-toggle ${item.hidden ? 'hidden-entry' : ''}`;
      visBtn.innerHTML = item.hidden
        ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>'
        : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
      visBtn.title = item.hidden ? 'Show on website' : 'Hide from website';
      visBtn.onclick = (e) => {
        e.stopPropagation();
        item.hidden = !item.hidden;
        renderSections();
        syncLivePreview();
        queueAutoSave();
      };

      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'entry-btn';
      editBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>';
      editBtn.onclick = (e) => {
        e.stopPropagation();
        openInlineEditor(sectionId, index);
      };

      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'entry-btn';
      delBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>';
      delBtn.onclick = (e) => {
        e.stopPropagation();
        profileState[sectionId].splice(index, 1);
        renderSections();
        syncLivePreview();
        queueAutoSave();
      };

      actions.append(visBtn, editBtn, delBtn);
      entry.append(dragHandle, info, actions);
      list.appendChild(entry);
    });

    container.appendChild(list);
  });
  initDropdowns();
}


function safeStr(val) {
  return val != null && typeof val === 'string' ? val : '';
}

function getEntrySummary(sectionId, item) {
  if (!item) return { title: 'Untitled', meta: '' };
  switch (sectionId) {
    case 'education':
      return {
        title: [safeStr(item.degree), safeStr(item.school)].filter(Boolean).join(' · ') || 'Education entry',
        meta: [safeStr(item.location), dateRange(safeStr(item.startDate), safeStr(item.endDate))].filter(Boolean).join(' · ')
      };
    case 'experience':
      return {
        title: [safeStr(item.title), safeStr(item.company)].filter(Boolean).join(' · ') || 'Experience entry',
        meta: [safeStr(item.location), dateRange(safeStr(item.startDate), safeStr(item.endDate))].filter(Boolean).join(' · ')
      };
    case 'projects':
      return {
        title: safeStr(item.name) || 'Project',
        meta: safeStr(item.link)
      };
    case 'skills':
      return {
        title: safeStr(item.name) || 'Skill',
        meta: ''
      };
    case 'achievements':
      return {
        title: safeStr(item.name) || 'Achievement',
        meta: ''
      };
    case 'links':
      return {
        title: safeStr(item.label) || safeStr(item.url) || 'Link',
        meta: safeStr(item.url)
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

function entryFieldValue(val) {
  return val != null && typeof val === 'string' ? val : '';
}

function buildEntryFields(def, item, fieldsContainer, onFieldChange) {
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
        input.innerHTML = entryFieldValue(item?.[field.key]);
        input.dataset.rte = 'true';
        if (onFieldChange) input.addEventListener('input', onFieldChange);
        wrapper.append(label, toolbar, input);
        fieldsContainer.appendChild(wrapper);
        return;
      }
      input = document.createElement('textarea');
      input.rows = 3;
      input.name = field.key;
      input.value = entryFieldValue(item?.[field.key]);
      if (onFieldChange) input.addEventListener('input', onFieldChange);
      wrapper.append(label, input);
      fieldsContainer.appendChild(wrapper);
      return;
    }
    if (field.type === 'chips') {
      const chips = Array.isArray(item?.[field.key]) ? item[field.key] : [];
      const chipItems = chips.map((c) => (typeof c === 'string' ? c : (c && typeof c.name === 'string' ? c.name : ''))).filter(Boolean);
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
        if (onFieldChange) onFieldChange();
      };

      const renderChips = () => {
        chipRow.innerHTML = '';
        const items = JSON.parse(input.dataset.chips || '[]');
        items.forEach((value, idx) => {
          const chip = document.createElement('span');
          chip.className = 'chip';
          chip.textContent = typeof value === 'string' ? value : (value && typeof value.name === 'string' ? value.name : '');
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
      fieldsContainer.appendChild(wrapper);
      return;
    }
    input = document.createElement('input');
    if (field.type) input.type = field.type;
    input.name = field.key;
    input.value = entryFieldValue(item?.[field.key]);

    if (field.type === 'month') {
      const row = document.createElement('div');
      row.className = 'month-row';
      input.type = 'text';
      input.readOnly = true;
      input.className = 'month-input';
      input.placeholder = 'MM/YY';
      input.dataset.value = entryFieldValue(item?.[field.key]);
      const inputWrap = document.createElement('div');
      inputWrap.className = 'month-input-wrap';
      const icon = document.createElement('span');
      icon.className = 'calendar-icon';
      icon.textContent = '📅';
      inputWrap.append(input, icon);
      const picker = buildMonthPicker(input, inputWrap, onFieldChange);
      row.append(inputWrap);
      wrapper.append(label, row, picker);
    } else {
      if (onFieldChange) input.addEventListener('input', onFieldChange);
      wrapper.append(label, input);
    }
    fieldsContainer.appendChild(wrapper);
  });
}

function collectEntryData(def, rootEl) {
  const data = {};
  def.fields.forEach((field) => {
    if (field.key === 'description') {
      const rte = rootEl.querySelector('.rte');
      data[field.key] = sanitizeHtml(rte?.innerHTML || '');
      return;
    }
    if (field.type === 'chips') {
      const input = rootEl.querySelector(`[name="${field.key}"]`);
      const items = JSON.parse(input?.dataset?.chips || '[]');
      data[field.key] = items.map((name) => ({ name }));
      return;
    }
    const input = rootEl.querySelector(`[name="${field.key}"]`);
    if (field.type === 'month') {
      data[field.key] = input?.dataset?.value || '';
    } else {
      data[field.key] = input?.value?.trim?.() || '';
    }
  });
  return data;
}

function openInlineEditor(sectionId, index = null) {
  const container = document.getElementById(`section-${sectionId}`);
  if (!container) return;
  container.querySelectorAll('.inline-editor').forEach((el) => el.remove());
  currentInlineEditor = null;
  const def = sectionDefs[sectionId];
  const item = index !== null ? profileState[sectionId][index] : {};

  const onFieldChange = () => syncLivePreviewAfterTyping(currentInlineEditor ? currentInlineEditor.sectionId : null);

  const editor = document.createElement('div');
  editor.className = 'inline-editor';
  const title = document.createElement('div');
  title.className = 'inline-title';
  title.textContent = index !== null ? `Edit ${def.label}` : `Add ${def.label}`;
  const fields = document.createElement('div');
  fields.className = 'inline-fields';
  buildEntryFields(def, item, fields, onFieldChange);
  const actions = document.createElement('div');
  actions.className = 'inline-actions';
  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.className = 'secondary';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.onclick = () => {
    currentInlineEditor = null;
    editor.remove();
  };
  const saveBtn = document.createElement('button');
  saveBtn.type = 'button';
  saveBtn.className = 'btn';
  saveBtn.textContent = 'Save entry';
  saveBtn.onclick = () => {
    currentInlineEditor = null;
    const data = collectEntryData(def, editor);
    if (data.startDate && data.endDate && data.endDate < data.startDate) {
      alert('End date must be after start date.');
      return;
    }
    if (index !== null) {
      profileState[sectionId][index] = data;
    } else {
      profileState[sectionId].push(data);
    }
    renderSections();
    syncLivePreview();
    queueAutoSave();
  };
  actions.append(cancelBtn, saveBtn);
  editor.append(title, fields, actions);
  const list = container.querySelector('.entry-list');
  if (list) {
    container.insertBefore(editor, list);
  } else {
    container.appendChild(editor);
  }
  currentInlineEditor = { sectionId, index, element: editor };
  syncLivePreview();
}

function buildMonthPicker(input, anchor, onMonthChange) {
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
  let monthChosen = false;
  let yearChosen = false;

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
    if (onMonthChange) onMonthChange();
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
        monthChosen = true;
        updateInputDisplay();
        renderGrid();
        if (monthChosen && yearChosen) {
          picker.classList.add('hidden');
        }
        setTimeout(() => btn.scrollIntoView({ block: 'nearest' }), 0);
      };
      monthList.appendChild(btn);
    });
    renderYearGrid();
  };

  const setFromValue = () => {
    const value = input.dataset.value || input.value || '';
    const [y, m] = value.split('-');
    if (y) {
      year = Number(y);
      yearChosen = true;
    }
    if (m) {
      selectedMonth = Number(m) - 1;
      monthChosen = true;
    }
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
        yearChosen = true;
        updateInputDisplay();
        renderGrid();
        if (monthChosen && yearChosen) {
          picker.classList.add('hidden');
        }
        setTimeout(() => btn.scrollIntoView({ block: 'nearest' }), 0);
      };
      yearList.appendChild(btn);
    }
  };

  const openPicker = () => {
    picker.classList.remove('hidden');
  };
  input.addEventListener('click', openPicker);
  anchor?.addEventListener('click', (event) => {
    if (event.target === input) return;
    openPicker();
  });

  document.addEventListener('click', (event) => {
    if (picker.classList.contains('hidden')) return;
    if (picker.contains(event.target) || input.contains(event.target) || anchor?.contains(event.target)) return;
    if (monthChosen && yearChosen) {
      picker.classList.add('hidden');
    }
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
  syncLivePreview();
  queueAutoSave();
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

Object.values(basicsInputs).forEach((input) => {
  if (!input) return;
  input.addEventListener('input', () => {
    syncLivePreviewAfterTyping(null);
    queueAutoSave();
  });
});

skillsInput.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter') return;
  event.preventDefault();
  const value = skillsInput.value.trim();
  if (!value) return;
  profileState.skills.push({ name: value });
  skillsInput.value = '';
  renderSkillChips();
  syncLivePreview();
  queueAutoSave();
});

function renderSkillChips() {
  skillsChips.innerHTML = '';
  (profileState.skills || []).forEach((skill, index) => {
    const chip = document.createElement('div');
    chip.className = 'chip';
    chip.textContent = skill.name || skill;
    const btn = document.createElement('button');
    btn.innerHTML = '&times;';
    btn.onclick = () => {
      profileState.skills.splice(index, 1);
      renderSkillChips();
      syncLivePreview();
      queueAutoSave();
    };
    chip.appendChild(btn);
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
  if (!value || typeof value !== 'string') return '';
  const [year, month] = value.split('-').map(Number);
  if (!year || !month) return value;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[month - 1]} ${year}`;
}

Array.from(document.querySelectorAll('.entry-select')).forEach((select) => {
  select.addEventListener('change', () => {
    const sectionId = select.dataset.section;
    const value = select.value;
    if (!sectionId || !value) return;
    if (value === '__edit__') {
      const card = document.querySelector(`.section-card[data-accordion="${sectionId}"]`);
      card?.classList.add('expanded');
      card?.classList.remove('collapsed');
      select.value = '__edit__';
      return;
    }
    if (sectionId === 'basics' || sectionId === 'skills') return;
    if (value === '__new__') {
      openInlineEditor(sectionId);
      select.value = '__new__';
    } else {
      openInlineEditor(sectionId, Number(value));
    }
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
    event.source?.postMessage({ type: 'profile', profile: buildLiveProfile() }, '*');
  }
});

init();
let accordionBound = false;
function initAccordion() {
  const stack = document.querySelector('.section-stack');
  const cards = document.querySelectorAll('.section-card[data-accordion]');
  cards.forEach((card) => {
    if (!card.classList.contains('expanded')) {
      card.classList.add('collapsed');
    }
  });
  if (!stack || accordionBound) return;
  accordionBound = true;
  stack.addEventListener('click', (e) => {
    const card = e.target.closest('.section-card[data-accordion]');
    if (!card) return;
    if (e.target.closest('select, input, textarea, button, .month-picker, .month-input-wrap, .rte')) return;
    const cardsAll = document.querySelectorAll('.section-card[data-accordion]');
    const isExpanded = card.classList.contains('expanded');
    if (isExpanded) {
      card.classList.remove('expanded');
      card.classList.add('collapsed');
      return;
    }
    cardsAll.forEach((c) => {
      c.classList.remove('expanded');
      c.classList.add('collapsed');
    });
    card.classList.add('expanded');
    card.classList.remove('collapsed');
  });
}

function initDropdowns() {
  // Legacy dropdown removed — entries now display in the section body.
}
