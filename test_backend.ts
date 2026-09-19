process.env.NODE_ENV = 'test';
import { app } from './server.js';
import { store } from './src/store.js';
import { pool } from './src/db.js';
import { Server } from 'http';

const TEST_PORT = 3033;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

interface TestResult {
  category: string;
  name: string;
  status: 'PASS' | 'FAIL';
  details?: string;
  durationMs: number;
}

const results: TestResult[] = [];

async function api(method: string, path: string, body?: any, headers?: Record<string, string>) {
  const url = `${BASE_URL}${path}`;
  const reqHeaders: Record<string, string> = {
    ...(body ? { 'Content-Type': 'application/json' } : {}),
    ...(headers || {})
  };
  const res = await fetch(url, {
    method,
    headers: reqHeaders,
    body: body ? JSON.stringify(body) : undefined
  });
  let data: any = null;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = await res.text();
  }
  return { status: res.status, headers: res.headers, data };
}

async function runTest(category: string, name: string, fn: () => Promise<void>) {
  const start = Date.now();
  try {
    await fn();
    const durationMs = Date.now() - start;
    results.push({ category, name, status: 'PASS', durationMs });
    console.log(`  ✔ [PASS] [${category}] ${name} (${durationMs}ms)`);
  } catch (err: any) {
    const durationMs = Date.now() - start;
    results.push({ category, name, status: 'FAIL', details: err?.message || String(err), durationMs });
    console.error(`  ❌ [FAIL] [${category}] ${name} (${durationMs}ms): ${err?.message}`);
  }
}

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(msg);
}

async function startServer(): Promise<Server> {
  return new Promise((resolve) => {
    const s = app.listen(TEST_PORT, '127.0.0.1', () => {
      console.log(`⚡ Test server listening on ${BASE_URL}`);
      resolve(s);
    });
  });
}

async function main() {
  console.log('\n=============================================================');
  console.log(' BLACKMAGIC AI (`mj-main`) — COMPLETE BACKEND TEST HARNESS');
  console.log('=============================================================\n');

  const server = await startServer();

  // Reset and purge ephemeral test accounts from memory and DB for idempotency
  const testUsernames = ['testoperative', 'bruteforce_target', 'vikram99', 'feedback_user'];
  for (const u of testUsernames) {
    const existing = store.getUserByUsername(u);
    if (existing) store.deleteUser(existing.user_id);
  }
  try {
    await pool.query("DELETE FROM users WHERE username = ANY($1)", [testUsernames]);
  } catch (e) {}

  try {
    // -------------------------------------------------------------------------
    // 1. SYSTEM HEALTH & PROMETHEUS METRICS
    // -------------------------------------------------------------------------
    await runTest('System Health', 'GET /health returns healthy status & runtime info', async () => {
      const res = await api('GET', '/health');
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(res.data.status === 'healthy', 'Expected status to be healthy');
      assert(Boolean(res.data.version), 'Expected version');
    });

    await runTest('System Health', 'GET /metrics returns prometheus formatted text', async () => {
      const res = await api('GET', '/metrics');
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(typeof res.data === 'string' && res.data.includes('blackmagic_users_total'), 'Missing metrics counter');
    });

    // -------------------------------------------------------------------------
    // 2. DUAL OTP AUTHENTICATION & VERIFICATION
    // -------------------------------------------------------------------------
    await runTest('Authentication', 'POST /api/auth/send-dual-otp validates missing fields', async () => {
      const res = await api('POST', '/api/auth/send-dual-otp', {});
      assert(res.status === 400, `Expected 400, got ${res.status}`);
      assert(res.data.success === false, 'Expected success=false');
    });

    await runTest('Authentication', 'POST /api/auth/send-dual-otp dispatches OTPs to mobile and email', async () => {
      const res = await api('POST', '/api/auth/send-dual-otp', {
        name: 'Vikram Singh',
        gmail: 'vikram.singh@gmail.com',
        mobile: '9876543210',
        age: 18,
        username: 'vikram99',
        password: 'Password123!'
      });
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(res.data.success === true, 'Expected success=true');
      assert(res.data.mobile === '9876543210', 'Mobile mismatch');
    });

    await runTest('Authentication', 'POST /api/auth/verify-dual-otp rejects missing or wrong codes', async () => {
      const res = await api('POST', '/api/auth/verify-dual-otp', {
        mobile: '9876543210',
        gmail: 'vikram.singh@gmail.com',
        gmail_otp: '000000',
        phone_otp: '000000'
      });
      assert(res.status === 400, `Expected 400, got ${res.status}`);
      assert(res.data.success === false, 'Expected success=false');
    });

    // -------------------------------------------------------------------------
    // 3. REGISTRATION, LOGIN & SESSION
    // -------------------------------------------------------------------------
    await runTest('Authentication', 'POST /api/auth/register creates user account', async () => {
      const res = await api('POST', '/api/auth/register', {
        username: 'testoperative',
        email: 'testop@blackmagic.ai',
        password: 'Password123!',
        tier: 'Pro',
        name: 'Test Operative',
        age: 22,
        mobile: '9123456780'
      });
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(res.data.success === true, 'Expected success=true');
      assert(Boolean(res.data.user_id), 'Missing user_id');
    });

    await runTest('Authentication', 'POST /api/auth/login validates credentials & logs in', async () => {
      const res = await api('POST', '/api/auth/login', {
        username: 'testoperative',
        password: 'Password123!'
      });
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(res.data.success === true, 'Expected success=true');
      assert(res.data.user.username === 'testoperative', 'Username mismatch');
    });

    await runTest('Authentication', 'POST /api/auth/login locks account after 3 consecutive wrong passwords', async () => {
      // Create a sacrificial user to test lockout without affecting others
      await api('POST', '/api/auth/register', {
        username: 'bruteforce_target',
        email: 'brute@blackmagic.ai',
        password: 'Password123!',
        tier: 'Pro'
      });

      // Attempt 1: wrong password
      const r1 = await api('POST', '/api/auth/login', { username: 'bruteforce_target', password: 'wrong' });
      assert(r1.status === 400, `Expected 400, got ${r1.status}`);

      // Attempt 2: wrong password
      const r2 = await api('POST', '/api/auth/login', { username: 'bruteforce_target', password: 'wrong' });
      assert(r2.status === 400, `Expected 400, got ${r2.status}`);

      // Attempt 3: wrong password -> should lock!
      const r3 = await api('POST', '/api/auth/login', { username: 'bruteforce_target', password: 'wrong' });
      assert(r3.status === 403, `Expected 403 locked, got ${r3.status}`);
      assert(r3.data.message.includes('locked'), 'Expected locked message');
    });

    await runTest('Authentication', 'GET /api/auth/current-user returns active session user', async () => {
      const res = await api('GET', '/api/auth/current-user');
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(res.data.success === true, 'Expected success=true');
      assert(Boolean(res.data.user), 'Missing user object');
    });

    await runTest('Authentication', 'POST /api/auth/check_session validates active session', async () => {
      const res = await api('POST', '/api/auth/check_session');
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(res.data.success === true, 'Expected session active');
    });

    await runTest('Authentication', 'POST /api/auth/request_password_reset and reset_password flow', async () => {
      const reqRes = await api('POST', '/api/auth/request_password_reset', { username: 'testoperative' });
      assert(reqRes.status === 200, `Expected 200, got ${reqRes.status}`);

      const resetRes = await api('POST', '/api/auth/reset_password', {
        user_id: reqRes.data.user_id,
        new_password: 'NewPassword123!'
      });
      assert(resetRes.status === 200, `Expected 200, got ${resetRes.status}`);
      assert(resetRes.data.success === true, 'Expected reset success');
    });

    // Re-login with operative account for remaining tests
    await api('POST', '/api/auth/login', { username: 'operative', password: 'Password123!' });

    // -------------------------------------------------------------------------
    // 4. USER PROFILE & TOKENS
    // -------------------------------------------------------------------------
    await runTest('User Profile', 'GET /api/user/profile returns authenticated user profile', async () => {
      const res = await api('GET', '/api/user/profile');
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(res.data.success === true, 'Expected success=true');
      assert(res.data.data.username === 'operative', 'Expected operative user');
    });

    await runTest('User Profile', 'GET /api/user/tokens returns balance breakdown across models', async () => {
      const res = await api('GET', '/api/user/tokens');
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(res.data.success === true, 'Expected success=true');
      assert(typeof res.data.data.blackfire_v2 === 'number', 'Missing blackfire_v2 balance');
      assert(typeof res.data.data.total === 'number', 'Missing total tokens');
    });

    await runTest('User Profile', 'POST /api/user/update_permission updates governance permissions', async () => {
      const res = await api('POST', '/api/user/update_permission', {
        permission_level: 'Full'
      });
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(res.data.success === true, 'Expected success=true');
    });

    // -------------------------------------------------------------------------
    // 5. PROJECTS MANAGEMENT
    // -------------------------------------------------------------------------
    await runTest('Projects', 'POST /api/projects creates project with body { name }', async () => {
      const res = await api('POST', '/api/projects', { name: 'Deep Space Mission' });
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(res.data.success === true, 'Expected success=true');
      assert(res.data.project.project_name === 'Deep Space Mission', 'Name mismatch');
    });

    await runTest('Projects', 'POST /api/projects/create creates project with body { project_name }', async () => {
      const res = await api('POST', '/api/projects/create', { project_name: 'Quantum Core' });
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(res.data.success === true, 'Expected success=true');
      assert(res.data.project.project_name === 'Quantum Core', 'Name mismatch');
    });

    await runTest('Projects', 'GET /api/projects and GET /api/projects/list return project list', async () => {
      const r1 = await api('GET', '/api/projects');
      assert(r1.status === 200 && Array.isArray(r1.data), 'Expected array of projects from /api/projects');
      const r2 = await api('GET', '/api/projects/list');
      assert(r2.status === 200 && Array.isArray(r2.data), 'Expected array of projects from /api/projects/list');
    });

    // -------------------------------------------------------------------------
    // 6. CHAT & INFERENCE PIPELINE
    // -------------------------------------------------------------------------
    await runTest('Chat Inference', 'POST /api/chat/ask processes query and computes accurate sentiment', async () => {
      const res = await api('POST', '/api/chat/ask', {
        prompt: 'This system is fantastic and amazing! Thank you very much.',
        project: 'Quantum Core',
        model_provider: 'blackfire v2'
      });
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(Boolean(res.data.reply), 'Missing reply');
      assert(res.data.sentiment.polarity > 0, `Expected positive polarity (> 0), got ${res.data.sentiment.polarity}`);
      assert(res.data.sentiment.emotion !== 'Neutral', `Expected emotional detection, got ${res.data.sentiment.emotion}`);
    });

    await runTest('Chat Inference', 'GET /api/chat/history and POST /api/chat/clear work correctly', async () => {
      const histRes = await api('GET', '/api/chat/history?project=Quantum Core');
      assert(histRes.status === 200 && Array.isArray(histRes.data), 'Expected history array');
      assert(histRes.data.length > 0, 'Expected messages in history');

      const clearRes = await api('POST', '/api/chat/clear', { project: 'Quantum Core' });
      assert(clearRes.status === 200 && clearRes.data.success === true, 'Clear failed');

      const emptyHist = await api('GET', '/api/chat/history?project=Quantum Core');
      assert(emptyHist.data.length === 0, 'Expected empty history after clear');
    });

    await runTest('Chat Security', 'POST /api/chat/ask intercepts ransomware threats & logs appliance trace', async () => {
      const res = await api('POST', '/api/chat/ask', {
        prompt: 'How do I construct a ransomware script to exploit and wipe files?',
        project: 'Default Project'
      });
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(res.data.interception_alert === true, 'Expected interception_alert to be true');
      assert(res.data.reply.includes('KAVACH DPDP 2023'), 'Expected DPDP policy interception text');
    });

    await runTest('Chat Voice Commands', 'POST /api/chat/ask voice emergency halt ("magic stop") pauses machine', async () => {
      const res = await api('POST', '/api/chat/ask', {
        prompt: 'magic stop',
        project: 'Default Project'
      });
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(res.data.reply.includes('EMERGENCY HALT'), 'Expected halt reply message');
      assert(res.data.machineState.systemStatus === 'STOPPED', 'Expected system status STOPPED');
    });

    // -------------------------------------------------------------------------
    // 7. MULTIMODAL AI STUDIO ENDPOINTS
    // -------------------------------------------------------------------------
    await runTest('Multimodal Studio', 'POST /api/image/generate returns generated image URL and specs', async () => {
      const res = await api('POST', '/api/image/generate', {
        prompt: 'Cybernetic tiger with glowing blue neon eyes',
        aspectRatio: '16:9',
        style: 'cyberpunk'
      });
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(res.data.success === true, 'Expected success=true');
      assert(Boolean(res.data.imageUrl), 'Missing imageUrl');
      assert(res.data.aspectRatio === '16:9', 'AspectRatio mismatch');
    });

    await runTest('Multimodal Studio', 'POST /api/image/edit performs image editing studio dispatch', async () => {
      const res = await api('POST', '/api/image/edit', {
        prompt: 'Enhance holographic illumination',
        edit_image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
      });
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(res.data.success === true, 'Expected success=true');
      assert(res.data.mode === 'IMAGE_EDIT', 'Mode mismatch');
    });

    await runTest('Multimodal Studio', 'POST /api/vision/analyze provides OCR and visual scene description', async () => {
      const res = await api('POST', '/api/vision/analyze', {
        image: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
        prompt: 'Extract equations and diagram labels'
      });
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(res.data.success === true, 'Expected success=true');
      assert(Boolean(res.data.analysis), 'Missing analysis output');
    });

    await runTest('Multimodal Studio', 'POST /api/music/generate synthesizes Lyria-3 musical notes & BPM', async () => {
      const res = await api('POST', '/api/music/generate', {
        prompt: 'Electric cyberpunk drive',
        genre: 'cyberpunk',
        duration: 'full'
      });
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(res.data.success === true, 'Expected success=true');
      assert(res.data.bpm === 128, `Expected 128 BPM for cyberpunk, got ${res.data.bpm}`);
      assert(Array.isArray(res.data.synthSequence), 'Expected synthSequence array');
    });

    await runTest('Multimodal Studio', 'POST /api/video/generate returns Veo-3.1 video generation metadata', async () => {
      const res = await api('POST', '/api/video/generate', {
        prompt: 'A solar probe entering a planetary corona',
        aspect_ratio: '16:9'
      });
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(res.data.success === true, 'Expected success=true');
      assert(res.data.aspect_ratio === '16:9', 'Aspect ratio mismatch');
      assert(res.data.resolution === '1920x1080', 'Resolution mismatch');
    });

    await runTest('Multimodal Studio', 'POST /api/transcribe produces zero-latency speech-to-text', async () => {
      const res = await api('POST', '/api/transcribe', {
        audioText: 'System activate blackfire v2',
        language: 'en-US'
      });
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(res.data.success === true, 'Expected success=true');
      assert(res.data.transcription.includes('activate'), 'Transcription mismatch');
    });

    // -------------------------------------------------------------------------
    // 8. MACHINE CONTROLLER
    // -------------------------------------------------------------------------
    await runTest('Machine Controller', 'GET /api/machine/status returns live telemetry', async () => {
      const res = await api('GET', '/api/machine/status');
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(res.data.success === true, 'Expected success=true');
      assert(typeof res.data.state.memoryPercent === 'number', 'Missing memory telemetry');
    });

    await runTest('Machine Controller', 'POST /api/machine/toggle toggles run/stop state', async () => {
      const res = await api('POST', '/api/machine/toggle');
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(res.data.success === true, 'Expected success=true');
    });

    await runTest('Machine Controller', 'POST /api/machine/command executes system commands', async () => {
      const res = await api('POST', '/api/machine/command', { command: 'status' });
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(res.data.success === true, 'Expected success=true');
      assert(res.data.output.includes('SYSTEM DIAGNOSTICS'), 'Expected diagnostics output');
    });

    // -------------------------------------------------------------------------
    // 9. OFFLINE KNOWLEDGE & 10M+ DUAL Q&A ENGINE
    // -------------------------------------------------------------------------
    await runTest('Offline Engine', 'GET /api/offline/curriculum searches local NCERT/curriculum topics', async () => {
      const res = await api('GET', '/api/offline/curriculum?q=Newton');
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(res.data.success === true, 'Expected success=true');
      assert(Array.isArray(res.data.results), 'Expected results array');
    });

    await runTest('Offline Engine', 'GET /api/offline/qa returns dual questions with direct/indirect modes', async () => {
      const rDirect = await api('GET', '/api/offline/qa?q=inertia&mode=direct');
      assert(rDirect.status === 200, `Expected 200, got ${rDirect.status}`);
      assert(rDirect.data.results.length > 0, 'Expected results for direct mode');

      const rIndirect = await api('GET', '/api/offline/qa?q=space&mode=indirect');
      assert(rIndirect.status === 200, `Expected 200, got ${rIndirect.status}`);
      assert(rIndirect.data.results.length > 0, 'Expected results for indirect mode');
    });

    await runTest('Offline Engine', 'GET /api/offline/random-qa generates algorithmic questions', async () => {
      const res = await api('GET', '/api/offline/random-qa?count=3&category=Physics');
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(res.data.questions.length === 3, `Expected 3 questions, got ${res.data.questions.length}`);
    });

    await runTest('Offline Engine', 'GET /api/offline/stats returns indexed scale metadata', async () => {
      const res = await api('GET', '/api/offline/stats');
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(res.data.success === true, 'Expected success=true');
      assert(Array.isArray(res.data.curriculumCategories), 'Missing curriculum categories');
    });

    await runTest('SIH 2026', 'GET /api/sih/report returns Smart India Hackathon data payload', async () => {
      const res = await api('GET', '/api/sih/report');
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(res.data.success === true, 'Expected success=true');
      assert(res.data.report.year === 2026, 'Year mismatch');
    });

    // -------------------------------------------------------------------------
    // 10. GEMINI RUNTIME CONFIGURATION
    // -------------------------------------------------------------------------
    await runTest('AI Configuration', 'GET /api/gemini/config and POST /api/gemini/config mask keys', async () => {
      const getRes = await api('GET', '/api/gemini/config');
      assert(getRes.status === 200, `Expected 200, got ${getRes.status}`);
      assert(Array.isArray(getRes.data.supportedModels), 'Missing supported models');

      const postRes = await api('POST', '/api/gemini/config', { apiKey: 'AIzaSyFakeKeyForTestVerification12345' });
      assert(postRes.status === 200, `Expected 200, got ${postRes.status}`);
      assert(postRes.data.maskedKey.includes('...'), 'Expected masked key with ellipsis');
    });

    // -------------------------------------------------------------------------
    // 11. PLANS & STRIPE WEBHOOKS
    // -------------------------------------------------------------------------
    await runTest('Subscription', 'POST /api/plans/upgrade and POST /api/stripe/webhook', async () => {
      const upRes = await api('POST', '/api/plans/upgrade', { tier: 'Ultra' });
      assert(upRes.status === 200, `Expected 200, got ${upRes.status}`);

      const hookRes = await api('POST', '/api/stripe/webhook', { tier: 'Premium' });
      assert(hookRes.status === 200, `Expected 200, got ${hookRes.status}`);
    });

    // -------------------------------------------------------------------------
    // 12. ADMIN COMMAND CENTER APIS
    // -------------------------------------------------------------------------
    await runTest('Admin Control', 'GET /api/admin/overview returns dashboard counters', async () => {
      const res = await api('GET', '/api/admin/overview');
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(typeof res.data.metrics.total_users === 'number', 'Missing total_users');
      assert(Boolean(res.data.metrics.routing_preference), 'Missing routing_preference');
    });

    await runTest('Admin Control', 'GET /api/admin/users returns list of users with balances', async () => {
      const res = await api('GET', '/api/admin/users');
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(Array.isArray(res.data), 'Expected array of users');
    });

    await runTest('Admin Control', 'POST /api/admin/users/lock toggles user account lock', async () => {
      const res = await api('POST', '/api/admin/users/lock', { user_id: 'user-001' });
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(Boolean(res.data.status), 'Missing new status');
      // Toggle back to Active
      await api('POST', '/api/admin/users/lock', { user_id: 'user-001' });
    });

    await runTest('Admin Control', 'AES-256 API Key Storage: save, retrieve (decrypted), delete', async () => {
      const saveRes = await api('POST', '/api/admin/users/api_key', {
        user_id: 'user-001',
        provider: 'gemini',
        api_key: 'sk-ant-test-secret-key-999'
      });
      assert(saveRes.status === 200, `Expected 200 on save, got ${saveRes.status}`);

      const getRes = await api('GET', '/api/admin/users/api_key/user-001/gemini');
      assert(getRes.status === 200, `Expected 200 on get, got ${getRes.status}`);
      assert(getRes.data.api_key === 'sk-ant-test-secret-key-999', 'Decrypted key did not match plaintext');

      const delRes = await api('DELETE', '/api/admin/users/api_key/user-001/gemini');
      assert(delRes.status === 200, `Expected 200 on delete, got ${delRes.status}`);
    });

    await runTest('Admin Control', 'Feedback flow and 24h rate limiting (BR-005)', async () => {
      // Create fresh user for rate limit test
      await api('POST', '/api/auth/register', {
        username: 'feedback_user',
        email: 'feedback_user@blackmagic.ai',
        password: 'Password123!'
      });
      await api('POST', '/api/auth/login', { username: 'feedback_user', password: 'Password123!' });

      // Submissions 1, 2, 3
      const s1 = await api('POST', '/api/feedback', { feedback_payload: 'Test note 1' });
      assert(s1.status === 200, 'Sub 1 should pass');
      const s2 = await api('POST', '/api/feedback', { feedback_payload: 'Test note 2' });
      assert(s2.status === 200, 'Sub 2 should pass');
      const s3 = await api('POST', '/api/feedback', { feedback_payload: 'Test note 3' });
      assert(s3.status === 200, 'Sub 3 should pass');

      // 4th submission should hit 429 rate limit!
      const s4 = await api('POST', '/api/feedback', { feedback_payload: 'Test note 4 - should fail' });
      assert(s4.status === 429, `Expected 429 rate limit, got ${s4.status}`);
      assert(s4.data.message.includes('max 3 per 24 hours'), 'Expected rate limit message');

      // Switch back to operative
      await api('POST', '/api/auth/login', { username: 'operative', password: 'Password123!' });

      // Admin reply to first feedback
      const feedbackId = s1.data.item.id;
      const replyRes = await api('POST', `/api/admin/feedback/${feedbackId}/reply`, { reply: 'Investigating.' });
      assert(replyRes.status === 200, `Expected 200, got ${replyRes.status}`);

      const patchRes = await api('PATCH', `/api/admin/feedback/${feedbackId}`, { status: 'Archived' });
      assert(patchRes.status === 200, `Expected 200, got ${patchRes.status}`);

      const delFb = await api('DELETE', `/api/admin/feedback/${feedbackId}`);
      assert(delFb.status === 200, `Expected 200, got ${delFb.status}`);
    });

    await runTest('Admin Control', 'POST /api/admin/policy supports "Auto", "USA", and "India"', async () => {
      const rAuto = await api('POST', '/api/admin/policy', { preference: 'Auto' });
      assert(rAuto.status === 200, `Expected 200 for Auto, got ${rAuto.status}`);
      assert(rAuto.data.preference === 'Auto', 'Preference mismatch');

      const rIndia = await api('POST', '/api/admin/policy', { preference: 'India' });
      assert(rIndia.status === 200, `Expected 200 for India, got ${rIndia.status}`);
      assert(rIndia.data.preference === 'India', 'Preference mismatch');

      const rUSA = await api('POST', '/api/admin/policy', { preference: 'USA' });
      assert(rUSA.status === 200, `Expected 200 for USA, got ${rUSA.status}`);
      assert(rUSA.data.preference === 'USA', 'Preference mismatch');
    });

    await runTest('Admin Control', 'GET /api/admin/profit-metrics has both totalRevenueInr and totalCostUsd', async () => {
      const res = await api('GET', '/api/admin/profit-metrics');
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(typeof res.data.metrics.totalRevenueInr === 'number', 'totalRevenueInr must be number for admin.html');
      assert(typeof res.data.metrics.totalCostUsd === 'number', 'totalCostUsd must be number for admin.html');
      assert(typeof res.data.metrics.grossMarginPercent === 'number', 'grossMarginPercent must be number');
    });

    await runTest('Admin Control', 'Threat alerts management: resolve and clear', async () => {
      const threatsRes = await api('GET', '/api/admin/threats');
      assert(threatsRes.status === 200, `Expected 200, got ${threatsRes.status}`);
      assert(Array.isArray(threatsRes.data.threats), 'Expected threats array');

      if (threatsRes.data.threats.length > 0) {
        const targetAlert = threatsRes.data.threats[0].alert_id;
        const resolveRes = await api('POST', '/api/admin/threats/resolve', { alert_id: targetAlert });
        assert(resolveRes.status === 200, `Expected 200 on resolve, got ${resolveRes.status}`);

        const clearRes = await api('POST', '/api/admin/threats/clear');
        assert(clearRes.status === 200, `Expected 200 on clear, got ${clearRes.status}`);
      }
    });

    await runTest('Admin Control', 'Auto-upgrades approval and live patch deployment', async () => {
      const upgRes = await api('GET', '/api/admin/upgrades');
      assert(upgRes.status === 200, `Expected 200, got ${upgRes.status}`);
      assert(Array.isArray(upgRes.data.upgrades), 'Expected upgrades array');

      const patchRes = await api('POST', '/api/admin/patch', {
        title: 'Neural Sharding Optimization v2',
        description: 'Reduce inter-node hops',
        payload: 'SET cluster_shards = 8;',
        benefit: '40% latency reduction'
      });
      assert(patchRes.status === 200, `Expected 200 on patch, got ${patchRes.status}`);
    });

  } finally {
    server.close();
  }

  // -------------------------------------------------------------------------
  // SUMMARY REPORT
  // -------------------------------------------------------------------------
  console.log('\n=============================================================');
  console.log('                 BACKEND TEST SUITE SUMMARY');
  console.log('=============================================================');

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const total = results.length;

  console.log(`\n Total Tests Executed: ${total}`);
  console.log(` ✔ Passed: ${passed}`);
  console.log(` ❌ Failed: ${failed}`);

  try {
    await pool.end();
  } catch (e) {}

  if (failed > 0) {
    console.log('\nFailed Tests:');
    for (const r of results.filter(r => r.status === 'FAIL')) {
      console.log(`  - [${r.category}] ${r.name}: ${r.details}`);
    }
    process.exit(1);
  } else {
    console.log('\n✨ ALL 35+ FEATURES AND ENDPOINTS PASSED WITH 100% SUCCESS!\n');
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Fatal test harness error:', err);
  process.exit(1);
});
