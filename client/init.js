/* client.js subfile 4 */
var socket = null;
function socketConnect() {
	socket = io.connect(); // DEVELOPMENT
	//var socket = io.connect("http://www.peoplenearby.me"); // PRODUCTION
}

socketConnect();
$(document).ready(function() {
	if($("#content").attr("showChat") === "true") {
		showChat();
		reJoin();
	} else {
		showConnect();
	}
	getLocation();
	bindEvents();
});

//if we can, notify the server that we're going away.
$(window).unload(part);