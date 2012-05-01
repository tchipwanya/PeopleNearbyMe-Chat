/* client.js subfile 4 */
var socket = io.connect(); // DEVELOPMENT
//var socket = io.connect("http://www.peoplenearby.me"); // PRODUCTION
socket.on("recv", onMessage);
socket.on("join", onJoin);
socket.on("who", whoCallback);
socket.on("location", locationCallback);
socket.on("error", onError);
$(document).ready(function() {
  if($("#content").attr("showChat") === "true")
    showChat();
  else
    showConnect();

  getLocation();
  /* Event binding */

  $("#entry").keypress(function (e) {
    if (e.keyCode != 13 /* Return */) return;
    var msg = $("#entry").attr("value").replace("\n", "");
    if (!util.isBlank(msg)) send(msg);
    $("#entry").attr("value", ""); // clear the entry field.
  });

  //try joining the chat when the user clicks the connect button
  $("#joinForm").submit(function (i) {
    i.preventDefault();
    showLoad();
    var alias = $("#aliasInput").attr("value");
    var roomSelect = "ROOM_SELECT_VAL"; // TODO FIGURE OUT HOW TO GET OPTION SELECTED HERE
    var roomInput = $("#roomInput").attr("value");

    if (alias.length > 50) {
      showConnect("alias too long. 50 character max.");
      return false;
    }

    if (alias.length === 0) {
      showConnect("You forgot to enter your alias silly.");
      return;
    }

    //more validations
    if (/[^\w_\-^!]/.exec(alias)) {
      showConnect("Bad character in alias. Can only have letters, numbers, and '_', '-', '^', '!'");
      return false;
    }

    // TODO validate roomInput.

    //make the actual join request to the server
    socket.emit("join", { alias: alias, roomInput: roomInput, roomSelect: roomSelect });
    return true;
  });
});

//if we can, notify the server that we're going away.
$(window).unload(function () {
  socket.emit("part", {id: CONFIG.id});
});