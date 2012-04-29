/* client.js subfile 3 */

// Handles when a user joins the chatroom
function userJoin(alias, timestamp) {
  addMessage(alias, "joined", timestamp, "join");
  for (var i = 0; i < aliases.length; i++)
    if (aliases[i] == alias) return;
  aliases.push(alias);
  updateUsersLink();
  who();
}

// Handles when a user leaves the chatroom
function userPart(alias, timestamp) {
  addMessage(alias, "left", timestamp, "part");
  for (var i = 0; i < aliases.length; i++) {
    if (aliases[i] == alias) {
      aliases.splice(i,1);
      break;
    }
  }
  updateUsersLink();
}

var first_poll = true;

function onMessage(data) {
      var message = data;
      if (message.timestamp > CONFIG.last_message_time)
        CONFIG.last_message_time = message.timestamp;

      switch (message.type) { // later on we can break these up into different callbacks and message types.
        case "msg":
          if (!CONFIG.focus) {
            CONFIG.unread++;
          }
          addMessage(message.alias, message.text, message.timestamp);
          break;

        case "join":
          userJoin(message.alias, message.timestamp);
          break;

        case "part":
          userPart(message.alias, message.timestamp);
          break;
      }
    updateTitle();

    // should we include this data in chatroom join callback?
    if (first_poll) {
      first_poll = false;
      who();
    }
}

function onError(data) {
  alert(data.error);
  showConnect();
}

//submit a new message to the server
function send(msg) {
  socket.emit("send", {id: CONFIG.id, text: msg});
  console.log("message: "+msg);
}

//handle the server's response to our alias and join request
function onJoin (session) {
  if (session.error) {
    alert("error connecting: " + session.error);
    showConnect();
    return;
  }

  CONFIG.alias = session.alias;
  CONFIG.id = session.id;

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

//add a list of present chat members to the stream
function outputUsers () {
  var alias_string = aliases.length > 0 ? aliases.join(", ") : "(none)";
  addMessage("users:", alias_string, new Date(), "notice");
  return false;
}

//get a list of the users presently in the room, and add it to the stream
function who() {

  socket.emit("who", {});
}

function whoCallback (data) {
    console.log(data);


    aliases = data.aliases;
    updateWhoList(aliases);
    //outputUsers();
}