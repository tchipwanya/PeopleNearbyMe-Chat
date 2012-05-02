/* client.js subfile 4 */

var socket = io.connect(); // DEVELOPMENT
//var socket = io.connect("http://www.peoplenearby.me"); // PRODUCTION

$(document).ready(function() {
  if($("#content").attr("showChat") === "true")
    showChat();
  else
    showConnect();
  getLocation();
  bindEvents();
});

//if we can, notify the server that we're going away.
$(window).unload(function () {
  socket.emit("part", {id: CONFIG.id});
});