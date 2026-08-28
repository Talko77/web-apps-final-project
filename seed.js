const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./models/User');
const Article = require('./models/Article');
const Analytics = require('./models/Analytics');

const MONGO_URI = 'mongodb://127.0.0.1:27017/daily_web';

const categories = ['חדשות', 'ספורט', 'טכנולוגיה', 'תרבות', 'כלכלה'];

async function seed() {
  await mongoose.connect(MONGO_URI);
  await User.deleteMany({});
  await Article.deleteMany({});
  await Analytics.deleteMany({});

  const hashedPassword = await bcrypt.hash('123456', 10);

  const editor = await User.create({ username: 'editor1', password: hashedPassword, role: 'Editor' });
  const reporter = await User.create({ username: 'reporter1', password: hashedPassword, role: 'Reporter' });

  console.log('נוצרו משתמשים בדימוי');

  const articles = [];
  for (let i = 1; i <= 500; i++) { // יצירת 500 כתבות[cite: 1]
    const cat = categories[i % categories.length];
    const isPublished = i <= 400;
    const isPending = i > 400 && i <= 450;
    const isReturned = i > 450 && i <= 470;
    const isDraft = i > 470;

    let status = 'draft';
    if (isPublished) status = 'published';
    else if (isPending) status = 'pending';
    else if (isReturned) status = 'returned';

    const contentObj = {
      title: `כתבה מספר ${i}: עדכונים מרכזיים בנושא ${cat}`,
      summary: `תקציר של כתבה ${i} שנכתבה במסגרת הבדיקות`,
      content: `תוכן מלא ומפורט של כתבה מספר ${i}. המערכת בודקת עומסים ויכולות שליפה.`,
      category: cat,
      imageUrl: 'https://via.placeholder.com/600x400'
    };

    const pubEvents = [];
    if (isPublished) {
      pubEvents.push(new Date(Date.now() - 3600000 * 24 * 5)); // לפני 5 ימים
      if (i % 10 === 0) {
        pubEvents.push(new Date(Date.now() - 3600000 * 24 * 2)); // עדכון לפני יומיים[cite: 1]
      }
    }

    articles.push({
      reporter: reporter._id,
      status: status,
      draftVersion: contentObj,
      publishedVersion: isPublished ? contentObj : null,
      publishedAt: isPublished ? pubEvents[0] : null,
      publishEvents: pubEvents,
      editorNote: isReturned ? 'נא לתקן את כותרת הכתבה' : ''
    });
  }

  const createdArticles = await Article.insertMany(articles);
  console.log('נוצרו 500 כתבות בהצלחה');

  // יצירת נתוני צפייה מדומים לגרף Impact Analytics[cite: 1]
  const analyticsData = [];
  const publishedOne = createdArticles.find(a => a.publishEvents.length > 1);

  if (publishedOne) {
    for (let h = 0; h < 72; h++) {
      const time = new Date(Date.now() - (72 - h) * 3600000);
      time.setMinutes(0, 0, 0);
      analyticsData.push({
        article: publishedOne._id,
        timestamp: time,
        viewsCount: Math.floor(Math.random() * 200) + (h > 40 ? 300 : 50)
      });
    }
    await Analytics.insertMany(analyticsData);
    console.log('נוצרו נתוני צפייה מדומים עבור הכתבה:', publishedOne._id);
  }

  mongoose.connection.close();
}

seed();