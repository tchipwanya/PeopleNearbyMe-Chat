/* Subfile 1 */

HOST = null; // localhost
PORT = 8001;

// when the daemon started
var starttime = (new Date()).getTime();

var mem = process.memoryUsage();
// every 10 seconds poll for the memory.
setInterval(function () {
	mem = process.memoryUsage();
}, 10*1000);


var fu = require("./fu"),
	sys = require("sys"),
	url = require("url"),
	qs = require("querystring");

var MESSAGE_BACKLOG = 200,
	SESSION_TIMEOUT = 60 * 1000;

//used to be below "interval to kill sessions"

fu.listen(Number(process.env.PORT || PORT), HOST);


fu.get("/", fu.staticHandler("index.html"));
fu.get("/style.css", fu.staticHandler("style.css"));
fu.get("/client.js", fu.staticHandler("client.js"));
//fu.get("/blue.jpg", fu.staticHandler("blue.jpg"));
fu.get("/jquery-1.2.6.min.js", fu.staticHandler("jquery-1.2.6.min.js"));