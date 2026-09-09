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
  { username: 'reporter1', displayName: 'דנה לוי' },
  { username: 'reporter2', displayName: 'יוסי מזרחי' },
  { username: 'reporter3', displayName: 'מיכל אברהם' },
  { username: 'reporter4', displayName: 'אורי שגב' }
];

const EDITORS = [
  { username: 'editor1', displayName: 'רונית כהן' },
  { username: 'editor2', displayName: 'אלון ברק' }
];

const COMMENT_TEXTS = [
  'כתבה מעניינת מאוד, תודה על הסקירה.',
  'לא בטוח שאני מסכים עם המסקנה, אבל הנתונים חשובים.',
  'אפשר לקבל הרחבה על הנושא הזה?',
  'סוף סוף מישהו כותב על זה בצורה רצינית.',
  'הכותרת מטעה ביחס לתוכן.',
  'שיתפתי עם חברים, רלוונטי מאוד.',
  'יש טעות בפסקה השלישית, כדאי לבדוק.',
  'תודה על העבודה היסודית.'
];

const COMMENTER_NAMES = ['אורח', 'קורא מתל אביב', 'נועה', 'איתי', 'ש. גולן', 'רותי', 'דני'];

const IMAGES = [
  'https://picsum.photos/seed/news1/800/500',
  'https://picsum.photos/seed/news2/800/500',
  'https://picsum.photos/seed/news3/800/500',
  'https://picsum.photos/seed/news4/800/500',
  'https://picsum.photos/seed/news5/800/500',
  'https://picsum.photos/seed/news6/800/500'
];

function buildContent(i, category, revision) {
  const suffix = revision > 1 ? ` (עדכון ${revision - 1})` : '';
  return {
    title: `${category}: דיווח מיוחד מספר ${i}${suffix}`,
    summary: `תקציר כתבה ${i} בתחום ${category}. סקירה קצרה של העיקר לפני הכניסה לגוף הכתבה.`,
    content: [
      `זו כתבה מספר ${i} בקטגוריית ${category}.`,
      revision > 1 ? `הכתבה עודכנה ${revision - 1} פעמים לאחר הפרסום הראשוני.` : '',
      'גוף הכתבה מכיל מספר פסקאות כדי לדמות תוכן אמיתי ולבחון את קריאות העמוד במסכים שונים.',
      'הפסקה הזו קיימת כדי לבדוק את רוחב עמודת הקריאה ואת ההיררכיה הטיפוגרפית בעמוד הכתבה.',
      'לסיום, הנתונים בכתבה זו הם נתוני הדגמה בלבד ואינם מתייחסים לאירועים אמיתיים.'
    ].filter(Boolean).join('\n\n'),
    category,
    imageUrl: pick(IMAGES)
  };
}

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('התחברות למסד הנתונים הצליחה');

  await Promise.all([
    User.deleteMany({}),
    Article.deleteMany({}),
    Comment.deleteMany({}),
    Analytics.deleteMany({})
  ]);
  console.log('נתונים קודמים נמחקו');

  // create() ולא insertMany() כדי שה-hook שמגבב את הסיסמה ירוץ
  const reporters = await User.create(
    REPORTERS.map(r => ({ ...r, password: DEMO_PASSWORD, role: ROLES.REPORTER }))
  );
  const editors = await User.create(
    EDITORS.map(e => ({ ...e, password: DEMO_PASSWORD, role: ROLES.EDITOR }))
  );
  console.log(`נוצרו ${reporters.length} כתבים ו-${editors.length} עורכים`);

  // התפלגות המצבים: 400 פורסמו, 40 ממתינות, 30 הוחזרו, 30 בהכנה,
  // ומתוך המפורסמות חלק עם עדכון שממתין לאישור וחלק עם מספר עדכונים.
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
      editorNote: status === STATUS.RETURNED ? 'נא לחדד את הכותרת ולהוסיף מקור לנתון בפסקה השנייה.' : '',
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

      // כל כתבה עשירית קיבלה מספר עדכונים לאחר הפרסום
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

      // כל כתבה 25 היא כתבה מפורסמת שיש לה עדכון שממתין לאישור העורך.
      // publishedVersion נשאר גלוי לציבור בזמן שהטיוטה החדשה בבדיקה.
      if (i % 25 === 0) {
        doc.status = STATUS.PENDING;
        doc.draftVersion = buildContent(i, category, revision + 1);
      }
    }

    docs.push(doc);
  }

  const articles = await Article.insertMany(docs);
  console.log(`נוצרו ${articles.length} כתבות`);

  const published = articles.filter(a => a.isPublished);

  // תגובות על מחצית מהכתבות המפורסמות
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
  console.log(`נוצרו ${comments.length} תגובות`);

  // נתוני צפייה שעתיים ל-40 הכתבות הראשונות שעברו עדכון.
  // סביב כל נקודת פרסום נוצרת קפיצה בצפיות, כדי שהגרף יראה
  // את ההשפעה של העדכון לפני ואחרי.
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

      // דעיכה טבעית של תשומת הלב מרגע הפרסום
      const hoursSincePublish = (t - events[0]) / HOUR;
      let views = Math.max(3, Math.round(120 / (1 + hoursSincePublish / 24)));

      // קפיצה ב-24 השעות שאחרי כל עדכון שאושר
      for (const evt of events.slice(1)) {
        const delta = (t - evt) / HOUR;
        if (delta >= 0 && delta <= 24) views += Math.round(250 / (1 + delta / 4));
      }

      views += rand(-5, 15);
      views = Math.max(0, views);
      total += views;
      buckets.push({ article: article._id, timestamp: ts, viewsCount: views });
    }

    // המונה המצטבר חייב להיות עקבי עם סכום הדליים, אחרת מיון לפי פופולריות ישקר
    await Article.updateOne({ _id: article._id }, { $set: { totalViews: total } });
  }

  await Analytics.insertMany(buckets);
  console.log(`נוצרו ${buckets.length} דליי צפייה עבור ${updated.length} כתבות`);

  console.log('\nמשתמשי הדגמה (סיסמה לכולם: %s)', DEMO_PASSWORD);
  [...REPORTERS, ...EDITORS].forEach(u => console.log(`  ${u.username} - ${u.displayName}`));

  await mongoose.connection.close();
  console.log('\nהזרעת הנתונים הושלמה');
}

seed().catch(async err => {
  console.error('הזרעת הנתונים נכשלה:', err);
  await mongoose.connection.close();
  process.exit(1);
});
