# Blackmagic AI — Client Button Reference
## Every Button, Its Options & How It Works
### Source: `src/ui/index.html` & `src/ui/app.js` | App: `blackmagic_ai.exe` (client.exe)

> **Client application only. No admin panel.**  
> Total Clickable Buttons: **45** | Dropdown Selects: **3** | Inputs: **15** | Keyboard Shortcuts: **8**

---

## 📋 Complete Master Table

| # | Button Name | Selector / Target | Location | Function / Action |
|---|-------------|-------------------|----------|-------------------|
| **1** | Initialize Core | `#btn-login-submit` | Login Screen | `performLogin()` |
| **2** | Create Account | `#btn-show-register` | Login Screen | `showRegisterForm()` |
| **3** | Create Account (4.5M Tokens) | `#btn-register-submit` | Register Screen | `performRegister()` |
| **4** | Back to login | `#btn-back-to-login` | Register Screen | `showLoginForm()` |
| **5** | Forget Password? | `#btn-forgot-password` | Login Screen | `showForgotPassword()` |
| **6** | Request Verification | `#btn-forgot-submit` | Forgot Password Screen | `submitForgotPassword()` |
| **7** | Back to login | `#btn-forgot-back` | Forgot Password Screen | `showLoginForm()` |
| **8** | Verify OTP | `#btn-verify-otp` | OTP Verification Screen | `verifyOTP()` |
| **9** | ⚙ Settings | `#btn-settings` | Left Sidebar | `openOverlay('settings-overlay')` |
| **10** | 💳 Upgrade Plan | `#btn-upgrade` | Left Sidebar | `openOverlay('upgrade-overlay')` |
| **11** | 🗑 Clear Chat | `#btn-clear-chat` | Left Sidebar | `clearActiveChat()` |
| **12** | Blackfire V2 | `#btn-model-v2` | Model Selector | `selectModelProvider('blackfire v2')` |
| **13** | Blackfire Ultra | `#btn-model-ultra` | Model Selector | `selectModelProvider('blackfire ultra')` |
| **14** | Blackcloud V2 | `#btn-model-cloud` | Model Selector | `selectModelProvider('blackcloud v2')` |
| **15** | 🛡️ DPDP 2023 Verified | `#btn-dpdp-badge` | Model Selector Bar | `openOverlay('dpdp-overlay')` |
| **16** | ✕ / + Cross Tools Toggle | `#btn-toggle-input-tools` | Chat Input Box | `toggleInputToolsDrawer()` |
| **17** | 🎙️ Voice Mode | `#btn-voice-mode-toggle` | Tools Drawer | `toggleVoiceMode()` |
| **18** | 🖼️ Picture (PC) | `#btn-upload-pc-image` | Tools Drawer | Select & upload image from PC/Storage |
| **19** | 📎 Attach Files | `#btn-open-file-import` | Tools Drawer | `openFileImportModal()` |
| **20** | 📸 Camera Button | `#btn-upload-live-camera` | Chat Input Box (Next to Execute) | `openLiveCameraModal()` |
| **21** | ➔ Execute Button | `#btn-chat-execute` | Chat Input Box | `sendChatMessage()` |
| **22** | ✕ Close Upgrade | `#btn-close-upgrade` | Upgrade Modal | `closeOverlay('upgrade-overlay')` |
| **23** | Buy Tier (₹499) | `#btn-buy-pro` | Upgrade Modal (Pro) | `buyPlan('Pro')` |
| **24** | Buy Tier (₹2,999) | `#btn-buy-premium` | Upgrade Modal (Premium) | `buyPlan('Premium')` |
| **25** | Buy Tier (₹7,999) | `#btn-buy-ultra` | Upgrade Modal (Ultra) | `buyPlan('Ultra')` |
| **26** | ✕ Close Settings | `#btn-close-settings` | Settings Modal | `closeOverlay('settings-overlay')` |
| **27** | Profile Portal | `#tab-btn-profile` | Settings Sidebar | `switchSettingsTab('settings-profile')` |
| **28** | Permissions | `#tab-btn-perms` | Settings Sidebar | `switchSettingsTab('settings-perms')` |
| **29** | Appearance | `#tab-btn-appearance` | Settings Sidebar | `switchSettingsTab('settings-appearance')` |
| **30** | Models Pool | `#tab-btn-models` | Settings Sidebar | `switchSettingsTab('settings-models')` |
| **31** | Customizations | `#tab-btn-custom` | Settings Sidebar | `switchSettingsTab('settings-custom')` |
| **32** | Feedback | `#tab-btn-feedback` | Settings Sidebar | `switchSettingsTab('settings-feedback')` |
| **33** | Shortcut Keys | `#tab-btn-shortcuts` | Settings Sidebar | `switchSettingsTab('settings-shortcuts')` |
| **34** | Projects Configuration | `#tab-btn-projects` | Settings Sidebar | `switchSettingsTab('settings-projects')` |
| **35** | Regional Routing | `#tab-btn-routing` | Settings Sidebar | `switchSettingsTab('settings-routing')` |
| **36** | Import/Export Config | `#tab-btn-export-import` | Settings Sidebar | `switchSettingsTab('settings-export-import')` |
| **37** | Submit Note | `#btn-submit-feedback` | Feedback Tab | `submitFeedback()` |
| **38** | Create Project | `#btn-create-project` | Projects Tab | `createNewProject()` |
| **39** | Export Config | `#btn-export-config` | Import/Export Tab | `exportConfig()` |
| **40** | Import Config | `#btn-import-config` | Import/Export Tab | `triggerImportConfig()` |
| **41** | 💾 Save Notepad Script | `#btn-notepad-save` | Screen Automation (Notepad) | `saveNotepadContent()` |
| **42** | 📋 Copy Notepad Code | `#btn-notepad-copy` | Screen Automation (Notepad) | `copyNotepadContent()` |
| **43** | 🗑 Clear Notepad | `#btn-notepad-clear` | Screen Automation (Notepad) | `clearNotepadContent()` |

---

## 🎛️ Complete Dropdown Selects (3)

| # | Select Name | ID | Options | Function |
|---|-------------|----|---------|----------|
| **1** | Permission Level | `#user-permission-level` | 1. `Sandbox Bounds`<br>2. `Restricted Mode`<br>3. `Full System Access` | `updatePermissionLevel()` — When Full System Access is selected, appliance grants root command privileges and activates trace audit. |
| **2** | Font Scale | `#font-scale-select` | 1. Small (13px)<br>2. Default (14px)<br>3. Large (16px)<br>4. Extra Large (18px) | `applyFontScale()` — Applies real-time font scaling across the entire interface. |
| **3** | Routing Preference | `#user-routing-preference` | 1. Auto Balanced (Failover enabled)<br>2. USA Region Node Preference<br>3. India Region Node Preference | `updateRoutingPreference()` — Dynamically switches cluster gateway between USA and India ap-south-1. |

---

## ⌨️ Complete Input Fields (15)

1. `#login-username` — Username or email address
2. `#login-password` — Account password
3. `#register-fullname` — Full Name (Required)
4. `#register-age` — Age (Required, 10–100)
5. `#register-phone` — Mobile phone number (Required, 10 digits)
6. `#register-email` — Email address (Required)
7. `#register-username` — Username (Required, 3–30 characters)
8. `#register-password` — Passphrase (Required, min 8 characters)
9. `#register-confirm-password` — Passphrase confirmation
10. `#forgot-username` — Username for OTP password reset
11. `#verification-otp` — 6-digit Security OTP code
12. `#new-password` — New password for reset
13. `#chat-user-input` — Main conversational and command input
14. `#feedback-note-text` — Feedback note textarea
15. `#new-project-name` — Name for new workspace project

---

## ⚡ Keyboard Shortcuts (8)

1. `Enter`: Send message (`sendChatMessage()`)
2. `Ctrl + N`: New chat context (`startNewChat()`)
3. `Ctrl + H`: Chat history overview
4. `Ctrl + S`: Open Settings overlay (`openOverlay('settings-overlay')`)
5. `Ctrl + Shift + F`: Jump to Feedback tab
6. `Ctrl + P`: Jump to Projects Configuration tab
7. **Voice Wake**: *"hey magic"* — Activates speech-to-text live listener
8. **Emergency Halt**: *"magic stop"* — Calls machine controller emergency halt, stopping all active appliance processes instantly.

---

## 🛡️ Appliance Tracing & Real-Time Admin Alerting

- **Full Appliance Access**: Users can select "Full System Access" from Dropdown #1. The appliance trace engine monitors all command executions and filesystem queries.
- **Anomalous Chat Detection**: Any anomalous prompt (cyber safety tests, ransomware, exploit generation, unauthorized privilege escalation, or hostile payloads) is immediately intercepted by the **Kavach DPDP 2023 Sentinel**.
- **Admin Alerting**: The system logs a `SecurityThreatAlert` containing:
  - User ID, Full Name, Username
  - Mobile Number & Email
  - Student Age & Plan Tier
  - Permission Level
  - Complete Query Text & Severity Level (`CRITICAL`)
  - Trace ID & Timestamp
- **Admin Command Center (`admin.exe`)**: Displays the alert in real time with an audio ping, red visual badge, full user contact card, and one-click **"🔒 Lock Account"** button.
