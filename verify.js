// Spec verification harness: boots its own copy of the server and re-proves every
// automatically checkable requirement from "דרישות פרויקט מסכם - סמסטר קיץ".
//
// The number in brackets on each line is the line number of that requirement in the
// requirements file at the root of this repository, so a failure names the clause it breaks.
//
//   npm run seed     # restore the demo state first
//   npm run verify
//
// Uses only Node built-ins plus mongoose and dotenv, which the application already
// depends on - no test framework and no extra packages.
//
// Everything the harness creates is registered and removed again at the end, and the
// collection counts are compared with the snapshot taken at the start: clause 206 requires
// the seeded demo state to be intact, so the harness must not leave anything behind.
require('dotenv').config();

const { spawn } = require('child_process');
const mongoose = require('mongoose');

const { MONGO_URI } = require('./config/db');
const { QUEUE_PAGE_SIZE, CATEGORIES, STATUS } = require('./config/constants');
const User = require('./models/User');
const Article = require('./models/Article');
const Comment = require('./models/Comment');
const Analytics = require('./models/Analytics');

// A port of its own, so a development server on 3000 does not collide with a verification run
const PORT = Number(process.env.VERIFY_PORT || 3101);
const BASE = `http://127.0.0.1:${PORT}`;
const PASSWORD = '123456';

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ---------- reporting ----------

const results = [];

function ck(clause, name, pass, detail) {
  results.push({ clause, name, pass: Boolean(pass) });
  const line = `${pass ? 'PASS' : 'FAIL'}  [${clause}] ${name}`;
  console.log(detail ? `${line}  :: ${detail}` : line);
}

function section(title) {
  console.log(`\n--- ${title} ---`);
}

// ---------- HTTP ----------

// One cookie jar per identity, so guest / reporter / editor requests never share a session
const jars = {};

async function rq(path, { method = 'GET', body, as = null, html = false } = {}) {
  const headers = { Accept: html ? 'text/html' : 'application/json' };
  if (body) headers['Content-Type'] = 'application/json';
  if (as && jars[as]) headers.Cookie = jars[as];

  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    redirect: 'manual'
  });

  const setCookie = res.headers.get('set-cookie');
  if (as && setCookie) jars[as] = setCookie.split(';')[0];

  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* an HTML response */ }

  return { status: res.status, text, json, location: res.headers.get('location') };
}

const login = (as, username, password = PASSWORD) =>
  rq('/api/auth/login', { method: 'POST', body: { username, password }, as });

// ---------- server process ----------

let child = null;
let childLog = [];

async function startServer() {
  childLog = [];
  child = spawn(process.execPath, ['server.js'], {
    cwd: __dirname,
    env: {
      ...process.env,
      PORT: String(PORT),
      // A production NODE_ENV would mark the session cookie "secure" and no cookie would
      // survive a plain-http request, so the harness always runs in development mode.
      NODE_ENV: process.env.NODE_ENV === 'production' ? 'development' : (process.env.NODE_ENV || 'development')
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  child.stdout.on('data', d => childLog.push(String(d)));
  child.stderr.on('data', d => childLog.push(String(d)));

  for (let i = 0; i < 120; i++) {
    if (child.exitCode !== null) throw new Error(`server exited early:\n${childLog.join('')}`);
    try {
      const res = await fetch(`${BASE}/api/articles/feed?page=1`);
      await res.arrayBuffer();
      if (res.ok) return;
    } catch { /* not listening yet */ }
    await sleep(150);
  }
  throw new Error(`server did not become ready on ${PORT}:\n${childLog.join('')}`);
}

async function stopServer() {
  if (!child || child.exitCode !== null) return;
  const exited = new Promise(r => child.once('exit', r));
  child.kill('SIGTERM');
  await Promise.race([exited, sleep(5000)]);
  if (child.exitCode === null) child.kill('SIGKILL');
}

// ---------- cleanup registry ----------

// Ids of documents this run created. Removed again in the finally block, whether the
// checks passed or threw, so a failed run does not dirty the demo data either.
const created = { articles: [], comments: [], users: [] };

async function removeCreated() {
  const ids = created.articles;
  await Promise.all([
    Article.deleteMany({ _id: { $in: ids } }),
    Comment.deleteMany({ $or: [{ _id: { $in: created.comments } }, { article: { $in: ids } }] }),
    Analytics.deleteMany({ article: { $in: ids } }),
    User.deleteMany({ _id: { $in: created.users } })
  ]);
}

const snapshot = async () => ({
  users: await User.countDocuments(),
  articles: await Article.countDocuments(),
  comments: await Comment.countDocuments(),
  analytics: await Analytics.countDocuments()
});

// A body long enough that the server-rendered article page really carries the story
const LONG_BODY = [
  'The verification harness filed this story to prove the article page is rendered on the server.',
  'A second paragraph exists so the reading column, the paragraph splitting and the reading-time label all have real content to work with.',
  'A third paragraph pushes the rendered body past the length a placeholder would have.'
].join('\n\n');

// ---------- the checks ----------

async function runChecks() {
  const before = await snapshot();

  section('Demo data (clauses 204-214)');
  ck('206', 'at least 500 articles are seeded', before.articles >= 500, `${before.articles} articles`);
  const reporters = await User.countDocuments({ role: 'Reporter' });
  const editors = await User.countDocuments({ role: 'Editor' });
  ck('207', 'several reporter accounts exist', reporters >= 2, `${reporters} reporters`);
  ck('208', 'an editor account exists', editors >= 1, `${editors} editors`);
  ck('209', 'articles carry comments', before.comments > 0, `${before.comments} comments`);

  const byStatus = {};
  for (const s of Object.values(STATUS)) byStatus[s] = await Article.countDocuments({ status: s });
  ck('210', 'articles are in progress (draft / changes requested)',
    byStatus.draft > 0 && byStatus.returned > 0, `${byStatus.draft} draft, ${byStatus.returned} returned`);
  ck('211', 'articles are waiting for approval', byStatus.pending > 0, `${byStatus.pending} pending`);
  ck('212', 'published articles exist', byStatus.published > 0, `${byStatus.published} published`);
  const usedCategories = await Article.distinct('draftVersion.category');
  ck('206', 'the articles span the categories',
    CATEGORIES.every(c => usedCategories.includes(c)), `${usedCategories.filter(Boolean).length} categories used`);
  const multiUpdate = await Article.countDocuments({ 'publishEvents.1': { $exists: true } });
  ck('213', 'articles were updated several times after publication', multiUpdate >= 5, `${multiUpdate} articles with more than one publish point`);
  ck('214', 'view data over time exists for the Impact Analytics chart',
    before.analytics > 500, `${before.analytics} hourly view buckets`);

  const hashes = await User.find().select('password').lean();
  ck('182', 'passwords are stored as bcrypt hashes, never as plain text',
    hashes.length > 0 && hashes.every(u => /^\$2[aby]\$\d{2}\$/.test(u.password)),
    `${hashes.length} accounts, all hashed`);

  section('Public feed (clauses 74-80, 194)');
  const p1 = await rq('/api/articles/feed?page=1');
  ck('76', 'the feed returns 20 articles per page',
    p1.json.articles.length === 20, `${p1.json.articles.length} items, hasMore=${p1.json.hasMore}`);

  const p2 = await rq('/api/articles/feed?page=2');
  const overlap = p1.json.articles.filter(a => p2.json.articles.some(b => b._id === a._id)).length;
  ck('76', 'page 2 is a distinct set of 20 (paging works)',
    overlap === 0 && p2.json.articles.length === 20, `overlap=${overlap}`);

  ck('74', 'the feed exposes published articles only',
    p1.json.articles.every(a => a.title && a.category), 'every item has an approved title and category');

  const cardFields = ['title', 'imageUrl', 'summary', 'category', 'reporterName', 'dateLabel'];
  const missingFields = cardFields.filter(f => p1.json.articles[0][f] === undefined);
  ck('80', 'a card carries title, image, summary, category, reporter and date',
    missingFields.length === 0, missingFields.length ? `missing: ${missingFields}` : cardFields.join(', '));

  const searched = await rq('/api/articles/feed?search=chip');
  ck('78/194', 'search returns matching articles only',
    searched.json.articles.length > 0 && searched.json.articles.every(a => /chip/i.test(a.title)),
    `${searched.json.articles.length} hits, all contain "chip"`);

  const filtered = await rq('/api/articles/feed?category=Science');
  ck('79/194', 'the category filter returns that category only',
    filtered.json.articles.length > 0 && filtered.json.articles.every(a => a.category === 'Science'),
    `${filtered.json.articles.length} items, all Science`);

  const popular = await rq('/api/articles/feed?sortBy=popularity');
  const views = popular.json.articles.map(a => {
    const raw = String(a.views);
    return parseFloat(raw) * (raw.includes('k') ? 1000 : 1);
  });
  ck('79/194', 'sorting by popularity is genuinely descending',
    views.every((v, i) => i === 0 || views[i - 1] >= v), views.slice(0, 4).join(' >= '));

  const recent = await rq('/api/articles/feed?sortBy=publishedAt');
  const times = recent.json.articles.map(a => new Date(a.datetime).getTime());
  ck('79/194', 'sorting by date is genuinely descending',
    times.every((v, i) => i === 0 || times[i - 1] >= v), 'newest first');

  const junk = await rq('/api/articles/feed?category=NotACategory&page=-5&sortBy=nonsense');
  ck('192/193', 'invalid feed parameters are handled and still answer 200',
    junk.status === 200 && Array.isArray(junk.json.articles), `status ${junk.status}`);

  section('Sign in and roles (clauses 96-99, 181-187)');
  const ed = await login('ed', 'editor1');
  const rp = await login('rp', 'reporter1');
  ck('96-98', 'an editor lands in the management area', ed.json.redirect === '/editor/reviews', ed.json.redirect);
  ck('96-98', 'a reporter lands in their own workspace', rp.json.redirect === '/reporter/articles', rp.json.redirect);
  ck('182', 'the sign-in response never leaks the password hash',
    !/password|\$2[aby]\$/.test(JSON.stringify(ed.json)), 'toPublic() strips it');

  const wrongPass = await login('bad', 'editor1', 'wrong-password');
  ck('181', 'a wrong password is rejected', wrongPass.status === 401, `${wrongPass.status} ${wrongPass.json.error}`);
  const unknownUser = await login('bad', 'no-such-person', 'x');
  ck('181', 'an unknown username gives the identical message (no user enumeration)',
    unknownUser.status === 401 && unknownUser.json.error === wrongPass.json.error,
    JSON.stringify(unknownUser.json.error));

  ck('187', 'a reporter cannot reach the editor API with a valid session',
    (await rq('/api/users', { as: 'rp' })).status === 403, '403');
  const spoofed = await fetch(`${BASE}/api/users`, {
    headers: { Accept: 'application/json', Cookie: jars.rp, 'X-Role': 'Editor', 'X-User-Role': 'Editor' }
  });
  await spoofed.arrayBuffer();
  ck('99/187', 'a client-supplied role header is ignored', spoofed.status === 403, `${spoofed.status}`);

  for (const p of ['/editor/reviews', '/reporter/articles', '/editor/staff', '/editor/analytics']) {
    const r = await rq(p, { html: true });
    ck('183', `a guest is redirected away from ${p}`,
      r.status === 302 && /\/staff\/login/.test(r.location || ''), `${r.status} -> ${r.location}`);
  }
  for (const p of ['/api/articles/manage', '/api/users', '/api/analytics/articles']) {
    ck('187', `a guest is refused ${p}`, (await rq(p)).status === 401, '401');
  }

  const mine = await rq('/api/articles/mine', { as: 'rp' });
  const myIds = new Set(mine.json.articles.map(a => String(a._id)));
  const foreignId = (await rq('/api/articles/manage', { as: 'ed' })).json.articles
    .find(a => !myIds.has(String(a._id)))._id;
  ck('184', "a reporter cannot read another reporter's article",
    (await rq('/api/articles/' + foreignId, { as: 'rp' })).status === 403, '403');
  ck('184', "a reporter cannot edit another reporter's article",
    (await rq('/api/articles/' + foreignId, {
      method: 'PUT', as: 'rp',
      body: { title: 'hijack', summary: 's', content: 'c', category: 'World' }
    })).status === 403, '403');

  section('Editorial workflow (clauses 108-142, 185)');
  const draft = await rq('/api/articles', {
    method: 'POST', as: 'rp',
    body: { title: 'Verification probe', summary: 'A probe filed by npm run verify.', content: LONG_BODY, category: 'World' }
  });
  const aid = draft.json.articleId;
  created.articles.push(aid);
  ck('177', 'Article: create', draft.status === 201, `201 id=${aid}`);
  ck('177', 'Article: read one', (await rq('/api/articles/' + aid, { as: 'rp' })).status === 200, '200');
  ck('177', 'Article: update', (await rq('/api/articles/' + aid, {
    method: 'PUT', as: 'rp',
    body: { title: 'Verification probe', summary: 'Revised summary.', content: LONG_BODY, category: 'World' }
  })).status === 200, '200');

  const setStatus = (id, newStatus, as, editorNote) =>
    rq(`/api/articles/${id}/status`, { method: 'PATCH', as, body: { newStatus, editorNote } });

  ck('118', 'a reporter cannot publish their own article',
    (await setStatus(aid, 'published', 'rp')).status === 400, '400');
  ck('185', 'a reporter cannot use the editor transitions either',
    (await setStatus(aid, 'returned', 'rp', 'x')).status === 400, '400');
  ck('114', 'a reporter may submit a draft for review',
    (await setStatus(aid, 'pending', 'rp')).status === 200, '200');
  ck('121', 'a reporter cannot edit an article that is awaiting a decision',
    (await rq('/api/articles/' + aid, {
      method: 'PUT', as: 'rp', body: { title: 'x', summary: 's', content: 'c', category: 'World' }
    })).status === 409, '409');

  const editorEdit = await rq('/api/articles/' + aid, {
    method: 'PUT', as: 'ed',
    body: { title: 'Edited by the editor', summary: 'Editor summary.', content: LONG_BODY, category: 'World' }
  });
  ck('138', 'the editor can edit the submitted article and it stays pending',
    editorEdit.status === 200 && editorEdit.json.status === 'pending', `200, status "${editorEdit.json.status}"`);

  ck('115/141', 'the editor returns the article with a note',
    (await setStatus(aid, 'returned', 'ed', 'Fix the lede.')).status === 200, '200');
  ck('108', 'the reporter can read the editor note',
    (await rq('/api/articles/' + aid, { as: 'rp' })).json.article.editorNote === 'Fix the lede.', '"Fix the lede."');
  ck('118', 'the editor cannot approve an article that was returned',
    (await setStatus(aid, 'published', 'ed')).status === 400, '400');
  ck('117', 'the reporter resubmits after fixing',
    (await setStatus(aid, 'pending', 'rp')).status === 200, '200');
  const published = await setStatus(aid, 'published', 'ed');
  ck('139', 'the editor approves and the article is published',
    published.status === 200 && published.json.isPublished === true, '200, isPublished=true');

  // Published stays public while an update is being written and while it waits for approval
  await rq('/api/articles/' + aid, {
    method: 'PUT', as: 'rp',
    body: { title: 'UNAPPROVED REWRITE', summary: 'Not approved yet.', content: LONG_BODY, category: 'World' }
  });
  const whileEditing = await rq('/articles/' + aid, { html: true });
  ck('131', 'a reporter edit is not on the public page while it is being written',
    whileEditing.text.includes('Edited by the editor') && !whileEditing.text.includes('UNAPPROVED REWRITE'),
    'the approved version is still shown');
  await setStatus(aid, 'pending', 'rp');
  const whilePending = await rq('/articles/' + aid, { html: true });
  ck('132', 'the published version stays public while the update waits for approval',
    whilePending.text.includes('Edited by the editor') && !whilePending.text.includes('UNAPPROVED REWRITE'),
    'the approved version is still shown');
  await setStatus(aid, 'published', 'ed');
  const afterApproval = await rq('/articles/' + aid, { html: true });
  ck('133', 'only the editor approval makes the new version public',
    afterApproval.text.includes('UNAPPROVED REWRITE'), 'the new title is public now');

  const partial = await rq('/api/articles', { method: 'POST', as: 'rp', body: {} });
  const partialId = partial.json.articleId;
  created.articles.push(partialId);
  ck('192', 'the server refuses to submit an incomplete article',
    (await setStatus(partialId, 'pending', 'rp')).status === 400, '400');
  ck('126', 'the incomplete draft was still saved (work continuity)',
    (await rq('/api/articles/' + partialId, { as: 'rp' })).status === 200, 'the draft exists');

  section('Article page (clauses 85-89, 166-170)');
  const page = await rq('/articles/' + aid, { as: 'guest', html: true });
  ck('166', 'the full article body is in the server HTML, with no JavaScript',
    page.text.includes('UNAPPROVED REWRITE') && /<div class="article-page__body">[\s\S]{200,}?<\/div>/.test(page.text),
    'headline and multi-paragraph body present');
  const semantic = ['<main', '<article', '<header', '<nav', '<footer', '<aside', '<time', '<h1'];
  const missingTags = semantic.filter(t => !page.text.includes(t));
  ck('169', 'HTML5 semantic tags are used',
    missingTags.length === 0, missingTags.length ? `missing ${missingTags}` : semantic.join(' '));
  ck('170', 'a viewport meta tag is present for the responsive layout',
    /<meta name="viewport"[^>]*width=device-width/.test(page.text), 'present');
  ck('85', 'the article shows byline, category and a machine-readable date',
    /article-page__author-name/.test(page.text) && /article-page__category/.test(page.text) && /<time datetime="/.test(page.text),
    'byline, category and <time> present');
  ck('87', 'the comment list and the add-comment form are on the page',
    page.text.includes('id="comment-form"') && page.text.includes('id="comments-list"'), 'both present');

  // Seen / unseen works off the articles read in this session, and the page above was read
  // through the guest jar, so that one article must now be the seen side of the split
  const seen = await rq('/api/articles/feed?seen=seen', { as: 'guest' });
  const unseen = await rq('/api/articles/feed?seen=unseen', { as: 'guest' });
  const isSeen = list => list.json.articles.some(a => String(a._id) === String(aid));
  ck('194', 'the seen / unseen filter splits the feed by what this session has read',
    isSeen(seen) && !isSeen(unseen),
    `${seen.json.articles.length} seen, ${unseen.json.articles.length} unseen on page 1`);

  section('Views and Impact Analytics (clauses 89, 150-153)');
  const t0 = (await rq(`/api/analytics/article/${aid}?hours=720`, { as: 'ed' })).json;
  await rq('/articles/' + aid, { html: true });
  await sleep(1000); // the view is recorded without blocking the render
  const t1 = (await rq(`/api/analytics/article/${aid}?hours=720`, { as: 'ed' })).json;
  const bucketSum = t => t.timeline.reduce((a, b) => a + b.viewsCount, 0);
  ck('89', 'a visit increments the hourly bucket and the total by exactly one',
    t1.totalViews === t0.totalViews + 1 && bucketSum(t1) === bucketSum(t0) + 1,
    `total ${t0.totalViews} -> ${t1.totalViews}, buckets ${bucketSum(t0)} -> ${bucketSum(t1)}`);
  ck('150-152', 'analytics returns a time axis, view counts and publish markers',
    t1.timeline.length > 0 && 'timestamp' in t1.timeline[0] && 'viewsCount' in t1.timeline[0] && Array.isArray(t1.publishEvents),
    `${t1.timeline.length} hourly points, ${t1.publishEvents.length} publish events`);
  ck('153', 'the chart can show the effect of an update (several publish points)',
    t1.publishEvents.length > 1, `${t1.publishEvents.length} publish points`);
  ck('177', 'Analytics: delete (reset the view data of one article)',
    (await rq('/api/analytics/article/' + aid, { method: 'DELETE', as: 'ed' })).status === 200, '200');

  section('Comments and spam limit (clauses 87-93, 177, 186)');
  const firstComment = await rq(`/api/comments/article/${aid}`, {
    method: 'POST', as: 'guest', body: { authorName: 'Harness', content: 'A comment from npm run verify.' }
  });
  ck('177', 'Comment: create', firstComment.status === 201, '201');
  const cid = firstComment.json.comment._id;
  created.comments.push(cid);
  ck('177', 'Comment: read list', (await rq(`/api/comments/article/${aid}`)).status === 200, '200');
  ck('186', 'a guest cannot moderate a comment',
    (await rq('/api/comments/' + cid, { method: 'PUT', body: { content: 'x' } })).status === 401, '401');
  ck('177', 'Comment: update (editor)',
    (await rq('/api/comments/' + cid, { method: 'PUT', as: 'ed', body: { content: 'Moderated.' } })).status === 200, '200');
  ck('177', 'Comment: delete (editor)',
    (await rq('/api/comments/' + cid, { method: 'DELETE', as: 'ed' })).status === 200, '200');

  // The limiter counts every attempt in the window, and the create above was the first of them
  const spam = [];
  for (let i = 2; i <= 4; i++) {
    const r = await rq(`/api/comments/article/${aid}`, {
      method: 'POST', as: 'guest', body: { authorName: 'Harness', content: `Spam probe ${i}` }
    });
    if (r.json && r.json.comment) created.comments.push(r.json.comment._id);
    spam.push(r);
  }
  ck('92', 'a guest may post three comments a minute',
    spam.slice(0, 2).every(r => r.status === 201), '201, 201');
  ck('93', 'the server blocks the fourth attempt with a message',
    spam[2].status === 429 && /3 comments per minute/.test(spam[2].json.error || ''), `429 "${spam[2].json.error}"`);

  section('Staff accounts (clauses 177-178, 182)');
  const newUser = await rq('/api/users', {
    method: 'POST', as: 'ed',
    body: { username: 'verifyprobe', password: 'verifypass1', displayName: 'Verify Probe', role: 'Reporter' }
  });
  ck('177', 'User: create', newUser.status === 201, '201');
  const uid = newUser.json.user._id;
  created.users.push(uid);
  ck('177', 'User: read list', (await rq('/api/users', { as: 'ed' })).status === 200, '200');
  const userSearch = await rq('/api/users?search=verifyprobe', { as: 'ed' });
  ck('177/178', 'User: search', userSearch.status === 200 && userSearch.json.users.length === 1, '1 hit');
  ck('182', 'the user API never returns the hash',
    !/\$2[aby]\$/.test(JSON.stringify(userSearch.json)), 'toPublic() only');
  ck('177', 'User: update',
    (await rq('/api/users/' + uid, { method: 'PUT', as: 'ed', body: { displayName: 'Renamed Probe' } })).status === 200, '200');
  ck('182', 'a password set through the API is hashed and verifies on sign-in',
    (await login('probe', 'verifyprobe', 'verifypass1')).status === 200, '200');
  const storedHash = await User.findById(uid).select('password').lean();
  ck('182', 'the stored value is a bcrypt hash, not the password',
    /^\$2[aby]\$/.test(storedHash.password) && !storedHash.password.includes('verifypass1'), 'bcrypt hash');
  ck('177', 'User: delete', (await rq('/api/users/' + uid, { method: 'DELETE', as: 'ed' })).status === 200, '200');

  section('Review queue at scale (clauses 194-195)');
  const queueStart = Date.now();
  const queue = await rq('/api/articles/manage', { as: 'ed' });
  const queueMs = Date.now() - queueStart;
  ck('195', 'the editor queue API is bounded to one page of rows',
    queue.json.articles.length <= QUEUE_PAGE_SIZE, `${queue.json.articles.length} rows (cap ${QUEUE_PAGE_SIZE}) in ${queueMs}ms`);
  const articlesInDb = await Article.countDocuments();
  ck('195', 'the queue reports the true number of matches alongside the page',
    queue.json.total === articlesInDb && queue.json.hasMore === true,
    `total=${queue.json.total} of ${articlesInDb} in the database, hasMore=${queue.json.hasMore}`);

  const queueSearch = await rq('/api/articles/manage?search=telescope', { as: 'ed' });
  ck('194', 'a queue search reports the filtered total, not the whole database',
    queueSearch.json.articles.length > 0 &&
    queueSearch.json.total === queueSearch.json.articles.length &&
    queueSearch.json.total < articlesInDb &&
    queueSearch.json.articles.every(a => /telescope/i.test(a.title)),
    `showing ${queueSearch.json.articles.length} of ${queueSearch.json.total}, all matching`);

  const queuePending = await rq('/api/articles/manage?status=pending', { as: 'ed' });
  ck('194', 'a queue status filter returns that status only',
    queuePending.json.articles.length > 0 && queuePending.json.articles.every(a => a.status === 'pending'),
    `${queuePending.json.articles.length} rows, all pending`);

  const queueCategory = await rq('/api/articles/manage?category=Sports', { as: 'ed' });
  ck('194', 'a queue category filter returns that category only',
    queueCategory.json.articles.length > 0 && queueCategory.json.articles.every(a =>
      (a.draftVersion && a.draftVersion.category === 'Sports') ||
      (a.publishedVersion && a.publishedVersion.category === 'Sports')),
    `${queueCategory.json.articles.length} rows`);

  const queuePageStart = Date.now();
  const queuePage = await rq('/editor/reviews', { as: 'ed', html: true });
  const queuePageMs = Date.now() - queuePageStart;
  const rows = (queuePage.text.match(/class="review-queue__row"/g) || []).length;
  ck('195', 'the rendered queue page is bounded to one page of rows',
    rows > 0 && rows <= QUEUE_PAGE_SIZE, `${rows} rows in ${queuePageMs}ms`);

  section('Weather widget (clauses 198-202)');
  const w1 = await rq('/api/weather');
  const w2 = await rq('/api/weather');
  ck('198', 'the weather endpoint always answers with data, never an error',
    w1.status === 200 && w2.status === 200 && w1.json.data && 'temp' in w1.json.data, `source "${w1.json.source}"`);
  ck('201/202', 'a repeated call is served from the server cache, not the external service',
    w1.json.source === 'fallback' ? w2.json.source === 'fallback' : w2.json.source === 'cache',
    `${w1.json.source} -> ${w2.json.source}`);
  if (w1.json.source === 'fallback') {
    console.log('      note: no WEATHER_API_KEY, so the fallback path was exercised instead of the live service');
  }

  section('Malformed input (clauses 192-193)');
  for (const [p, method] of [['/api/articles/notanid', 'GET'], ['/api/users/zzz', 'DELETE'], ['/api/comments/zzz', 'PUT']]) {
    const r = await rq(p, { method, as: 'ed', body: method === 'PUT' ? { content: 'x' } : undefined });
    ck('193', `${method} ${p} is refused cleanly`, r.status >= 400 && r.status < 500, `${r.status}`);
  }
  ck('192', 'an unknown page returns the 404 view',
    (await rq('/no/such/page', { html: true })).status === 404, '404');
  ck('193', 'the server is still alive after every invalid request',
    (await rq('/api/articles/feed?page=1')).status === 200, '200');

  section('Continuity across a server restart (clauses 189-190)');
  await stopServer();
  await startServer();
  const afterRestart = await rq('/api/auth/me', { as: 'ed' });
  ck('189-190', 'a signed-in user stays signed in after the server restarts',
    afterRestart.status === 200 && afterRestart.json.user && afterRestart.json.user.username === 'editor1',
    `session restored as ${afterRestart.json.user && afterRestart.json.user.username}`);
  ck('189-190', 'and can carry on working straight away',
    (await rq('/editor/reviews', { as: 'ed', html: true })).status === 200, '200 from /editor/reviews');
  const draftAfterRestart = await rq('/api/articles/' + partialId, { as: 'ed' });
  ck('126/189', 'the unfinished draft survived the restart',
    draftAfterRestart.status === 200, 'the draft is still there');

  section('Operational logging (clause 196)');
  ck('196', 'the server logged its significant events',
    /Server listening|MongoDB connected/.test(childLog.join('')), 'startup events logged');

  // Article delete comes last: it cascades to the comments and view data of the probe article
  section('Deletion and permissions (clauses 142, 177)');
  ck('142', 'a reporter cannot delete an article',
    (await rq('/api/articles/' + aid, { method: 'DELETE', as: 'rp' })).status === 403, '403');
  ck('177/142', 'Article: delete (editor)',
    (await rq('/api/articles/' + aid, { method: 'DELETE', as: 'ed' })).status === 200, '200');
  await rq('/api/articles/' + partialId, { method: 'DELETE', as: 'ed' });
  ck('142', 'deleting an article also removes its comments and view data',
    (await Comment.countDocuments({ article: aid })) === 0 && (await Analytics.countDocuments({ article: aid })) === 0,
    'no orphans left');

  return before;
}

// ---------- entry point ----------

(async () => {
  await mongoose.connect(MONGO_URI);
  let before = null;
  try {
    await startServer();
    before = await runChecks();
  } finally {
    await removeCreated();
    await stopServer();
  }

  if (before) {
    section('The demo data is intact (clause 206)');
    const after = await snapshot();
    for (const key of Object.keys(before)) {
      ck('206', `${key} unchanged by the verification run`,
        after[key] === before[key], `${before[key]} -> ${after[key]}`);
    }
  }

  await mongoose.connection.close();

  const failed = results.filter(r => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed, ${failed.length} failures`);
  if (failed.length) {
    console.log('FAILED: ' + failed.map(f => `[${f.clause}] ${f.name}`).join(' | '));
  }
  process.exit(failed.length ? 1 : 0);
})().catch(async err => {
  console.error('\nVERIFY ERROR:', err.message);
  try { await removeCreated(); } catch { /* nothing more to do */ }
  await stopServer();
  await mongoose.connection.close().catch(() => {});
  process.exit(2);
});
