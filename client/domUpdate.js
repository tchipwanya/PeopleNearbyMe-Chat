/* client.js subfile 2 */

//updates the users link to reflect the number of active users
function updateUsersLink ( ) {
  var t = aliases.length.toString() + " user";
  if (aliases.length != 1) t += "s";
  $("#usersLink").text(t);
}

//inserts an event into the stream for display
//the event may be a msg, join or part type
//from is the user, text is the body and time is the timestamp, defaulting to now
//_class is a css class to apply to the message, usefull for system events
function updateWhoList(aliases) {
  $('#who').html('');
  var content = "";
  for(var x in aliases) {
    var alias = aliases[x];
    content += '<div class="person">';
    content += alias;
    content += '</div>';
  }
  $('#who').html(content);
}
function addMessage (from, text, time, _class) {
  if (text === null)
    return;

  if (time === null) {
    // if the time is null or undefined, use the current time.
    time = new Date();
  } else if ((time instanceof Date) === false) {
    // if it's a timestamp, interpret it
    time = new Date(time);
  }

  //every message you see is actually a table with 3 cols:
  //  the time,
  //  the person who caused the event,
  //  and the content
  var messageElement = $(document.createElement("div"));

  messageElement.addClass("message");
  if (_class)
    messageElement.addClass(_class);

  // sanitize
  text = util.toStaticHTML(text);

  // If the current user said this, add a special css class
  var alias_re = new RegExp(CONFIG.alias);
  if (alias_re.exec(text))
    messageElement.addClass("personal");

  // replace URLs with links
  text = text.replace(util.urlRE, '<a target="_blank" href="$&">$&</a>');

  var content = '<div>';
  content+= '  <span class="date">' + util.timeString(time) + '</span>';
  content+= '  <span class="alias">' + util.toStaticHTML(from) + '</span>';
  content+= '  <span class="msg-text">' + text  + '</td>';
  content+= '</div>';
              
  messageElement.html(content);
  $("#log").append(messageElement);
  scrollDown();
}

//we want to show a count of unread messages when the window does not have focus
function updateTitle(){
  if (CONFIG.unread) {
    document.title = "(" + CONFIG.unread.toString() + ") #PeopleNearby.me";
  } else {
    document.title = "#PeopleNearby.me";
  }
}

//Transition the page to the state that prompts the user for a alias
function showConnect (errorMessage) {
  if (errorMessage)
    $("#error").html(errorMessage).css('display', 'block');
  
  $("#connect").css('display','block');
  $("#loading").css('display','none');
  $("#toolbar").css('display','none');
  $("#map_canvas").css('display','block');
  $("#log").css('display','none');
  $("#who").css('display','none');
  $("#aliasInput").focus();
}

//transition the page to the loading screen
function showLoad () {
  $("#error").css('display', 'none');
  $("#connect").css('display','none');
  $("#loading").css('display','block');
  $("#toolbar").css('display','none');

}

//transition the page to the main chat view, putting the cursor in the textfield
function showChat (alias) {
  $("#map_canvas").css('display','none');
  $("#toolbar").css('display','block');
  $("#log").css('display','block');
  $("#who").css('display','block');
  $("#entry").focus();
  $("#error").css('display', 'none');
  $("#connect").css('display','none');
  $("#loading").css('display','none');

  scrollDown();
}
