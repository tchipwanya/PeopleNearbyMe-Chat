/* server.js subfile 1 */

/* Mongodb connection */

var mongo = require('mongodb')
  , Server = mongo.Server
  , Db = mongo.Db
  , server = new Server('localhost', 27017, {auto_reconnect: true})
  , BSON = mongo.BSONPure
  , db = new Db('peoplenearbyme', server)
  , MongoStore = require('connect-mongodb');

/* Express init */

var express = require('express')
  , routes = require('./routes')
  , io = require('socket.io')
  , sessionStore = new MongoStore({db: db, reapInterval: 1000 * 60 * 60 })
  , connect = require('connect')
  , Session = connect.middleware.session.Session
  , parseCookie = connect.utils.parseCookie
  , app = module.exports = express.createServer()
  , io = io.listen(app);

/* Configuration */

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
            if (err) {
              accept(err, false);
            } else if (!session) {
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

/* Routes */

app.get('/', routes.index);

var PORT = process.env.PORT || 3000;
if (!module.parent) {
  app.listen(PORT, function(){
    console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
  });
}


/* server.js subfile 4 */

db.open(function(err, db) {
	if (err) { 
		console.log(err); 
	} else {
		io.sockets.on("connection", function (socket) { 
			var hs = socket.handshake; // don't store shit here, not persistent over pageloads.
			var room = null;

		    // setup an inteval that will keep our session fresh
		    var intervalID = setInterval(function () {
		        // reload the session (just in case something changed
		        hs.session.reload( function () {
		            // "touch" it (resetting maxAge and lastAccess) and save it back again.
		            hs.session.touch().save();
		        });
		    }, 60 * 1000);

		    socket.on('disconnect', function (data) {
		        // clear the socket interval to stop refreshing the session
		        clearInterval(intervalID);
		    });

			function createSession (socket, alias) {
			//facebook or anoynomous
				if (/[^\w_\-^!]/.exec(alias)) return "Alias contains invalid characters.";
				if (alias === null) return "Alias was not included in join request.";
				if (alias.length === 0) return "You forgot to enter your alias silly.";
				if (alias.length > 50) return "The alias you entered is too long.";
				// if (alias.flagCount >= 5) return "you have been banned for poor conduct.";

				var clients = io.sockets.in(room._id).clients();
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
	    		db.collection('rooms', function(err, collection) { 			
					if (userData.roomInput) {  			
	    				room = {name: userData.roomInput};
	    				// TODO validation here of roomInput
	    				room = collection.insert(room); //TODO see what this function returns
	    				onRetrieveRoom();
					} else if (userData.roomSelect) {
			    		collection.findOne({'_id': new BSON.ObjectID(userData.roomSelect)}, function(err, item) {
			    			if(!err) { 
			    				room = item;
			    				onRetrieveRoom(); 
				    		} else { 
				    			console.log(err); 
				    		}
			    		}); 
					} else { 
						socket.emit("error", {error: "No room specified."});
						return null; 
					}
				});
				
		/*just a function increasing the flag counter
			function flagCount(){
				var user = { alias: alias };
				var session = socket.handshake.session;
				var flagged = handshake.session.user.flagCount;//get this stuff make sure query is right
				flagged++;	
				if (flagged > 5){
					flagged = 0;
					flagged.save();
					 socket.on('disconnect', function (data) { //logging out
		        // clear the socket interval to stop refreshing the session
		        	clearInterval(intervalID);
				}
				flagged.save(); //saving the flag count before kicking out
			};*/
		

				function onRetrieveRoom() {
					var alias = userData.alias;
					var error = "";

					if (!alias){ error += "Alias was not included in join request. "; }
					if (/[^\w_\-^!]/.exec(alias)) { error += "Alias contains invalid characters and is far too silly. "; }
					if (alias.length === 0) { error += "You forgot to enter your alias silly. "; }
					if (alias.length > 50) { error += "The alias you entered is too long. "; }

					var clients = io.sockets.in(room._id).clients();

					for (var i in clients) {
						var client = clients[i];
						var user = client.handshake.session.user;
						if (user && user.alias === alias) { error += "The alias you entered is already in use."; }
					}

					if(error.length !== 0) {
						socket.emit("error", {error: error});
						return null;
					}

					if (!room) { 
						socket.emit("error", {error: "Room could not be resolved."});
						return null;
					}

					socket.join(room._id);  // TODO insert room join codez
					var user = { alias: alias, room: room};
					var session = socket.handshake.session;
					
					session.user = user;
					session.save();

					var aliases = who();
					console.log("RIGHT HERE");
					console.log(userData);
					socket.broadcast.to(room._id).emit("someoneJoin", {	user: user,
															timestamp: (new Date()).getTime() });

					socket.emit("join", { 	id: hs.sessionID, 
											alias: hs.session.user.alias,
											aliases: aliases,
											room: room });
				};
			});
			
			
			function who() {
				var aliases = [];
				var clients = io.sockets.in(room._id).clients();
				for (var i in clients) {
					client = clients[i];
					var user = client.handshake.session.user;
					if(user) {
						aliases.push(user.alias);
					}
				}
				return aliases;
			}

			socket.on("rejoin", function (userData) {
				var user = hs.session.user;
				socket.join(user.room._id);
				room = user.room;
				var aliases = who();
				socket.emit("rejoin", { 	id: hs.sessionID, 
											alias: user.alias,
											aliases: aliases,
											room: user.room});
				socket.broadcast.to(room._id).emit("someoneJoin", {	user: user,
																	timestamp: (new Date()).getTime() });
			});

			socket.on("part", function (userData) {
				if(room) {
					socket.leave(room._id);
				}

				socket.broadcast.to(room._id).emit("someonePart", {	alias: userData.alias,
														timestamp: (new Date()).getTime() });
				clearInterval(intervalID);
			});

			socket.on("logout", function (userData) {
				socket.broadcast.to(room._id).emit("someonePart", {	alias: hs.session.user.alias,
																	timestamp: (new Date()).getTime() });
				if(room) {
					socket.leave(room);
				}

				clearInterval(intervalID);
				hs.session.destroy();
				hs.session.regenerate().save();
				console.log(hs.session);
			});


			socket.on("send", function (userData) {
				var id = userData.id;
				var text = userData.text;
				// If a registered user.
				if(hs.session.user) {
					hs.session.touch().save();
					io.sockets.in(room._id).emit("message", {	alias: hs.session.user.alias,
													text: text,
													timestamp: (new Date()).getTime() });
				}
			});

			socket.on("location", function(position) {
			  	/* 	   	Future schema?
			  			{ 	name:"Computer Science Lab", 
			  				roomNum:"632", 
			  				building:"McCardell Bicentennial Hall",
			  				roomId:"f2Eq17",
			  				occupants:5 
			  			 }
			  	*/

			    db.collection('rooms', function(err, collection) {
			    	collection.find().toArray(function(err, items) {
			    		socket.emit("location", items);
			    	});
			    });

			});
		});
	}
});