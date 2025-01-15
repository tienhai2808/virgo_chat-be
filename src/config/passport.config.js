import passport from "passport"
import { Strategy as GoogleStrategy } from "passport-google-oauth20";

import { convertFullName } from "../lib/utils.js";
import User from "../models/user.model.js";

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ googleId: profile.id });
        if (!user) {
          const userName = await convertFullName(profile.displayName)
          
          user = await User.create({
            googleId: profile.id,
            fullName: profile.displayName,
            userName: userName,
            email: profile.emails[0].value,
            avatar: profile.photos[0]?.value,
          });
        }
        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});
