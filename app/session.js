/* server.js subfile 3 */

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
}, 1000);