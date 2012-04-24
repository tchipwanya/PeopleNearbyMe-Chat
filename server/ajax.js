/* server.js subfile 4 */

fu.get("/who", function (req, res) {
	var aliases = [];
	for (var id in sessions) {
		if (!sessions.hasOwnProperty(id)) continue;
		var session = sessions[id];
		aliases.push(session.alias);
	}
	res.simpleJSON(200, { aliases: aliases});
});

fu.get("/join", function (req, res) {
	var alias = qs.parse(url.parse(req.url).query).alias;
	if (alias === null || alias.length === 0) {
		res.simpleJSON(400, {error: "Bad alias."});
		return;
	}
	var session = createSession(alias);
	if (session === null) {
		res.simpleJSON(400, {error: "alias in use"});
		return;
	}

	//sys.puts("connection: " + alias + "@" + res.connection.remoteAddress);

	channel.appendMessage(session.alias, "join");
	res.simpleJSON(200, { id: session.id,
						alias: session.alias
						});
});

fu.get("/part", function (req, res) {
	var id = qs.parse(url.parse(req.url).query).id;
	var session;
	if (id && sessions[id]) {
		session = sessions[id];
		session.destroy();
	}
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
		res.simpleJSON(200, { messages: messages});
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

	channel.appendMessage(session.alias, "msg", text);
});