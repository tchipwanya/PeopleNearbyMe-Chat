/* Subfile 3 */

var sessions = {};

function createSession (nick) {
	if (nick.length > 50) return null;
	if (/[^\w_\-^!]/.exec(nick)) return null;

	for (var i in sessions) {
		var session = sessions[i];
		if (session && session.nick === nick) return null;
	}

	var session = {
		nick: nick,
		id: Math.floor(Math.random()*99999999999).toString(),
		timestamp: new Date(),

		poke: function () {
			session.timestamp = new Date();
		},

		destroy: function () {
			channel.appendMessage(session.nick, "part");
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
