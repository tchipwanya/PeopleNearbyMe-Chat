/* server.js subfile 1 */

/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , io = require('socket.io');

var app = module.exports = express.createServer(),
    io = io.listen(app);

// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure('production', function(){
  app.use(express.errorHandler()); 
});


io.configure(function () { 
  io.set("transports", ["xhr-polling"]); 
  io.set("polling duration", 10); 
});

// Routes

app.get('/', routes.index);

// Only listen on $ node app.js

if (!module.parent) {
  app.listen(3000, function(){
    console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
  });
}

//io.listen(80);

//var MESSAGE_BACKLOG = 200,
var SESSION_TIMEOUT = 60 * 1000;/* server.js subfile 2 */
/*
var channel = new function () {
	
	var messages = [], 
		callbacks = [];

	this.appendMessage = function (alias, type, text) {
		var m = { 	alias: alias,
					type: type, // "msg", "join", "part",
					text: text,
					timestamp: (new Date()).getTime()
				};

		switch (type) {
			case "msg":
				console.log("<" + alias + "> " + text);
				break;
			case "join":
				console.log(alias + " join");
				break;
			case "part":
				console.log(alias + " part");
				break;
		}

		//messages.push( m );
		socket.broadcast.emit("recv", m);		

		/*while (callbacks.length > 0) {
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
};*//* server.js subfile 3 */

var sessions = {};

function createSession (alias) { // probably more secure than we need at the moment.
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
			//channel.appendMessage(session.alias, "part");
			var m = {
				alias: session.alias,
				type: "part", // "msg", "join", "part",
				timestamp: (new Date()).getTime()
			};
			io.sockets.emit("recv", m);
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
}, 1000);/* server.js subfile 4 */

io.sockets.on("connection", function (socket) {
	socket.on("who", function (data) {
		var aliases = [];
		for (var id in sessions) {
			if (!sessions.hasOwnProperty(id)) continue;  // what?
			var session = sessions[id];
			aliases.push(session.alias);
		}
		socket.emit("who", { aliases: aliases});
	});

	socket.on("join", function (user) {
		var alias = user.alias;
		if (alias === null || alias.length === 0) {
			socket.emit("error", {error: "Bad alias."});
			return;
		}
		var session = createSession(alias);
		if (session === null) {
			socket.emit("error", {error: "alias in use"});
			return;
		}

		//channel.appendMessage(session.alias, "join");

		var m = { 	
			alias: session.alias,
			type: "join", // "msg", "join", "part",
			timestamp: (new Date()).getTime()
		};
		socket.broadcast.emit("recv", m);
		socket.emit("join", { id: session.id, alias: session.alias });
	});

	socket.on("part", function (user) {
		var id = user.id;
		var session;
		if (id && sessions[id]) {
			session = sessions[id];
			session.destroy();
		}
	});

/*	socket.on("recv", function (user) {
		if (!user.since) {
			socket.emit("error", { error: "Must supply since parameter" });
			return;
		}
		var id = user.id;
		var session;
		if (id && sessions[id]) {
			session = sessions[id];
			session.poke();
		}

		var since = parseInt(user.since, 10);

		channel.query(since, function (messages) {
			if (session) session.poke();
			socket.emit("recv", { messages: messages });
		});
	}); */

	socket.on("send", function (user) {
		var id = user.id;
		var text = user.text;
		var session = sessions[id];
		if (!session || !text) {
			socket.emit("error", { error: "No such session id" });
			return;
		}

		session.poke();

		var m = { 	
			alias: session.alias,
			type: "msg", // "msg", "join", "part",
			text: text,
			timestamp: (new Date()).getTime()
		};
		io.sockets.emit("recv", m);
	});
});