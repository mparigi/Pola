var express = require('express');
var mongo = require('mongodb').MongoClient;
var mlabUrl = process.env.MLAB_URL;
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var cookieParser = require('cookie-parser');
var cookieSession = require('cookie-session')
var flash = require('connect-flash');
var bodyParser = require('body-parser');
var bCrypt = require('bcrypt-nodejs');

var app = express();
var port = process.env.PORT || 8080;

app.set('views', './views');
app.set('view engine', 'pug');

app.set('trust proxy', 1)

app.use('/bootstrap', express.static(__dirname + '/node_modules/bootstrap/dist/'));
app.use('/styles', express.static(__dirname + '/styles'));

app.use(cookieParser());
app.use(cookieSession({
    secret: process.env.SESSION_SECRET
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
            creator: 1,
            _id: 0
        }).sort(
            {latestResTime: -1}
        ).toArray(function(e, docs) {
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

    mongo.connect(mlabUrl, function (err, db) {
        if (err) throw err;
        var pCol = db.collection("polls");
        pCol.findOne(
            {pollID: Number(req.params.pollID)},
            function (error, doc) {
                if (error) throw error;
                db.close();
                res.render("poll.pug", {poll: doc, user: req.user});
            }
        );
    });
});

app.post("/vote", function (req, res){
    var selNum = req.body.selection;
    var pid = Number(req.body.pollID);
    var incer = {
        responses: 1
    }
    incer["options." + selNum.toString() + ".opRes"] = 1;

    mongo.connect(mlabUrl, function (err, db) {
        if (err) throw err;
        var polls = db.collection("polls");
        polls.updateOne(
            {pollID: pid},
            {
                $inc: incer,
                $set: {latestResTime: Date.now()}
            },
            function (error, results) {
                if (error) throw error;
                db.close();
                res.redirect("/polls/" + pid);
            }
        );
    });
});

app.get("/create", isAuthenticated, function(req, res) {
    res.render("create.pug", {user: req.user});
});

app.post("/create", isAuthenticated, function (req, res) {
    var question = req.body.question;
    var ops = req.body.undefined ? [req.body.option1, req.body.option2].concat(req.body.undefined): [req.body.option1, req.body.option2];
    mongo.connect(mlabUrl, function (err, db) {
        if (err) throw err;
        var pCol = db.collection("polls");
        var newPoll = {
            name: question,
            responses: 0,
            createTime: Date.now(),
            creator: req.user.username,
            latestResTime: Date.now(),
            options: []
        }
        for (var i in ops) {
            newPoll.options.push({op: ops[i], opRes: 0});
        }
        pCol.count(function(e, cnt) {
            if (e) throw e;
            newPoll.pollID = cnt;
            pCol.insertOne(newPoll, function (error, result) {
                if (error) throw error;
                db.close();
                res.redirect("/polls/" + newPoll.pollID);
            });
        });
    });
});

app.get("/mypolls", isAuthenticated, function(req, res) {
    mongo.connect(mlabUrl, function (err, db) {
        if (err) throw err;
        var pCol = db.collection("polls");
        pCol.find(
            {creator: req.user.username},
            {
                name: 1,
                responses: 1,
                pollID: 1,
                _id: 0
            }
        ).toArray(function(e, docs){
            if (e) throw e;
            db.close();
            res.render("mypolls.pug", {user: req.user, mypolls: docs});
        });
    });
});

app.get("/delete", isAuthenticated, function(req, res){
    if (req.user.username != req.query.u) {
        res.end("You are not authorized to delete this poll.");
    } else {
        mongo.connect(mlabUrl, function(err, db) {
            if (err) throw err;
            var pCol = db.collection("polls");
            pCol.deleteOne(
                {pollID: Number(req.query.p)},
                function (e, results) {
                    if (e) throw e;
                    db.close();
                    res.redirect("/mypolls");
                }
            );
        });
    }
});

app.get("/settings", isAuthenticated, function(req, res) {
    res.render("settings.pug", {user: req.user, authMessage: req.flash("message")});
});

app.post("/passchange", isAuthenticated, function (req, res) {
    if (isValidPass(req.user, req.body.oldPass)) {
        if (req.body.newPass != req.body.confirmNewPass) {
            req.flash("message", "Passwords don't match.");
            res.redirect("/settings");
        } else {
            mongo.connect(mlabUrl, function (err, db) {
                if (err) throw err;
                var accounts = db.collection("accounts");
                accounts.updateOne(
                    {"username": req.user.username},
                    {$set: {"password": createHash(req.body.newPass)}},
                    function (error, results) {
                        if (error) throw error;
                        req.logout();
                        res.render("updatedpass.pug");
                    }
                );
            });
        }
    } else {
        req.flash("message", "Incorrect Current Password.");
        res.redirect("/settings");
    }
});

app.get("/logout", function (req, res) {
    req.logout();
    res.redirect("/");
});

app.listen(port);
