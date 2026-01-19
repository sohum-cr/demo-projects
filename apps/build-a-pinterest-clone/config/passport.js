'use strict';

var GitHubStrategy = require('passport-github').Strategy;
var User = require('../models/users');
var configAuth = require('./auth');

var EMAIL_CONSENT_VERSION = process.env.EMAIL_CONSENT_VERSION || '1.0';

// Helper to check if user consented to email collection in the current session
function hasUserEmailConsent(req) {
  return req && req.session && req.session.emailConsent === true;
}

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
              // Capture verified primary email from GitHub only when consent is recorded
              var primaryEmail =
                profile.emails && profile.emails.length > 0 ? profile.emails[0] : null;
              if (
                primaryEmail &&
                primaryEmail.value &&
                primaryEmail.verified === true &&
                hasUserEmailConsent(req)
              ) {
                newUser.email = primaryEmail.value;
                newUser.emailConsentDate = new Date();
                newUser.emailConsentIP = req.ip;
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
