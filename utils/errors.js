// Error types shared by the layers. A service throws AppError with an HTTP-style status;
// the central error handler turns it into the JSON or HTML response.

class AppError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'AppError';
    this.status = status;
  }
}

// Thrown by a repository when a unique field (a username, an hour bucket) already exists.
// Storage specific codes, such as MongoDB's E11000, never leave the repository.
class DuplicateKeyError extends Error {
  constructor(message = 'Duplicate key') {
    super(message);
    this.name = 'DuplicateKeyError';
  }
}

module.exports = { AppError, DuplicateKeyError };
