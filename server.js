var express = require('express');
var mongo = require('mongodb').MongoClient;
var mlabUrl = require('./key.js');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var cookieParser = require('cookie-parser');
var session = require('express-session');
var flash = require('connect-flash');
var bodyParser = require('body-parser');
var bCrypt = require('bcrypt-nodejs');

var app = express();
var port = 3000;

app.set('views', './views');
app.set('view engine', 'pug');

app.use('/bootstrap', express.static(__dirname + '/node_modules/bootstrap/dist/'));
app.use('/styles', express.static(__dirname + '/styles'));

app.use(cookieParser());
app.use(session({
    secret: 'mySecretKey',
    resave: false,
    saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(bodyParser.urlencoded({extended: true}));
app.use(flash());


var isAuthenticated = function (req, res, next) {
    if (req.isAuthenticated()) return next();
    res.redirect('/');
}

var isValidPass = function (user, password) {
    return bCrypt.compareSync(password, user.password);
}

var createHash = function (password) {
    return bCrypt.hashSync(password, bCrypt.genSaltSync(10), null);
}



passport.use("login", new LocalStrategy(
    {
        passReqToCallback: true
    },
    function(req, username, password, done) {
        mongo.connect(mlabUrl, function(err, db) {
            if (err) throw err;
            var accounts = db.collection("accounts");
            accounts.findOne({"username": username}, function(e, user) {
                if (e) return done(e);
                db.close();
                if (!user) {
                    return done(null, false, req.flash("message", "User not found."));
                }
                if (!isValidPass(user, password)) {
                    return done(null, false, req.flash("message", "Invalid Password"));
                }
                return done(null, user);
            });
        });
    }
));

passport.use("signup", new LocalStrategy(
    {
        passReqToCallback: true
    },
    function(req, username, password, done) {
        var findOrCreateUser = function () {
            mongo.connect(mlabUrl, function(err, db) {
                if (err) throw err;
                var accounts = db.collection("accounts");
                accounts.findOne({"username": username}, function(e, user) {
                    if (e) return done(e);
                    if (user) {
                        return done(null, false, req.flash("message", "Username taken."));
                    } else {
                        var newUser = {
                            "username": username,
                            "password": createHash(password),
                            "name": req.body.name,
                            "email": req.body.email
                        }
                        accounts.insertOne(newUser, function (error, result) {
                            if (error) throw error;
                            db.close();
                            return done(null, newUser);
                        });
                    }
                });
            });
        }
        process.nextTick(findOrCreateUser);
    }
));


passport.serializeUser(function(user, done) {
    done(null, user.username);
});

passport.deserializeUser(function(username, done) {
    mongo.connect(mlabUrl, function (err, db) {
        if (err) throw err;
        var accounts = db.collection("accounts");
        accounts.findOne({"username": username}, function (e, user) {
            if (e) throw e;
            db.close();
            done(err, user);
        });
    });
});









//HOME PAGE
app.get("/", function(req, res) {
    mongo.connect(mlabUrl, function (err, db) {
        if (err) throw err;
        var polls = db.collection("polls");
        polls.find({}, {
            name: 1,
            responses: 1,
            pollID: 1,
            _id: 0
        }).toArray(function(e, docs) {
            if (e) throw e;
            db.close();
            res.render("index.pug", {polls: docs, user: req.user});
        });
    });
});

app.get("/login", function(req, res) {
    res.render("login.pug", {
        authMessage: req.flash("message")
    });
});

app.post(
    "/login",
    passport.authenticate("login", {
        successRedirect: '/',
        failureRedirect: '/login',
        failureFlash: true,
        session: true
    })
);

app.get("/signup", function(req, res) {
    res.render("signup.pug", {authMessage: req.flash("message")});
});

app.post(
    "/signup",
    passport.authenticate("signup", {
        successRedirect: "/",
        failureRedirect: "/signup",
        failureFlash: true,
        session: true
    })
);


app.get("/polls/:pollID", function(req, res) {
    res.end("Poll with pollID " + req.params.pollID);
});

app.get("/create", isAuthenticated, function(req, res) {

});

app.get("/mypolls", isAuthenticated, function(req, res) {
    res.render("mypolls.pug");
});

app.get("/settings", isAuthenticated, function(req, res) {
    res.render("settings.pug", {user: req.user});
});

app.get("/logout", function (req, res) {
    req.logout();
    res.redirect("/");
});

app.listen(port);
