'use strict';

var GitHubStrategy = require('passport-github').Strategy;
var User = require('../models/users');
var configAuth = require('./auth');

var EMAIL_CONSENT_VERSION = process.env.EMAIL_CONSENT_VERSION || '1.0';

/**
 * Determine the client's IP address from an Express-style request object.
 * @param {Object} req - Express-style request object; may be falsy.
 * @returns {string|null} The client IP: the first value from the `X-Forwarded-For` header when present, otherwise `req.ip`; `null` if no request or no IP is available.
 */
function getClientIp(req) {
  if (!req) return null;
  var xff = req.headers && (req.headers['x-forwarded-for'] || req.headers['X-Forwarded-For']);
  if (xff && typeof xff === 'string') {
    return xff.split(',')[0].trim();
  }
  return req.ip || null;
}

// Privacy-preserving IP anonymization:
// - IPv4: zero last octet (e.g., 192.168.1.42 -> 192.168.1.0)
/**
 * Produces a privacy-preserving version of an IP address by masking trailing parts.
 * @param {string|null|undefined} ip - IP address in IPv4 or IPv6 notation.
 * @returns {string|null} For IPv4, the last octet is set to "0"; for IPv6, the last four segments are set to "0000"; returns `null` if `ip` is falsy; returns the original `ip` if its format is unrecognized.
 */
function anonymizeIp(ip) {
  if (!ip) return null;

  if (ip.indexOf('.') !== -1) {
    var parts = ip.split('.');
    if (parts.length === 4) {
      parts[3] = '0';
      return parts.join('.');
    }
    return ip;
  }

  if (ip.indexOf(':') !== -1) {
    var segments = ip.split(':');
    var keep = Math.max(0, segments.length - 4);
    for (var i = keep; i < segments.length; i++) {
      segments[i] = '0000';
    }
    return segments.join(':');
  }

  return ip;
}

/**
 * Update the user's stored GitHub image URL when it differs from the OAuth profile.
 *
 * If the profile's first photo value is identical to user.github.imageUrl, the callback is invoked immediately.
 * Otherwise the user's github.imageUrl is updated and the user is saved before invoking the callback.
 *
 * @param {Object} profile - OAuth profile object (expects photos[0].value to contain the image URL).
 * @param {Object} user - User document with a `github.imageUrl` field; will be mutated and saved if changed.
 * @param {Function} done - Callback invoked as done(err, user) after no change or after a successful save.
 * @throws {*} Throws the save error if saving the updated user fails.
 */
function updatePictureIfChanged(profile, user, done) {
  if (profile.photos[0].value === user.github.imageUrl) return done(null, user);
  else {
    user.github.imageUrl = profile.photos[0].value;
    user.save(function (err) {
      if (err) {
        throw err;
      }
      return done(null, user);
    });
  }
}

module.exports = function (passport) {
  passport.serializeUser(function (user, done) {
    done(null, user.id);
  });

  passport.deserializeUser(function (id, done) {
    User.findById(id, function (err, user) {
      done(err, user);
    });
  });

  passport.use(
    new GitHubStrategy(
      {
        clientID: configAuth.githubAuth.clientID,
        clientSecret: configAuth.githubAuth.clientSecret,
        callbackURL: configAuth.githubAuth.callbackURL,
        scope: ['user:email'],
        passReqToCallback: true
      },
      function (req, accessToken, refreshToken, profile, done) {
        process.nextTick(function () {
          User.findOne({ 'github.id': profile.id }, function (err, user) {
            if (err) {
              return done(err);
            }

            if (user) {
              return updatePictureIfChanged(profile, user, done);
            } else {
              var newUser = new User();

              newUser.github.id = profile.id;
              newUser.github.username = profile.username;
              newUser.github.displayName = profile.displayName;
              newUser.github.imageUrl = profile.photos[0].value;
              // Capture verified primary email from GitHub
              var primaryEmail =
                profile.emails && profile.emails.length > 0 ? profile.emails[0] : null;
              if (
                primaryEmail &&
                primaryEmail.value &&
                primaryEmail.verified === true
              ) {
                newUser.email = primaryEmail.value;
                newUser.emailConsentDate = new Date();
                newUser.emailConsentIP = anonymizeIp(getClientIp(req));
                newUser.emailConsentVersion = EMAIL_CONSENT_VERSION;
              }

              newUser.save(function (err) {
                if (err) {
                  throw err;
                }

                return done(null, newUser);
              });
            }
          });
        });
      }
    )
  );
};