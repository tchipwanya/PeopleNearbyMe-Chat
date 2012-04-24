/* Subfile 2 */

var channel = new function () {
	
	var messages = [], 
		callbacks = [];

	this.appendMessage = function (nick, type, text) {
		var m = { nick: nick,
							type: type, // "msg", "join", "part",
							text: text,
							timestamp: (new Date()).getTime()
						};

		switch (type) {
			case "msg":
				sys.puts("<" + nick + "> " + text);
				break;
			case "join":
				sys.puts(nick + " join");
				break;
			case "part":
				sys.puts(nick + " part");
				break;
		}

		messages.push( m );

		while (callbacks.length > 0) {
			callbacks.shift().callback([m]);
		}

		while (messages.length > MESSAGE_BACKLOG)
			messages.shift();
	};

	this.query = function (since, callback) {
		var matching = [];
		for (var i = 0; i < messages.length; i++) {
			var message = messages[i];
			if (message.timestamp > since)
				matching.push(message);
		}

		if (matching.length !== 0) {
			callback(matching);
		} else {
			callbacks.push({ timestamp: new Date(), callback: callback });
		}
	};

	// clear old callbacks
	// they can hang around for at most 30 seconds.
	setInterval(function () {
		var now = new Date();
		while (callbacks.length > 0 && now - callbacks[0].timestamp > 30*1000) {
			callbacks.shift().callback([]);
		}
	}, 3000);
};
