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
  app.use(express.session({store: sessionStore, secret: 'JHgzU1IWXZmAJpETpPgTYsjtiojqn7mseIbzboQW', key: 'express.sid'}));
  app.use(app.router);
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
  app.use(express.errorHandler());
});


io.configure(function () {
  //io.set('log level', 1); // reduce logging FOR PRODUCTION ONLY
  io.set("transports", ["xhr-polling"]);
  io.set("polling duration", 10);
  io.set('authorization', function (data, accept) {
    if (data.headers.cookie) {
        data.cookie = parseCookie(data.headers.cookie);
        data.sessionID = data.cookie['express.sid'];
        data.sessionStore = sessionStore;
        sessionStore.get(data.sessionID, function (err, session) {
           if (err || !session) {
              accept('Error null session', false);
            } else {
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

var PORT = process.env.PORT || 3000;
if (!module.parent) {
  app.listen(PORT, function(){
    console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
  });
}

/* Mongodb connection */

var mongo = require('mongodb')
  , Server = mongo.Server
  , Db = mongo.Db
  , server = new Server('localhost', 27017, {auto_reconnect: true})
  , db = new Db('peoplenearbyme', server);
/* server.js subfile 4 */

io.sockets.on("connection", function (socket) {

	var hs = socket.handshake;

    // setup an inteval that will keep our session fresh
    var intervalID = setInterval(function () {
        // reload the session (just in case something changed
        hs.session.reload( function () {
            // "touch" it (resetting maxAge and lastAccess) and save it back again.
            hs.session.touch().save();
        });
    }, 60 * 1000);

    socket.on('disconnect', function () {
        console.log('A socket with sessionID ' + hs.sessionID + ' disconnected!');
        // clear the socket interval to stop refreshing the session
        clearInterval(intervalID);
    });

	function createSession (socket, alias) {
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
		if (!alias) error += "Alias was not included in join request. ";
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
			return null;
		}

		if (userData.roomInput) {
			// insert new room into MongoDB and join it. TODO
		} else { 
			// use 'userData.room' to get room selection. TODO
		}

		var user = { alias: alias };
		var session = socket.handshake.session;
		
		session.user = user;
		session.save();

		// who function copied in here and removed.
		var aliases = [];
		var clients = io.sockets.clients();
		for (var i in clients) {
			client = clients[i];
			var user = client.handshake.session.user;
			if(user) {
				aliases.push(user.alias);
			}
		}

		socket.broadcast.emit("someoneJoin", {	alias: user.alias,
												timestamp: (new Date()).getTime() });

		socket.emit("join", { 	id: hs.sessionID, 
								alias: hs.session.user.alias,
								aliases: aliases });
	});

	socket.on("part", function (userData) {
		clearInterval(intervalID);
		socket.broadcast.emit("someonePart", {	alias: user.alias,
												timestamp: (new Date()).getTime() });
	});

	socket.on("send", function (userData) {
		var id = userData.id;
		var text = userData.text;
		// If a registered user.
		if(hs.session.user) {
			hs.session.touch().save();
			io.sockets.emit("message", {	alias: hs.session.user.alias,
											text: text,
											timestamp: (new Date()).getTime() });
		}
	});

	socket.on("location", function(position) {
	  	/* use mongodb to search for location. TODO
	  	   Should return object array of rooms nearby 'position' in the format: 
	  		   	[ { name:"Computer Science Lab", 
	  				roomNum:"632", 
	  				building:"McCardell Bicentennial Hall",
	  				roomId:"f2Eq17",
	  				occupants:5 
	  			  } ]
	  	*/
	  	socket.emit("location", [ { name:"Computer Science Lab", // Mock filer data.
	  								roomNum:"632", 
	  								building:"McCardell Bicentennial Hall",
	  								roomId:"f2Eq17",
	  								occupants:5 
	  							  }, 
									{ name:"Computer Science Lab", // Mock filer data.
	  								roomNum:"531", 
	  								building:"McCardell Bicentennial Hall",
	  								roomId:"f2Eq17",
	  								occupants:5 
	  							  } ]);
	});

});