/* server.js subfile 1 */
/**
 * Module dependencies.
 */
/*
var express = require('express'),
	io = require('socket.io');

var app = module.exports = express.createServer(),
	io = io.listen(app);

// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyDecoder());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.staticProvider(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure('production', function(){
  app.use(express.errorHandler()); 
});

// Routes

app.get('/', function(req, res){
  res.render('index', {
    title: 'Express'
  });
});

// Only listen on $ node app.js

if (!module.parent) {
  app.listen(8888);
  console.log("Express server listening on port %d", app.address().port)
}

io.on('connection', function(client){
  client.send("Server: You're connected!\n=> The first thing you type will be your screen name.");

  var user;
  client.on('message', function(data){
    if (!user) {
      user = data;
      io.broadcast(user + ' has joined.');
      return;
    }

    io.broadcast(user + ": " + data);
  });
});
*/

HOST = null; // localhost
PORT = 8001;

var fu = require("./fu"),
	sys = require("sys"),
	url = require("url"),
	qs = require("querystring"),
	io = require('socket.io');

var MESSAGE_BACKLOG = 200,
	SESSION_TIMEOUT = 60 * 1000;

//used to be below "interval to kill sessions"

fu.listen(Number(process.env.PORT || PORT), HOST);
io.listen(80);

fu.get("/", fu.staticHandler("index.html"));
fu.get("/style.css", fu.staticHandler("style.css"));
fu.get("/client.js", fu.staticHandler("client.js"));
fu.get("/jquery-1.2.6.min.js", fu.staticHandler("jquery-1.2.6.min.js"));