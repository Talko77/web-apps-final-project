// Shared values used by both the server and the EJS views.
const CATEGORIES = ['World', 'Business', 'Technology', 'Science', 'Culture', 'Sports', 'Opinion'];

const STATUS = {
  DRAFT: 'draft',
  PENDING: 'pending',
  PUBLISHED: 'published',
  RETURNED: 'returned'
};

// Editorial vocabulary from the original prototypes.
const STATUS_LABELS = {
  draft: 'Draft',
  pending: 'Pending Review',
  published: 'Published',
  returned: 'Changes Requested'
};

const ROLES = {
  REPORTER: 'Reporter',
  EDITOR: 'Editor'
};

const FEED_PAGE_SIZE = 20;

module.exports = { CATEGORIES, STATUS, STATUS_LABELS, ROLES, FEED_PAGE_SIZE };
