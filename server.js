var express = require('express');
var key = require('key.js');

var app = express();
var port = 3000;

app.use(express.static(__dirname + "/public"));

app.get("/", function(req, res) {
    res.sendFile(__dirname + "/index.html");
});

app.listen(port);
