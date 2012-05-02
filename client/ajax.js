/* client.js subfile 3 */

// Handles when a user joins the chatroom

function onSomeoneJoin(data) {
	var alias = data.alias;
	var timestamp = data.timestamp;
	addMessage(alias, "joined", timestamp, "join");
	updateTitle();      
	for (var i = 0; i < aliases.length; i++)
		if (aliases[i] == alias) return;
	aliases.push(alias);
	updateUsersLink();
}

// Handles when a user leaves the chatroom

function onSomeonePart(data) {
	var alias = data.alias;
	var timestamp = data.timestamp;

	addMessage(alias, "left", timestamp, "part");
	for (var i = 0; i < aliases.length; i++) {
		if (aliases[i] == alias) {
			aliases.splice(i,1);
			break;
		}
	}
    updateWhoList();
	updateTitle();
	updateUsersLink();
}


function onMessage(data) {
	if (!CONFIG.focus) {
		CONFIG.unread++;
	}
	if (data.timestamp > CONFIG.last_message_time)
		CONFIG.last_message_time = data.timestamp;
	addMessage(data.alias, data.text, data.timestamp);
	updateTitle();
}

function onError(data) {
	showConnect(data.error);
}

// submit a new message to the server
function send(msg) {
	socket.emit("send", {id: CONFIG.id, text: msg});
}

//handle the server's response to our alias and join request
function onJoin (data) {
	if (data.error) {
		showConnect(data.error);
		return;
	}

	CONFIG.alias = data.alias;
	CONFIG.id = data.id;
	CONFIG.room = data.room;
	updateRoomTitle();
	
    aliases = data.aliases;
    updateWhoList();

	//update the UI to show the chat
	showChat(CONFIG.alias);

	//listen for browser events so we know to update the document title
	$(window).bind("blur", function() {
		CONFIG.focus = false;
		updateTitle();
	});

	$(window).bind("focus", function() {
		CONFIG.focus = true;
		CONFIG.unread = 0;
		updateTitle();
	});
}