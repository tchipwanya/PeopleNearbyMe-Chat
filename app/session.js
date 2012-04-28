/* server.js subfile 3 */

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
}, 10000); */