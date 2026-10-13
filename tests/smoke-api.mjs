// Local-only browser fixture. It never calls the production API or persists data.
import { createServer } from 'node:http';

const org = '11111111-1111-4111-8111-111111111111';
const groups = Array.from({ length: 125 }, (_, index) => ({ id: `dealer-${index + 1}`, org_id: org, name: `Dealer ${String(index + 1).padStart(3, '0')}`, code: `DLR${index + 1}`, status: 'active' }));
const now = '2026-10-13T02:00:00Z';
const materials = [
  { id: 'material-1', title: 'Panduan audit 5R showroom', description: 'Standar pemeriksaan showroom untuk seluruh jaringan dealer. Pelajari panduan sebelum menjalankan inspeksi.', category: 'pdf', document_id: 'document-1', document_name: 'Panduan-Audit-5R.pdf', required: true, status: 'published', audience_type: 'all_dealers', assignee_group_ids: [], assignee_group_count: 125, read_count: 18 },
  { id: 'material-2', title: 'Video penanganan temuan kritis', description: 'Alur eskalasi dan pengumpulan evidence untuk temuan kritis.', category: 'video', external_url: 'https://example.com/training', required: false, status: 'published', audience_type: 'selected_dealers', assignee_group_ids: ['dealer-1', 'dealer-125'], assignee_group_count: 2, read_count: 4 },
  { id: 'material-3', title: 'Checklist kesiapan bengkel', description: 'Materi baru sedang dipersiapkan oleh Head Office.', category: 'checklist', external_url: 'https://example.com/checklist', required: true, status: 'draft', audience_type: 'all_dealers', assignee_group_ids: [], assignee_group_count: 125, read_count: 0 },
].map(item => ({ ...item, org_id: org, created_by_id: 'admin-demo', created_at: now, updated_at: now }));
const schedules = [{ id: 'schedule-1', org_id: org, title: 'Refresh SOP audit nasional', description: 'Pelatihan standar audit dan diskusi temuan lapangan.', starts_at: '2026-10-20T02:00:00Z', ends_at: '2026-10-20T04:00:00Z', trainer: 'Tim Head Office', location: 'Online', meeting_url: 'https://example.com/meeting', audience_type: 'all_dealers', status: 'published', assignee_group_ids: [], assignee_group_count: 125, created_by_id: 'admin-demo', created_at: now, updated_at: now }];

const server = createServer(async (request, response) => {
  response.setHeader('Access-Control-Allow-Origin', 'http://localhost:4173');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.setHeader('Content-Type', 'application/json');
  if (request.method === 'OPTIONS') { response.end(); return; }
  const url = new URL(request.url, 'http://127.0.0.1:4174');
  const dealer = request.headers.authorization?.includes('dealer-demo');
  const user = { id: dealer ? 'dealer-demo' : 'admin-demo', org_id: org, name: dealer ? 'Dealer Demo' : 'Admin Demo', email: 'demo@example.test', username: dealer ? 'dealer-demo' : 'admin-demo', role_name: dealer ? 'inspector' : 'platform_admin', groups: dealer ? [groups[0]] : [], permissions: [] };
  const send = (data, status = 200) => { response.statusCode = status; response.end(JSON.stringify({ success: status < 400, data })); };
  const paginated = (items) => {
    const search = (url.searchParams.get('search') ?? '').toLowerCase();
    const category = url.searchParams.get('category');
    const status = url.searchParams.get('status');
    const filtered = items.filter(item => `${item.title ?? item.name} ${item.description ?? ''}`.toLowerCase().includes(search) && (!category || item.category === category) && (!status || item.status === status));
    const page = Number(url.searchParams.get('page') || 1);
    const limit = Number(url.searchParams.get('limit') || 20);
    response.end(JSON.stringify({ success: true, data: filtered.slice((page - 1) * limit, page * limit), meta: { total: filtered.length, page, limit } }));
  };
  if (url.pathname === '/auth/login') {
    let body = '';
    for await (const chunk of request) body += chunk;
    const identifier = JSON.parse(body).identifier;
    send({ access_token: identifier === 'dealer-demo' ? 'dealer-demo-local-fixture' : 'admin-demo-local-fixture', refresh_token: 'fixture-only' });
  } else if (url.pathname === '/users/me') send(user);
  else if (url.pathname.startsWith('/auth/')) send({});
  else if (url.pathname === '/groups') paginated(groups);
  else if (url.pathname.endsWith('/content')) send({ url: 'https://example.com/training', file_name: 'Panduan-Audit-5R.pdf' });
  else if (url.pathname.endsWith('/read')) {
    const material = materials.find(item => url.pathname.includes(item.id));
    if (material) material.read_at = new Date().toISOString();
    send({ read_at: material?.read_at });
  } else if (url.pathname === '/training/materials' && request.method === 'GET') paginated(materials.filter(item => !dealer || item.status === 'published'));
  else if (url.pathname === '/training/schedules' && request.method === 'GET') paginated(schedules);
  else if (url.pathname === '/notifications/unread-count') send({ count: 0 });
  else if (url.pathname === '/notifications') send([]);
  else if (url.pathname.startsWith('/dashboard')) send({});
  else if (url.pathname.startsWith('/training') || url.pathname.startsWith('/documents')) send({ message: 'Use automated tests for fixture mutations.' }, 400);
  else send([]);
});

server.listen(4174, '127.0.0.1', () => console.log('Local Training fixture API: http://127.0.0.1:4174 (admin-demo / dealer-demo; any local fixture password)'));
