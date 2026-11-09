// MongoDB query helpers shared by the Mongo repositories.
const { DuplicateKeyError } = require('../../utils/errors');

// Escapes special characters so free-text input is not interpreted as a regular expression
const escapeRegex = str => String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// A case-insensitive "contains" match for free text
const containsText = term => ({ $regex: escapeRegex(term), $options: 'i' });

// Maps MongoDB's unique index violation (E11000) onto the storage-neutral error
async function translateDuplicate(work) {
  try {
    return await work();
  } catch (err) {
    if (err.code === 11000) throw new DuplicateKeyError();
    throw err;
  }
}

module.exports = { escapeRegex, containsText, translateDuplicate };
