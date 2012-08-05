/* Constants */

var GOOGLE_API_KEY = "AIzaSyDUyWoBTnAqU5faKSREgi4-xfw1Slzk-0Q",
	NUM_PLACES_RESULTS = 5,
  	MONGO_DEV_USER = '',
  	MONGO_DEV_PASS = '',
  	MONGO_PROD_USER = 'heroku_app4027608',
  	MONGO_PROD_PASS = 'd8fc6548a8d78b52cf1b6b47c277ae52';

/* Requires and Global Setups */
var mongo = require('mongodb'),
	Server = mongo.Server,
	Db = mongo.Db,
	server = new Server('localhost', 27017, {auto_reconnect: true}),
	BSON = mongo.BSONPure,
	db = new Db('peoplenearbyme', server),
	MongoStore = require('connect-mongodb'),
	sessionStore = new MongoStore({db: db, reapInterval: 1000 * 60 * 60 }),
	express = require('express'),
	routes = require('./routes'),
	http = require('http'),
	https = require('https'),
	io = require('socket.io'),
	connect = require('connect'),
	Session = connect.middleware.session.Session,
	parseCookie = connect.utils.parseCookie;

/* Mongo Authentication Setup */

/* Express setup */

var app = module.exports = express.createServer();

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
  app.use(express.errorHandler());
});

app.configure(function() {
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.static(__dirname + '/public', { maxAge: 86400000 })); // one day
  app.use(express.cookieParser());
  app.use(express.session({	store: sessionStore, 
							secret: 'JHgzU1IWXZmAJpETpPgTYsjtiojqn7mseIbzboQW', 
							key: 'express.sid'}));
  app.use(app.router);
});

/* Routes */

app.get('/', routes.index);
app.get('/channel.html', routes.channel)

/* App start */

var PORT = process.env.PORT || 3000;
//if (!module.parent) { // If you only want to listen as root module
app.listen(PORT, function(){
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
});
io = io.listen(app); // Reassigning var io from library to instance
//}

/* Socket.io Setup */

io.configure(function(){
	io.set("transports", ["xhr-polling"]);
	io.set("polling duration", 10);
	io.set("authorization", function (data, accept) {
		if (data.headers.cookie) {
			data.cookie = parseCookie(data.headers.cookie);
			data.sessionID = data.cookie['express.sid'];
			data.sessionStore = sessionStore;
			sessionStore.get(data.sessionID, function (err, session) {
				if (!err && session) {  // Express session will always exist before socket.io connects.
					data.session = new Session(data, session);
					accept(null, true);
				} else {
					accept(err, false);
				}
			});
		} else {
		   return accept('No cookie transmitted.', false);
		}
	});
});

io.configure('development', function() {
	io.set('log level', 0);
});

io.configure('production', function() {
	io.enable('browser client minification');  
	io.enable('browser client etag');          
	io.enable('browser client gzip');          
	io.set('log level', 1);                    
});

/* Application Implementation */

db.open(function(err1, db) {
	if (!err1 && db)
		if(process.env.NODE_ENV == 'production')
			dbWrapper.authenticate(MONGO_PROD_USER, MONGO_PROD_PASS, start);			
		else
			start(err1, db);		
	else
		console.log(err1);
});

function start(err2,db) {
			if(!err2 && db) {
				db.ensureIndex('rooms', { coords : "2d" }, function(err, fieldName) {
					if(!err)
						console.log("Geospatial Index created named: "+fieldName);
					else
						console.log("mongodb error 573");
				});

				io.sockets.on("connection", function (socket) {
					var hs = socket.handshake;
					var intervalID = setInterval(function () { // setup an inteval that will keep our session fresh
						hs.session.reload( function () { // reload the session (just in case something changed			
							hs.session.touch().save(); // "touch" it (resetting maxAge and lastAccess) and save it back again.
						});
					}, 60 * 1000);

					socket.on('disconnect', function (data) {
					// clear the socket interval to stop refreshing the session
						var session = hs.session;
						if(session.roomID) {
							socket.broadcast.to(session.roomID).emit("someonePart", {	alias: session.user.alias,
																		timestamp: (new Date()).getTime() });
							socket.leave(session.roomID);
						}
						clearInterval(intervalID);
					});

					socket.on("join", function (userData) {
						db.collection('rooms', function(err, collection) {
							if (userData.roomSelect && validateRoomSelect(userData.roomSelect)) {
								if(userData.roomSelect.length === 40){ // google places id
									var room = { roomID: userData.roomSelect };
									onRoomRetrieved(userData.alias, room);
								} else {
									var query = {'_id': BSON.ObjectID.createFromHexString(userData.roomSelect)};
									collection.findOne(query, function(err, item) {
											if(!err)
												onRoomRetrieved(userData.alias,item);
											else 
												console.log("mongodb error 2"); 
									}); 
								}
							} else if (userData.roomInput && validateRoomInput(userData.roomInput)) {  			
								room = { name: userData.roomInput };
								var session = hs.session
								room.coords = [session.lat,session.lng];
								collection.insert(room, {safe:true}, function(err, records) {
									if(!err)
										onRoomRetrieved(userData.alias, records[0]);
									else
										console.log("mongodb error 23");
								});
							} else {
								socket.emit("error", {error: "No room specified."});
								return null; 
							}
						});
					});

					function onRoomRetrieved(alias, room) { // deciding to validate alias after room is queried.	
						var roomID;
						if(room.roomID && room.roomID.length === 40)
							roomID = room.roomID;
						else
							roomID = room._id.toHexString();

						if(validateAlias(alias, roomID)) {
							if (!room) {
								socket.emit("error", {error: "Room could not be resolved."});
								return null;
							}

							var user = { alias: alias };

							socket.join(roomID);

							var session = hs.session;
							session.user = user;
							session.roomID = roomID;
							session.save();

							var users = who(roomID);
							socket.broadcast.to(roomID).emit("someoneJoin", { user: session.user, timestamp: (new Date()).getTime() });
							socket.emit("join", {	sessionID: hs.sessionID,
													users: users,
													room: room });
						}
					}

					/*socket.on("rejoin", function (userData) {
						var user = hs.session.user;
						socket.join(user.room._id);
						room = user.room;
						var aliases = who();
						socket.emit("rejoin", { 	sessionID: hs.sessionID, 
													alias: user.alias,
													aliases: aliases,
													room: user.room});
						socket.broadcast.to(room._id).emit("someoneJoin", {	user: user,
																			timestamp: (new Date()).getTime() });
					}); */


					socket.on("logout", function (userData) {
							socket.broadcast.to(hs.session.roomID).emit("someonePart", {	alias: hs.session.user.alias,
							timestamp: (new Date()).getTime()
						});
						socket.leave(hs.session.roomID);
						delete hs.session.user;
						delete hs.session.roomID;
						delete hs.session.lat;
						delete hs.session.lng;
						//clearInterval(intervalID);
						//hs.session.destroy();
						//hs.session.regenerate().save();
						//	console.log(hs.session);
						//hs.session.close();
					});


					socket.on("send", function (userData) {
						// If a registered user.
						if(hs.session.user) {
							hs.session.touch().save();
							io.sockets.in(hs.session.roomID).emit("message", { 
								alias: hs.session.user.alias,
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

						var session = hs.session
						session.lat = lat;
						session.lng = lng;
						session.save();

						var options = {
							host: "maps.googleapis.com",
							path: "/maps/api/place/search/json?",
							ssl: true
						}

						var params = {
							key: GOOGLE_API_KEY,
							location: lat.toString()+","+lng.toString(),
							radius: 100, // 100m default
							sensor: true
						}

						REST.getJSON(options, params, function(status, response){
							//console.log(response.status);
							//console.log(response.results);
							//44.013506, -73.180891
							db.collection('rooms', function(err, collection) {
								collection.find( { coords:{$near:[lat,lng]} } ).toArray(function(err, items) {
									for(var x in items)
										items[x].roomID = items[x]._id.toHexString();
									for(var x = 0; x < NUM_PLACES_RESULTS && x < response.results.length; x++)
										response.results[x].roomID = response.results[x].id;
									var retArray = items.concat(response.results.splice(0,NUM_PLACES_RESULTS));
									for(var x in retArray)
										retArray[x].numUsers = io.sockets.clients(retArray[x].roomID).length;
									socket.emit("location", retArray);
								});
							});
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

					function validateRoomInput(input) { return true; } // TODO
					function validateRoomSelect(select) { return true; } // TODO
					function validateAlias(alias, roomID) {
						var error = "";
						if (!alias) {
							error += "Alias was not included in join request. "; 
						}
						// if (/[^\w_\-^!]/.exec(alias)){ error += "Alias contains invalid characters and is far too silly. "; }
						// if (alias.length === 0) { error += "You forgot to enter your alias silly. "; }
						// if (alias.length > 50) { error += "The alias you entered is too long. "; }

						var clients = io.sockets.clients(roomID);

						for (var i in clients) {
							var client = clients[i];
							var session = client.handshake.session;
							if (session.user && session.user.alias === alias)
								error += "The alias you entered is already in use.";
						}

						if(error.length !== 0) {
							socket.emit("error", {error: error});
							return false;
						} else return true;
					}
				});
			} else console.log(err2);
}


var REST = {
	getJSON: function (options, params, callback) {

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
			
			res.on('data', function (chunk) {
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
}