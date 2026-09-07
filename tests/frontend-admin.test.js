const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const storage = new Map();
let loginRole = 'مشرف';
let lastRequest = null;

const sandbox = {
  console,
  URL,
  sessionStorage: {
    setItem(key, value) {
      storage.set(key, value);
    },
    getItem(key) {
      return storage.has(key)
        ? storage.get(key)
        : null;
    },
    removeItem(key) {
      storage.delete(key);
    }
  },
  async fetch(url, options = {}) {
    lastRequest = {
      url: String(url),
      options
    };

    if (options.method === 'POST') {
      const body = JSON.parse(options.body);
      return {
        ok: true,
        async json() {
          return {
            success: true,
            data: {
              supervisorId:
                loginRole === 'مدير'
                  ? 'ADM001'
                  : 'SUP001',
              nationalId: body.nationalId,
              name:
                loginRole === 'مدير'
                  ? 'مدير الاختبار'
                  : 'مشرف الاختبار',
              role: loginRole,
              phone: ''
            }
          };
        }
      };
    }

    return {
      ok: true,
      async json() {
        return {
          success: true,
          data: {
            admin: {
              id: 'ADM001',
              name: 'مدير الاختبار',
              role: 'مدير'
            },
            summary: {},
            supervisors: [],
            schools: []
          }
        };
      }
    };
  }
};

vm.createContext(sandbox);
vm.runInContext(
  fs.readFileSync(
    __dirname + '/../safety-dashboard/js/api.js',
    'utf8'
  ),
  sandbox
);
vm.runInContext(
  fs.readFileSync(
    __dirname + '/../safety-dashboard/js/auth.js',
    'utf8'
  ),
  sandbox
);

(async () => {
  loginRole = 'مشرف';
  let result = await vm.runInContext(
    "SafetyAuth.login('1000000002')",
    sandbox
  );
  assert.strictEqual(result.success, true);
  assert.strictEqual(
    vm.runInContext('SafetyAuth.isSupervisor()', sandbox),
    true
  );
  assert.strictEqual(
    vm.runInContext('SafetyAuth.getSession().role', sandbox),
    'مشرف'
  );

  vm.runInContext('SafetyAuth.logout()', sandbox);
  assert.strictEqual(
    vm.runInContext('SafetyAuth.getSession()', sandbox),
    null
  );

  loginRole = 'مدير';
  result = await vm.runInContext(
    "SafetyAuth.login('1000000001')",
    sandbox
  );
  assert.strictEqual(result.success, true);
  assert.strictEqual(
    vm.runInContext('SafetyAuth.isAdmin()', sandbox),
    true
  );
  assert.strictEqual(
    vm.runInContext('SafetyAuth.getSession().role', sandbox),
    'مدير'
  );

  const adminResult = await vm.runInContext(
    "SafetyAPI.getAdminDashboard('1000000001')",
    sandbox
  );
  assert.strictEqual(adminResult.success, true);
  const requestUrl = new URL(lastRequest.url);
  assert.strictEqual(
    requestUrl.searchParams.get('action'),
    'getAdminDashboard'
  );
  assert.strictEqual(
    requestUrl.searchParams.get('nationalId'),
    '1000000001'
  );

  const appSource = fs.readFileSync(
    __dirname + '/../safety-dashboard/js/app.js',
    'utf8'
  );
  assert.match(
    appSource,
    /function loadDashboardForSession\(session\)/
  );
  assert.match(
    appSource,
    /session\?\.role === 'مدير'[\s\S]*return loadAdminDashboard\(session\)/
  );
  assert.match(
    appSource,
    /session\?\.role === 'مشرف'[\s\S]*return loadSupervisorSchools\(session\)/
  );
  assert.match(
    appSource,
    /await loadDashboardForSession\([\s\n]*session/
  );
  assert.match(
    appSource,
    /SafetyAuth\.logout\(\);[\s\S]*clearAdminState\(\)/
  );

  const dashboardHtmlPath =
    __dirname + '/../dashboard.html';

  assert.ok(
    dashboardHtmlPath,
    'Dashboard HTML file is missing'
  );

  const html = fs.readFileSync(
    dashboardHtmlPath,
    'utf8'
  );
  const ids = Array.from(
    html.matchAll(/\sid="([^"]+)"/g),
    match => match[1]
  );
  assert.strictEqual(
    new Set(ids).size,
    ids.length,
    'HTML IDs must remain unique'
  );

  const schoolPortalHtml = fs.readFileSync(
    __dirname + '/../index.html',
    'utf8'
  );
  const schoolPortalIds = Array.from(
    schoolPortalHtml.matchAll(/\sid="([^"]+)"/g),
    match => match[1]
  );
  assert.strictEqual(
    new Set(schoolPortalIds).size,
    schoolPortalIds.length,
    'School portal HTML IDs must remain unique'
  );
  assert.match(
    schoolPortalHtml,
    /id="systemInstructionsModal"[\s\S]*role="dialog"[\s\S]*aria-modal="true"/
  );
  assert.match(
    schoolPortalHtml,
    /id="instructionsReadCheckbox"[\s\S]*id="instructionsConfirmButton"[\s\S]*disabled/
  );
  assert.match(
    schoolPortalHtml,
    /showSystemInstructions\(\{[\s\S]*school: authenticatedSchool[\s\S]*achievement: result\.data\.achievement/
  );
  assert.match(
    schoolPortalHtml,
    /instructionsConfirmButton\.addEventListener\([\s\S]*sessionStorage\.setItem\([\s\S]*openDashboard\(/
  );
  assert.match(
    schoolPortalHtml,
    /\.instructions-content\s*\{[\s\S]*?min-height:\s*0;[\s\S]*?overflow-y:\s*auto;/
  );
  assert.match(
    schoolPortalHtml,
    /@media \(max-width: 600px\)[\s\S]*?\.instructions-dialog\s*\{[\s\S]*?height:\s*100%;[\s\S]*?max-height:\s*100%;/
  );
  const inlineScripts = Array.from(
    schoolPortalHtml.matchAll(
      /<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g
    ),
    match => match[1]
  ).filter(Boolean);

  inlineScripts.forEach(script => {
    // Syntax validation only; browser globals are not executed.
    new Function(script);
  });

  assert.match(
    schoolPortalHtml,
    /action=getSchoolDashboard&number=/
  );
  assert.match(
    schoolPortalHtml,
    /function refreshSchoolDashboardData\(\)/
  );
  assert.doesNotMatch(
    schoolPortalHtml,
    /await loadReports\(\);\s*await loadAchievement\(\);/
  );

  vm.runInContext('SafetyAuth.logout()', sandbox);
  assert.strictEqual(storage.size, 0);

  console.log(
    'Frontend passed: roles, sessions, admin route, unified school refresh, syntax, logout cleanup, unique IDs'
  );
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
