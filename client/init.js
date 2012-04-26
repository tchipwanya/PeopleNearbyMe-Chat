/* client.js subfile 4 */
var socket = io.connect();
socket.on("recv", onMessage);
socket.on("join", onJoin);
socket.on("who", whoCallback);

$(document).ready(function() {

  /* Event binding */

  //submit new messages when the user hits enter if the message isnt blank
  $("#entry").keypress(function (e) {
    if (e.keyCode != 13 /* Return */) return;
    var msg = $("#entry").attr("value").replace("\n", "");
    if (!util.isBlank(msg)) send(msg);
    $("#entry").attr("value", ""); // clear the entry field.
  });

  //$("#usersLink").click(outputUsers);

  //try joining the chat when the user clicks the connect button
  $("#aliasForm").submit(function (i) {
    i.preventDefault();
    //lock the UI while waiting for a response
    showLoad();
    var alias = $("#aliasInput").attr("value");

    //dont bother the backend if we fail easy validations
    if (alias.length > 50) {
      alert("alias too long. 50 character max.");
      showConnect();
      return false;
    }

    //more validations
    if (/[^\w_\-^!]/.exec(alias)) {
      alert("Bad character in alias. Can only have letters, numbers, and '_', '-', '^', '!'");
      showConnect();
      return false;
    }

    //make the actual join request to the server
    socket.emit("join", { alias: alias });
    return true;
  });

  /*if (CONFIG.debug) {
    $("#loading").hide();
    $("#connect").hide();
    scrollDown();
    return;
  }*/

  // remove fixtures
  //$("#log div").remove();

  //begin listening for updates right away
  //interestingly, we don't need to join a room to get its updates
  //we just don't show the chat stream to the user until we create a session
  //longPoll(); // not necessary since socket is always long-polling.

  showConnect(); // possibly move to socket join response callback.
});

//if we can, notify the server that we're going away.
$(window).unload(function () {
  socket.emit("part", {id: CONFIG.id});
});