/* client.js subfile 1 */

var CONFIG = {	alias: "#",   // set in onConnect,
				room: null,
				id: null,    // set in onConnect,
				last_message_time: 1,
				focus: true, //event listeners bound in onConnect,
				unread: 0 //updated in the message-processing loop
			 };

var aliases = [];

/* Returns a description of this past date in relative terms.
 * Takes an optional parameter (default: 0) setting the threshold in ms which
 * is considered "Just now".
 *
 * Examples, where new Date().toString() == "Mon Nov 23 2009 17:36:51 GMT-0500 (EST)":
 *
 * new Date().toRelativeTime()
 * --> 'Just now'
 *
 * new Date("Nov 21, 2009").toRelativeTime()
 * --> '2 days ago'
 *
 * // One second ago
 * new Date("Nov 23 2009 17:36:50 GMT-0500 (EST)").toRelativeTime()
 * --> '1 second ago'
 *
 * // One second ago, now setting a now_threshold to 5 seconds
 * new Date("Nov 23 2009 17:36:50 GMT-0500 (EST)").toRelativeTime(5000)
 * --> 'Just now'
 *
 */
Date.prototype.toRelativeTime = function(now_threshold) {
	var delta = new Date() - this;

	now_threshold = parseInt(now_threshold, 10);

	if (isNaN(now_threshold)) {
		now_threshold = 0;
	}

	if (delta <= now_threshold) {
		return 'Just now';
	}

	var units = null;
	var conversions = {
		millisecond: 1, // ms    -> ms
		second: 1000,   // ms    -> sec
		minute: 60,     // sec   -> min
		hour:   60,     // min   -> hour
		day:    24,     // hour  -> day
		month:  30,     // day   -> month (roughly)
		year:   12      // month -> year
	};

	for (var key in conversions) {
		if (delta < conversions[key]) {
			break;
		} else {
			units = key; // keeps track of the selected key over the iteration
			delta = delta / conversions[key];
		}
	}

	// pluralize a unit when the difference is greater than 1.
	delta = Math.floor(delta);
	if (delta !== 1) { units += "s"; }
	return [delta, units].join(" ");
};

/*
 * Wraps up a common pattern used with this plugin whereby you take a String
 * representation of a Date, and want back a date object.
 */
Date.fromString = function(str) {
	return new Date(Date.parse(str));
};

util = {
	urlRE: /https?:\/\/([-\w\.]+)+(:\d+)?(\/([^\s]*(\?\S+)?)?)?/g,

	//html sanitizer
	toStaticHTML: function(inputHtml) {
		inputHtml = inputHtml.toString();
		return inputHtml.replace(/&/g, "&amp;")
										.replace(/</g, "&lt;")
										.replace(/>/g, "&gt;");
	},

	//pads n with zeros on the left,
	//digits is minimum length of output
	//zeroPad(3, 5); returns "005"
	//zeroPad(2, 500); returns "500"
	zeroPad: function (digits, n) {
		n = n.toString();
		while (n.length < digits)
			n = '0' + n;
		return n;
	},

	//it is almost 8 o'clock PM here
	//timeString(new Date); returns "19:49"
	timeString: function (date) {
		var minutes = date.getMinutes().toString();
		var hours = date.getHours().toString();
		var ampm = "am"
		if (hours > 12) {
			ampm = "pm";
			hours -= 12;
		}
		return hours + ":" + this.zeroPad(2, minutes) + ampm;
	},

	//does the argument only contain whitespace?
	isBlank: function(text) {
		var blank = /^\s*$/;
		return (text.match(blank) !== null);
	}
};

//used to keep the most recent messages visible
function scrollDown () {
	var doAutoscroll = (($("#log").scrollTop()+ $("#log").innerHeight() + 40)>=($("#log")[0].scrollHeight));
	//  addMessage2("sys", ($("#log").scrollTop() +  $("#log").innerHeight()).toString() + " " + ($("#log")[0].scrollHeight).toString() + " " + doAutoscroll );
	if (doAutoscroll) $("#log").scrollTop($("#log")[0].scrollHeight);
}

function gotLocation(position) {
	mapsInit(position);
	socket.emit("location", position);
}

function onLocation(data) {
	updateRoomList(data);
}
function mapsInit(position) {
	var myOptions = {
		center: new google.maps.LatLng(position.coords.latitude, position.coords.longitude),
		zoom: 16,
		zoomControl: false,
		streetViewControl: false,
		scaleControl: false,
		rotateControl: false,
		panControl: false,
		overviewMapControl: false,
		mapTypeControl: false,
		disableDoubleClickZoom: true,
		scrollwheel: false,
		mapTypeId: google.maps.MapTypeId.HYBRID
	};
	var map = new google.maps.Map(document.getElementById("map_canvas"), myOptions);
}

function getLocation() {
	if (navigator.geolocation) {
		navigator.geolocation.getCurrentPosition(gotLocation,
			function (error) {
				switch(error.code) {
					case error.TIMEOUT:
						console.log('Timeout');
						break;
					case error.POSITION_UNAVAILABLE:
						console.log('Position unavailable');
						break;
					case error.PERMISSION_DENIED:
						console.log('Permission denied');
						break;
					case error.UNKNOWN_ERROR:
						console.log('Unknown error');
						break;
				}
			});
	} else {
		console.log("Error: Old or non-compliant browser.");
	}
}

function bindEvents() {
	socket.on("connection", onConnect);
	socket.on("someoneJoin", onSomeoneJoin);
	socket.on("someonePart", onSomeonePart);
	socket.on("message", onMessage);
	socket.on("error", onError);
	socket.on("join", onJoin);
	socket.on("rejoin", onReJoin);
	socket.on("location", onLocation);
	socket.on("flag", onFlag)

	// Entry send
	$("#entryForm").submit(function (i) { 
		i.preventDefault();
		var msg = $("#entry").val().replace("\n", "");
		if (!util.isBlank(msg))
			send(msg);
		$("#entry").val('');
	});

	// Try joining the chat when the user clicks the connect button
	$("#joinForm").submit(function (i) {
		i.preventDefault();
		showLoad();
		var alias = $("#aliasInput").val();
		var roomSelect = $("#roomSelect").val(); // I <3 jQuery
		var roomInput = $("#roomInput").val();

		if (alias.length > 50) {
			showConnect("alias too long. 50 character max.");
			return false;
		}
		if (alias.length < 4){
			showConnect("alias too short. Enter at least 4 characters");
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

	$("#logout").click(logout);
}/* client.js subfile 2 */

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
//aliases is global for better or for worse...
function updateWhoList() {
	$('#whoList').html('');
	var content = "";
	for(var i in aliases) { //An attempt to make a drop down menu with the flag option
		var alias = aliases[i];
		content += '<ul class="dropv">'
		content += '<li class="person"><a href = "#">';
		content += alias;
		content +='</a>';
		content += '<ul>';
		content += '<li><a href = "#">';
		content += "Flag User";
		content += '</a></li>';
		content += '</ul>';
		content += '</li>';
		content +='</ul>';
	}
	//
	$('#whoList').html(content);
}
function updateRoomList(data) {
	$('#roomSelect').html('');

	var content = "";
	for(var x in data) {
		content += '<option value="'+data[x]._id+'">';
		content += data[x].name;
		if(data[x].roomNum!= "000") {
			content+=" - "+data[x].roomNum;
		}
		content += "</option>";
	}
	$('#roomSelect').html(content);
}

function flagUser(){
	content = "";
	$('#dropv').click(onFlag(content));
	send(content);
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

function updateRoomTitle() {
	$("#roomTitle").html(CONFIG.room);
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
/* client.js subfile 3 */

// Handles when a user joins the chatroom

function onConnect () {

}

function onSomeoneJoin(data) {
	var alias = data.user.alias;
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

// Called when page is randomly left with no warning.
function part() {
	socket.emit("part", {id: CONFIG.id}); // Session not deleted.
}

// Called when logout button is explicitly pressed.
function logout () {
	socket.emit("logout", {});
// fuck it just reloading page
	window.location.reload();

// 	CONFIG.id = null;
// 	CONFIG.room = null;
// 	CONFIG.alias = null;
// 	showConnect();
//	socket.server.close();
// 	socketConnect();
}

function onFlag(){ 
	var user = data.user;
	var flagged = socket.handshake.session.user.flagCount;//get this stuff make sure query is right
		flagged++;	
		send(flagged);
		socket.emit("flagged",{});
	if (flagged > 5){
			flagged = 0;
			flagged.save();
	 		logout;
	 	}
	flagged.save();
}

function reJoin() {
	socket.emit("rejoin", {});
}

// return of reJoin emit.
function onReJoin(data) {
	CONFIG.alias = data.alias;
	CONFIG.room = data.room;
	CONFIG.id = data.id;
	aliases = data.aliases;
	updateWhoList();
	updateRoomTitle();
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
}/* client.js subfile 4 */
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