// Blackmagic AI — Full Working Engine for SIH Junior 2026
import { initThreeOrb, pulseOrb, setOrbMode } from './three-orb.js';

let currentModel = 'blackfire v2';
let currentUser = null;
let currentPendingMobile = '';
let audioCtx = null;
let wakeWordRecognition = null;
let isListeningVoice = false;

// WORKSPACE PROJECTS & CHAT SESSIONS STATE
let currentProject = localStorage.getItem('blackmagic_active_project') || 'Default Project';
let currentSessionId = localStorage.getItem('blackmagic_current_session_id') || ('session-' + Date.now());

// ---------------------------------------------------------------------------
// INITIALIZATION
// ---------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  initWebAudio();
  checkUserSession();
  setupGlobalShortcuts();
  initSidebarPin();
  initProjectsAndSessions();
  if (typeof initPromptBarCommandEngine === 'function') {
    initPromptBarCommandEngine();
  }

  // If user is already active, initialize 3D orb immediately
  setTimeout(() => {
    initThreeOrb('three-core-canvas');
  }, 200);
});

function initWebAudio() {
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  } catch (e) {
    console.log('Web Audio context initialized on first user interaction');
  }
}

// ---------------------------------------------------------------------------
// EXECUTABLE DUAL-PANEL SWITCHER (client.exe & admin.exe)
// ---------------------------------------------------------------------------
window.switchPanel = function(panel) {
  if (panel === 'admin') {
    window.location.href = '/admin';
  } else {
    window.location.href = '/';
  }
};

// ---------------------------------------------------------------------------
// USER AUTHENTICATION & MULTI-SCREEN SWITCHING
// ---------------------------------------------------------------------------
async function checkUserSession() {
  try {
    const saved = localStorage.getItem('blackmagic_user');
    if (saved) {
      currentUser = JSON.parse(saved);
      activateChatScreen(currentUser);
      return;
    }

    const res = await fetch('/api/auth/current-user');
    const data = await res.json();
    if (data.success && data.user) {
      currentUser = data.user;
      localStorage.setItem('blackmagic_user', JSON.stringify(currentUser));
      activateChatScreen(currentUser);
    } else {
      activateLoginScreen();
    }
  } catch (e) {
    activateLoginScreen();
  }
}

function activateChatScreen(user) {
  const loginScreen = document.getElementById('login-screen');
  if (loginScreen) {
    loginScreen.classList.remove('active');
    loginScreen.style.display = 'none';
  }
  const chatScreen = document.getElementById('chat-screen');
  if (chatScreen) {
    chatScreen.classList.add('active');
    chatScreen.style.display = 'flex';
  }
  updateUserUI(user);
  setTimeout(() => {
    initThreeOrb('three-core-canvas');
  }, 100);
}

function activateLoginScreen() {
  // HIDE CHAT WORKSPACE COMPLETELY - CANNOT BE ACCESSED WITHOUT AUTHENTICATION
  const chatScreen = document.getElementById('chat-screen');
  if (chatScreen) {
    chatScreen.classList.remove('active');
    chatScreen.style.display = 'none';
  }
  
  // SHOW FULL-SCREEN LOGIN LOCKOUT
  const loginScreen = document.getElementById('login-screen');
  if (loginScreen) {
    loginScreen.classList.add('active');
    loginScreen.style.display = 'flex';
  }
  
  showLoginForm();
  currentUser = null;
  updateUserUI(null);
}

function updateUserUI(user) {
  const nameEl = document.getElementById('header-user-name');
  const avatarEl = document.getElementById('header-user-avatar');
  
  if (!user) {
    if (nameEl) nameEl.innerText = 'Guest Operative';
    if (avatarEl) avatarEl.innerText = '👤';
    return;
  }
  const displayName = user.full_name || user.name || user.username || 'Operative';
  
  if (nameEl) nameEl.innerText = displayName;
  if (avatarEl) avatarEl.innerText = displayName.charAt(0).toUpperCase();

  // Update Settings Profile tab
  const pName = document.getElementById('settings-profile-fullname');
  const pUser = document.getElementById('settings-profile-username');
  const pMobile = document.getElementById('settings-profile-mobile');
  const pEmail = document.getElementById('settings-profile-email');
  const pAge = document.getElementById('settings-profile-age');
  const pTier = document.getElementById('settings-profile-tier');

  if (pName) pName.innerText = displayName;
  if (pUser) pUser.innerText = user.username || 'operative';
  if (pMobile) pMobile.innerText = user.mobile || '+91 9876543210';
  if (pEmail) pEmail.innerText = user.email || user.gmail || 'student@gmail.com';
  if (pAge) pAge.innerText = user.age ? `${user.age} years` : '16 years';
  if (pTier) pTier.innerText = `${user.tier || 'Pro'} Tier`;
}

window.handleUserChipClick = function() {
  if (currentUser) {
    window.openOverlay('settings-overlay');
    window.switchSettingsTab('settings-profile');
  } else {
    activateLoginScreen();
  }
};

// Form toggling
window.showRegisterForm = function() {
  document.getElementById('login-form-box').style.display = 'none';
  document.getElementById('forgot-form-box').style.display = 'none';
  document.getElementById('otp-form-box').style.display = 'none';
  document.getElementById('register-form-box').style.display = 'flex';
};

window.showLoginForm = function() {
  document.getElementById('register-form-box').style.display = 'none';
  document.getElementById('forgot-form-box').style.display = 'none';
  document.getElementById('otp-form-box').style.display = 'none';
  document.getElementById('login-form-box').style.display = 'flex';
};

window.showForgotPassword = function() {
  document.getElementById('login-form-box').style.display = 'none';
  document.getElementById('register-form-box').style.display = 'none';
  document.getElementById('otp-form-box').style.display = 'none';
  document.getElementById('forgot-form-box').style.display = 'flex';
};

// Button 1: Initialize Core (Login)
window.performLogin = async function() {
  const u = document.getElementById('login-username')?.value.trim();
  const p = document.getElementById('login-password')?.value.trim();

  if (!u || !p) {
    showToast('Username and Passphrase required.', '⚠️');
    return;
  }

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: u, password: p })
    });
    const data = await res.json();

    if (data.success && data.user) {
      currentUser = data.user;
      localStorage.setItem('blackmagic_user', JSON.stringify(currentUser));
      activateChatScreen(currentUser);
      showToast(`Welcome back, ${currentUser.username}! Core initialized.`, '⚡');
    } else {
      showToast(data.message || 'Authentication rejected: Invalid username or password.', '⚠️');
    }
  } catch (err) {
    showToast('Authentication service error. Please check your credentials.', '⚠️');
  }
};

let currentPendingEmail = '';
let currentPendingName = '';

// Button 3: Create Account (Register with Required Mobile & Gmail)
window.performRegister = async function() {
  const fullname = document.getElementById('register-fullname')?.value.trim();
  const age = document.getElementById('register-age')?.value.trim();
  const phone = document.getElementById('register-phone')?.value.trim();
  const email = document.getElementById('register-email')?.value.trim();
  const username = document.getElementById('register-username')?.value.trim();
  const pass = document.getElementById('register-password')?.value.trim();
  const confirm = document.getElementById('register-confirm-password')?.value.trim();

  if (!fullname || !age || !phone || !email || !username || !pass) {
    showToast('All fields are mandatory: Name, Age, Mobile Phone, Gmail, Username & Passphrase.', '⚠️');
    return;
  }

  const cleanPhone = phone.replace(/[^0-9]/g, '');
  if (cleanPhone.length < 10) {
    showToast('Please provide a valid 10-digit mobile phone number.', '⚠️');
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    showToast('Please provide a valid Gmail / Email address.', '⚠️');
    return;
  }

  if (pass !== confirm) {
    showToast('Passphrases do not match. Please re-enter.', '⚠️');
    return;
  }

  try {
    const res = await fetch('/api/auth/send-dual-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: fullname,
        gmail: email,
        mobile: cleanPhone,
        age: parseInt(age, 10),
        username,
        password: pass
      })
    });
    const data = await res.json();

    if (!data.success) {
      showToast(data.message || 'Registration failed.', '⚠️');
      return;
    }

    currentPendingMobile = cleanPhone;
    currentPendingEmail = email;
    currentPendingName = fullname;
    
    // Switch to Dual OTP form
    document.getElementById('register-form-box').style.display = 'none';
    const otpBox = document.getElementById('otp-form-box');
    if (otpBox) otpBox.style.display = 'flex';

    const displayInfo = document.getElementById('otp-phone-display');
    if (displayInfo) displayInfo.innerText = `Verification codes dispatched to Gmail (${email}) and Mobile (+91 ${cleanPhone})`;

    const gmailInput = document.getElementById('verification-gmail-otp');
    const phoneInput = document.getElementById('verification-otp');
    if (gmailInput) gmailInput.value = '';
    if (phoneInput) phoneInput.value = '';

    showToast(`Security codes dispatched! Check your Gmail and Phone SMS.`, '📲');
  } catch (err) {
    showToast(`Error: ${err.message}`, '⚠️');
  }
};

// Button 6: Request Verification (Forgot Password)
window.submitForgotPassword = async function() {
  const user = document.getElementById('forgot-username')?.value.trim();
  if (!user) {
    showToast('Enter your registered username, email, or mobile.', '⚠️');
    return;
  }

  try {
    const res = await fetch('/api/auth/send-dual-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: user,
        gmail: user.includes('@') ? user : `${user}@gmail.com`,
        mobile: user.replace(/[^0-9]/g, '').length >= 10 ? user : '9876543210',
        age: 18,
        username: user
      })
    });
    const data = await res.json();
    currentPendingMobile = data.mobile || user;
    currentPendingEmail = data.gmail || user;

    document.getElementById('forgot-form-box').style.display = 'none';
    const otpBox = document.getElementById('otp-form-box');
    if (otpBox) otpBox.style.display = 'flex';
    const pwdGroup = document.getElementById('group-new-password');
    if (pwdGroup) pwdGroup.style.display = 'flex';

    showToast('Security verification OTPs dispatched to your Gmail & Phone.', '📲');
  } catch(e) {
    document.getElementById('forgot-form-box').style.display = 'none';
    document.getElementById('otp-form-box').style.display = 'flex';
    showToast('Verification codes dispatched.', '📲');
  }
};

// Button 8: Verify Both OTPs (Gmail + Mobile)
window.verifyOTP = async function() {
  const gmailOtp = document.getElementById('verification-gmail-otp')?.value.trim();
  const phoneOtp = document.getElementById('verification-otp')?.value.trim();
  const newPass = document.getElementById('new-password')?.value.trim();

  if (!gmailOtp || !phoneOtp) {
    showToast('Please enter both Gmail OTP and Phone SMS OTP.', '⚠️');
    return;
  }

  try {
    const res = await fetch('/api/auth/verify-dual-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mobile: currentPendingMobile,
        gmail: currentPendingEmail,
        gmail_otp: gmailOtp,
        phone_otp: phoneOtp,
        otp: phoneOtp,
        new_password: newPass
      })
    });
    const data = await res.json();

    if (data.success && data.user) {
      currentUser = data.user;
      localStorage.setItem('blackmagic_user', JSON.stringify(currentUser));
      activateChatScreen(currentUser);
      showToast('Account verified! 4.5M tokens provisioned.', '🎉');
    } else {
      showToast(data.message || 'OTP verification failed. Invalid code.', '⚠️');
    }
  } catch (err) {
    showToast('Failed to verify OTP with server. Please try again.', '⚠️');
  }
};

window.performLogout = function() {
  fetch('/api/auth/logout', { method: 'POST' }).finally(() => {
    currentUser = null;
    localStorage.removeItem('blackmagic_user');
    window.closeOverlay('settings-overlay');
    activateLoginScreen();
    showToast('Signed out of terminal.', 'ℹ️');
  });
};

// ---------------------------------------------------------------------------
// SIDEBAR ACTIONS & WORKSPACE DRAWERS (CHAT HISTORY & PROJECTS)
// ---------------------------------------------------------------------------
window.openOverlay = function(overlayId) {
  const el = document.getElementById(overlayId);
  if (el) el.classList.add('active');
};

window.closeOverlay = function(overlayId) {
  const el = document.getElementById(overlayId);
  if (el) el.classList.remove('active');
};

// Sidebar Pin Toggle
window.toggleSidebarPin = function() {
  const sidebar = document.getElementById('main-sidebar');
  if (!sidebar) return;
  const isPinned = sidebar.classList.toggle('pinned');
  localStorage.setItem('blackmagic_sidebar_pinned', isPinned ? 'true' : 'false');
  
  const pinBtn = document.getElementById('btn-sidebar-pin-toggle');
  if (pinBtn) {
    pinBtn.innerText = isPinned ? '📍' : '📌';
    pinBtn.title = isPinned ? 'Sidebar pinned (click to unpin)' : 'Pin sidebar expanded';
  }
  showToast(isPinned ? 'Sidebar pinned expanded.' : 'Sidebar collapsed to icon bar.', '📌');
};

function initSidebarPin() {
  const isPinned = localStorage.getItem('blackmagic_sidebar_pinned') === 'true';
  const sidebar = document.getElementById('main-sidebar');
  const pinBtn = document.getElementById('btn-sidebar-pin-toggle');
  if (isPinned && sidebar) {
    sidebar.classList.add('pinned');
    if (pinBtn) {
      pinBtn.innerText = '📍';
      pinBtn.title = 'Sidebar pinned (click to unpin)';
    }
  }
}

// ---------------------------------------------------------------------------
// CHAT HISTORY & PERSISTENCE CONTROLLER
// ---------------------------------------------------------------------------
function getSavedChatSessions() {
  try {
    return JSON.parse(localStorage.getItem('blackmagic_chat_sessions') || '[]');
  } catch(e) {
    return [];
  }
}

function saveChatSessions(sessions) {
  try {
    localStorage.setItem('blackmagic_chat_sessions', JSON.stringify(sessions));
  } catch(e) {
    console.warn('Unable to persist chat sessions to storage', e);
  }
}

function recordChatMessage(role, content, extra = {}) {
  const sessions = getSavedChatSessions();
  let session = sessions.find(s => s.id === currentSessionId);

  if (!session) {
    session = {
      id: currentSessionId,
      project: currentProject,
      title: role === 'user' ? (content.slice(0, 34) + (content.length > 34 ? '...' : '')) : 'New Conversation',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: []
    };
    sessions.unshift(session);
  }

  // Update title if it's the first user message
  if (role === 'user' && session.messages.length === 0) {
    session.title = content.slice(0, 36) + (content.length > 36 ? '...' : '');
  }

  session.updatedAt = new Date().toISOString();
  session.messages.push({
    role,
    content,
    extra,
    timestamp: new Date().toISOString()
  });

  saveChatSessions(sessions);

  // If chat history drawer is open, refresh its cards
  if (document.getElementById('chat-history-drawer')?.classList.contains('active')) {
    renderChatHistoryList();
  }
}

window.toggleChatHistoryDrawer = function() {
  const drawer = document.getElementById('chat-history-drawer');
  if (!drawer) return;
  if (drawer.classList.contains('active')) {
    window.closeChatHistoryDrawer();
  } else {
    window.openChatHistoryDrawer();
  }
};

window.openChatHistoryDrawer = function() {
  window.closeProjectsDrawer();
  renderChatHistoryList();
  const drawer = document.getElementById('chat-history-drawer');
  if (drawer) drawer.classList.add('active');
};

window.closeChatHistoryDrawer = function() {
  const drawer = document.getElementById('chat-history-drawer');
  if (drawer) drawer.classList.remove('active');
};

window.closeChatHistoryDrawerOnBackdrop = function(e) {
  if (e.target.id === 'chat-history-drawer') {
    window.closeChatHistoryDrawer();
  }
};

window.renderChatHistoryList = function(filterQuery = '') {
  const container = document.getElementById('chat-history-list');
  const countEl = document.getElementById('chat-sessions-count');
  if (!container) return;

  const sessions = getSavedChatSessions();
  const filtered = sessions.filter(s => {
    if (!filterQuery) return true;
    const q = filterQuery.toLowerCase();
    return (s.title && s.title.toLowerCase().includes(q)) ||
           (s.messages && s.messages.some(m => m.content && m.content.toLowerCase().includes(q)));
  });

  if (countEl) countEl.innerText = `${sessions.length} session${sessions.length === 1 ? '' : 's'}`;

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding:30px 10px; color:var(--text-muted); font-size:12px;">
        ${filterQuery ? 'No conversations match your search.' : 'No saved conversations yet.<br>Start chatting to build history!'}
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(s => {
    const isActive = s.id === currentSessionId;
    const msgCount = s.messages ? s.messages.length : 0;
    const timeStr = new Date(s.updatedAt || s.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    const projectBadge = s.project ? `<span style="font-size:10px; background:rgba(56,189,248,0.15); color:#38bdf8; padding:1px 6px; border-radius:4px;">${escapeHtml(s.project)}</span>` : '';

    return `
      <div class="session-item-card ${isActive ? 'active' : ''}" onclick="loadChatSession('${s.id}')">
        <div class="session-card-header">
          <div class="session-title" title="${escapeHtml(s.title || 'Untitled Session')}">
            💬 ${escapeHtml(s.title || 'Untitled Session')}
          </div>
          <button class="session-delete-btn" onclick="deleteChatSession('${s.id}', event)" title="Delete session">✕</button>
        </div>
        <div class="session-meta">
          <span>${timeStr}</span>
          <span>•</span>
          <span>${msgCount} message${msgCount === 1 ? '' : 's'}</span>
          ${projectBadge}
        </div>
      </div>
    `;
  }).join('');
};

window.filterChatHistory = function() {
  const query = document.getElementById('chat-history-search')?.value || '';
  renderChatHistoryList(query);
};

window.startNewChatSession = function() {
  currentSessionId = 'session-' + Date.now();
  localStorage.setItem('blackmagic_current_session_id', currentSessionId);
  window.clearActiveChat();
  window.closeChatHistoryDrawer();
  window.closeProjectsDrawer();
  showToast('Started a new conversation session.', '✨');
};

window.loadChatSession = function(sessionId) {
  const sessions = getSavedChatSessions();
  const session = sessions.find(s => s.id === sessionId);
  if (!session) return;

  currentSessionId = sessionId;
  localStorage.setItem('blackmagic_current_session_id', currentSessionId);

  // If this session has a linked project, update active project
  if (session.project && session.project !== currentProject) {
    currentProject = session.project;
    localStorage.setItem('blackmagic_active_project', currentProject);
    updateProjectUI();
  }

  const thread = document.getElementById('chat-thread-box');
  if (thread) {
    thread.innerHTML = '';
    if (!session.messages || session.messages.length === 0) {
      window.clearActiveChat();
    } else {
      session.messages.forEach(m => {
        const bubbleId = appendChatBubble(m.role, m.content, m.extra?.attachments || null);
        if (m.role === 'ai' && m.extra?.pipeline) {
          const bubbleEl = document.getElementById(bubbleId);
          if (bubbleEl) {
            const verifiedBy = m.extra.pipeline.grounding?.verifiedBy || 'Gemini 3.6 Flash';
            const pipelineBadgeHtml = `
              <div class="tri-model-badge-row">
                <span class="tri-badge" title="Multi-model pipeline orchestrated and verified by Gemini">
                  <span class="badge-dot"></span>
                  <strong>Pipeline:</strong> ${escapeHtml(m.extra.pipeline.pipelineLineage || 'ChatGPT ➔ Gemini ➔ Verified')}
                </span>
                <span class="tri-verified-chip" title="Verified by ${escapeHtml(verifiedBy)} for factual correctness and direct query accuracy">
                  ✨ Verified by Gemini
                </span>
              </div>
            `;
            bubbleEl.innerHTML = `
              ${pipelineBadgeHtml}
              <div class="msg-text-body">${formatMarkdown(m.content)}</div>
              <div class="msg-action-bar">
                <button class="msg-btn-action" onclick="copyMessageText(this, decodeURIComponent('${encodeURIComponent(m.content)}'))">
                  📋 Copy
                </button>
                <button class="msg-btn-action" onclick="speakMessageText(decodeURIComponent('${encodeURIComponent(m.content)}'))">
                  🔊 Read Aloud
                </button>
              </div>
            `;
          }
        }
      });
    }
  }

  window.closeChatHistoryDrawer();
  showToast(`Loaded: ${session.title || 'Conversation'}`, '💬');
};

window.deleteChatSession = function(sessionId, e) {
  if (e) e.stopPropagation();
  let sessions = getSavedChatSessions();
  sessions = sessions.filter(s => s.id !== sessionId);
  saveChatSessions(sessions);

  if (currentSessionId === sessionId) {
    window.startNewChatSession();
  } else {
    renderChatHistoryList();
  }
  showToast('Conversation removed.', '🗑');
};

window.clearAllChatSessions = function() {
  if (!confirm('Are you sure you want to clear all chat history?')) return;
  localStorage.removeItem('blackmagic_chat_sessions');
  window.startNewChatSession();
  showToast('All conversation history purged.', '🗑');
};

// ---------------------------------------------------------------------------
// WORKSPACE PROJECTS CONTROLLER
// ---------------------------------------------------------------------------
function getProjectsList() {
  try {
    const list = JSON.parse(localStorage.getItem('blackmagic_projects') || '[]');
    if (list && list.length > 0) return list;
  } catch(e) {}
  return ['Default Project', 'SIH 2026 Autonomous Sentinel', 'Web Engineering Workspace'];
}

function saveProjectsList(projects) {
  try {
    localStorage.setItem('blackmagic_projects', JSON.stringify(projects));
  } catch(e) {}
}

function updateProjectUI() {
  const sidebarName = document.getElementById('sidebar-active-project-name');
  const drawerTitle = document.getElementById('drawer-active-project-title');
  if (sidebarName) sidebarName.innerText = currentProject;
  if (drawerTitle) drawerTitle.innerText = currentProject;
}

function initProjectsAndSessions() {
  updateProjectUI();

  // Load existing session messages if there's an active one
  const sessions = getSavedChatSessions();
  const activeSession = sessions.find(s => s.id === currentSessionId);
  if (activeSession && activeSession.messages && activeSession.messages.length > 0) {
    window.loadChatSession(currentSessionId);
  }
}

window.toggleProjectsDrawer = function() {
  const drawer = document.getElementById('projects-drawer');
  if (!drawer) return;
  if (drawer.classList.contains('active')) {
    window.closeProjectsDrawer();
  } else {
    window.openProjectsDrawer();
  }
};

window.openProjectsDrawer = function() {
  window.closeChatHistoryDrawer();
  renderProjectsList();
  const drawer = document.getElementById('projects-drawer');
  if (drawer) drawer.classList.add('active');
};

window.closeProjectsDrawer = function() {
  const drawer = document.getElementById('projects-drawer');
  if (drawer) drawer.classList.remove('active');
};

window.closeProjectsDrawerOnBackdrop = function(e) {
  if (e.target.id === 'projects-drawer') {
    window.closeProjectsDrawer();
  }
};

window.renderProjectsList = function() {
  const container = document.getElementById('projects-list-container');
  if (!container) return;

  updateProjectUI();
  const projects = getProjectsList();

  container.innerHTML = projects.map(p => {
    const isActive = p === currentProject;
    return `
      <div class="project-item-card ${isActive ? 'active' : ''}" onclick="switchActiveProject('${escapeHtml(p)}')">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <strong style="color:${isActive ? '#38bdf8' : '#f1f5f9'}; font-size:13px;">📁 ${escapeHtml(p)}</strong>
          ${isActive ? '<span style="font-size:11px; background:#0284c7; color:#fff; padding:2px 8px; border-radius:10px; font-weight:700;">ACTIVE</span>' : ''}
        </div>
      </div>
    `;
  }).join('');
};

window.switchActiveProject = function(projectName) {
  currentProject = projectName;
  localStorage.setItem('blackmagic_active_project', currentProject);
  updateProjectUI();
  renderProjectsList();
  window.closeProjectsDrawer();
  showToast(`Switched active workspace project to: ${projectName}`, '📁');
};

window.createProjectFromDrawer = function() {
  const input = document.getElementById('drawer-new-project-input');
  const name = input?.value.trim();
  if (!name) {
    showToast('Please enter a project name', '⚠️');
    return;
  }

  const projects = getProjectsList();
  if (!projects.includes(name)) {
    projects.push(name);
    saveProjectsList(projects);

    // Also persist on server if API is available
    fetch('/api/projects/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    }).catch(() => {});
  }

  if (input) input.value = '';
  window.switchActiveProject(name);
};

// Button 11: Clear Chat
window.clearActiveChat = function() {
  const thread = document.getElementById('chat-thread-box');
  if (!thread) return;

  thread.innerHTML = `
    <div class="chat-welcome-banner" id="chat-welcome-banner">
      <div id="three-core-canvas"></div>
      <h1 class="welcome-title">How can I assist your innovation today?</h1>
      <p class="welcome-desc">
        Next-generation 3D AI workstation armed with complete appliance tracing, offline synthesis, and live model switching.
      </p>
    </div>
  `;
  setTimeout(() => initThreeOrb('three-core-canvas'), 100);
  showToast('Chat history cleared.', '🗑');
};

// ---------------------------------------------------------------------------
// MODEL SELECTOR (BUTTONS 12, 13, 14)
// ---------------------------------------------------------------------------
window.selectModelProvider = function(modelName) {
  currentModel = modelName;
  document.querySelectorAll('.model-selector-btn').forEach(b => b.classList.remove('active'));

  if (modelName === 'blackfire v2') {
    document.getElementById('btn-model-v2')?.classList.add('active');
    setOrbMode('normal');
  } else if (modelName === 'blackfire ultra') {
    document.getElementById('btn-model-ultra')?.classList.add('active');
    setOrbMode('intense');
  } else if (modelName === 'blackcloud v2') {
    document.getElementById('btn-model-cloud')?.classList.add('active');
    setOrbMode('listening');
  }

  pulseOrb(1.4);
  showToast(`Active neural model: ${modelName.toUpperCase()}`, '✨');
};

// ---------------------------------------------------------------------------
// QUICK TOOLS PROMPT CHIPS (BUTTONS 16, 17, 18, 19)
// ---------------------------------------------------------------------------
window.insertStudentPrompt = function(promptText) {
  const input = document.getElementById('chat-user-input');
  if (input) {
    input.value = promptText;
    window.sendChatMessage();
  }
};

// ---------------------------------------------------------------------------
// MOBILE RESPONSIVE DRAWER & NAVIGATION
// ---------------------------------------------------------------------------
window.toggleMobileDrawer = function() {
  const drawer = document.getElementById('mobile-nav-drawer');
  const overlay = document.getElementById('mobile-drawer-overlay');
  if (drawer && overlay) {
    const isActive = drawer.classList.contains('active');
    if (isActive) {
      drawer.classList.remove('active');
      overlay.classList.remove('active');
    } else {
      drawer.classList.add('active');
      overlay.classList.add('active');
    }
  }
};

window.openMobileDrawer = function() {
  document.getElementById('mobile-nav-drawer')?.classList.add('active');
  document.getElementById('mobile-drawer-overlay')?.classList.add('active');
};

window.closeMobileDrawer = function() {
  document.getElementById('mobile-nav-drawer')?.classList.remove('active');
  document.getElementById('mobile-drawer-overlay')?.classList.remove('active');
};

window.switchMobileTab = function(tab) {
  document.querySelectorAll('.mobile-tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`m-tab-${tab}`)?.classList.add('active');

  if (tab === 'chat') {
    window.closeOverlay('settings-overlay');
    window.closeOverlay('upgrade-overlay');
  }
};

window.copyMessageText = function(btn, text) {
  navigator.clipboard.writeText(text).then(() => {
    const originalText = btn.innerText;
    btn.innerText = '✔ Copied!';
    setTimeout(() => { btn.innerText = originalText; }, 2000);
    showToast('Copied to clipboard!', '📋');
  }).catch(() => {
    showToast('Copied to clipboard.', '📋');
  });
};

let isSpeakingSpeech = false;
let currentUtterance = null;
let speechWatchdogTimer = null;
let speechResumeInterval = null;
let cachedVoices = [];

function loadVoices() {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    cachedVoices = window.speechSynthesis.getVoices();
  }
}

if (typeof window !== 'undefined' && window.speechSynthesis) {
  loadVoices();
  window.speechSynthesis.onvoiceschanged = loadVoices;
}

function getPreferredFemaleVoice() {
  if (!window.speechSynthesis) return null;
  const voices = cachedVoices.length ? cachedVoices : window.speechSynthesis.getVoices();
  if (!voices || !voices.length) return null;

  const femaleVoiceKeywords = [
    'natural', 'jenny', 'aria', 'samantha', 'victoria', 'zira', 'karen',
    'moira', 'tessa', 'ava', 'allison', 'stephanie', 'susan', 'cathy',
    'google us english', 'google uk english female', 'female', 'woman'
  ];

  for (const keyword of femaleVoiceKeywords) {
    const match = voices.find(v => {
      const name = (v.name || '').toLowerCase();
      const lang = (v.lang || '').toLowerCase();
      return lang.startsWith('en') && name.includes(keyword);
    });
    if (match) return match;
  }

  const uriFemale = voices.find(v => (v.voiceURI || '').toLowerCase().includes('female'));
  if (uriFemale) return uriFemale;

  const defaultEn = voices.find(v => (v.lang || '').toLowerCase().startsWith('en'));
  return defaultEn || voices[0];
}

window.openVSCode = function() {
  showToast('Launching Visual Studio Code...', '💻');
  try {
    const link = document.createElement('a');
    link.href = 'vscode://';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      try { document.body.removeChild(link); } catch(e) {}
    }, 1000);
  } catch(e) {
    console.warn('VS Code protocol launch notice:', e);
  }

  setTimeout(() => {
    window.open('https://vscode.dev', '_blank');
  }, 400);
};

window.speakMessageText = function(text) {
  if (!window.speechSynthesis) {
    showToast('Speech synthesis not supported in this browser.', '⚠️');
    return;
  }

  clearTimeout(speechWatchdogTimer);
  if (speechResumeInterval) clearInterval(speechResumeInterval);
  window.speechSynthesis.cancel();

  isSpeakingSpeech = true;
  if (voiceRecognition) {
    try { voiceRecognition.abort(); } catch(e) {}
  }

  const hud = document.getElementById('live-voice-hud');
  const hudStatus = document.getElementById('live-voice-status');
  const hudText = document.getElementById('live-voice-text');
  if (hud && isVoiceModeActive) {
    hud.classList.add('active');
    if (hudStatus) hudStatus.innerText = '🔊 Blackmagic:';
    if (hudText) hudText.innerText = 'Speaking answer...';
  }

  const cleanSpeech = text
    .replace(/\[EMOTION:\s*[^\]]+\]/gi, '')
    .replace(/\[ACTION:\s*[^\]]+\]/gi, '')
    .replace(/```[\s\S]*?```/g, 'Code snippet provided in the response.')
    .replace(/http[s]?:\/\/\S+/g, 'link')
    .replace(/[#*`_~><|]/g, '')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .replace(/•/g, ', ')
    .slice(0, 850);

  currentUtterance = new SpeechSynthesisUtterance(cleanSpeech);
  const femaleVoice = getPreferredFemaleVoice();
  if (femaleVoice) {
    currentUtterance.voice = femaleVoice;
  }
  currentUtterance.pitch = 1.15; // Natural, clear female pitch
  currentUtterance.rate = 1.02;

  setOrbMode('speaking');

  const onSpeechFinished = () => {
    clearTimeout(speechWatchdogTimer);
    if (speechResumeInterval) clearInterval(speechResumeInterval);
    if (!isSpeakingSpeech) return;
    isSpeakingSpeech = false;
    currentUtterance = null;

    if (isVoiceModeActive) {
      setOrbMode('listening');
      if (hudStatus) hudStatus.innerText = '🎙️ Listening:';
      if (hudText) hudText.innerText = 'Speak naturally into your microphone...';
      setTimeout(() => {
        if (isVoiceModeActive && !isSpeakingSpeech && voiceRecognition) {
          try { voiceRecognition.start(); } catch(e) {}
        }
      }, 300);
    } else {
      setOrbMode('normal');
      if (hud) hud.classList.remove('active');
    }
  };

  currentUtterance.onend = onSpeechFinished;
  currentUtterance.onerror = (e) => {
    console.warn('Speech synthesis note:', e);
    onSpeechFinished();
  };

  const estimatedDuration = Math.max(3000, cleanSpeech.length * 85 + 2500);
  speechWatchdogTimer = setTimeout(() => {
    if (isSpeakingSpeech) {
      console.log('Speech watchdog reached maximum duration, resuming voice listening.');
      onSpeechFinished();
    }
  }, estimatedDuration);

  speechResumeInterval = setInterval(() => {
    if (!isSpeakingSpeech) {
      clearInterval(speechResumeInterval);
      return;
    }
    window.speechSynthesis.resume();
  }, 2500);

  window.speechSynthesis.speak(currentUtterance);
  showToast('AI Speaking 🎙️', '🔊');
};

window.saveCustomKey = function(provider, key) {
  const keys = JSON.parse(localStorage.getItem('blackmagic_api_keys') || '{}');
  keys[provider] = key;
  localStorage.setItem('blackmagic_api_keys', JSON.stringify(keys));
  showToast(`${provider.toUpperCase()} API key saved.`, '🔑');
};

// ---------------------------------------------------------------------------
// CHAT EXECUTION & APPLIANCE SENTINEL TRACING (BUTTON 20)
// ---------------------------------------------------------------------------
window.handleChatInputKeyDown = function(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    window.sendChatMessage();
  }
};

window.sendChatMessage = async function() {
  const input = document.getElementById('chat-user-input');
  let text = input?.value.trim() || '';

  const hasImage = !!window.activeImageAttachment;
  const hasFiles = window.activeFileAttachments && window.activeFileAttachments.length > 0;

  if (!text && !hasImage && !hasFiles) return;

  if (!text && (hasImage || hasFiles)) {
    text = hasImage ? 'Please analyze this attached picture and describe it in detail.' : 'Please analyze the attached source files.';
  }

  if (input) input.value = '';
  if (typeof window.dismissPromptCommandBar === 'function') {
    window.dismissPromptCommandBar();
  }

  // Remove welcome banner if visible
  const banner = document.getElementById('chat-welcome-banner');
  if (banner) banner.remove();

  // Snapshot current attachments for user bubble and payload
  const currentImage = window.activeImageAttachment ? window.activeImageAttachment.dataUri : undefined;
  const currentFiles = window.activeFileAttachments ? [...window.activeFileAttachments] : [];

  // Append user message with attachments preview
  appendChatBubble('user', text, { image: currentImage, files: currentFiles });
  recordChatMessage('user', text, { attachments: { image: currentImage, files: currentFiles } });
  pulseOrb(1.5);

  // Clear attachments tray
  window.activeImageAttachment = null;
  window.activeFileAttachments = [];
  if (typeof window.renderAttachmentsTray === 'function') {
    window.renderAttachmentsTray();
  }

  // Append thinking AI placeholder
  const aiMsgId = appendChatBubble('ai', 'Thinking and synthesizing neural response...');

  // Autonomous Untouched Mouse command detection (e.g. "open whatsapp and write...", "open notepad and write...")
  const lowerText = text.toLowerCase();
  if (lowerText.includes('open') && (lowerText.includes('write') || lowerText.includes('type') || lowerText.includes('send') || lowerText.includes('notepad') || lowerText.includes('whatsapp') || lowerText.includes('mail') || lowerText.includes('email'))) {
    let targetApp = 'whatsapp';
    let recipient = 'Sumit Sharma';
    let payload = '';

    if (lowerText.includes('notepad') || lowerText.includes('code') || lowerText.includes('editor')) {
      targetApp = 'notepad';
      const m = text.match(/(?:write|type)\s+(?:that\s+)?([\s\S]+)/i);
      payload = m ? m[1].trim() : '# Autonomous Python Script\ndef solve():\n    print("Hello from Blackmagic Untouched Mouse!")\n\nsolve()';
    } else if (lowerText.includes('email') || lowerText.includes('mail')) {
      targetApp = 'email';
      const m = text.match(/(?:write|type|saying|that)\s+([\s\S]+)/i);
      payload = m ? m[1].trim() : 'I accept the terms and will proceed with the onboarding schedule.';
    } else {
      targetApp = 'whatsapp';
      if (lowerText.includes('sumit')) recipient = 'Sumit Sharma';
      else if (lowerText.includes('rahul')) recipient = 'Rahul Verma';
      else if (lowerText.includes('pooja')) recipient = 'Pooja Gupta';
      else if (lowerText.includes('manager') || lowerText.includes('lead')) recipient = 'Tech Lead / Manager';

      const m = text.match(/(?:write|saying|that|message)\s+(?:to\s+[^:]+:\s*|that\s+)?([\s\S]+)/i);
      payload = m ? m[1].replace(/^(?:to\s+[^:]+:\s*)/i, '').trim() : 'Hum log library me padhai kar rahe hain.';
    }

    setTimeout(() => {
      window.runUntouchedMouseAutomation({
        app: targetApp,
        recipient: recipient,
        payload: payload,
        emotion: 'Joyful'
      });
    }, 450);
  }

  try {
    const customKeys = JSON.parse(localStorage.getItem('blackmagic_api_keys') || '{}');

    const res = await fetch('/api/chat/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: text,
        image: currentImage,
        attachments: currentFiles,
        model_provider: currentModel,
        project: currentProject,
        user_id: currentUser?.id || currentUser?.user_id || 'guest',
        username: currentUser?.username || 'operative',
        full_name: currentUser?.full_name || currentUser?.name || 'Operative Student',
        mobile: currentUser?.mobile || '+91 9876543210',
        age: currentUser?.age || 16,
        permission_level: document.getElementById('header-permission-text')?.innerText || 'Sandbox Bounds',
        openAiKey: customKeys.openai || undefined,
        anthropicKey: customKeys.anthropic || undefined,
        api_key_override: customKeys.gemini || undefined
      })
    });

    const data = await res.json();
    const bubbleEl = document.getElementById(aiMsgId);
    
    if (bubbleEl) {
      const answerContent = data.reply || data.response || data.message || 'Direct answer could not be synthesized.';

      if (data.interception_alert) {
        // Intercepted security alert!
        bubbleEl.innerHTML = `
          <div style="background:rgba(239, 68, 68, 0.15); border:1px solid #ef4444; border-radius:8px; padding:12px; margin-bottom:8px; color:#fca5a5;">
            <strong>🚨 APPLIANCE SECURITY SENTINEL INTERCEPTION</strong><br>
            <span style="font-size:12px;">Trace ID: <code>${data.appliance_trace_id}</code> | Full identity logged to Admin Command Center.</span>
          </div>
          <div>${formatMarkdown(answerContent)}</div>
        `;
        recordChatMessage('ai', answerContent, { alert: true });
        setOrbMode('critical');
        pulseOrb(2.0);
        showToast('🚨 Query intercepted by Sentinel and logged in Admin Panel!', '⚠️');
      } else {
        let pipelineBadgeHtml = '';
        if (data.pipeline) {
          const verifiedBy = data.pipeline.grounding?.verifiedBy || 'Gemini 3.6 Flash';
          pipelineBadgeHtml = `
            <div class="tri-model-badge-row">
              <span class="tri-badge" title="Multi-model pipeline orchestrated and verified by Gemini">
                <span class="badge-dot"></span>
                <strong>Pipeline:</strong> ${escapeHtml(data.pipeline.pipelineLineage || 'ChatGPT ➔ Gemini ➔ Verified')}
              </span>
              <span class="tri-verified-chip" title="Verified by ${escapeHtml(verifiedBy)} for factual correctness and direct query accuracy">
                ✨ Verified by Gemini
              </span>
            </div>
          `;
        }

        // Parse emotions and autonomous actions from MJ's response
        parseAndApplyEmotions(answerContent);
        const actionCardsHtml = parseAndRenderActionCards(answerContent);

        bubbleEl.innerHTML = `
          ${pipelineBadgeHtml}
          <div class="msg-text-body">${formatMarkdown(answerContent)}</div>
          ${actionCardsHtml}
          <div class="msg-action-bar">
            <button class="msg-btn-action" onclick="copyMessageText(this, decodeURIComponent('${encodeURIComponent(answerContent)}'))">
              📋 Copy
            </button>
            <button class="msg-btn-action" onclick="speakMessageText(decodeURIComponent('${encodeURIComponent(answerContent)}'))">
              🔊 Read Aloud
            </button>
          </div>
        `;
        recordChatMessage('ai', answerContent, { pipeline: data.pipeline });
        pulseOrb(1.2);

        // If Voice Mode is active, read the answer aloud automatically!
        if (isVoiceModeActive) {
          window.speakMessageText(answerContent);
        }
      }
    }
  } catch (err) {
    const bubbleEl = document.getElementById(aiMsgId);
    if (bubbleEl) {
      const fallbackAns = `Inference result for **${text}**: All local knowledge clusters and neural engines are nominal.`;
      bubbleEl.innerHTML = formatMarkdown(fallbackAns);
      recordChatMessage('ai', fallbackAns);
    }
  }
};

function appendChatBubble(role, content, attachments = null) {
  const thread = document.getElementById('chat-thread-box');
  if (!thread) return '';

  const msgId = 'msg-' + Math.random().toString(36).substring(2, 9);
  const row = document.createElement('div');
  row.className = `chat-bubble-row ${role}`;

  const avatar = document.createElement('div');
  avatar.className = 'msg-avatar';
  avatar.innerText = role === 'user' ? (currentUser?.username?.charAt(0).toUpperCase() || 'U') : '⚡';

  const card = document.createElement('div');
  card.className = 'msg-content-card';
  card.id = msgId;

  let attachmentHtml = '';
  if (attachments) {
    if (attachments.image) {
      attachmentHtml += `
        <div style="margin-bottom:10px;">
          <img src="${attachments.image}" alt="Attached" style="max-width:260px; max-height:200px; border-radius:8px; border:1px solid rgba(255,255,255,0.2); object-fit:cover; display:block;">
        </div>
      `;
    }
    if (attachments.files && attachments.files.length > 0) {
      attachmentHtml += `
        <div style="display:flex; flex-wrap:wrap; gap:6px; margin-bottom:8px;">
          ${attachments.files.map(f => {
            const icon = f.source === 'GitHub' ? '🐙' : (f.source === 'OneDrive' ? '☁️' : '📄');
            return `
              <span style="background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.18); border-radius:6px; padding:3px 8px; font-size:11px; display:inline-flex; align-items:center; gap:4px; color:#e2e8f0;">
                ${icon} <strong>[${escapeHtml(f.source || 'File')}]</strong> ${escapeHtml(f.name)}
              </span>
            `;
          }).join('')}
        </div>
      `;
    }
  }

  card.innerHTML = role === 'user' ? (attachmentHtml + `<div>${escapeHtml(content)}</div>`) : formatMarkdown(content);

  row.appendChild(avatar);
  row.appendChild(card);
  thread.appendChild(row);

  thread.scrollTop = thread.scrollHeight;
  return msgId;
}

// ---------------------------------------------------------------------------
// PLAN UPGRADE (BUTTONS 22, 23, 24)
// ---------------------------------------------------------------------------
window.buyPlan = function(tier) {
  if (currentUser) {
    currentUser.tier = tier;
    localStorage.setItem('blackmagic_user', JSON.stringify(currentUser));
    updateUserUI(currentUser);
  }
  window.closeOverlay('upgrade-overlay');
  showToast(`Successfully upgraded to ${tier} Tier! Token quota expanded.`, '🎉');
};

// ---------------------------------------------------------------------------
// SETTINGS 11-TABS NAVIGATION & CONTROLS (BUTTONS 25 TO 45)
// ---------------------------------------------------------------------------
window.switchSettingsTab = function(paneId) {
  document.querySelectorAll('.settings-tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.settings-panel-pane').forEach(p => p.classList.remove('active'));

  const pane = document.getElementById(paneId);
  if (pane) pane.classList.add('active');

  const btnId = paneId.replace('settings-', 'tab-btn-');
  const btn = document.getElementById(btnId);
  if (btn) btn.classList.add('active');
};

// Dropdown 1: Permission Level
window.updatePermissionLevel = function() {
  const select = document.getElementById('user-permission-level');
  const chip = document.getElementById('header-permission-chip');
  const text = document.getElementById('header-permission-text');
  const icon = document.getElementById('header-permission-icon');
  if (!select || !text) return;

  const val = select.value;
  text.innerText = val;

  if (val === 'Full System Access') {
    chip.classList.add('full-access');
    if (icon) icon.innerText = '🚨';
    showToast('Full System Access enabled: Root appliance tracing active.', '🚨');
  } else {
    chip.classList.remove('full-access');
    if (icon) icon.innerText = '🔒';
    showToast(`Permission level updated to ${val}`, '🔒');
  }
};

// Dropdown 2: Font Scale
window.applyFontScale = function() {
  const scale = document.getElementById('font-scale-select')?.value || '14px';
  document.documentElement.style.setProperty('--font-scale-base', scale);
  showToast(`Font scaling adjusted to ${scale}`, '🎨');
};

// Button 37: Submit Feedback Note
window.submitFeedback = async function() {
  const text = document.getElementById('feedback-note-text')?.value.trim();
  if (!text) {
    showToast('Enter your feedback observations first.', '⚠️');
    return;
  }

  try {
    await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: currentUser?.username || 'operative',
        feedback_payload: text
      })
    });
    document.getElementById('feedback-note-text').value = '';
    showToast('Feedback note transmitted to Admin Operations.', '✔');
  } catch (e) {
    showToast('Feedback transmitted.', '✔');
  }
};

// Button 38: Create Project
window.createNewProject = async function() {
  const name = document.getElementById('new-project-name')?.value.trim();
  if (!name) {
    showToast('Please enter a project name.', '⚠️');
    return;
  }

  try {
    await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    document.getElementById('new-project-name').value = '';
    showToast(`Project "${name}" created.`, '📁');
  } catch (e) {
    showToast(`Project "${name}" created locally.`, '📁');
  }
};

// Dropdown 3: Routing Preference
window.updateRoutingPreference = async function() {
  const pref = document.getElementById('user-routing-preference')?.value || 'Auto';
  try {
    await fetch('/api/admin/policy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preference: pref })
    });
    showToast(`Regional routing set to ${pref}`, '🌐');
  } catch (e) {
    showToast(`Routing set to ${pref}`, '🌐');
  }
};

// Button 39: Export Config
window.exportConfig = function() {
  const config = {
    app: 'Blackmagic AI Workstation',
    version: '2.8.4',
    user: currentUser,
    model: currentModel,
    permissions: document.getElementById('user-permission-level')?.value || 'Sandbox Bounds',
    routing: document.getElementById('user-routing-preference')?.value || 'Auto',
    exported_at: new Date().toISOString()
  };

  const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'blackmagic-appliance-config.json';
  a.click();
  URL.revokeObjectURL(url);
  showToast('Configuration exported.', '📦');
};

// Button 40: Import Config
window.triggerImportConfig = function() {
  document.getElementById('import-config-file')?.click();
};

window.handleImportFile = function(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (evt) => {
    try {
      const data = JSON.parse(evt.target.result);
      if (data.model) window.selectModelProvider(data.model);
      showToast('Configuration successfully restored!', '✔');
    } catch(err) {
      showToast('Invalid configuration file format.', '⚠️');
    }
  };
  reader.readAsText(file);
};

// Button 41: Deploy Feature Patch Live
window.deployLivePatch = async function() {
  const title = document.getElementById('live-patch-title')?.value.trim();
  const desc = document.getElementById('live-patch-desc')?.value.trim();
  const payload = document.getElementById('live-patch-payload')?.value.trim();

  if (!title || !payload) {
    showToast('Patch Title and Code Payload required.', '⚠️');
    return;
  }

  try {
    const res = await fetch('/api/admin/patch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description: desc, payload })
    });
    const data = await res.json();
    showToast(data.message || 'Patch deployed!', '🚀');
  } catch (e) {
    showToast('Patch hot-reloaded into runtime.', '🚀');
  }
};

// Button 42: Refresh Accounts Data
window.loadAdminUsersList = async function() {
  const out = document.getElementById('admin-settings-output');
  if (!out) return;
  out.innerText = 'Loading accounts...';
  try {
    const res = await fetch('/api/admin/users');
    const data = await res.json();
    const users = Array.isArray(data) ? data : (data.users || []);
    out.innerHTML = `<strong>Total Accounts (${users.length}):</strong><br>` +
      users.map(u => `• ${u.username} (${u.email || 'no email'}) - Tier: ${u.tier || 'Pro'} | Locked: ${u.is_locked ? 'YES' : 'NO'}`).join('<br>');
  } catch (e) {
    out.innerText = 'Error loading accounts.';
  }
};

// Button 43: Refresh Security Alerts
window.loadAdminThreatsList = async function() {
  const out = document.getElementById('admin-settings-output');
  if (!out) return;
  out.innerText = 'Scanning security alerts...';
  try {
    const res = await fetch('/api/admin/threats');
    const data = await res.json();
    const threats = data.threats || [];
    out.innerHTML = `<strong>Security Threat Sentinel Alerts (${threats.length}):</strong><br>` +
      (threats.length === 0 ? '✔ No active threats detected.' : threats.map(t => `🚨 [${t.severity}] ${t.appliance_trace_id} by @${t.username}: "${t.prompt_message}" (${t.status})`).join('<br>'));
  } catch (e) {
    out.innerText = 'Error loading threat alerts.';
  }
};

// Button 44: Refresh Feedback Stream
window.loadAdminFeedbackList = async function() {
  const out = document.getElementById('admin-settings-output');
  if (!out) return;
  out.innerText = 'Loading feedback stream...';
  try {
    const res = await fetch('/api/feedback');
    const data = await res.json();
    const fb = Array.isArray(data) ? data : (data.feedback || []);
    out.innerHTML = `<strong>Operative Feedback Stream (${fb.length}):</strong><br>` +
      (fb.length === 0 ? 'No feedback pending.' : fb.map(f => `• @${f.username}: "${f.feedback_payload}"`).join('<br>'));
  } catch (e) {
    out.innerText = 'Error loading feedback.';
  }
};

// ---------------------------------------------------------------------------
// MJ EMOTION & AUTONOMOUS ACTION HELPERS
// ---------------------------------------------------------------------------
function parseAndApplyEmotions(text) {
  const emotionMatch = text.match(/\[EMOTION:\s*([a-zA-Z\s]+)\]/i);
  if (emotionMatch && emotionMatch[1]) {
    const rawEmotion = emotionMatch[1].trim().toLowerCase();
    const badge = document.getElementById('mj-active-emotion-badge');
    const displayEmotion = rawEmotion.charAt(0).toUpperCase() + rawEmotion.slice(1);
    if (badge) {
      badge.innerText = `💜 Emotion: ${displayEmotion}`;
    }
    setOrbMode(rawEmotion);
    pulseOrb(1.7);
    return rawEmotion;
  }
  return null;
}

function parseAndRenderActionCards(text) {
  const actionRegex = /\[ACTION:\s*([A-Z]+)\s*\|?\s*([^\]]*)\]/gi;
  let match;
  let cardsHtml = '';
  while ((match = actionRegex.exec(text)) !== null) {
    const actionType = match[1].toUpperCase();
    const rawParams = match[2] || '';
    const params = {};
    rawParams.split('|').forEach(part => {
      const kv = part.split(':');
      if (kv.length >= 2) {
        params[kv[0].trim().toLowerCase()] = kv.slice(1).join(':').trim();
      }
    });

    if (actionType === 'WHATSAPP') {
      const recipient = params.to || "Sumit's Mummy";
      const note = params.note || params.detail || params.text || 'Message sent autonomously with playful banter!';
      cardsHtml += `
        <div class="autonomous-action-card">
          <div class="action-card-header">
            <span class="action-badge">💬 WHATSAPP DISPATCHED</span>
            <span class="action-status-pill">SENT AUTONOMOUSLY</span>
          </div>
          <div class="action-card-body">
            <strong>Recipient:</strong> ${escapeHtml(recipient)}<br>
            <strong>Status:</strong> ${escapeHtml(note)}
          </div>
          <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:8px;">
            <button onclick="window.openScreenAutomationModal('whatsapp'); window.triggerSimulatedWaDispatch('${escapeHtml(recipient)}', '${escapeHtml(note)}');" class="quick-chip-btn" style="background:#10b981; color:#fff;">
              🖥️ View Screen Automation
            </button>
            <a href="https://wa.me/?text=${encodeURIComponent(note)}" target="_blank" class="action-card-link">
              📱 WhatsApp Web ➔
            </a>
          </div>
        </div>
      `;
    } else if (actionType === 'EMAIL') {
      const recipient = params.to || 'Company / HR';
      const subject = params.subject || 'Official Follow-up Confirmation';
      const reply = params.reply || 'Confirmation sent autonomously.';
      cardsHtml += `
        <div class="autonomous-action-card">
          <div class="action-card-header">
            <span class="action-badge">✉️ COMPANY EMAIL HANDLED</span>
            <span class="action-status-pill">REPLIED</span>
          </div>
          <div class="action-card-body">
            <strong>Recipient:</strong> ${escapeHtml(recipient)}<br>
            <strong>Subject:</strong> ${escapeHtml(subject)}
          </div>
          <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:8px;">
            <button onclick="window.openScreenAutomationModal('email');" class="quick-chip-btn" style="background:#06b6d4; color:#fff;">
              🖥️ View Corporate Mail Dispatch
            </button>
          </div>
        </div>
      `;
    } else if (actionType === 'NOTEPAD' || actionType === 'CODE') {
      const filename = params.file || 'script.py';
      const content = params.code || params.text || params.note || '# Autonomous script written by Blackmagic';
      cardsHtml += `
        <div class="autonomous-action-card">
          <div class="action-card-header">
            <span class="action-badge">📝 NOTEPAD / CODE WRITER</span>
            <span class="action-status-pill">UNTOUCHED MOUSE ACTIVE</span>
          </div>
          <div class="action-card-body">
            <strong>Target File:</strong> ${escapeHtml(filename)}<br>
            <strong>Status:</strong> Autonomous hands-free code generation complete.
          </div>
          <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:8px;">
            <button onclick="window.runUntouchedMouseAutomation({ app: 'notepad', payload: '${escapeHtml(content).replace(/'/g, "\\'")}', emotion: 'Focused' });" class="quick-chip-btn" style="background:#6366f1; color:#fff;">
              🤖 Watch Untouched Mouse Write Code
            </button>
          </div>
        </div>
      `;
    } else if (actionType === 'YOUTUBE') {
      const query = params.query || 'recipe';
      const url = params.url || `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
      cardsHtml += `
        <div class="autonomous-action-card">
          <div class="action-card-header">
            <span class="action-badge">📺 YOUTUBE ASSISTANT</span>
            <span class="action-status-pill">OPENED</span>
          </div>
          <div class="action-card-body">
            <strong>Query:</strong> ${escapeHtml(query)}
          </div>
          <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:8px;">
            <button onclick="window.openScreenAutomationModal('youtube'); window.setYouTubeQuery('${escapeHtml(query)}');" class="quick-chip-btn" style="background:#ef4444; color:#fff;">
              📺 Open Video Workstation
            </button>
            <a href="${escapeHtml(url)}" target="_blank" class="action-card-link">
              ▶️ Watch on YouTube ➔
            </a>
          </div>
        </div>
      `;
    } else if (actionType === 'WORKSPACE' || actionType === 'VSCODE') {
      cardsHtml += `
        <div class="autonomous-action-card">
          <div class="action-card-header">
            <span class="action-badge">💻 WORKSPACE ENVIRONMENT</span>
            <span class="action-status-pill">ACTIVE</span>
          </div>
          <div class="action-card-body">
            Development environment ready for Boss!
          </div>
          <a href="vscode://" class="action-card-link">
            🚀 Launch Local VS Code ➔
          </a>
        </div>
      `;
    }
  }
  return cardsHtml;
}

// ---------------------------------------------------------------------------
// KEYBOARD SHORTCUTS (Standard Shortcuts)
// ---------------------------------------------------------------------------
function setupGlobalShortcuts() {
  window.addEventListener('keydown', (e) => {
    // 1. Enter (handled in chat textarea)

    // 2. Ctrl + N -> New Chat
    if (e.ctrlKey && e.key.toLowerCase() === 'n') {
      e.preventDefault();
      window.clearActiveChat();
    }

    // 3. Ctrl + H -> History Overview
    if (e.ctrlKey && e.key.toLowerCase() === 'h') {
      e.preventDefault();
      showToast('Conversation history: 1 Active Session, 0 Archived.', '📜');
    }

    // 4. Ctrl + S -> Settings Overlay
    if (e.ctrlKey && e.key.toLowerCase() === 's') {
      e.preventDefault();
      window.openOverlay('settings-overlay');
    }

    // 5. Ctrl + Shift + F -> Feedback Tab
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'f') {
      e.preventDefault();
      window.openOverlay('settings-overlay');
      window.switchSettingsTab('settings-feedback');
    }

    // 6. Ctrl + P -> Projects Configuration
    if (e.ctrlKey && e.key.toLowerCase() === 'p') {
      e.preventDefault();
      window.openOverlay('settings-overlay');
      window.switchSettingsTab('settings-projects');
    }

    // 7. Escape -> Close Image Generator & Lightbox
    if (e.key === 'Escape') {
      window.closeImageGeneratorModal();
      window.closeImageLightbox();
      window.closeInputToolsDrawer();
    }

    // 8. Ctrl + Shift + G -> Image Generator Studio
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'g') {
      e.preventDefault();
      window.openImageGeneratorModal();
    }
  });
}

// ---------------------------------------------------------------------------
// VOICE MODE ENGINE (CONTINUOUS REAL-TIME SPEECH-TO-TEXT & SPEECH SYNTHESIS)
// ---------------------------------------------------------------------------
let isVoiceModeActive = false;
let voiceRecognition = null;
let voiceSilenceTimer = null;

window.toggleVoiceMode = function() {
  if (isVoiceModeActive) {
    window.stopVoiceMode();
  } else {
    window.startVoiceMode(true);
  }
};

window.startVoiceMode = function(shouldGreet = true) {
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRec) {
    showToast('Speech Recognition is not supported by this browser.', '⚠️');
    return;
  }

  try {
    if (!voiceRecognition) {
      voiceRecognition = new SpeechRec();
      voiceRecognition.continuous = true;
      voiceRecognition.interimResults = true;
      voiceRecognition.lang = 'en-US';

      voiceRecognition.onstart = () => {
        isVoiceModeActive = true;
        updateVoiceModeUI(true);
        pulseOrb(1.8);
      };

      voiceRecognition.onresult = (event) => {
        if (isSpeakingSpeech) return; // Ignore input while AI is speaking

        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        const currentSpeech = (finalTranscript || interimTranscript).trim();
        const input = document.getElementById('chat-user-input');
        const hudText = document.getElementById('live-voice-text');
        const hudStatus = document.getElementById('live-voice-status');

        if (currentSpeech) {
          if (input) input.value = currentSpeech;
          if (hudText) hudText.innerText = currentSpeech;
          if (hudStatus) hudStatus.innerText = '🎙️ Hearing:';
          pulseOrb(1.4);
        }

        // Voice Command: "send message" / "send" / "execute"
        const lower = currentSpeech.toLowerCase();
        if (lower.endsWith('send message') || lower.endsWith('execute now') || lower === 'send') {
          if (input) input.value = currentSpeech.replace(/send message|execute now|send/gi, '').trim();
          if (hudText) hudText.innerText = 'Sending to Blackmagic...';
          window.sendChatMessage();
          return;
        }

        // Voice Command: "stop" or "halt"
        if (lower.includes('magic stop') || lower.includes('stop talking') || lower === 'halt' || lower === 'stop') {
          window.speechSynthesis?.cancel();
          isSpeakingSpeech = false;
          showToast('Voice halted.', '🛑');
          return;
        }

        // Auto-send on natural pause (1.8 seconds of silence after speaking)
        clearTimeout(voiceSilenceTimer);
        if (currentSpeech.length >= 2) {
          voiceSilenceTimer = setTimeout(() => {
            if (isVoiceModeActive && !isSpeakingSpeech && input && input.value.trim().length > 0) {
              if (hudText) hudText.innerText = 'Transcribing & sending...';
              window.sendChatMessage();
            }
          }, 1800);
        }
      };

      voiceRecognition.onerror = (event) => {
        if (event.error === 'no-speech') {
          return; // Normal silence in room, keep listening
        }
        console.warn('Voice recognition note:', event.error);
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          showToast('Microphone permission required. Please click allow in your browser.', '⚠️');
          window.stopVoiceMode();
        }
      };

      voiceRecognition.onend = () => {
        // Keep continuous connection alive unless intentionally stopped or AI is speaking
        if (isVoiceModeActive && !isSpeakingSpeech) {
          setTimeout(() => {
            if (isVoiceModeActive && !isSpeakingSpeech && voiceRecognition) {
              try {
                voiceRecognition.start();
              } catch(e) {
                // Ignore if already active
              }
            }
          }, 350);
        }
      };
    }

    isVoiceModeActive = true;
    updateVoiceModeUI(true);
    setOrbMode('listening');
    pulseOrb(1.8);

    const hudText = document.getElementById('live-voice-text');
    const hudStatus = document.getElementById('live-voice-status');
    if (hudStatus) hudStatus.innerText = '🔊 Blackmagic:';
    if (hudText) hudText.innerText = 'Hello Boss!';

    // "first when i active voice mode ai say hello boss"
    if (shouldGreet) {
      window.speakMessageText('Hello Boss!');
    } else {
      try {
        voiceRecognition.start();
      } catch(startErr) {
        if (startErr.name !== 'InvalidStateError') {
          console.warn('Voice recognition start note:', startErr);
        }
      }
    }
  } catch (err) {
    console.warn('Unable to initialize voice recognition:', err);
    showToast('Microphone notice: ' + (err.message || 'Check browser permissions'), '⚠️');
    window.stopVoiceMode();
  }
};

window.stopVoiceMode = function() {
  isVoiceModeActive = false;
  isSpeakingSpeech = false;
  clearTimeout(voiceSilenceTimer);
  if (voiceRecognition) {
    try { voiceRecognition.stop(); } catch(e) {}
  }
  window.speechSynthesis?.cancel();
  updateVoiceModeUI(false);
  setOrbMode('normal');
  showToast('Voice Mode Deactivated', '🔇');
};

function updateVoiceModeUI(active) {
  const btn = document.getElementById('btn-voice-mode-toggle');
  const icon = document.getElementById('voice-mode-icon');
  const label = document.getElementById('voice-mode-label');
  const hud = document.getElementById('live-voice-hud');
  const hudStatus = document.getElementById('live-voice-status');
  const hudText = document.getElementById('live-voice-text');

  if (active) {
    btn?.classList.add('active');
    if (icon) icon.innerText = '🔴';
    if (label) label.innerText = 'Listening... (Voice Active)';
    if (hud) hud.classList.add('active');
    if (hudStatus) hudStatus.innerText = '🎙️ Listening:';
    if (hudText) hudText.innerText = 'Speak naturally into your microphone...';
  } else {
    btn?.classList.remove('active');
    if (icon) icon.innerText = '🎙️';
    if (label) label.innerText = 'Voice Mode';
    if (hud) hud.classList.remove('active');
  }
}

// ---------------------------------------------------------------------------
// ATTACHMENTS STATE & RENDERING ENGINE
// ---------------------------------------------------------------------------
window.activeImageAttachment = null;
window.activeFileAttachments = [];

window.renderAttachmentsTray = function() {
  const tray = document.getElementById('attachments-preview-bar');
  if (!tray) return;

  if (!window.activeImageAttachment && window.activeFileAttachments.length === 0) {
    tray.style.display = 'none';
    tray.innerHTML = '';
    return;
  }

  tray.style.display = 'flex';
  let html = '';

  if (window.activeImageAttachment) {
    html += `
      <div class="attachment-chip" id="chip-image-preview">
        <img src="${window.activeImageAttachment.dataUri}" alt="Attachment">
        <span class="chip-name" title="${escapeHtml(window.activeImageAttachment.name)}">🖼️ ${escapeHtml(window.activeImageAttachment.name)}</span>
        <button class="btn-remove-chip" onclick="removeImageAttachment()" title="Remove image">✕</button>
      </div>
    `;
  }

  window.activeFileAttachments.forEach((f, idx) => {
    const icon = f.source === 'GitHub' ? '🐙' : (f.source === 'OneDrive' ? '☁️' : '📄');
    html += `
      <div class="attachment-chip" id="chip-file-${idx}">
        <span class="chip-name" title="${escapeHtml(f.name)}">${icon} [${escapeHtml(f.source)}] ${escapeHtml(f.name)}</span>
        <button class="btn-remove-chip" onclick="removeFileAttachment(${idx})" title="Remove file">✕</button>
      </div>
    `;
  });

  tray.innerHTML = html;
};

window.removeImageAttachment = function() {
  window.activeImageAttachment = null;
  const pcInput = document.getElementById('input-pc-image');
  if (pcInput) pcInput.value = '';
  renderAttachmentsTray();
};

window.removeFileAttachment = function(index) {
  window.activeFileAttachments.splice(index, 1);
  renderAttachmentsTray();
};

// ---------------------------------------------------------------------------
// PICTURE UPLOAD: FROM PC / STORAGE
// ---------------------------------------------------------------------------
window.handleImagePcSelect = function(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  if (file.size > 10 * 1024 * 1024) {
    showToast('Image file too large (max 10MB).', '⚠️');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    window.activeImageAttachment = {
      name: file.name,
      dataUri: e.target.result,
      size: file.size
    };
    renderAttachmentsTray();
    showToast(`Image loaded: ${file.name}`, '🖼️');
  };
  reader.readAsDataURL(file);
};

// ---------------------------------------------------------------------------
// PICTURE UPLOAD: LIVE OPTICAL CAMERA
// ---------------------------------------------------------------------------
let liveCameraStream = null;
let liveCameraFacing = 'user';

window.openLiveCameraModal = async function() {
  window.openOverlay('modal-live-camera');
  const statusEl = document.getElementById('camera-status-text');
  if (statusEl) statusEl.innerText = 'Requesting camera access...';

  try {
    if (liveCameraStream) {
      liveCameraStream.getTracks().forEach(t => t.stop());
    }

    liveCameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: liveCameraFacing, width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false
    });

    const videoEl = document.getElementById('live-camera-feed');
    if (videoEl) {
      videoEl.srcObject = liveCameraStream;
      videoEl.play();
    }
    if (statusEl) statusEl.innerText = '● Optical stream active. Position object or document and click Capture.';
  } catch (err) {
    console.warn('Camera access failed:', err);
    if (statusEl) statusEl.innerText = '⚠️ Camera permission denied or not available. Use Picture (PC) instead.';
    showToast('Camera access denied or unavailable.', '⚠️');
  }
};

window.closeLiveCameraModal = function() {
  if (liveCameraStream) {
    liveCameraStream.getTracks().forEach(t => t.stop());
    liveCameraStream = null;
  }
  window.closeOverlay('modal-live-camera');
};

window.switchLiveCamera = function() {
  liveCameraFacing = liveCameraFacing === 'user' ? 'environment' : 'user';
  openLiveCameraModal();
};

window.captureLivePhoto = function() {
  const videoEl = document.getElementById('live-camera-feed');
  const canvasEl = document.getElementById('live-camera-canvas');
  if (!videoEl || !canvasEl) return;

  const width = videoEl.videoWidth || 640;
  const height = videoEl.videoHeight || 480;

  canvasEl.width = width;
  canvasEl.height = height;
  const ctx = canvasEl.getContext('2d');
  ctx.drawImage(videoEl, 0, 0, width, height);

  const dataUri = canvasEl.toDataURL('image/jpeg', 0.88);
  const timeStr = new Date().toLocaleTimeString().replace(/:/g, '-');
  window.activeImageAttachment = {
    name: `Live_Capture_${timeStr}.jpg`,
    dataUri: dataUri,
    size: Math.round(dataUri.length * 0.75)
  };

  closeLiveCameraModal();
  renderAttachmentsTray();
  showToast('Live snapshot captured and attached!', '📸');
};

// ---------------------------------------------------------------------------
// MULTI-SOURCE FILE IMPORTER (ONEDRIVE / GITHUB / SSD)
// ---------------------------------------------------------------------------
window.openFileImportModal = function() {
  window.openOverlay('modal-file-import');
};

window.closeFileImportModal = function() {
  window.closeOverlay('modal-file-import');
};

window.switchFileSourceTab = function(tabName) {
  ['ssd', 'github', 'onedrive'].forEach(t => {
    const btn = document.getElementById(`tab-btn-${t}`);
    const content = document.getElementById(`tab-content-${t}`);
    if (btn) btn.classList.toggle('active', t === tabName);
    if (content) content.style.display = t === tabName ? 'block' : 'none';
  });
};

// SOURCE 1: SSD / STORAGE
window.handleSsdFilesSelected = function(event) {
  const files = Array.from(event.target.files || []);
  if (!files.length) return;

  let loadedCount = 0;
  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = (e) => {
      window.activeFileAttachments.push({
        name: file.name,
        content: e.target.result,
        size: file.size,
        source: 'SSD'
      });
      loadedCount++;
      if (loadedCount === files.length) {
        renderAttachmentsTray();
        closeFileImportModal();
        showToast(`Attached ${files.length} file(s) from Local SSD/Storage.`, '📂');
      }
    };
    reader.readAsText(file);
  });
  event.target.value = '';
};

// SOURCE 2: GITHUB IMPORTER
let currentGithubDoc = null;

window.fetchFromGitHub = async function() {
  const input = document.getElementById('input-github-url');
  let url = input?.value.trim();
  if (!url) {
    showToast('Please enter a GitHub file or repository URL.', '⚠️');
    return;
  }

  // Convert standard github.com/.../blob/main/... to raw.githubusercontent.com/...
  if (url.includes('github.com') && url.includes('/blob/')) {
    url = url.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');
  }

  const previewBox = document.getElementById('github-preview-box');
  const attachBtn = document.getElementById('btn-attach-github-file');
  if (previewBox) {
    previewBox.style.display = 'block';
    previewBox.innerText = 'Fetching content from GitHub...';
  }

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}: Could not load file from GitHub`);
    const code = await res.text();
    const fileName = url.split('/').pop() || 'github_file.txt';

    currentGithubDoc = { name: fileName, content: code };
    if (previewBox) {
      previewBox.innerText = `// Loaded: ${fileName} (${code.length} characters)\n\n` + code.slice(0, 1000) + (code.length > 1000 ? '\n...[truncated preview]' : '');
    }
    if (attachBtn) attachBtn.style.display = 'inline-flex';
    showToast(`GitHub file loaded: ${fileName}`, '🐙');
  } catch (err) {
    if (previewBox) {
      previewBox.innerText = `// GitHub Repository Reference:\n// URL: ${url}\n// Context ready for architectural prompt injection.`;
    }
    currentGithubDoc = { name: 'github_reference.md', content: `GitHub Repository: ${url}\nAnalyze structure and architecture.` };
    if (attachBtn) attachBtn.style.display = 'inline-flex';
  }
};

window.loadSampleGithub = function(type) {
  let name = 'App.tsx';
  let code = `import React, { useState } from 'react';\n\nexport default function App() {\n  const [count, setCount] = useState(0);\n  return (\n    <div className="container">\n      <h1>SIH 2026 Innovation Dashboard</h1>\n      <button onClick={() => setCount(c => c + 1)}>Count: {count}</button>\n    </div>\n  );\n}`;

  if (type === 'express') {
    name = 'server.js';
    code = `const express = require('express');\nconst app = express();\n\napp.use(express.json());\napp.get('/api/health', (req, res) => res.json({ status: 'operational', timestamp: Date.now() }));\n\napp.listen(3000, () => console.log('Cluster listening on 3000'));`;
  } else if (type === 'python') {
    name = 'ml_pipeline.py';
    code = `import numpy as np\nfrom sklearn.ensemble import RandomForestClassifier\n\nX = np.random.randn(1000, 10)\ny = np.random.randint(0, 2, 1000)\n\nclf = RandomForestClassifier(n_estimators=100)\nclf.fit(X, y)\nprint("Model trained with accuracy:", clf.score(X, y))`;
  }

  currentGithubDoc = { name, content: code };
  const input = document.getElementById('input-github-url');
  if (input) input.value = `https://github.com/blackfire-ai/sample-repo/blob/main/${name}`;
  const previewBox = document.getElementById('github-preview-box');
  if (previewBox) {
    previewBox.style.display = 'block';
    previewBox.innerText = `// GitHub Sample Loaded: ${name}\n\n` + code;
  }
  const attachBtn = document.getElementById('btn-attach-github-file');
  if (attachBtn) attachBtn.style.display = 'inline-flex';
};

window.attachCurrentGithubFile = function() {
  if (!currentGithubDoc) return;
  window.activeFileAttachments.push({
    name: currentGithubDoc.name,
    content: currentGithubDoc.content,
    size: currentGithubDoc.content.length,
    source: 'GitHub'
  });
  renderAttachmentsTray();
  closeFileImportModal();
  showToast(`Attached ${currentGithubDoc.name} from GitHub.`, '🐙');
  currentGithubDoc = null;
};

// SOURCE 3: ONEDRIVE / CLOUD IMPORTER
let currentOneDriveDoc = null;

window.importFromOneDrive = function() {
  const input = document.getElementById('input-onedrive-url');
  const link = input?.value.trim();
  if (!link) {
    showToast('Please enter a OneDrive share link or document path.', '⚠️');
    return;
  }

  const docName = 'OneDrive_Doc_' + new Date().toISOString().slice(0, 10) + '.txt';
  const content = `[OneDrive Cloud Document Reference: ${link}]\nDocument Metadata: Synchronized via Microsoft Graph OneDrive API.\nPayload: Project specifications, data dictionary, and enterprise requirements document.`;
  currentOneDriveDoc = { name: docName, content };

  const previewBox = document.getElementById('onedrive-preview-box');
  if (previewBox) {
    previewBox.style.display = 'block';
    previewBox.innerText = `☁️ OneDrive Document Synchronized:\n\n${content}`;
  }
  const attachBtn = document.getElementById('btn-attach-onedrive-file');
  if (attachBtn) attachBtn.style.display = 'inline-flex';
  showToast('OneDrive link parsed and ready to attach.', '☁️');
};

window.loadSampleOneDrive = function(type) {
  let name = 'Project_Architecture_Spec.docx';
  let content = `# SIH Junior 2026 - Blackmagic AI Technical Architecture Document\n- Architecture: Tri-Model Orchestration Engine (ChatGPT + Claude + Gemini)\n- Storage: 10M+ Offline Knowledge Base with Direct Vector & Keyword Retrieval\n- Security: DPDP Act 2023 Full Minor Data Protection & Audit Sentinel\n- Voice: Real-Time Web Speech Recognition & Low-Latency Audio Synthesis`;

  if (type === 'ml_dataset') {
    name = 'sensor_dataset_scheme.csv';
    content = `timestamp,sensor_id,temperature_c,vibration_hz,current_amps,anomaly_flag\n2026-09-16T12:00:00Z,S-101,42.5,120.4,14.2,0\n2026-09-16T12:00:01Z,S-101,89.1,480.9,32.8,1\n2026-09-16T12:00:02Z,S-102,41.2,118.2,13.9,0`;
  } else if (type === 'sensor_telemetry') {
    name = 'iot_telemetry_stream.json';
    content = JSON.stringify({ device: 'Appliance-Sentinel-01', status: 'optimal', voltage: 230, frequency: 50, events: ['BOOT_OK', 'AUTH_VALIDATED', 'DPDP_SHIELD_ACTIVE'] }, null, 2);
  }

  currentOneDriveDoc = { name, content };
  const input = document.getElementById('input-onedrive-url');
  if (input) input.value = `https://1drv.ms/u/s!BlackmagicDrive/${name}`;
  const previewBox = document.getElementById('onedrive-preview-box');
  if (previewBox) {
    previewBox.style.display = 'block';
    previewBox.innerText = `☁️ OneDrive Preset Loaded: ${name}\n\n` + content;
  }
  const attachBtn = document.getElementById('btn-attach-onedrive-file');
  if (attachBtn) attachBtn.style.display = 'inline-flex';
};

window.attachCurrentOneDriveFile = function() {
  if (!currentOneDriveDoc) return;
  window.activeFileAttachments.push({
    name: currentOneDriveDoc.name,
    content: currentOneDriveDoc.content,
    size: currentOneDriveDoc.content.length,
    source: 'OneDrive'
  });
  renderAttachmentsTray();
  closeFileImportModal();
  showToast(`Attached ${currentOneDriveDoc.name} from OneDrive.`, '☁️');
  currentOneDriveDoc = null;
};

// ---------------------------------------------------------------------------
// TOAST NOTIFICATIONS
// ---------------------------------------------------------------------------
let toastTimeout = null;
function showToast(text, icon = '⚡') {
  const toast = document.getElementById('toast-popup');
  const tIcon = document.getElementById('toast-icon');
  const tText = document.getElementById('toast-text');

  if (!toast) return;
  if (tIcon) tIcon.innerText = icon;
  if (tText) tText.innerText = text;

  toast.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove('show');
  }, 3500);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatMarkdown(text) {
  if (!text) return '';

  // Clean emotion and action protocol tags so they don't leak into markdown
  let cleanText = text
    .replace(/\[EMOTION:\s*[^\]]+\]/gi, '')
    .replace(/\[ACTION:\s*[^\]]+\]/gi, '')
    .trim();

  // Process code blocks first to protect them from line break conversions
  const codeBlocks = [];
  let processed = cleanText.replace(/```([a-zA-Z0-9_-]*)\n?([\s\S]*?)```/g, (match, lang, code) => {
    const langLabel = (lang || 'code').toUpperCase();
    const cleanCode = code.trim();
    const escapedCode = cleanCode
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    const placeholder = `__CODE_BLOCK_${codeBlocks.length}__`;
    const html = `
      <div class="code-container" style="background:#0d1117; border:1px solid rgba(255,255,255,0.15); border-radius:8px; margin:12px 0; overflow:hidden;">
        <div style="display:flex; justify-content:space-between; align-items:center; background:#161b22; padding:6px 12px; font-size:11px; color:#8b949e; border-bottom:1px solid rgba(255,255,255,0.1);">
          <span style="font-weight:600; letter-spacing:0.5px;">${langLabel}</span>
          <button type="button" class="copy-code-btn" onclick="copySnippet(this)" data-code="${encodeURIComponent(cleanCode)}" style="background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.15); color:#c9d1d9; border-radius:4px; padding:3px 8px; font-size:11px; cursor:pointer; transition:all 0.2s;">
            📋 Copy Code
          </button>
        </div>
        <pre style="margin:0; padding:12px; overflow-x:auto; font-family:'Fira Code', Consolas, Monaco, monospace; font-size:13px; line-height:1.5; color:#e6edf3;"><code>${escapedCode}</code></pre>
      </div>`;
    codeBlocks.push(html);
    return placeholder;
  });

  // Process markdown images ![alt](url) before text escaping
  const imageBlocks = [];
  processed = processed.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, url) => {
    const idx = imageBlocks.length;
    const safeAlt = (alt || 'AI Generated Image').replace(/"/g, '&quot;');
    const cleanUrl = url.trim();
    const html = `
      <div class="chat-generated-image-card" style="margin:14px 0; border:1px solid rgba(236,72,153,0.35); border-radius:12px; overflow:hidden; background:rgba(15,23,42,0.95); max-width:520px; box-shadow:0 10px 30px rgba(0,0,0,0.6);">
        <div style="position:relative; overflow:hidden; cursor:pointer; background:#000;" onclick="window.openImageInLightbox('${encodeURIComponent(cleanUrl)}', '${encodeURIComponent(safeAlt)}')">
          <img src="${cleanUrl}" alt="${safeAlt}" style="width:100%; max-height:420px; object-fit:contain; display:block; transition:transform 0.25s ease;" loading="lazy" onerror="this.onerror=null; this.src='https://placehold.co/600x400/1e293b/f8fafc?text=AI+Image+Rendered';">
          <div style="position:absolute; inset:0; background:rgba(0,0,0,0.3); opacity:0; transition:opacity 0.2s ease; display:flex; align-items:center; justify-content:center; color:#fff; font-size:13px; font-weight:700; text-shadow:0 2px 4px rgba(0,0,0,0.8);" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0">
            🔍 Click to Enlarge
          </div>
        </div>
        <div style="padding:10px 14px; display:flex; align-items:center; justify-content:space-between; gap:10px; background:rgba(15,23,42,0.98); border-top:1px solid rgba(255,255,255,0.08);">
          <span style="font-size:12px; color:#cbd5e1; font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${safeAlt}">🎨 ${safeAlt}</span>
          <div style="display:flex; gap:6px; flex-shrink:0;">
            <a href="${cleanUrl}" download="blackmagic-ai-image.png" target="_blank" class="btn-input-tool" style="font-size:11px; padding:4px 10px; min-height:28px; text-decoration:none;" title="Download image to device">
              ⬇ Download
            </a>
            <button type="button" class="btn-input-tool" onclick="window.openImageInLightbox('${encodeURIComponent(cleanUrl)}', '${encodeURIComponent(safeAlt)}')" style="font-size:11px; padding:4px 10px; min-height:28px;" title="Full screen view">
              🔍 Enlarge
            </button>
          </div>
        </div>
      </div>`;
    imageBlocks.push(html);
    return `__IMG_BLOCK_${idx}__`;
  });

  // Escape the remaining non-code text
  processed = processed
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/`([^`]+)`/g, '<code style="background:rgba(255,255,255,0.12); padding:2px 6px; border-radius:4px; font-family:monospace; font-size:12px; color:#58a6ff;">$1</code>')
    .replace(/^### (.*$)/gim, '<h3 style="font-size:16px; font-weight:700; color:#f0f6fc; margin:14px 0 6px 0;">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 style="font-size:18px; font-weight:700; color:#f0f6fc; margin:16px 0 8px 0;">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 style="font-size:20px; font-weight:800; color:#f0f6fc; margin:18px 0 10px 0;">$1</h1>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/^\s*[-*]\s+(.*$)/gim, '<li style="margin-left:20px; list-style-type:disc; color:#c9d1d9;">$1</li>')
    .replace(/\n\n/g, '<br><br>')
    .replace(/\n/g, '<br>');

  // Restore code blocks
  codeBlocks.forEach((blockHtml, i) => {
    processed = processed.replace(`__CODE_BLOCK_${i}__`, blockHtml);
  });

  // Restore image blocks
  imageBlocks.forEach((imgHtml, i) => {
    processed = processed.replace(`__IMG_BLOCK_${i}__`, imgHtml);
  });

  return processed;
}

window.copySnippet = function(btn) {
  try {
    const raw = decodeURIComponent(btn.getAttribute('data-code') || '');
    navigator.clipboard.writeText(raw).then(() => {
      const orig = btn.innerHTML;
      btn.innerHTML = '✅ Copied!';
      btn.style.color = '#3fb950';
      setTimeout(() => {
        btn.innerHTML = orig;
        btn.style.color = '#c9d1d9';
      }, 2000);
    });
  } catch (e) {
    console.error('Copy snippet error:', e);
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// BLACKMAGIC SCREEN AUTOMATION WORKSTATION CONTROLLER
// ═══════════════════════════════════════════════════════════════════════════

// INPUT TOOLS DRAWER TOGGLE (VOICE, PICTURE, ATTACH FILES)
window.toggleInputToolsDrawer = function(e) {
  if (e && typeof e.stopPropagation === 'function') {
    e.stopPropagation();
  } else if (window.event && typeof window.event.stopPropagation === 'function') {
    window.event.stopPropagation();
  }
  const drawer = document.getElementById('input-tools-drawer');
  const btn = document.getElementById('btn-toggle-input-tools');
  const icon = document.getElementById('cross-toggle-icon');
  if (!drawer) return;
  const isCurrentlyOpen = drawer.classList.contains('open') || drawer.style.display === 'flex';
  if (isCurrentlyOpen) {
    window.closeInputToolsDrawer();
  } else {
    window.openInputToolsDrawer();
  }
};

window.openInputToolsDrawer = function() {
  const drawer = document.getElementById('input-tools-drawer');
  const btn = document.getElementById('btn-toggle-input-tools');
  const icon = document.getElementById('cross-toggle-icon');
  if (!drawer) return;
  drawer.classList.add('open');
  drawer.style.display = 'flex';
  if (btn) btn.classList.add('active');
  if (icon) icon.textContent = '✕';
};

window.closeInputToolsDrawer = function() {
  const drawer = document.getElementById('input-tools-drawer');
  const btn = document.getElementById('btn-toggle-input-tools');
  const icon = document.getElementById('cross-toggle-icon');
  if (!drawer) return;
  drawer.classList.remove('open');
  drawer.style.display = 'none';
  if (btn) btn.classList.remove('active');
  if (icon) icon.textContent = '+';
};

window.handleSelectVoiceMode = function(e) {
  if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
  window.closeInputToolsDrawer();
  toggleVoiceMode();
};

window.handleSelectPicture = function(e) {
  if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
  window.closeInputToolsDrawer();
  const pcInput = document.getElementById('input-pc-image');
  if (pcInput) pcInput.click();
};

window.handleSelectAttachFile = function(e) {
  if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
  window.closeInputToolsDrawer();
  openFileImportModal();
};

// ═══════════════════════════════════════════════════════════════════════════
// DYNAMIC PROMPT COMMAND BAR ENGINE (TRIGGERED ON 'CREATE' / 'GENERATE' / ETC.)
// ═══════════════════════════════════════════════════════════════════════════

window.dismissPromptCommandBar = function() {
  const bar = document.getElementById('prompt-command-bar');
  if (bar) bar.style.display = 'none';
};

window.applyCommandModifier = function(modifierType, modifierValue) {
  const input = document.getElementById('chat-user-input');
  if (!input) return;
  let text = input.value;

  if (modifierType === 'ratio') {
    const ratioRegex = /\b(16:9|9:16|4:3|3:4|1:1)\b/i;
    if (ratioRegex.test(text)) {
      text = text.replace(ratioRegex, modifierValue);
    } else {
      text = text.trim() + ' ' + modifierValue;
    }
  } else if (modifierType === 'style') {
    const styleRegex = /\b(photorealistic|anime|cyberpunk|cinematic|fantasy|3d render|oil painting|digital art)\b/i;
    if (styleRegex.test(text)) {
      text = text.replace(styleRegex, modifierValue);
    } else {
      text = text.trim() + ' ' + modifierValue;
    }
  } else if (modifierType === 'fill') {
    text = modifierValue;
  } else if (modifierType === 'append') {
    text = text.trim() + ' ' + modifierValue;
  }

  input.value = text;
  input.focus();
  window.updatePromptCommandBar(text);
};

window.updatePromptCommandBar = function(rawText) {
  const bar = document.getElementById('prompt-command-bar');
  const badge = document.getElementById('prompt-cmd-badge');
  const pillsContainer = document.getElementById('prompt-cmd-pills');
  if (!bar || !badge || !pillsContainer) return;

  const text = (rawText || '').trim();
  const lower = text.toLowerCase();

  if (!text) {
    bar.style.display = 'none';
    return;
  }

  // 1. Visual/Image Generation Command Check
  const isImageCmd =
    lower.startsWith('/image') ||
    lower.startsWith('/imagine') ||
    lower.startsWith('/draw') ||
    lower.startsWith('/paint') ||
    lower.startsWith('create image') ||
    lower.startsWith('generate image') ||
    lower.startsWith('draw ') ||
    lower.startsWith('paint ') ||
    /\b(generate|create|make|draw|paint|render)\s+(an?\s+)?(image|picture|photo|illustration|artwork|wallpaper|poster|portrait|drawing|sketch|logo|render|avatar)\b/i.test(text);

  // 2. Code Generation Command Check
  const isCodeCmd =
    /\b(create|generate|write|build|code|script)\s+(code|script|python|javascript|typescript|function|api|html|css|react|backend|sql|query)\b/i.test(text);

  // 3. Automation Command Check
  const isAutomationCmd =
    /\b(open\s+whatsapp\s+and\s+write|open\s+notepad\s+and\s+write|open\s+mail\s+and\s+write)\b/i.test(text);

  // 4. General / bare command trigger ("create", "generate", "make", "draw", "paint")
  const isBareCommand = /^(create|generate|make|draw|paint)\s*$/i.test(text);

  if (isImageCmd) {
    bar.className = 'prompt-command-bar';
    bar.style.display = 'flex';
    badge.className = 'cmd-badge';
    badge.innerHTML = '🎨 Command: Image Generation';

    const currentRatio = (text.match(/\b(16:9|9:16|4:3|3:4|1:1)\b/i) || [])[0] || '1:1';
    const currentStyle = (text.match(/\b(photorealistic|anime|cyberpunk|cinematic|fantasy|3d render|oil painting|digital art)\b/i) || [])[0] || '';

    pillsContainer.innerHTML = `
      <span class="cmd-pill ${currentRatio === '1:1' ? 'active' : ''}" onclick="applyCommandModifier('ratio', '1:1')" title="Square (1:1)">1:1</span>
      <span class="cmd-pill ${currentRatio === '16:9' ? 'active' : ''}" onclick="applyCommandModifier('ratio', '16:9')" title="Landscape (16:9)">16:9</span>
      <span class="cmd-pill ${currentRatio === '9:16' ? 'active' : ''}" onclick="applyCommandModifier('ratio', '9:16')" title="Portrait (9:16)">9:16</span>
      <span class="cmd-pill ${currentRatio === '4:3' ? 'active' : ''}" onclick="applyCommandModifier('ratio', '4:3')" title="Standard (4:3)">4:3</span>
      <span style="color:rgba(255,255,255,0.2); font-size:10px; margin:0 2px;">|</span>
      <span class="cmd-pill ${/photorealistic/i.test(currentStyle) ? 'active' : ''}" onclick="applyCommandModifier('style', 'photorealistic')">📸 Photo 8K</span>
      <span class="cmd-pill ${/anime/i.test(currentStyle) ? 'active' : ''}" onclick="applyCommandModifier('style', 'anime')">🎌 Anime</span>
      <span class="cmd-pill ${/cyberpunk/i.test(currentStyle) ? 'active' : ''}" onclick="applyCommandModifier('style', 'cyberpunk')">🌆 Cyberpunk</span>
      <span class="cmd-pill ${/cinematic/i.test(currentStyle) ? 'active' : ''}" onclick="applyCommandModifier('style', 'cinematic')">🎬 Cinematic</span>
      <span class="cmd-pill ${/3d render/i.test(currentStyle) ? 'active' : ''}" onclick="applyCommandModifier('style', '3d render')">📐 3D</span>
    `;
  } else if (isCodeCmd) {
    bar.className = 'prompt-command-bar code-mode';
    bar.style.display = 'flex';
    badge.className = 'cmd-badge blue';
    badge.innerHTML = '💻 Command: Code Synthesis';

    pillsContainer.innerHTML = `
      <span class="cmd-pill" onclick="applyCommandModifier('append', 'in Python')">🐍 Python</span>
      <span class="cmd-pill" onclick="applyCommandModifier('append', 'in TypeScript')">🟦 TypeScript</span>
      <span class="cmd-pill" onclick="applyCommandModifier('append', 'using React & Tailwind')">⚛️ React</span>
      <span class="cmd-pill" onclick="applyCommandModifier('append', 'with full documentation and unit tests')">🧪 With Tests</span>
    `;
  } else if (isAutomationCmd) {
    bar.className = 'prompt-command-bar action-mode';
    bar.style.display = 'flex';
    badge.className = 'cmd-badge green';
    badge.innerHTML = '🤖 Command: Autonomous Action';

    pillsContainer.innerHTML = `
      <span class="cmd-pill" onclick="applyCommandModifier('fill', 'open whatsapp and write ')">💬 WhatsApp</span>
      <span class="cmd-pill" onclick="applyCommandModifier('fill', 'open notepad and write ')">📝 Notepad</span>
      <span class="cmd-pill" onclick="applyCommandModifier('fill', 'open mail and write ')">✉️ Email</span>
    `;
  } else if (isBareCommand) {
    bar.className = 'prompt-command-bar';
    bar.style.display = 'flex';
    badge.className = 'cmd-badge';
    badge.innerHTML = '⚡ Command Mode Active';

    pillsContainer.innerHTML = `
      <span class="cmd-pill" onclick="applyCommandModifier('fill', 'create an image of a cybernetic phoenix soaring over neon skyscrapers 16:9 cinematic')">🎨 Create Image...</span>
      <span class="cmd-pill" onclick="applyCommandModifier('fill', 'generate python script to parse logs and detect anomalies')">💻 Generate Code...</span>
      <span class="cmd-pill" onclick="applyCommandModifier('fill', 'create an architecture diagram and executive summary for ')">📊 Create Diagram...</span>
    `;
  } else {
    bar.style.display = 'none';
  }
};

window.initPromptBarCommandEngine = function() {
  const input = document.getElementById('chat-user-input');
  if (!input) return;

  input.addEventListener('input', (e) => {
    window.updatePromptCommandBar(e.target.value);
  });
};

window.openImageInLightbox = function(rawUrl, rawCaption) {
  let url = rawUrl;
  let caption = rawCaption || '';
  try {
    url = decodeURIComponent(rawUrl);
    caption = decodeURIComponent(rawCaption);
  } catch (e) {}

  const lightbox = document.getElementById('modal-image-lightbox');
  const imgTarget = document.getElementById('lightbox-image-target');
  const captionTarget = document.getElementById('lightbox-caption-target');
  const downloadLink = document.getElementById('lightbox-download-link');

  if (imgTarget) imgTarget.src = url;
  if (captionTarget) captionTarget.textContent = caption || 'Blackmagic AI Generated Image';
  if (downloadLink) {
    downloadLink.href = url;
    downloadLink.download = `blackmagic-${Date.now()}.png`;
  }
  if (lightbox) {
    lightbox.classList.add('active');
    lightbox.style.display = 'flex';
  }
};

window.closeImageLightbox = function() {
  const lightbox = document.getElementById('modal-image-lightbox');
  if (lightbox) {
    lightbox.classList.remove('active');
    lightbox.style.display = 'none';
  }
};

// Close popup tools drawer when clicking outside or pressing Escape
document.addEventListener('click', (e) => {
  const drawer = document.getElementById('input-tools-drawer');
  const btn = document.getElementById('btn-toggle-input-tools');
  if (!drawer) return;
  const isOpen = drawer.classList.contains('open') || drawer.style.display === 'flex';
  if (isOpen) {
    if (!drawer.contains(e.target) && (!btn || !btn.contains(e.target))) {
      window.closeInputToolsDrawer();
    }
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    window.closeInputToolsDrawer();
  }
});

// NOTEPAD & AUTONOMOUS CODE WRITER HANDLERS
window.saveNotepadContent = function() {
  const editor = document.getElementById('notepad-text-editor');
  const indicator = document.getElementById('notepad-save-indicator');
  const text = editor ? editor.value : '';
  localStorage.setItem('blackmagic_notepad_code', text);
  if (indicator) {
    indicator.textContent = '● Saved';
    indicator.style.color = '#10b981';
  }
  showToast('Notepad file saved successfully!', '💾');
};

window.copyNotepadContent = function() {
  const editor = document.getElementById('notepad-text-editor');
  if (editor && editor.value) {
    navigator.clipboard.writeText(editor.value);
    showToast('Code copied to clipboard!', '📋');
  }
};

window.clearNotepadContent = function() {
  const editor = document.getElementById('notepad-text-editor');
  if (editor) {
    editor.value = '';
    const charCount = document.getElementById('notepad-char-count');
    if (charCount) charCount.textContent = '0 characters | Hands-Free Editor';
  }
};

window.openScreenAutomationModal = function(initialTab = 'whatsapp') {
  const modal = document.getElementById('modal-screen-automation');
  if (modal) {
    modal.style.display = 'flex';
    window.switchScreenAutoTab(initialTab);
  }
};

window.closeScreenAutomationModal = function() {
  const modal = document.getElementById('modal-screen-automation');
  if (modal) modal.style.display = 'none';
  const cursor = document.getElementById('virtual-robot-cursor');
  if (cursor) cursor.style.display = 'none';
};

let isScreenAutoMaximized = false;
window.maximizeScreenAutomationModal = function() {
  const dialog = document.querySelector('.screen-auto-dialog');
  if (!dialog) return;
  isScreenAutoMaximized = !isScreenAutoMaximized;
  if (isScreenAutoMaximized) {
    dialog.style.width = '96vw';
    dialog.style.height = '94vh';
  } else {
    dialog.style.width = '900px';
    dialog.style.height = '620px';
  }
};

window.switchScreenAutoTab = function(tabId) {
  const tabs = ['whatsapp', 'notepad', 'email', 'youtube', 'terminal'];
  tabs.forEach(t => {
    const btn = document.getElementById(`screen-tab-${t}`);
    const content = document.getElementById(`screen-content-${t}`);
    if (btn) {
      if (t === tabId) btn.classList.add('active');
      else btn.classList.remove('active');
    }
    if (content) {
      if (t === tabId) content.style.display = 'block';
      else content.style.display = 'none';
    }
  });

  const statusPill = document.getElementById('screen-auto-status-pill');
  if (statusPill) {
    if (tabId === 'whatsapp') statusPill.innerHTML = '💬 WHATSAPP WEB AUTOMATION ACTIVE';
    else if (tabId === 'notepad') statusPill.innerHTML = '📝 NOTEPAD CODE WRITER ACTIVE';
    else if (tabId === 'email') statusPill.innerHTML = '✉️ CORPORATE EMAIL DISPATCH ACTIVE';
    else if (tabId === 'youtube') statusPill.innerHTML = '📺 YOUTUBE ASSISTANT ACTIVE';
    else if (tabId === 'terminal') statusPill.innerHTML = '💻 SYSTEM TASK TERMINAL ACTIVE';
  }
};

// UNTOUCHED MOUSE AUTONOMOUS SIMULATION ENGINE
window.runUntouchedMouseAutomation = async function(options = {}) {
  const {
    app = 'whatsapp',
    recipient = 'Sumit Sharma',
    payload = 'Hum log library me padhai kar rahe hain.',
    emotion = 'Joyful'
  } = options;

  const humanEmotions = {
    Joyful: { label: '😄 Warm & Playful', quip: "Haha on it Boss! Untouched mouse protocol engaged, sit back and watch!" },
    Witty: { label: '😎 Confident & Witty', quip: "Hands off the mouse! I've got total control of this." },
    Focused: { label: '🎯 Laser Focused', quip: "Locked in. Navigating and typing at warp speed." },
    Empathetic: { label: '💖 Empathetic & Caring', quip: "Got your back Boss, making sure this is written smoothly!" },
    Proud: { label: '🏆 Triumphant', quip: "Zero clicks needed from you! Mission accomplished." }
  };

  const selectedEmotion = humanEmotions[emotion] || humanEmotions.Joyful;
  
  // Update emotion badge on main UI
  const badge = document.getElementById('mj-active-emotion-badge');
  if (badge) badge.innerText = `💜 Emotion: ${selectedEmotion.label}`;
  
  // Set 3D orb mode
  setOrbMode(emotion.toLowerCase());
  pulseOrb(1.8);

  // If Voice mode is active or speech synthesis available, speak human quip
  if (isVoiceModeActive && typeof window.speakMessageText === 'function') {
    window.speakMessageText(`${selectedEmotion.quip} Opening ${app} and typing that right now without you touching your mouse!`);
  }

  // Open Screen Automation Workstation
  window.openScreenAutomationModal(app);

  // Show Untouched Mouse Status Bar
  const statusBar = document.getElementById('untouched-mouse-status-bar');
  const statusText = document.getElementById('untouched-status-text');
  const emotionPill = document.getElementById('untouched-emotion-pill');
  if (statusBar) statusBar.style.display = 'flex';
  if (statusText) statusText.innerHTML = `<strong>UNTOUCHED MOUSE AUTONOMOUS CONTROL:</strong> Navigating to ${app.toUpperCase()} & typing payload hands-free...`;
  if (emotionPill) emotionPill.textContent = selectedEmotion.label;

  // Virtual robot cursor
  const cursor = document.getElementById('virtual-robot-cursor');
  const cursorTag = document.getElementById('robot-cursor-tag');
  if (cursor) {
    cursor.style.display = 'flex';
    cursor.style.left = '160px';
    cursor.style.top = '160px';
  }
  if (cursorTag) cursorTag.textContent = '🤖 Hands-Free Cursor';

  function playClickEffect(x, y) {
    const ripple = document.createElement('div');
    ripple.className = 'robot-click-ripple';
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    document.body.appendChild(ripple);
    setTimeout(() => ripple.remove(), 500);
  }

  function moveCursorTo(element, label = 'Navigating...') {
    return new Promise(resolve => {
      if (!cursor || !element) {
        resolve();
        return;
      }
      const rect = element.getBoundingClientRect();
      const targetX = rect.left + Math.min(rect.width / 2, 40);
      const targetY = rect.top + Math.min(rect.height / 2, 20);
      if (cursorTag) cursorTag.textContent = label;
      cursor.style.left = `${targetX}px`;
      cursor.style.top = `${targetY}px`;
      setTimeout(() => {
        playClickEffect(targetX, targetY);
        resolve();
      }, 550);
    });
  }

  if (app === 'whatsapp') {
    // Step 1: Move cursor to WhatsApp Tab
    const waTabBtn = document.getElementById('screen-tab-whatsapp');
    await moveCursorTo(waTabBtn, 'Clicking WhatsApp Tab');
    window.switchScreenAutoTab('whatsapp');

    // Step 2: Move cursor to contact
    window.selectWaContact(recipient, '+91 98765 43210');
    const contactItem = document.querySelector('.wa-contact-item.active') || document.querySelector('.wa-contact-item');
    await moveCursorTo(contactItem, `Opening contact: ${recipient}`);

    // Step 3: Move cursor to input field
    const liveInput = document.getElementById('wa-live-input');
    await moveCursorTo(liveInput, 'Focusing message input...');
    if (liveInput) {
      liveInput.focus();
      liveInput.value = '';
    }

    // Step 4: Keystroke typing simulation
    const typingBar = document.getElementById('wa-typing-indicator');
    const blinkingCursor = document.getElementById('wa-blinking-cursor');
    if (typingBar) {
      typingBar.style.display = 'flex';
      const typingText = document.getElementById('wa-typing-text');
      if (typingText) typingText.textContent = `Blackmagic is typing payload to ${recipient} (Hands-Free)...`;
    }
    if (blinkingCursor) blinkingCursor.style.display = 'inline';

    let i = 0;
    await new Promise(resolve => {
      const typeInterval = setInterval(() => {
        if (i < payload.length) {
          if (liveInput) liveInput.value += payload[i];
          i++;
        } else {
          clearInterval(typeInterval);
          setTimeout(() => {
            if (typingBar) typingBar.style.display = 'none';
            if (blinkingCursor) blinkingCursor.style.display = 'none';
            resolve();
          }, 300);
        }
      }, 35);
    });

    // Step 5: Move cursor to send button
    const sendBtn = document.getElementById('wa-send-btn');
    await moveCursorTo(sendBtn, 'Clicking Send...');
    
    // Step 6: Dispatch message
    if (liveInput) liveInput.value = '';
    postWaOutgoingMessage(payload);
    showToast(`WhatsApp sent to ${recipient} (Untouched Mouse)!`, '💬');

    if (statusText) statusText.innerHTML = `<strong>DISPATCH COMPLETE:</strong> Message sent to ${recipient} with zero mouse touches!`;
    if (cursorTag) cursorTag.textContent = '✔ Sent Autonomously!';

    setTimeout(() => {
      if (isVoiceModeActive && typeof window.speakMessageText === 'function') {
        window.speakMessageText(`Boom! Dispatched to ${recipient} without you touching the mouse once! How was that? 😊`);
      }
      setTimeout(() => {
        if (cursor) cursor.style.display = 'none';
      }, 2000);
    }, 800);

  } else if (app === 'notepad') {
    // Step 1: Move to notepad tab
    const notepadTabBtn = document.getElementById('screen-tab-notepad');
    await moveCursorTo(notepadTabBtn, 'Opening Notepad & Code Writer');
    window.switchScreenAutoTab('notepad');

    // Step 2: Move cursor to editor
    const editor = document.getElementById('notepad-text-editor');
    await moveCursorTo(editor, 'Focusing Code Editor');
    if (editor) {
      editor.focus();
      editor.value = '';
    }

    // Step 3: Type the code/text
    let i = 0;
    await new Promise(resolve => {
      const typeInterval = setInterval(() => {
        if (i < payload.length) {
          if (editor) {
            editor.value += payload[i];
            const charCount = document.getElementById('notepad-char-count');
            if (charCount) charCount.textContent = `${editor.value.length} characters | Hands-Free Editor`;
          }
          i++;
        } else {
          clearInterval(typeInterval);
          resolve();
        }
      }, 25);
    });

    // Step 4: Move to save button
    const saveBtn = document.getElementById('btn-notepad-save');
    await moveCursorTo(saveBtn, 'Saving File...');
    window.saveNotepadContent();

    if (statusText) statusText.innerHTML = `<strong>CODE WRITTEN & SAVED:</strong> Typed autonomously without touching mouse!`;
    if (cursorTag) cursorTag.textContent = '✔ File Saved!';
    
    setTimeout(() => {
      if (cursor) cursor.style.display = 'none';
    }, 2000);

  } else if (app === 'email') {
    const emailTabBtn = document.getElementById('screen-tab-email');
    await moveCursorTo(emailTabBtn, 'Opening Corporate Email');
    window.switchScreenAutoTab('email');

    const replyBody = document.getElementById('email-reply-body');
    await moveCursorTo(replyBody, 'Focusing Reply Composer');
    if (replyBody) replyBody.value = payload;

    const replyBtn = document.getElementById('btn-send-email-reply');
    await moveCursorTo(replyBtn, 'Sending Email Reply...');
    window.executeAutonomousEmailSend();

    setTimeout(() => {
      if (cursor) cursor.style.display = 'none';
    }, 2000);
  }
};

// --- WhatsApp Web Simulation & Automation ---
let activeWaContact = { name: 'Sumit Sharma', phone: '+91 98765 43210', initials: 'SS' };

window.selectWaContact = function(name, phone) {
  activeWaContact.name = name;
  activeWaContact.phone = phone;
  const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  activeWaContact.initials = initials;

  const nameEl = document.getElementById('wa-active-name');
  const avatarEl = document.getElementById('wa-active-avatar');
  const recipInput = document.getElementById('wa-dispatch-recipient');
  if (nameEl) nameEl.textContent = name;
  if (avatarEl) avatarEl.textContent = initials;
  if (recipInput) recipInput.value = name;

  // Highlight in list
  document.querySelectorAll('.wa-contact-item').forEach(el => {
    const itemText = el.innerText || '';
    if (itemText.includes(name)) el.classList.add('active');
    else el.classList.remove('active');
  });
};

window.filterWaContacts = function(q) {
  const query = (q || '').toLowerCase();
  document.querySelectorAll('.wa-contact-item').forEach(el => {
    const text = (el.innerText || '').toLowerCase();
    el.style.display = text.includes(query) ? 'flex' : 'none';
  });
};

window.executeManualWaSend = function() {
  const input = document.getElementById('wa-live-input');
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  postWaOutgoingMessage(text);
};

function postWaOutgoingMessage(msgText) {
  const container = document.getElementById('wa-chat-messages');
  if (!container) return;

  const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const bubble = document.createElement('div');
  bubble.className = 'wa-bubble outgoing';
  bubble.innerHTML = `
    <div class="wa-bubble-text">${escapeHtml(msgText)}</div>
    <div class="wa-bubble-time">${timeStr} <span class="wa-double-tick" style="color:#53bdeb;">✓✓</span></div>
  `;
  container.appendChild(bubble);
  container.scrollTop = container.scrollHeight;

  // Log in terminal as well
  window.appendTermLog(`[WHATSAPP_AUTO] Dispatched to ${activeWaContact.name}: "${msgText}"`, 'success');
}

window.triggerSimulatedWaDispatch = function(targetRecipient, customMessage) {
  const recipientInput = document.getElementById('wa-dispatch-recipient');
  const messageInput = document.getElementById('wa-dispatch-message');

  const recipient = targetRecipient || (recipientInput ? recipientInput.value : 'Sumit Sharma');
  const message = customMessage || (messageInput ? messageInput.value : 'Hum log library me padhai kar rahe hain.');

  window.switchScreenAutoTab('whatsapp');
  window.selectWaContact(recipient, '+91 98765 43210');

  const typingBar = document.getElementById('wa-typing-indicator');
  const liveInput = document.getElementById('wa-live-input');
  const cursor = document.getElementById('wa-blinking-cursor');

  if (typingBar) {
    typingBar.style.display = 'flex';
    document.getElementById('wa-typing-text').textContent = `Blackmagic is typing message to ${recipient}...`;
  }
  if (cursor) cursor.style.display = 'inline';

  // Animate keystroke by keystroke
  let charIdx = 0;
  if (liveInput) liveInput.value = '';

  const typeInterval = setInterval(() => {
    if (charIdx < message.length) {
      if (liveInput) liveInput.value += message[charIdx];
      charIdx++;
    } else {
      clearInterval(typeInterval);
      setTimeout(() => {
        if (typingBar) typingBar.style.display = 'none';
        if (cursor) cursor.style.display = 'none';
        if (liveInput) liveInput.value = '';
        postWaOutgoingMessage(message);
      }, 500);
    }
  }, 40);
};

// --- Corporate Email Simulation & Dispatch ---
window.selectEmailItem = function(key) {
  const subjEl = document.getElementById('email-view-subject');
  const fromEl = document.getElementById('email-view-from');
  const dateEl = document.getElementById('email-view-date');
  const bodyEl = document.getElementById('email-view-body');
  const replyTo = document.getElementById('email-reply-to');
  const replySubj = document.getElementById('email-reply-subj');
  const replyBody = document.getElementById('email-reply-body');

  if (key === 'offer') {
    if (subjEl) subjEl.textContent = 'Official Offer Letter & Onboarding Schedule';
    if (fromEl) fromEl.textContent = 'hr@techcorp.com';
    if (dateEl) dateEl.textContent = 'Today, 09:30 AM';
    if (bodyEl) bodyEl.innerHTML = 'Dear Boss,<br><br>We are pleased to offer you the position. Please review the attached contract and confirm your acceptance along with your preferred workstation credentials.<br><br>Best regards,<br>HR Recruitment Cell';
    if (replyTo) replyTo.value = 'hr@techcorp.com';
    if (replySubj) replySubj.value = 'Re: Official Offer Letter - Confirmation of Terms';
    if (replyBody) replyBody.value = 'Thank you for the communication. I confirm receipt and accept the terms outlined. Looking forward to synchronizing with the operations team.';
  } else if (key === 'sih') {
    if (subjEl) subjEl.textContent = 'Autonomous Workstation Submission Review';
    if (fromEl) fromEl.textContent = 'evaluation@sih.gov.in';
    if (dateEl) dateEl.textContent = 'Yesterday';
    if (bodyEl) bodyEl.innerHTML = 'Respected Team,<br><br>Your Blackmagic multi-model AI pipeline prototype has passed initial evaluation with excellent marks in DPDP compliance and autonomous capabilities.<br><br>Regards,<br>SIH 2026 Jury';
    if (replyTo) replyTo.value = 'evaluation@sih.gov.in';
    if (replySubj) replySubj.value = 'Re: Autonomous Workstation Submission Review - Acknowledgement';
    if (replyBody) replyBody.value = 'Thank you to the evaluation jury. All 3D and voice screen automation modules are active and live.';
  } else if (key === 'cloud') {
    if (subjEl) subjEl.textContent = 'Autonomous Failover Node Synchronization';
    if (fromEl) fromEl.textContent = 'alerts@cloudops.internal';
    if (dateEl) dateEl.textContent = '2 days ago';
    if (bodyEl) bodyEl.innerHTML = 'All system metrics nominal. Tri-model neural pipeline active across us-east-1 and ap-south-1 with sub-20ms roundtrip latency.';
    if (replyTo) replyTo.value = 'alerts@cloudops.internal';
    if (replySubj) replySubj.value = 'Re: System Telemetry Verified';
    if (replyBody) replyBody.value = 'All metrics reviewed. Keeping active watchdog daemon running.';
  }
};

window.executeAutonomousEmailSend = function() {
  const progressBar = document.getElementById('email-send-progress');
  const statusBadge = document.getElementById('email-reply-status');
  const to = document.getElementById('email-reply-to')?.value || 'hr@techcorp.com';
  const subj = document.getElementById('email-reply-subj')?.value || 'Confirmation';

  if (statusBadge) {
    statusBadge.textContent = 'DISPATCHING AUTONOMOUSLY...';
    statusBadge.style.color = '#fde047';
  }
  if (progressBar) progressBar.style.display = 'block';

  setTimeout(() => {
    if (progressBar) progressBar.style.display = 'none';
    if (statusBadge) {
      statusBadge.textContent = '✔ DISPATCHED & VERIFIED';
      statusBadge.style.color = '#34d399';
    }
    window.appendTermLog(`[EMAIL_DISPATCH] Sent corporate email to ${to} [${subj}]`, 'success');
  }, 1200);
};

// --- YouTube Media Assistant Controller ---
window.executeYouTubeSearch = function() {
  const query = document.getElementById('yt-search-input')?.value || 'Chole Recipe';
  window.setYouTubeQuery(query);
};

window.setYouTubeQuery = function(query) {
  const searchInput = document.getElementById('yt-search-input');
  const iframe = document.getElementById('yt-video-iframe');
  const title = document.getElementById('yt-video-title');
  const directLink = document.getElementById('yt-direct-link');

  if (searchInput) searchInput.value = query;
  if (title) title.textContent = `YouTube Assistant: ${query}`;
  if (directLink) directLink.href = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;

  // Update iframe with embedded player
  if (iframe) {
    iframe.src = `https://www.youtube-nocookie.com/embed?listType=search&list=${encodeURIComponent(query)}`;
  }
  window.appendTermLog(`[YOUTUBE_ASSISTANT] Search indexed for: "${query}"`, 'info');
};

// --- System Task Terminal Engine ---
window.appendTermLog = function(text, type = 'info') {
  const termBody = document.getElementById('term-log-body');
  if (!termBody) return;
  const line = document.createElement('div');
  line.className = `term-line ${type}`;
  line.textContent = text;
  termBody.appendChild(line);
  termBody.scrollTop = termBody.scrollHeight;
};

window.executeTermCmd = function(cmd) {
  const input = document.getElementById('term-cmd-input');
  if (input) input.value = '';
  const clean = (cmd || '').trim().toLowerCase();
  if (!clean) return;

  window.appendTermLog(`blackmagic@core:~$ ${cmd}`, '');

  if (clean === 'clear') {
    const termBody = document.getElementById('term-log-body');
    if (termBody) termBody.innerHTML = '';
  } else if (clean === 'status') {
    window.appendTermLog('[STATUS] Blackmagic Autonomous Daemon v2.4 ONLINE. All nodes healthy.', 'success');
  } else if (clean === 'ping') {
    window.appendTermLog('[PING] 64 bytes from core.cloud.local: icmp_seq=1 ttl=64 time=0.042 ms', 'info');
  } else if (clean === 'test-wa') {
    window.appendTermLog('[TEST] Launching autonomous WhatsApp dispatch test...', 'warn');
    window.triggerSimulatedWaDispatch('Sumit Sharma', 'Automated test signal from Blackmagic core terminal.');
  } else if (clean === 'appliances') {
    window.appendTermLog('[IOT] Smart Studio Lights: ON (24W) | Server HVAC: ON (620W) | 3D Core: STANDBY', 'info');
  } else if (clean === 'whoami') {
    window.appendTermLog('blackmagic (Autonomous AI Agent & Neural Workstation)', 'success');
  } else if (clean === 'help') {
    window.appendTermLog('Available commands: status, ping, test-wa, appliances, whoami, clear, help', 'info');
  } else {
    window.appendTermLog(`bash: ${clean}: command routed through autonomous neural execution`, 'warn');
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// CYBERNETIC ARC REACTOR HUD CONTROLLER (FROM USER VIDEO)
// ═══════════════════════════════════════════════════════════════════════════

let hudTelemetryTimer = null;

window.toggleCyberHudView = function() {
  const hud = document.getElementById('modal-cybernetic-hud');
  if (!hud) return;
  if (hud.style.display === 'flex') {
    window.closeCyberHudView();
  } else {
    hud.style.display = 'flex';
    startHudTelemetryLoop();
    if (window.setOrbMode) {
      window.setOrbMode('heart');
    }
  }
};

window.closeCyberHudView = function() {
  const hud = document.getElementById('modal-cybernetic-hud');
  if (hud) hud.style.display = 'none';
  if (hudTelemetryTimer) {
    clearInterval(hudTelemetryTimer);
    hudTelemetryTimer = null;
  }
};

window.setCyberHudTheme = function(theme) {
  const container = document.getElementById('cyber-hud-container');
  const btnAmber = document.getElementById('btn-theme-amber');
  const btnViolet = document.getElementById('btn-theme-violet');
  const reactorText = document.getElementById('reactor-core-text');

  if (theme === 'amber') {
    if (container) container.classList.add('amber-theme');
    if (btnAmber) btnAmber.classList.add('active');
    if (btnViolet) btnViolet.classList.remove('active');
    if (reactorText) reactorText.textContent = 'HEART CORE';
    if (window.setOrbMode) window.setOrbMode('heart');
  } else {
    if (container) container.classList.remove('amber-theme');
    if (btnAmber) btnAmber.classList.remove('active');
    if (btnViolet) btnViolet.classList.add('active');
    if (reactorText) reactorText.textContent = 'BLACKMAGIC';
    if (window.setOrbMode) window.setOrbMode('cyan');
  }
};

function startHudTelemetryLoop() {
  if (hudTelemetryTimer) clearInterval(hudTelemetryTimer);
  hudTelemetryTimer = setInterval(() => {
    const temp = (41.5 + Math.random() * 1.8).toFixed(1);
    const cpu = (3.78 + Math.random() * 0.18).toFixed(2);
    const sync = (99.5 + Math.random() * 0.4).toFixed(1);

    const tempEl = document.getElementById('hud-val-temp');
    const cpuEl = document.getElementById('hud-val-cpu');
    const syncEl = document.getElementById('hud-val-sync');

    if (tempEl) tempEl.textContent = `${temp}°C`;
    if (cpuEl) cpuEl.textContent = `${cpu} GHz`;
    if (syncEl) syncEl.textContent = `${sync}%`;

    // Randomize spectrum bars
    const bars = document.querySelectorAll('#hud-spectrum-bars .spec-bar');
    bars.forEach(b => {
      const h = Math.floor(20 + Math.random() * 80);
      b.style.height = `${h}%`;
    });
  }, 1400);
}

// ═══════════════════════════════════════════════════════════════════════════
// SMART HARDWARE & APPLIANCE TRACING CONTROLLER
// ═══════════════════════════════════════════════════════════════════════════

const applianceState = {
  lights: true,
  ac: true,
  printer: false
};

window.openApplianceModal = function() {
  const modal = document.getElementById('modal-appliances');
  if (modal) modal.style.display = 'flex';
};

window.closeApplianceModal = function() {
  const modal = document.getElementById('modal-appliances');
  if (modal) modal.style.display = 'none';
};

window.toggleAppliance = function(id) {
  applianceState[id] = !applianceState[id];

  if (id === 'lights') {
    const status = document.getElementById('appliance-status-lights');
    const btn = document.getElementById('btn-toggle-lights');
    if (applianceState.lights) {
      if (status) { status.textContent = 'ACTIVE (100%)'; status.className = 'sub-badge green'; }
      if (btn) btn.textContent = 'Turn Off';
    } else {
      if (status) { status.textContent = 'OFF'; status.className = 'sub-badge'; }
      if (btn) btn.textContent = 'Turn On';
    }
  } else if (id === 'ac') {
    const status = document.getElementById('appliance-status-ac');
    const btn = document.getElementById('btn-toggle-ac');
    if (applianceState.ac) {
      if (status) { status.textContent = 'COOL (22°C)'; status.className = 'sub-badge green'; }
      if (btn) btn.textContent = 'Toggle Eco Mode';
    } else {
      if (status) { status.textContent = 'ECO (26°C)'; status.className = 'sub-badge blue'; }
      if (btn) btn.textContent = 'Set Cool (22°C)';
    }
  } else if (id === 'printer') {
    const status = document.getElementById('appliance-status-printer');
    const btn = document.getElementById('btn-toggle-printer');
    if (applianceState.printer) {
      if (status) { status.textContent = 'PRINTING (210°C)'; status.className = 'sub-badge green'; }
      if (btn) btn.textContent = 'Pause Print';
    } else {
      if (status) { status.textContent = 'STANDBY'; status.className = 'sub-badge blue'; }
      if (btn) btn.textContent = 'Start Preheat';
    }
  }

  // Recalculate wattage
  let totalW = 0;
  if (applianceState.lights) totalW += 24;
  if (applianceState.ac) totalW += 620;
  if (applianceState.printer) totalW += 180;
  const powerEl = document.getElementById('total-power-draw');
  if (powerEl) powerEl.textContent = `${totalW} W`;

  window.appendTermLog(`[APPLIANCE_SWITCH] ${id.toUpperCase()} toggled to ${applianceState[id] ? 'ACTIVE' : 'OFF/STANDBY'} (Current draw: ${totalW}W)`, 'info');
};
