var express = require('express');
var mongo = require('mongodb').MongoClient;
var mlabUrl = require('./key.js');

var app = express();
var port = 3000;

app.set('views', './views');
app.set('view engine', 'pug');
app.use('/bootstrap', express.static(__dirname + '/node_modules/bootstrap/dist/'));





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
            res.render("index.pug", {polls: docs});
        });
    });
});

app.get("/login", function(req, res) {
    res.render("login.pug");
});

app.get("/signup", function(req, res) {
    res.render("signup.pug");
});

app.get("/polls/:pollID", function(req, res) {
    res.end("Poll with pollID " + req.params.pollID);
});

app.get("/create", function(req, res) {
    if (/*authenticated user*/true) {
        res.render("create.pug");;
    } else {
        res.render("no-acccount-error.pug");
    }
});

app.get("/mypolls", function(req, res) {
    if (/*authenticated user*/true) {
        res.render("mypolls.pug");
    } else {
        res.render("no-acccount-error.pug");
    }
});

app.get("/settings", function(req, res) {
    if (/*authenticated user*/true) {
        res.render("settings.pug");
    } else {
        res.render("no-acccount-error.pug");
    }
});

app.listen(port);
