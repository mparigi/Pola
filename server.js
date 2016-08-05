var express = require('express');
var key = require('./key.js');

var app = express();
var port = 3000;

app.set('views', './views');
app.set('view engine', 'pug');


app.get("/", function(req, res) {
    res.render("index.pug");
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
