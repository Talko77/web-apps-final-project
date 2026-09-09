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
  const angle = pick(ANGLES[category] || ['newsroom update']);
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
      const firstPublish = new Date(Date.now() - rand(2, 30) * DAY);
      doc.publishedAt = firstPublish;
      doc.publishEvents = [firstPublish];

      // Every tenth article received several post-publication updates
      let revision = 1;
      if (i % 10 === 0) {
        const updates = rand(1, 3);
        for (let u = 1; u <= updates; u++) {
          doc.publishEvents.push(new Date(firstPublish.getTime() + u * rand(12, 48) * HOUR));
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
        createdAt: new Date(article.publishedAt.getTime() + rand(1, 200) * HOUR)
      });
    }
  });
  await Comment.insertMany(comments);
  console.log(`Created ${comments.length} comments`);

  // Hourly view data for the first 40 articles that received an update.
  // Views spike around each publish event so the graph shows the impact of
  // an update before and after the approval point.
  const updated = published.filter(a => a.publishEvents.length > 1).slice(0, 40);
  const buckets = [];
  const HOURS_BACK = 21 * 24;

  for (const article of updated) {
    const events = article.publishEvents.map(d => new Date(d).getTime());
    let total = 0;

    for (let h = HOURS_BACK; h >= 0; h--) {
      const ts = Analytics.hourBucket(Date.now() - h * HOUR);
      const t = ts.getTime();
      if (t < new Date(article.publishedAt).getTime()) continue;

      // Natural decay of attention from the moment of publication
      const hoursSincePublish = (t - events[0]) / HOUR;
      let views = Math.max(3, Math.round(120 / (1 + hoursSincePublish / 24)));

      // Spike in the 24 hours following each approved update
      for (const evt of events.slice(1)) {
        const delta = (t - evt) / HOUR;
        if (delta >= 0 && delta <= 24) views += Math.round(250 / (1 + delta / 4));
      }

      views += rand(-5, 15);
      views = Math.max(0, views);
      total += views;
      buckets.push({ article: article._id, timestamp: ts, viewsCount: views });
    }

    // The running counter must agree with the sum of the buckets,
    // otherwise sorting by popularity would be wrong.
    await Article.updateOne({ _id: article._id }, { $set: { totalViews: total } });
  }

  await Analytics.insertMany(buckets);
  console.log(`Created ${buckets.length} view buckets for ${updated.length} articles`);

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
