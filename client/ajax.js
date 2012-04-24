/* client.js subfile 3 */

//handles another person joining chat
function userJoin(alias, timestamp) {
  //put it in the stream
  addMessage(alias, "joined", timestamp, "join");
  //if we already know about this user, ignore it
  for (var i = 0; i < aliass.length; i++)
    if (aliass[i] == alias) return;
  //otherwise, add the user to the list
  aliass.push(alias);
  //update the UI
  updateUsersLink();
}

//handles someone leaving
function userPart(alias, timestamp) {
  //put it in the stream
  addMessage(alias, "left", timestamp, "part");
  //remove the user from the list
  for (var i = 0; i < aliass.length; i++) {
    if (aliass[i] == alias) {
      aliass.splice(i,1);
      break;
    }
  }
  //update the UI
  updateUsersLink();
}

var transmission_errors = 0;
var first_poll = true;

//process updates if we have any, request updates from the server,
// and call again with response. the last part is like recursion except the call
// is being made from the response handler, and not at some point during the
// function's execution.
function longPoll (data) {
  if (transmission_errors > 2) {
    showConnect();
    return;
  }

  if (data && data.rss) {
    rss = data.rss;
    updateRSS();
  }

  //process any updates we may have
  //data will be null on the first call of longPoll
  if (data && data.messages) {
    for (var i = 0; i < data.messages.length; i++) {
      var message = data.messages[i];

      //track oldest message so we only request newer messages from server
      if (message.timestamp > CONFIG.last_message_time)
        CONFIG.last_message_time = message.timestamp;

      //dispatch new messages to their appropriate handlers
      switch (message.type) {
        case "msg":
          if(!CONFIG.focus){
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
    }
    //update the document title to include unread message count if blurred
    updateTitle();

    //only after the first request for messages do we want to show who is here
    if (first_poll) {
      first_poll = false;
      who();
    }
  }

  //make another request
  $.ajax({ cache: false,
           type: "GET",
           url: "/recv",
           dataType: "json",
           data: { since: CONFIG.last_message_time, id: CONFIG.id },
           error: function () {
             addMessage("", "long poll error. trying again...", new Date(), "error");
             transmission_errors += 1;
             //don't flood the servers on error, wait 10 seconds before retrying
             setTimeout(longPoll, 10*1000);
           },
          success: function (data) {
             transmission_errors = 0;
             //if everything went well, begin another request immediately
             //the server will take a long time to respond
             //how long? well, it will wait until there is another message
             //and then it will return it to us and close the connection.
             //since the connection is closed when we get data, we longPoll again
             longPoll(data);
             console.log(data);
           }
         });
}

//submit a new message to the server
function send(msg) {
  if (CONFIG.debug === false) {
    // XXX should be POST
    // XXX should add to messages immediately
    jQuery.get("/send", {id: CONFIG.id, text: msg}, function (data) { }, "json");
  }
}

//Transition the page to the state that prompts the user for a aliasname
function showConnect () {
  $("#connect").css('display','block');
  $("#loading").css('display','none');
  $("#toolbar").css('display','none');
  $("#log").css('display','none');
  $("#aliasInput").focus();
}

//transition the page to the loading screen
function showLoad () {
  $("#connect").css('display','none');
  $("#loading").css('display','block');
  $("#toolbar").css('display','none');
}

//transition the page to the main chat view, putting the cursor in the textfield
function showChat (alias) {
  $("#toolbar").css('display','block');
  $("#log").css('display','block');
  $("#entry").focus();

  $("#connect").css('display','none');
  $("#loading").css('display','none');

  scrollDown();
}

//handle the server's response to our aliasname and join request
function onConnect (session) {
  if (session.error) {
    alert("error connecting: " + session.error);
    showConnect();
    return;
  }

  CONFIG.alias = session.alias;
  CONFIG.id   = session.id;
  starttime   = new Date(session.starttime);
  rss         = session.rss;
  updateRSS();
  updateUptime();

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
  var alias_string = aliass.length > 0 ? aliass.join(", ") : "(none)";
  addMessage("users:", alias_string, new Date(), "notice");
  return false;
} 

//get a list of the users presently in the room, and add it to the stream
function who () {
  jQuery.get("/who", {}, function (data, status) {
    if (status != "success") return;
    aliass = data.aliass;
    outputUsers();
  }, "json");
}


