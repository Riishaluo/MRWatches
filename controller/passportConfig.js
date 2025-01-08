const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require("../model/userModel")


const GOOGLE_CLIENT_ID = '21618195641-qf3md7nep1at0ahemfpph1ir31hvsp5c.apps.googleusercontent.com';
const GOOGLE_CLIENT_SECRET = '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';


passport.use(
    new GoogleStrategy(
        {
            clientID: GOOGLE_CLIENT_ID,
            clientSecret: GOOGLE_CLIENT_SECRET,
            callbackURL: 'http://localhost:3000/auth/google/callback',
        },
        async (accessToken, refreshToken, profile, done) => {
            console.log("Access Token:", accessToken);
            console.log("Profile Object:", profile);
            try {
                // Check if a user with the same email exists
                let user = await User.findOne({ email: profile.emails[0].value });

                if (!user) {
                    // If no user exists, create a new one with isGoogleLogin set to true
                    user = new User({
                        email: profile.emails[0].value,
                        isGoogleLogin: true, // Mark as Google login
                        password: null, // No password since it's a Google login
                    });
                    await user.save();
                } else {
                    // Update isGoogleLogin to true if the user logs in via Google
                    user.isGoogleLogin = true;
                    await user.save();
                }

                done(null, user); // Pass the user to Passport
            } catch (err) {
                console.error("Error in GoogleStrategy callback:", err);
                done(err, null);
            }
        }
    )
);




passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

module.exports = passport;
