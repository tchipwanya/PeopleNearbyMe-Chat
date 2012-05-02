/* server.js subfile 4 */

db.open(function(err, db) {
	if (err) { 
		console.log(err); 
	} else {
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

		    socket.on('disconnect', function (data) {
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

				if (!alias){ error += "Alias was not included in join request. "; }
				if (/[^\w_\-^!]/.exec(alias)) { error += "Alias contains invalid characters and is far too silly. "; }
				if (alias.length === 0) { error += "You forgot to enter your alias silly. "; }
				if (alias.length > 50) { error += "The alias you entered is too long. "; }

				var clients = io.sockets.clients();

				for (var i in clients) {
					var client = clients[i];
					var user = client.handshake.session.user;
					if (user && user.alias === alias) { error += "The alias you entered is already in use."; }
				}

				if(error.length !== 0) {
					socket.emit("error", {error: error});
					return null;
				}

	    		db.collection('rooms', function(err, collection) {
	    			
	    			var room = null;
					if (userData.roomInput) {  			
	    				room = {name: userData.roomInput};
	    				collection.insert(room); //TODO see what this function returns
					} else if (userData.roomSelect) {
			    		collection.findOne({'_id': new BSON.ObjectID(userData.roomSelect)}, function(err, item) {
			    			if(!err) {
			    				room = item;
				    		} else { console.log(err); }
			    		});
					} else { 
						socket.emit("error", {error: "No room specified."});
						return null; 
					}

					//socket.join(room._id);  // TODO insert room join codez
					var user = { alias: alias, room: room._id};
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
											aliases: aliases,
											room: room });
				});
			});

			socket.on("part", function (userData) {
				clearInterval(intervalID);
				socket.broadcast.emit("someonePart", {	alias: userData.alias,
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