// Constants 
var GOOGLE_API_KEY = "AIzaSyDUyWoBTnAqU5faKSREgi4-xfw1Slzk-0Q",
		NUM_PLACES_RESULTS = 5,
		SECRET = 'JHgzU1IWXZmAJpETpPgTYsjtiojqn7mseIbzboQW',
		COOKIE = 'express.sid',
		PORT = process.env.PORT || 3000;

// Mongoose init 
var mongoose = require('mongoose'),
		ObjectID = require('mongodb').ObjectID;
mongoose.connect('mongodb://localhost/peoplenearbyme');
var db = mongoose.connection;

// Express requires 
var express = require('express'),
		connect = require('connect'),
		http = require('http'),
		https = require('https');

// Express init 
var app = express();

// Express plumbing


var cookieParser = express.cookieParser(SECRET),
		sessionStore = new express.session.MemoryStore();
app.set('view engine', 'jade');
app.set('views', __dirname + '/views');
app.engine('jade', require('jade').__express);
app.use(express.bodyParser());
app.use(express.methodOverride());
// app.use(express.directory('public'));
app.use(cookieParser);
app.use(connect.session({ key: COOKIE, store: sessionStore }));
app.use(express.static('public'));

// Conditional configs
app.configure('development', function() {
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});
app.configure('production', function() {
  app.use(express.errorHandler());
});

// Routes 
app.get('/', function(req, res) {
	res.render('index', {})
});

// Express server init, io init
var server = http.createServer(app),
		io = require('socket.io').listen(server);

// io config 
io.set("transports", ["xhr-polling"]);
io.set("polling duration", 10);
io.set('authorization', function(handshake, callback) { // https://github.com/alphapeter/socket.io-express
  if (handshake && handshake.headers && handshake.headers.cookie) {
	  cookieParser(handshake, {}, function(err) {
	      if(err) {
	          return callback('COOKIE_PARSE_ERROR', false);
	      }
	      var sessionId = handshake.signedCookies[COOKIE];
	      sessionStore.get(sessionId, function(err, session) {
	          if(err || !session) {//|| !session.auth || !session.auth.loggedIn) {
	              callback('NOT_LOGGED_IN', false);
	          }
	          else{
	              handshake.session = session;
	              callback(null, true);
	          }
	      });
	  });
  } else {
      return callback('MISSING_COOKIE', false);
  }
});

// io conditional config
io.configure('development', function() {
	io.set('log level', 0);
});
io.configure('production', function() {
	io.enable('browser client minification');  
	io.enable('browser client etag');          
	io.enable('browser client gzip');          
	io.set('log level', 1);                    
});

// Server start 
server.listen(PORT)
console.log("Express server listening on port %d in %s mode", PORT, app.settings.env);

/* Mongoose Models */
var roomSchema = new mongoose.Schema({
	name: String,
	roomID: String, 
	coords: [Number, Number]
});
roomSchema.index({ coords : "2d" });
var Room = mongoose.model('Room', roomSchema);

/* Mongoose */
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function callback() {
	io.sockets.on("connection", function(socket) {
		var session = socket.handshake.session;
		// var intervalID = setInterval(function() { // setup an inteval that will keep our session fresh
			// session.reload( function() { // reload the session (just in case something changed			
			// session.touch().save(); // "touch" it (resetting maxAge and lastAccess) and save it back again.
			// });
		// }, 60 * 1000);

		socket.on('disconnect', function(data) {	// clear the socket interval to stop refreshing the session
			if(session.roomID) {
				socket.broadcast.to(session.roomID)
					.emit("someonePart", { 
						alias: session.user.alias, 
						timestamp: (new Date()).getTime() 
					});
				socket.leave(session.roomID);
			}
			// clearInterval(intervalID);
		});

		socket.on("join", function(userData) {
			if (validateRoomSelect(userData.roomSelect)) {
				Room.findOne({ '_id': new ObjectID(userData.roomSelect) }, function(err, room) {
					if(!err) {
						finishJoin(userData.alias, room);
					} else {
						console.log(err);
						socket.emit("error", {error: "Database error."});
					}
				});
			} else if (validateRoomInput(userData.roomInput)) {
				room = {
					name: userData.roomInput,
					coords: [session.lat,session.lng]
				};
				room = new Room(room).save(function(err, room) {
					if (!err) {
						finishJoin(userData.alias, room);
					} else {
						console.log("error 42");
						socket.emit("error", {error: "Db error"});						
					}
				});
			} else {
				socket.emit("error", {error: "No room specified."});
			}
		});

		function finishJoin(alias, room) { // deciding to validate alias after room is queried.	
			var roomID = room._id;
			if(validateAlias(alias, roomID)) {
				socket.join(roomID);
				session.user = { alias: alias };
				session.roomID = roomID;
				// session.save();
				var users = who(roomID);
				socket.broadcast.to(roomID).emit("someoneJoin", { user: session.user, timestamp: (new Date()).getTime() });
				socket.emit("join", {	alias: alias, users: users, room: room });
			}
		}

		/*socket.on("rejoin", function(userData) {
			var user = session.user;
			socket.join(user.room._id);
			room = user.room;
			var aliases = who();
			socket.emit("rejoin", { 	sessionID: sessionID, 
										alias: user.alias,
										aliases: aliases,
										room: user.room});
			socket.broadcast.to(room._id).emit("someoneJoin", {	user: user,
																timestamp: (new Date()).getTime() });
		}); */


		socket.on("logout", function(userData) {
				socket.broadcast.to(session.roomID).emit("someonePart", {	alias: session.user.alias,
				timestamp: (new Date()).getTime()
			});
			socket.leave(session.roomID);
			delete session.user;
			delete session.roomID;
			delete session.lat;
			delete session.lng;
			//clearInterval(intervalID);
			//session.destroy();
			//session.regenerate().save();
			//	console.log(session);
			//session.close();
		});


		socket.on("send", function(userData) {
			// If a registered user.
			if(session.user) {
				console.log(session);
				// session.touch().save();
				io.sockets.in(session.roomID).emit("message", { 
					alias: session.user.alias,
					text: userData.text,
					timestamp: (new Date()).getTime()
				});
			}
		});
		
		//connecting the flagging socket
		
		socket.on("location", function(position) {
			/* Future schema?
				{	name:"The Lobby",
					roomNum:"000",
					building:"Burlington City Hall",
					roomId:"asdf",
					occupants:200,
					coords:[44.476190, -73.213063]
				}*/
			
			var lat = position.coords.latitude;
			var lng = position.coords.longitude;

			session.lat = lat;
			session.lng = lng;
			// session.save();

			Room.find({ coords: { $near:[lat,lng] } }, function(err, items) {
				for(var x in items)
					items[x].roomID = items[x]._id;
				for(var x in items)
					items[x].numUsers = io.sockets.clients(items[x].roomID).length;
				socket.emit("location", items);
			});
		});

		function who(roomID) {
			var users = [];
			var clients = io.sockets.clients(roomID);
			for (var i in clients) {
				var client = clients[i];
				var user = client.handshake.session.user;
				if(user) {
					users.push(user.alias);
				}
			}
			return users;
		}

		function validateRoomInput(input) { 
			if (input)
				return true; 
			else return false;
		}
		function validateRoomSelect(select) { 
			if (select)
				return true; 
			else return false;
		} // TODO
		function validateAlias(alias, roomID) {
			var error = "";
			if (!alias) {
				error += "Alias was not included in join request. "; 
			}
			// if (/[^\w_\-^!]/.exec(alias)) { error += "Alias contains invalid characters and is far too silly. "; }
			// if (alias.length === 0) { error += "You forgot to enter your alias silly. "; }
			// if (alias.length > 50) { error += "The alias you entered is too long. "; }

			var clients = io.sockets.clients(roomID);

			for (var i in clients) {
				var client = clients[i];
				var clientSession = client.handshake.session;
				if (clientSession.user && clientSession.user.alias === alias)
					error += "The alias you entered is already in use.";
			}

			if(error.length !== 0) {
				socket.emit("error", {error: error});
				return false;
			} else return true;
		}
	});
});

function getJSON(options, params, callback) {

	var keyValuePairs = [];
	for (var prop in params) {
		if (params.hasOwnProperty(prop)) {
			keyValuePairs.push(prop + "=" + params[prop]);
		}
	}
	params = keyValuePairs.join("&");

	var client;
	if(!options.ssl) {
		options.port = 80;
		client = http;
	} else {
		options.port = 443;
		client = https;
	}

	delete options.ssl;

	options.path = options.path + params;
	options.method = 'GET';
	options.headers = {
		Referer: "localhost"
	}

	//console.log(options.host+options.path);
	var req = client.request(options, function(res) {
		//console.log("statusCode: ", res.statusCode);
		//console.log("headers: ", res.headers);
		res.setEncoding('utf8');
		var output = '';
		
		res.on('data', function(chunk) {
			output += chunk;
		});

		res.on('end', function() {
			var obj = JSON.parse(output);
			callback(res.statusCode, obj);
		});
	});
	req.end();		
	req.on('error', function(err) {
		console.log('error: ' + err.message);
	});
}