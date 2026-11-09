// Article workflow: creating drafts, saving edits, and the editorial state machine.
// Receives its repositories as arguments, so the storage can be swapped (or faked in
// tests) without touching these rules.
const { AppError } = require('../utils/errors');
const { STATUS, ROLES } = require('../config/constants');
const { sanitizeContent, isDraftComplete, ownerId } = require('../domain/article');

module.exports = function createArticleService({ articleRepository, commentRepository, analyticsRepository }) {
  // The article named by id; a reporter may only use their own, an editor may use any
  async function loadForUser(user, id, deniedMessage) {
    const article = await articleRepository.findById(id);
    if (!article) throw new AppError(404, 'Article not found');
    if (user.role === ROLES.REPORTER && ownerId(article) !== String(user._id)) {
      throw new AppError(403, deniedMessage);
    }
    return article;
  }

  // The reporter submits a draft or a returned article for review
  function reporterTransition(article, newStatus) {
    // Submitting a published article with nothing changed would only re-review the live version
    if (article.status === STATUS.PUBLISHED) {
      throw new AppError(400, 'There are no changes to submit - edit the article first');
    }
    const allowed = article.status === STATUS.DRAFT || article.status === STATUS.RETURNED;
    if (!allowed || newStatus !== STATUS.PENDING) {
      throw new AppError(400, 'This status change is not allowed for a reporter');
    }
    if (!isDraftComplete(article.draftVersion)) {
      throw new AppError(400, 'Add a title, summary, content and category before submitting for review');
    }
    return { status: STATUS.PENDING, editorNote: '' };
  }

  // The editor approves or returns an article awaiting review
  function editorTransition(article, newStatus, editorNote) {
    if (article.status !== STATUS.PENDING) {
      throw new AppError(400, 'Only an article awaiting approval can be approved or returned');
    }

    if (newStatus === STATUS.PUBLISHED) {
      if (!isDraftComplete(article.draftVersion)) {
        throw new AppError(400, 'The article needs a title, summary, content and category before it can be published');
      }
      // Approving makes the draft the version shown to readers
      return {
        publishedVersion: { ...article.draftVersion },
        status: STATUS.PUBLISHED,
        isPublished: true,
        publishedAt: article.publishedAt || new Date(),
        publishEvents: [...(article.publishEvents || []), new Date()], // marker on the analytics chart
        editorNote: ''
      };
    }

    if (newStatus === STATUS.RETURNED) {
      // The note is required by the workflow, so it is enforced here and not only in the form
      const note = String(editorNote || '').trim();
      if (!note) throw new AppError(400, 'Add a note explaining what changes are needed');
      return { status: STATUS.RETURNED, editorNote: note.slice(0, 1000) };
    }

    throw new AppError(400, 'This status change is not allowed for an editor');
  }

  return {
    getForUser: (user, id) => loadForUser(user, id, 'You do not have permission to view this article'),

    create: (user, body) => articleRepository.create({
      reporter: user._id,
      status: STATUS.DRAFT,
      draftVersion: sanitizeContent(body)
    }),

    // Called by the explicit Save Draft action and by autosave, so a draft may be partial
    async saveDraft(user, id, body) {
      const article = await loadForUser(user, id, 'You do not have permission to edit this article');

      if (article.status === STATUS.PENDING && user.role === ROLES.REPORTER) {
        throw new AppError(409, 'This article is awaiting editor approval and cannot be edited right now');
      }

      const incoming = sanitizeContent(body);
      // An editor's edit goes straight to review and can be approved, so it must be complete
      if (user.role === ROLES.EDITOR && !isDraftComplete(incoming)) {
        throw new AppError(400, 'A title, summary, content and category are all required');
      }

      const changes = { draftVersion: incoming };
      // Compared trimmed, because the storage trims title and summary
      const current = article.draftVersion || {};
      const changed = Object.keys(incoming).some(k => incoming[k].trim() !== String(current[k] || '').trim());

      // Editing a published article starts a new draft while publishedVersion stays live.
      // A save with nothing changed (for example from a stale tab) leaves it as it is.
      if (article.status === STATUS.PUBLISHED && changed) {
        changes.status = user.role === ROLES.EDITOR ? STATUS.PENDING : STATUS.DRAFT;
      }

      return articleRepository.update(article._id, changes);
    },

    async changeStatus(user, id, { newStatus, editorNote } = {}) {
      const article = await loadForUser(user, id, 'You do not have permission to change this article');
      const changes = user.role === ROLES.REPORTER
        ? reporterTransition(article, newStatus)
        : editorTransition(article, newStatus, editorNote);
      return articleRepository.update(article._id, changes);
    },

    // Deleting an article also deletes its comments and view data
    async remove(id) {
      const article = await articleRepository.delete(id);
      if (!article) throw new AppError(404, 'Article not found');
      await Promise.all([
        commentRepository.deleteByArticle(article._id),
        analyticsRepository.deleteByArticle(article._id)
      ]);
      return article;
    }
  };
};
