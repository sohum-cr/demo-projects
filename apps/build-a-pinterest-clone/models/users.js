'use strict';

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var User = new Schema({
  github: {
    id: String,
    displayName: String,
    username: String,
    imageUrl: String
  },
  email: {
    type: String,
    required: false,
    trim: true,
    lowercase: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please fill a valid email address']
  },
  // Email consent metadata for audit/compliance:
  // - emailConsentDate: when consent was recorded
  // - emailConsentIP: privacy-preserving, anonymized client IP (truncated/hashed)
  // - emailConsentVersion: version of the consent text the user agreed to
  // Retention: a separate scheduled job or TTL policy should periodically
  // purge or further anonymize old consent metadata according to policy.
  emailConsentDate: Date,
  emailConsentIP: String,
  emailConsentVersion: String
});

module.exports = mongoose.model('User', User);
