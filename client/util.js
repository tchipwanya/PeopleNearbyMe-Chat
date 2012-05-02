/* client.js subfile 1 */

var CONFIG = {alias: "#",   // set in onConnect,
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
	socket.on("someoneJoin", onSomeoneJoin);
	socket.on("someonePart", onSomeonePart);
	socket.on("message", onMessage);
	socket.on("error", onError);
	socket.on("join", onJoin);
	socket.on("location", onLocation);

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
}