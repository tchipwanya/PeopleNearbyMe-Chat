/* client.js subfile 4 */
var socket = io.connect();
socket.on("recv", onMessage);
socket.on("join", onJoin);
socket.on("who", whoCallback);
socket.on("error" onError);
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

  showConnect(); // possibly move to socket join response callback.
});

//if we can, notify the server that we're going away.
$(window).unload(function () {
  socket.emit("part", {id: CONFIG.id});
});