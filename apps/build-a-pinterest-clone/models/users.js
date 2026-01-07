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
  emailConsentDate: Date,
  emailConsentIP: String,
  emailConsentVersion: String
});

module.exports = mongoose.model('User', User);
