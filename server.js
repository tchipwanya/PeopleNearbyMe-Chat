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
fu.get("/jquery-1.2.6.min.js", fu.staticHandler("jquery-1.2.6.min.js"));/* server.js subfile 2 */

var channel = new function () {
	
	var messages = [], 
		callbacks = [];

	this.appendMessage = function (alias, type, text) {
		var m = { alias: alias,
							type: type, // "msg", "join", "part",
							text: text,
							timestamp: (new Date()).getTime()
						};

		switch (type) {
			case "msg":
				sys.puts("<" + alias + "> " + text);
				break;
			case "join":
				sys.puts(alias + " join");
				break;
			case "part":
				sys.puts(alias + " part");
				break;
		}

		messages.push( m );

		while (callbacks.length > 0) {
			callbacks.shift().callback([m]);
		}

		while (messages.length > MESSAGE_BACKLOG)
			messages.shift();
	};

	this.query = function (since, callback) {
		var matching = [];
		for (var i = 0; i < messages.length; i++) {
			var message = messages[i];
			if (message.timestamp > since)
				matching.push(message);
		}

		if (matching.length !== 0) {
			callback(matching);
		} else {
			callbacks.push({ timestamp: new Date(), callback: callback });
		}
	};

	// clear old callbacks
	// they can hang around for at most 30 seconds.
	setInterval(function () {
		var now = new Date();
		while (callbacks.length > 0 && now - callbacks[0].timestamp > 30*1000) {
			callbacks.shift().callback([]);
		}
	}, 3000);
};
/* server.js subfile 3 */

var sessions = {};

function createSession (alias) {
	if (alias.length > 50) return null;
	if (/[^\w_\-^!]/.exec(alias)) return null;

	for (var i in sessions) {
		var session = sessions[i];
		if (session && session.alias === alias) return null;
	}

	var session = {
		alias: alias,
		id: Math.floor(Math.random()*99999999999).toString(),
		timestamp: new Date(),

		poke: function () {
			session.timestamp = new Date();
		},

		destroy: function () {
			channel.appendMessage(session.alias, "part");
			delete sessions[session.id];
		}
	};

	sessions[session.id] = session;
	return session;
}

// interval to kill off old sessions
setInterval(function () {
	var now = new Date();
	for (var id in sessions) {
		if (!sessions.hasOwnProperty(id)) continue;
		var session = sessions[id];

		if (now - session.timestamp > SESSION_TIMEOUT) {
			session.destroy();
		}
	}
}, 1000);
/* server.js subfile 4 */

fu.get("/who", function (req, res) {
	var aliases = [];
	for (var id in sessions) {
		if (!sessions.hasOwnProperty(id)) continue;
		var session = sessions[id];
		aliases.push(session.alias);
	}
	res.simpleJSON(200, { aliases: aliases});
});

fu.get("/join", function (req, res) {
	var alias = qs.parse(url.parse(req.url).query).alias;
	if (alias === null || alias.length === 0) {
		res.simpleJSON(400, {error: "Bad alias."});
		return;
	}
	var session = createSession(alias);
	if (session === null) {
		res.simpleJSON(400, {error: "alias in use"});
		return;
	}

	//sys.puts("connection: " + alias + "@" + res.connection.remoteAddress);

	channel.appendMessage(session.alias, "join");
	res.simpleJSON(200, { id: session.id,
						alias: session.alias
						});
});

fu.get("/part", function (req, res) {
	var id = qs.parse(url.parse(req.url).query).id;
	var session;
	if (id && sessions[id]) {
		session = sessions[id];
		session.destroy();
	}
});

fu.get("/recv", function (req, res) {
	if (!qs.parse(url.parse(req.url).query).since) {
		res.simpleJSON(400, { error: "Must supply since parameter" });
		return;
	}
	var id = qs.parse(url.parse(req.url).query).id;
	var session;
	if (id && sessions[id]) {
		session = sessions[id];
		session.poke();
	}

	var since = parseInt(qs.parse(url.parse(req.url).query).since, 10);

	channel.query(since, function (messages) {
		if (session) session.poke();
		res.simpleJSON(200, { messages: messages});
	});
});

fu.get("/send", function (req, res) {
	var id = qs.parse(url.parse(req.url).query).id;
	var text = qs.parse(url.parse(req.url).query).text;

	var session = sessions[id];
	if (!session || !text) {
		res.simpleJSON(400, { error: "No such session id" });
		return;
	}

	session.poke();

	channel.appendMessage(session.alias, "msg", text);
});