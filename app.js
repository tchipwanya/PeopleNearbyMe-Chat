/* server.js subfile 1 */

var express = require('express')
  , routes = require('./routes')
  , io = require('socket.io')
  , MemoryStore = express.session.MemoryStore
  , sessionStore = new MemoryStore({ reapInterval: 1000 * 60 * 60 })
  , connect = require('connect')
  , Session = connect.middleware.session.Session
  , parseCookie = connect.utils.parseCookie
  , app = module.exports = express.createServer()
  , io = io.listen(app);

// Configuration

app.configure(function() {
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.static(__dirname + '/public'));
  app.use(express.cookieParser());
  app.use(express.session({store: sessionStore, secret: 'SECRET_HERE', key: 'express.sid'}));
  app.use(app.router);  
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
  io.set('authorization', function (data, accept) {
    if (data.headers.cookie) {
        data.cookie = parseCookie(data.headers.cookie);
        data.sessionID = data.cookie['express.sid'];
        // save the session store to the data object 
        // (as required by the Session constructor)
        data.sessionStore = sessionStore;
        sessionStore.get(data.sessionID, function (err, session) {
           if (err || !session) {
              accept('Error null session', false);
            } else {
                // create a session object, passing data as request and our
                // just acquired session data
                data.session = new Session(data, session);
                accept(null, true);
            }
        });
    } else {
       return accept('No cookie transmitted.', false);
    }
  });
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

/* server.js subfile 2 */
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

//var SESSION_TIMEOUT = 1 * 60 * 60 * 1000; // 1 hour session timeout time

//var sessions = {};
/*
function createSession (socket, alias) { // probably more secure than we need at the moment.
	if (/[^\w_\-^!]/.exec(alias)) return "Alias contains invalid characters.";
	if (alias === null) return "Alias was not included in join request.";
	if (alias.length === 0) return "You forgot to enter your alias silly.";
	if (alias.length > 50) return "The alias you entered is too long.";

	var clients = io.of('/').clients();
	console.log(clients);
	for (var client in clients) {
		//console.log(client);
		var user = client.handshake.session.user;
		if (user.alias === alias) return null; // not sure why session is part of the condition... took that out.
	}

	var user = {
		alias: alias /*,
		id: socket.handshake.sessionID,
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
		} */
/*	};
	var session = socket.handshake.session;
	session.user = user;
	session.save();
	//sessions[session.id] = session;
	return user;
}

// interval to kill off old sessions
/*
setInterval(function () {
	var now = new Date();
	for (var id in sessions) {
		if (!sessions.hasOwnProperty(id)) continue;
		var session = sessions[id];

		if (now - session.timestamp > SESSION_TIMEOUT) {
			session.destroy();
		}
	}
}, 10000); *//* server.js subfile 4 */

io.sockets.on("connection", function (socket) {

	var hs = socket.handshake;
    console.log('A socket with sessionID ' + hs.sessionID + ' connected!');
    // setup an inteval that will keep our session fresh
    var intervalID = setInterval(function () {
        // reload the session (just in case something changed,
        // we don't want to override anything, but the age)
        // reloading will also ensure we keep an up2date copy
        // of the session with our connection.
        hs.session.reload( function () { 
            // "touch" it (resetting maxAge and lastAccess)
            // and save it back again.
            hs.session.touch().save();
        });
    }, 60 * 1000);

    socket.on('disconnect', function () {
        console.log('A socket with sessionID ' + hs.sessionID 
            + ' disconnected!');
        // clear the socket interval to stop refreshing the session
        clearInterval(intervalID);
    });


	socket.on("who", function (data) {
		var aliases = [];
		var clients = io.sockets.clients();
		for (var i in clients) {
			client = clients[i];
			if (!client.handshake.session.hasOwnProperty(user)) continue; // skip user if not "authenticated"
			var user = client.handshake.session.user;
			aliases.push(user.alias);
		}
		socket.emit("who", { aliases: aliases});
	});

	function createSession (socket, alias) { // probably more secure than we need at the moment.
		if (/[^\w_\-^!]/.exec(alias)) return "Alias contains invalid characters.";
		if (alias === null) return "Alias was not included in join request.";
		if (alias.length === 0) return "You forgot to enter your alias silly.";
		if (alias.length > 50) return "The alias you entered is too long.";

		var clients = io.sockets.clients();
		for (var i in clients) {
			var client = clients[i];
			var user = client.handshake.session.user;
			if (user && user.alias === alias) return null;
		}

		var user = { alias: alias };
		var session = socket.handshake.session;
		session.user = user;
		session.save();
		return user;
	}

	socket.on("join", function (userData) {

		var alias = userData.alias;
		var error = "";
		if (alias === null) error += "Alias was not included in join request. ";
		if (/[^\w_\-^!]/.exec(alias)) error += "Alias contains invalid characters and is far too silly. ";	
		if (alias.length === 0) error += "You forgot to enter your alias silly. ";
		if (alias.length > 50) error += "The alias you entered is too long. ";

		var clients = io.sockets.clients();
		for (var i in clients) {
			var client = clients[i];
			var user = client.handshake.session.user;
			if (user && user.alias === alias) error += "The alias you entered is already in use.";
		}

		if(error.length !== 0) {
			socket.emit("error", {error: error});
			return;
		}

		var user = { alias: alias };
		var session = socket.handshake.session;
		
		session.user = user;
		session.save();

		var m = { 	
			alias: user.alias,
			type: "join", // "msg", "join", "part",
			timestamp: (new Date()).getTime()
		};
		socket.broadcast.emit("recv", m);
		socket.emit("join", { id: hs.sessionID, alias: hs.session.user.alias });
	});

/*	socket.on("part", function (user) {
		var id = user.id;
		var session;
		if (id && sessions[id]) {
			//session = sessions[id];
			//session.destroy();
		}
	});*/

	socket.on("send", function (userData) {
		var id = userData.id;
		var text = userData.text;
		//var session = sessions[id];
		/*if (!session || !text) {
			socket.emit("error", { error: "No such session id" });
			return;
		}*/

		//session.poke();
		hs.session.touch().save();

		var m = { 	
			alias: hs.session.user.alias,
			type: "msg", // "msg", "join", "part",
			text: text,
			timestamp: (new Date()).getTime()
		};
		io.sockets.emit("recv", m);
	});
});