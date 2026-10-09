// Database seeding script: populates demo newsroom staff, categorized articles across workflow states, comments, and analytics buckets.
require('dotenv').config();

const mongoose = require('mongoose');
const User = require('./models/User');
const Article = require('./models/Article');
const Comment = require('./models/Comment');
const Analytics = require('./models/Analytics');
const { CATEGORIES, STATUS, ROLES } = require('./config/constants');
const { MONGO_URI } = require('./config/db');

const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;
const TOTAL_ARTICLES = 500;
const DEMO_PASSWORD = '123456';

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = arr => arr[rand(0, arr.length - 1)];

const REPORTERS = [
  { username: 'reporter1', displayName: 'Elena Vasquez' },
  { username: 'reporter2', displayName: 'Marcus Bell' },
  { username: 'reporter3', displayName: 'Priya Raman' },
  { username: 'reporter4', displayName: 'Jonah Keller' }
];

const EDITORS = [
  { username: 'editor1', displayName: 'Sarah Chen' },
  { username: 'editor2', displayName: 'Daniel Okafor' }
];

const COMMENT_TEXTS = [
  'Genuinely useful breakdown, thanks for the reporting.',
  'I am not convinced by the conclusion, but the data matters.',
  'Any chance of a follow-up with more detail on this?',
  'Finally someone covering this properly.',
  'The headline oversells what the article actually says.',
  'Shared this with colleagues, very relevant right now.',
  'There is an error in the third paragraph worth checking.',
  'Appreciate the thorough sourcing here.'
];

const COMMENTER_NAMES = ['Guest', 'A. Reader', 'Noa', 'Ethan', 'S. Gold', 'Ruth', 'Danny'];

const IMAGES = [
  'https://picsum.photos/seed/news1/800/500',
  'https://picsum.photos/seed/news2/800/500',
  'https://picsum.photos/seed/news3/800/500',
  'https://picsum.photos/seed/news4/800/500',
  'https://picsum.photos/seed/news5/800/500',
  'https://picsum.photos/seed/news6/800/500'
];

// Headline fragments per category, so seeded titles read like real copy
// instead of all sharing one template.
const ANGLES = {
  World: ['border talks resume', 'aid convoy reaches the region', 'election monitors report'],
  Business: ['quarterly earnings surprise', 'merger clears review', 'supply chain costs ease'],
  Technology: ['chip supply shifts', 'platform opens its API', 'security flaw disclosed'],
  Science: ['trial results published', 'telescope captures new data', 'study revises estimate'],
  Culture: ['festival lineup announced', 'retrospective opens', 'debut novel draws praise'],
  Sports: ['late goal decides the tie', 'transfer window closes', 'season record broken'],
  Opinion: ['the case for patience', 'why the numbers mislead', 'a policy worth rethinking']
};

function buildContent(i, category, revision) {
  // Fixed per article, so every revision of a story keeps the same headline
  const angles = ANGLES[category] || ['newsroom update'];
  const angle = angles[i % angles.length];
  const suffix = revision > 1 ? ` (Update ${revision - 1})` : '';
  return {
    title: `${category}: ${angle} — report ${i}${suffix}`,
    summary: `A short summary of report ${i} covering ${category.toLowerCase()}, outlining the key points before the main story.`,
    content: [
      `This is report number ${i}, filed to the ${category} desk.`,
      revision > 1 ? `The story has been updated ${revision - 1} time(s) since it was first published.` : '',
      'The body carries several paragraphs so the page reflects realistic content and the reading column can be assessed at different screen sizes.',
      'This paragraph exists to exercise the measure of the reading column and the typographic hierarchy on the article page.',
      'All figures in this article are demonstration data and do not refer to real events.'
    ].filter(Boolean).join('\n\n'),
    category,
    imageUrl: pick(IMAGES)
  };
}

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  await Promise.all([
    User.deleteMany({}),
    Article.deleteMany({}),
    Comment.deleteMany({}),
    Analytics.deleteMany({})
  ]);
  console.log('Cleared previous data');

  // create() rather than insertMany() so the password hashing hook runs
  const reporters = await User.create(
    REPORTERS.map(r => ({ ...r, password: DEMO_PASSWORD, role: ROLES.REPORTER }))
  );
  const editors = await User.create(
    EDITORS.map(e => ({ ...e, password: DEMO_PASSWORD, role: ROLES.EDITOR }))
  );
  console.log(`Created ${reporters.length} reporters and ${editors.length} editors`);

  // State spread: 400 published, 40 pending, 30 returned, 30 draft.
  // Among the published ones, some carry several approved updates and some
  // have a further update still waiting for the editor.
  const docs = [];
  for (let i = 1; i <= TOTAL_ARTICLES; i++) {
    const category = CATEGORIES[i % CATEGORIES.length];
    const reporter = reporters[i % reporters.length]._id;

    let status = STATUS.DRAFT;
    let isPublished = false;

    if (i <= 400) { status = STATUS.PUBLISHED; isPublished = true; }
    else if (i <= 440) status = STATUS.PENDING;
    else if (i <= 470) status = STATUS.RETURNED;

    const doc = {
      reporter,
      status,
      isPublished,
      editorNote: status === STATUS.RETURNED
        ? 'Please tighten the headline and add a source for the figure in the second paragraph.'
        : '',
      publishEvents: [],
      totalViews: 0,
      draftVersion: buildContent(i, category, 1),
      publishedVersion: null,
      publishedAt: null
    };

    if (isPublished) {
      // Every tenth article received several post-publication updates
      const hasUpdates = i % 10 === 0;

      // Updated articles are first published inside the 3-week analytics window,
      // so the chart shows the original publication and every update marker.
      const firstPublish = new Date(Date.now() - (hasUpdates ? rand(5, 20) : rand(2, 30)) * DAY);
      doc.publishedAt = firstPublish;
      doc.publishEvents = [firstPublish];

      let revision = 1;
      if (hasUpdates) {
        // Updates are spread evenly between the first publication and a recent last
        // update (2-48 hours ago), so no approval point lies in the future.
        const updates = rand(2, 3); // "several" updates, so never just one
        const lastUpdate = Date.now() - rand(2, 48) * HOUR;
        const step = (lastUpdate - firstPublish.getTime()) / updates;
        for (let u = 1; u <= updates; u++) {
          doc.publishEvents.push(new Date(firstPublish.getTime() + u * step));
        }
        revision = updates + 1;
      }

      doc.publishedVersion = buildContent(i, category, revision);
      doc.draftVersion = doc.publishedVersion;
      doc.totalViews = rand(50, 8000);

      // Every 25th article is a published story with an update awaiting approval.
      // publishedVersion stays public while the new draft is under review.
      if (i % 25 === 0) {
        doc.status = STATUS.PENDING;
        doc.draftVersion = buildContent(i, category, revision + 1);
      }
    }

    docs.push(doc);
  }

  const articles = await Article.insertMany(docs);
  console.log(`Created ${articles.length} articles`);

  const published = articles.filter(a => a.isPublished);

  // Comments on half of the published articles
  const comments = [];
  published.forEach((article, idx) => {
    if (idx % 2 !== 0) return;
    for (let c = 0; c < rand(1, 6); c++) {
      comments.push({
        article: article._id,
        authorName: pick(COMMENTER_NAMES),
        content: pick(COMMENT_TEXTS),
        // Never later than now, so no comment is dated in the future
        createdAt: new Date(Math.min(article.publishedAt.getTime() + rand(1, 200) * HOUR, Date.now()))
      });
    }
  });
  await Comment.insertMany(comments);
  console.log(`Created ${comments.length} comments`);

  // Hourly view data for EVERY published article, so the Impact Analytics chart has data
  // whichever article the editor picks. Views decay from the moment of publication, and
  // spike in the 24 hours after each approved update so the chart shows the impact of an
  // update before and after the approval point. Each article gets its own popularity
  // level, so the totals (and the popularity sort) differ between articles.
  const HOURS_BACK = 21 * 24;
  const BATCH = 10000;
  let bucketCount = 0;
  let buckets = [];

  const flushBuckets = async () => {
    if (!buckets.length) return;
    await Analytics.insertMany(buckets);
    bucketCount += buckets.length;
    buckets = [];
  };

  for (const article of published) {
    const events = article.publishEvents.map(d => new Date(d).getTime());
    const popularity = 0.2 + Math.random() * 1.3;
    let total = 0;

    for (let h = HOURS_BACK; h >= 0; h--) {
      const ts = Analytics.hourBucket(Date.now() - h * HOUR);
      const t = ts.getTime();
      if (t < new Date(article.publishedAt).getTime()) continue;

      const hoursSincePublish = (t - events[0]) / HOUR;
      let views = Math.max(3, Math.round((120 * popularity) / (1 + hoursSincePublish / 24)));

      for (const evt of events.slice(1)) {
        const delta = (t - evt) / HOUR;
        if (delta >= 0 && delta <= 24) views += Math.round((250 * popularity) / (1 + delta / 4));
      }

      views = Math.max(0, views + rand(-5, 15));
      total += views;
      buckets.push({ article: article._id, timestamp: ts, viewsCount: views });
      if (buckets.length >= BATCH) await flushBuckets();
    }

    // The running counter must agree with the sum of the buckets,
    // otherwise sorting by popularity would be wrong.
    article.totalViews = total;
  }
  await flushBuckets();

  // Realistic created / updated times. insertMany stamps every document with "now", which
  // would make every article look edited at the moment of seeding and hide the real order.
  const now = Date.now();
  await Article.bulkWrite(articles.map(a => {
    const lastEvent = a.publishEvents.length ? new Date(a.publishEvents[a.publishEvents.length - 1]).getTime() : null;
    const createdAt = a.isPublished
      ? new Date(a.publishedAt.getTime() - rand(1, 48) * HOUR)
      : new Date(now - rand(2, 10) * DAY);
    // A published article with an update waiting was edited most recently
    const updatedAt = a.isPublished
      ? new Date(a.status === STATUS.PENDING ? now - rand(1, 48) * HOUR : lastEvent)
      : new Date(Math.min(createdAt.getTime() + rand(1, 72) * HOUR, now));
    const set = { createdAt, updatedAt };
    if (a.isPublished) set.totalViews = a.totalViews;
    return { updateOne: { filter: { _id: a._id }, update: { $set: set } } };
  }), { timestamps: false });
  console.log(`Created ${bucketCount} view buckets for ${published.length} articles`);

  console.log('\nDemo users (password for all: %s)', DEMO_PASSWORD);
  [...REPORTERS, ...EDITORS].forEach(u => console.log(`  ${u.username} - ${u.displayName}`));

  await mongoose.connection.close();
  console.log('\nSeeding complete');
}

seed().catch(async err => {
  console.error('Seeding failed:', err);
  await mongoose.connection.close();
  process.exit(1);
});
