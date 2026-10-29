const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test, before, after } = require('node:test');

// Pass PLAYWRIGHT_MODULE when the package is supplied by a workspace runtime.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(__dirname, '../..');
const output = process.env.BRANDING_SCREENSHOT_DIR;
const companyA = '11111111-1111-4111-8111-111111111111';
const companyB = '22222222-2222-4222-8222-222222222222';
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');
let browser, base;

before(async () => {
  // All requests are fulfilled from disk; no external network or account is used.
  base = 'https://xrmovi.test';
  browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_EXECUTABLE ? { executablePath: process.env.CHROMIUM_EXECUTABLE } : {}) });
});

after(async () => {
  await browser?.close();
});

async function open({ role = 'owner', existing = false, viewport = { width: 1440, height: 1000 } } = {}) {
  const page = await browser.newPage({ viewport });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(({ role, existing, a, b, png64 }) => {
    const bytes = Uint8Array.from(atob(png64), character => character.charCodeAt(0));
    const state = window.brandingTest = {
      uploads: [], saves: [], downloads: [], downloadsCompleted: 0, databaseError: false, uploadError: false, downloadError: false,
      holdUpload: false, holdDownload: false,
      companies: [
        { id: a, name: 'Empresa de Teste — Operação e Transportes', role, logo_path: existing ? a + '/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.png' : null, logo_url: existing ? 'https://example.test/logo.png' : null },
        { id: b, name: 'Segunda Empresa', role: 'viewer', logo_path: null, logo_url: null }
      ]
    };
    const today=new Date().toLocaleDateString('en-CA'),old='2020-01-01';
    state.costRequests=[];state.costError=false;state.costMultiplier=1;state.fixture={vehicles:[{id:'v1',plate:'AAA1111',category:'Leve',contract_id:'c1',status:'Ativo',odometer_value:100},{id:'v2',plate:'BBB2222',category:'Caminhão',contract_id:'c2',status:'Manutenção',odometer_value:100}],maintenance:[{id:'m1',vehicle_id:'v1',plate:'AAA1111',title:'Revisão A',due_date:old,status:'open',created_at:today},{id:'m2',vehicle_id:'v2',plate:'BBB2222',title:'Revisão B',due_date:old,status:'open',created_at:today}],fuel:[{vehicle_id:'v1',fueled_on:today,liters:10,total_cost:100},{vehicle_id:'v2',fueled_on:today,liters:20,total_cost:200}]};
    state.client = {
      auth: { getUser: async () => ({ data: { user: { id: 'test-user' } } }) },
      rpc: async (name, args) => {
        if(name==='xrmovi_my_vehicles')return {data:state.fixture.vehicles};
        if(name==='xrmovi_maintenance_list')return {data:state.fixture.maintenance};
        if(name==='xrmovi_contracts_list')return {data:[{id:'c1',name:'Contrato A'},{id:'c2',name:'Contrato B'}]};
        if(name==='xrmovi_my_vehicle_documents')return {data:[{name:args.vid+' documento',path:'test.pdf'}]};
        if(name==='xrmovi_cost_report'){state.costRequests.push(args);if(state.costError)return {error:{message:'Falha de teste'}};return {data:{fuel:state.fixture.fuel.map(f=>({...f,total_cost:f.total_cost*state.costMultiplier})),maintenance:[{vehicle_id:'v1',actual_cost:50},{vehicle_id:'v2',actual_cost:75}]}};}
        if(name==='xrmovi_os_list')return {data:[{id:'o1',category:'frota',code:'OS1',title:'Troca óleo',status:'aberta',priority:'baixa'},{id:'o2',category:'frota',code:'OS2',title:'Pneus',status:'concluida',priority:'baixa'},{id:'o3',category:'predial',code:'OS3',title:'Predial legado',status:'aberta',priority:'baixa'}]};
        if(name==='xrmovi_operations_list')return {data:[{id:'p1',title:'Filtro de óleo',code:'P1',status:'aberto',quantity:2,min_quantity:3,cost:10},{id:'p2',title:'Pneu',code:'P2',status:'concluido',quantity:5,min_quantity:1,cost:100}]};
        if(name==='xrmovi_stock_history')return {data:[{created_at:'2026-10-29',kind:'entrada',quantity:2}]};
        if (name === 'xrmovi_my_companies') return { data: state.companies, error: null };
        if (name === 'xrmovi_company_logo_save') {
          state.saves.push(args);
          if (state.databaseError) return { data: null, error: { message: 'Banco indisponível' } };
          return { data: { id: args.cid, logo_path: args.p_path, logo_url: 'https://example.test/storage/' + args.p_path }, error: null };
        }
        if (name === 'xrmovi_financial_intelligence') return { data: { vehicles: [] }, error: null };
        if (name === 'xrmovi_cost_report') return { data: { fuel: [], maintenance: [] }, error: null };
        return { data: [], error: null };
      },
      storage: { from: bucket => ({
        upload: async (objectPath, file, options) => {
          state.uploads.push({ bucket, path: objectPath, type: file.type, size: file.size, options });
          if (state.holdUpload) await new Promise(resolve => state.releaseUpload = resolve);
          return { data: { path: objectPath }, error: state.uploadError ? { message: 'Storage indisponível' } : null };
        },
        download: async objectPath => {
          state.downloads.push(objectPath);
          if (state.holdDownload) await new Promise(resolve => state.releaseDownload = resolve);
          state.downloadsCompleted++;
          if (state.downloadError) return { data: null, error: { message: 'Download indisponível' } };
          return { data: new Blob([bytes], { type: 'image/png' }), error: null };
        }
      }) }
    };
  }, { role, existing, a: companyA, b: companyB, png64: png.toString('base64') });
  await page.route(base + '/**', route => {
    const relative = decodeURIComponent(new URL(route.request().url()).pathname).replace(/^\/+/, '');
    const filename = path.resolve(root, relative || 'v3/index.html');
    if (!filename.startsWith(root + path.sep)) return route.fulfill({ status: 403, body: '' });
    try {
      const contentType = ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' })[path.extname(filename)] || 'application/octet-stream';
      return route.fulfill({ contentType, body: fs.readFileSync(filename) });
    } catch { return route.fulfill({ status: 404, body: '' }); }
  });
  await page.route('https://esm.sh/**', route => route.fulfill({ contentType: 'text/javascript', headers: { 'Access-Control-Allow-Origin': '*' }, body: 'export const createClient = () => window.brandingTest.client;' }));
  await page.route('https://cdn.jsdelivr.net/**', route => route.fulfill({ contentType: 'text/javascript', body: `
    window.lucide = { createIcons() {
      document.querySelectorAll('i[data-lucide="pencil"]').forEach(icon => {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('fill', 'none');
        svg.setAttribute('stroke', 'currentColor');
        svg.setAttribute('stroke-width', '2');
        svg.setAttribute('aria-hidden', 'true');
        svg.innerHTML = '<path d="m16 3 5 5-12 12-6 1 1-6Z M14 5l5 5"/>';
        icon.replaceWith(svg);
      });
    } };
  ` }));
  await page.goto(base + '/v3/index.html');
  await page.waitForFunction(() => document.getElementById('company-name').textContent.startsWith('Empresa de Teste'));
  await page.waitForFunction(() => document.getElementById('v3-company'));
  return { page, errors };
}

async function selectFile(page, file = { name: 'logo.png', mimeType: 'image/png', buffer: png }) {
  const picker = page.waitForEvent('filechooser');
  await page.locator('#company-logo-edit').click();
  await (await picker).setFiles(file);
}

async function waitIdle(page) {
  await page.waitForFunction(() => document.getElementById('company-logo-area').getAttribute('aria-busy') === 'false');
}

test('fleet controls have no legacy modules or dead exports',async()=>{
 const {page,errors}=await open();await page.waitForSelector('#fleet-table-body tr');
 assert.equal(await page.locator('#view-quality,#analytics-toggle,#export-button,#table-next,#fleet-import-file').count(),0);
 assert.doesNotMatch(await page.locator('body').innerText(),/CPL|Somente leitura|senha master|Qualidade da Base/i);
 assert.equal(await page.locator('.fleet-breadcrumb #xrm-contract-filter').count(),1);
 assert.match(await page.locator('.fleet-main-nav').innerText(),/Relatórios financeiros/);
 await page.locator('[data-focus="maintenance"]').click();assert.equal(await page.locator('#maintenance-panel').isVisible(),true);
 assert.deepEqual(errors,[]);await page.close();
});

test('contract and combined filters scope KPIs charts alerts maintenance documents fuel and costs',async()=>{
 const {page,errors}=await open();await page.waitForFunction(()=>document.querySelectorAll('#vehicle-documents button').length===2);
 await page.selectOption('#xrm-contract-filter','c1');
 assert.equal(await page.locator('.fleet-kpi-value').first().textContent(),'1');
 assert.equal(await page.locator('#v3-situation-donut').innerText(),'1');
 assert.match(await page.locator('#fleet-table-body').innerText(),/AAA1111/);assert.doesNotMatch(await page.locator('#fleet-table-body').innerText(),/BBB2222/);
 assert.doesNotMatch(await page.locator('#alerts-content').innerText(),/Revisão B/);
 assert.doesNotMatch(await page.locator('#v3-maintenance-list').innerText(),/Revisão B/);
 assert.equal(await page.locator('#vehicle-documents button').count(),1);
 assert.equal(await page.locator('#fleet-fuel-records tbody tr').count(),1);
 assert.match(await page.locator('#xrm-contract-finance').innerText(),/150,00/);
 await page.selectOption('#xrm-filter-category','Caminhão');assert.equal(await page.locator('.fleet-kpi-value').first().textContent(),'0');assert.equal(await page.locator('#fleet-fuel-records tbody tr').count(),0);
 await page.locator('#xrm-clear-filters').click();assert.equal(await page.locator('#xrm-contract-filter').inputValue(),'');assert.equal(await page.locator('.fleet-kpi-value').first().textContent(),'2');
 await page.locator('#fleet-search').fill('BBB2222');await page.locator('[data-view="history"]').click();assert.doesNotMatch(await page.locator('#history-content').innerText(),/AAA1111/);assert.match(await page.locator('#history-content').innerText(),/BBB2222/);
 assert.deepEqual(errors,[]);await page.close();
});

test('order search updates counters and excludes unrelated categories without deleting records',async()=>{
 const {page,errors}=await open();await page.goto(base+'/v3/os.html');await page.waitForFunction(()=>document.querySelectorAll('#rows tr').length===2);
 assert.equal(await page.locator('#total').innerText(),'2');assert.equal(await page.locator('#category').count(),0);assert.doesNotMatch(await page.locator('body').innerText(),/Predial legado|Patrimônio|Help Desk/);
 await page.locator('#search').fill('Pneus');assert.equal(await page.locator('#total').innerText(),'1');assert.equal(await page.locator('#done').innerText(),'1');assert.equal(await page.locator('#open').innerText(),'0');
 assert.deepEqual(errors,[]);await page.close();
});

test('financial period reloads both costs and records; failure never retains another period totals',async()=>{
 const {page,errors}=await open();await page.waitForSelector('#fleet-fuel-records tbody tr');await page.selectOption('#xrm-contract-filter','c1');
 await page.evaluate(()=>{brandingTest.costMultiplier=3});
 await page.locator('#fuel-ranking-month').fill('2026-09');await page.locator('#fuel-ranking-month').dispatchEvent('change');
 await page.waitForFunction(()=>document.querySelector('#xrm-contract-finance').innerText.includes('350,00'));
 const args=await page.evaluate(()=>brandingTest.costRequests.at(-1));assert.equal(args.from_date,'2026-09-01');assert.equal(args.to_date,'2026-09-30');
 await page.evaluate(()=>{brandingTest.costError=true});await page.locator('#fuel-ranking-month').fill('2026-08');await page.locator('#fuel-ranking-month').dispatchEvent('change');
 await page.waitForFunction(()=>document.querySelector('#xrm-contract-finance').innerText.includes('Não foi possível'));
 assert.doesNotMatch(await page.locator('#xrm-contract-finance').innerText(),/350,00/);assert.equal(await page.locator('#fleet-fuel-records tbody tr').count(),0);
 assert.deepEqual(errors,[]);await page.close();
});

test('stock movements remain inside the warehouse and search scopes counters',async()=>{
 const {page,errors}=await open();await page.goto(base+'/v3/operacoes.html#movimentacoes');await page.waitForFunction(()=>document.querySelectorAll('#rows tr').length===2);
 assert.equal(await page.locator('#modules [data-module="movimentacoes"]').count(),0);assert.equal(await page.locator('#title').innerText(),'Estoque de peças');
 await page.locator('#search').fill('Pneu');assert.equal(await page.locator('#total').innerText(),'1');assert.equal(await page.locator('#attention').innerText(),'0');
 await page.getByText('Histórico de movimentações',{exact:true}).click();assert.match(await page.locator('dialog[open]').innerText(),/entrada/);
 assert.deepEqual(errors,[]);await page.close();
});

