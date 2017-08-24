import * as Facebook from "passport-facebook";
import * as Google from "passport-google-oauth";
import * as Twitter from "passport-twitter";
// import * as Local from "passport-local";

import { User, UserModel } from "../models/User";
// import * as store from "store";
import * as p from "passport";

const host = process.env.NODE_ENV !== "production" ? "localhost:3000" : "goita.net";

export function SetupPassport(passport: p.Passport) {

    passport.serializeUser<any, any>((user, done) => {
        done(undefined, user.id);
    });

    passport.deserializeUser((id, done) => {
        User.findById(id, (err, user) => {
            done(err, user);
        });
    });

    // NOTE: to set up FB auth you need your own clientID, clientSecret and set up your callbackURL.  This can all be done at https://developers.facebook.com/
    passport.use(new Facebook.Strategy({
        clientID: process.env.FACEBOOK_ID,
        clientSecret: process.env.FACEBOOK_SECRET,
        callbackURL: "http://" + host + "/auth/facebook/callback",
        profileFields: ["id", "displayName", "photos", "email"],
    },
        (accessToken, refreshToken, profile, done) => {
            findAndUpdateUser("fb", "facebook", profile, done);
        },
    ));

    passport.use(new Google.OAuth2Strategy({
        clientID: process.env.GOOGLE_ID,
        clientSecret: process.env.GOOGLE_SECRET,
        callbackURL: "http://" + host + "/auth/google/callback",
    }, (accessToken, refreshToken, profile, done) => {
        findAndUpdateUser("gl", "google", profile, done);
    }));

    passport.use(new Twitter.Strategy({
        consumerKey: process.env.TWITTER_KEY,
        consumerSecret: process.env.TWITTER_SECRET,
        callbackURL: "http://" + host + "/auth/twitter/callback",
    }, (token, tokenSecret, profile, done) => {
        findAndUpdateUser("tw", "twitter", profile, done);
    }));
}

function findAndUpdateUser(idPrefix: string, authtype: string, profile: p.Profile, done: (error: any, user?: any, info?: any) => void): void {
    const id = idPrefix + profile.id;
    const name = profile.displayName;
    const email = profile.emails ? profile.emails[0].value : ""; // twitter doesn't provide emails
    const icon = profile.photos[0].value;

    User.findOneAndUpdate(
        { userid: id },
        {
            $set: {
                id, name, email, icon,
            },
        },
        { upsert: true },
        (err, user) => {
            if (err) { console.log(err); }
            if (!err && user !== null) {
                done(null, user);
            } else {
                console.log("Failed to update user information from auth");
            }
        },
    );
}