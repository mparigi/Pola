var express = require('express');
var key = require('key.js');

var app = express();
var port = 3000;

app.use(express.static(__dirname + "/public"));


app.get("/", function(req, res) {
    res.sendFile(__dirname + "/index.html");
});

app.get("/login", function(req, res) {
    res.sendFile(__dirname + "/login.html");
});

app.get("/signup", function(req, res) {
    res.sendFile(__dirname + "/signup.html");
});

app.get("/polls/:pollID", function(req, res) {
    res.end("Poll with pollID " + req.params.pollID);
});

app.get("/create", function(req, res) {
    if (/*authenticated user*/true) {
        res.sendFile(__dirname + "/create.html");
    } else {
        res.sendFile(__dirname + "/no-acccount-error.html");
    }
});

app.get("/mypolls", function(req, res) {
    if (/*authenticated user*/true) {
        res.sendFile(__dirname + "/mypolls.html");
    } else {
        res.sendFile(__dirname + "/no-acccount-error.html");
    }
});

app.get("/settings", function(req, res) {
    if (/*authenticated user*/true) {
        res.sendFile(__dirname + "/settings.html");
    } else {
        res.sendFile(__dirname + "/no-acccount-error.html");
    }
});

app.listen(port);
