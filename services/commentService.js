// Comment rules: comments exist only on published articles and have bounded text.
const { AppError } = require('../utils/errors');

const LIST_LIMIT = 200;
const MAX_LENGTH = 1000;

// One place for the comment text rules, shared by posting and by editor moderation
function readContent(body) {
  const content = String((body && body.content) || '').trim();
  if (!content) throw new AppError(400, 'Comment cannot be empty');
  if (content.length > MAX_LENGTH) throw new AppError(400, 'Comment is too long (1000 characters maximum)');
  return content;
}

module.exports = function createCommentService({ commentRepository, articleRepository }) {
  async function requirePublished(articleId) {
    const article = await articleRepository.findPublishedById(articleId);
    if (!article) throw new AppError(404, 'Article not found');
    return article;
  }

  return {
    async listForArticle(articleId, search) {
      const article = await requirePublished(articleId);
      return commentRepository.listByArticle(article._id, { search, limit: LIST_LIMIT });
    },

    // Open to guests; the name falls back to the signed-in user, then to "Guest"
    async create(articleId, body, sessionUser) {
      const content = readContent(body);
      const article = await requirePublished(articleId);
      const rawName = String((body && body.authorName) || '').trim();
      const authorName = rawName ? rawName.slice(0, 40) : (sessionUser ? sessionUser.displayName : 'Guest');
      return commentRepository.create({ article: article._id, authorName, content });
    },

    // Editors moderate the text instead of having to delete the comment outright
    async update(id, body) {
      const content = readContent(body);
      const comment = await commentRepository.update(id, { content });
      if (!comment) throw new AppError(404, 'Comment not found');
      return comment;
    },

    async remove(id) {
      const comment = await commentRepository.delete(id);
      if (!comment) throw new AppError(404, 'Comment not found');
      return comment;
    }
  };
};
