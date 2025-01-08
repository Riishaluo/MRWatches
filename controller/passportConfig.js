const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;


const GOOGLE_CLIENT_ID = '21618195641-qf3md7nep1at0ahemfpph1ir31hvsp5c.apps.googleusercontent.com';
const GOOGLE_CLIENT_SECRET = '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';


passport.use(
    new GoogleStrategy(
        {
            clientID: GOOGLE_CLIENT_ID,
            clientSecret: GOOGLE_CLIENT_SECRET,
            callbackURL: 'https://mrwatches.ddns.net/auth/google/callback',
        },
        async (accessToken, refreshToken, profile, done) => {
            console.log("Access Token:", accessToken);
            console.log("Refresh Token:", refreshToken);
            console.log("Profile Object:", profile); 
            try {
                const user = {
                    email: profile.emails[0].value,
                };
                done(null, user); 
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
