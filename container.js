// Composition root: the one place that decides which implementation each layer gets.
// Swapping the database means writing new repositories with the same methods and
// changing the four require() lines below - services and controllers stay as they are.
const articleRepository = require('./repositories/mongo/articleRepository');
const commentRepository = require('./repositories/mongo/commentRepository');
const analyticsRepository = require('./repositories/mongo/analyticsRepository');
const userRepository = require('./repositories/mongo/userRepository');

const createArticleService = require('./services/articleService');
const createCommentService = require('./services/commentService');
const createUserService = require('./services/userService');
const createAnalyticsService = require('./services/analyticsService');

const repositories = { articleRepository, commentRepository, analyticsRepository, userRepository };

module.exports = {
  ...repositories,
  articleService: createArticleService(repositories),
  commentService: createCommentService(repositories),
  userService: createUserService(repositories),
  analyticsService: createAnalyticsService(repositories)
};
