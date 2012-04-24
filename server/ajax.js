/* Subfile 4 */

fu.get("/who", function (req, res) {
	var nicks = [];
	for (var id in sessions) {
		if (!sessions.hasOwnProperty(id)) continue;
		var session = sessions[id];
		nicks.push(session.nick);
	}
	res.simpleJSON(200, { nicks: nicks,
							rss: mem.rss
						});
});

fu.get("/join", function (req, res) {
	var nick = qs.parse(url.parse(req.url).query).nick;
	if (nick === null || nick.length === 0) {
		res.simpleJSON(400, {error: "Bad nick."});
		return;
	}
	var session = createSession(nick);
	if (session === null) {
		res.simpleJSON(400, {error: "Nick in use"});
		return;
	}

	//sys.puts("connection: " + nick + "@" + res.connection.remoteAddress);

	channel.appendMessage(session.nick, "join");
	res.simpleJSON(200, { id: session.id,
						nick: session.nick,
						rss: mem.rss,
						starttime: starttime
						});
});

fu.get("/part", function (req, res) {
	var id = qs.parse(url.parse(req.url).query).id;
	var session;
	if (id && sessions[id]) {
		session = sessions[id];
		session.destroy();
	}
	res.simpleJSON(200, { rss: mem.rss });
});

fu.get("/recv", function (req, res) {
	if (!qs.parse(url.parse(req.url).query).since) {
		res.simpleJSON(400, { error: "Must supply since parameter" });
		return;
	}
	var id = qs.parse(url.parse(req.url).query).id;
	var session;
	if (id && sessions[id]) {
		session = sessions[id];
		session.poke();
	}

	var since = parseInt(qs.parse(url.parse(req.url).query).since, 10);

	channel.query(since, function (messages) {
		if (session) session.poke();
		res.simpleJSON(200, { messages: messages, rss: mem.rss });
	});
});

fu.get("/send", function (req, res) {
	var id = qs.parse(url.parse(req.url).query).id;
	var text = qs.parse(url.parse(req.url).query).text;

	var session = sessions[id];
	if (!session || !text) {
		res.simpleJSON(400, { error: "No such session id" });
		return;
	}

	session.poke();

	channel.appendMessage(session.nick, "msg", text);
	res.simpleJSON(200, { rss: mem.rss });
});