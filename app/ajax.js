/* server.js subfile 4 */

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