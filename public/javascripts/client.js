// window.fbAsyncInit = function() {
// 	FB.init({
// 		appId			:'253250614745350',//'262579080505640', // PRODUCTION
// //		appId			:'408731785826423', // DEVELOPMENT		
// 		status			: true, // check login status
// 		cookies			: true, // enable cookies to allow the server to access the session
// 		xfbml			: true,  // parse XFBML
// 		oauth 			: true,
// 		channelUrl		: "//localhost:3000/pages/channel.html", 
// 	});
// 	FB.Event.subscribe('auth.authResponseChange', fbLoginStatusChanged);
// };

// // Load the SDK Asynchronously
// (function(d){
// 	var js, 
// 		id = 'facebook-jssdk', 
// 		ref = d.getElementsByTagName('script')[0];

// 	if (d.getElementById(id)) {return;}
// 	js = d.createElement('script'); 
// 	js.id = id; 
// 	js.async = true;
// 	js.src = "//connect.facebook.net/en_US/all.js";
// 	ref.parentNode.insertBefore(js, ref);
// }(document));

// function fbLogin() {
// 	FB.login(fbLoginStatusChanged, {scope:'email'});
// };

// function onFbLogout(response) {
// 	$('#aliasDisplay').css('display','none');
// 	$('#fbLogin').css('display','block');					
// }

// function fbLoginStatusChanged(response) {
// 	if(response.status === 'connected') {
// 		CONFIG.fbID = response.authResponse.userID;
// 		CONFIG.fbToken = response.authResponse.accessToken;
// 		FB.api('/me', onFbGraphResponse);
// 	} else if(response.status === 'not_authorized') {
// 		// user is logged into facebook but not the app. keep button where it is
// 	} else {
// 		// user is not logged into facebook or the application.
// 	}
// }

// function onFbGraphResponse(response) {
// 	CONFIG.alias = response.name;
// 	//console.log(response.name);
// 	//	$('#aliasInput').val(response.name);
// 	$('#aliasDisplay').html(response.name);
// 	$('#fbLogin').css('display','none');				
// 	$('#aliasDisplay').css('display','block');
// }

var CONFIG = {	alias: null,   // set in onConnect,
				// fbID: null,
				// fbToken: null,
				room: null,
				last_message_time: 1,
				focus: true, //event listeners bound in onConnect,
				unread: 0 //updated in the message-processing loop
			 };

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
	//  addMessage2("sys", ($("#log").scrollTop() +  $("#log").innerHeight()).toString
		//() + " " + ($("#log")[0].scrollHeight).toString() + " " + doAutoscroll );
	if (doAutoscroll) $("#log").scrollTop($("#log")[0].scrollHeight);
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

function gotLocation(position) {
	mapsInit(position);
	socket.emit("location", position);

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



function onLocation(data) {
	updateRoomList(data);
	mapsUpdate(data);
}


function mapsUpdate(rooms) {
	var myOptions = {
		center: new google.maps.LatLng(rooms[0].coords[0], rooms[0].coords[1]),
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

	for(var x in rooms) {
			// first set the center point of the marker
			var latlng = new google.maps.LatLng(rooms[x].coords[0], rooms[x].coords[1]);
			// now, create the marker
			var marker = new google.maps.Marker({
			    position: latlng,
			    map: map,
			    title: rooms[x].roomID

			});	

			google.maps.event.addListener(marker, 'click', function() {
				console.log(this.title);

				$("#roomSelect").val(this.title);				
		    });
		}
}


function bindEvents() {
	socket.on("connection", onConnect);
	socket.on("someoneJoin", onSomeoneJoin);
	socket.on("someonePart", onSomeonePart);
	socket.on("message", onMessage);
	socket.on("error", onError);
	socket.on("join", onJoin);
	socket.on("location", onLocation);
	socket.on("flag", onFlag);

	$("#entryForm").submit(onEntryFormSubmit);
	// $("#fbLogin").click(fbLogin);
	$("#joinForm").submit(onJoinFormSubmit);
	$("#logout").click(logout);
	$("#switch").click(switchRoom);
}



function onEntryFormSubmit(i) {
	i.preventDefault();
	var msg = $("#entry").val().replace("\n", "");
	if (!util.isBlank(msg))
		send(msg);
	$("#entry").val('');
}

function onJoinFormSubmit(i) {
	i.preventDefault();
	showLoad();

	var alias = $("#aliasInput").val();
	var roomSelect = $("#roomSelect").val();
	var roomInput = $("#roomInput").val();

	
	if(validate(alias, roomSelect, roomInput)) {
		CONFIG.alias = alias;
		var joinObj = { alias: CONFIG.alias	}
		if(roomSelect)
			joinObj.roomSelect = roomSelect;
		else if(roomInput)
			joinObj.roomInput = roomInput;

		// if(CONFIG.fbToken)
		// 	joinObj.fbToken = CONFIG.fbToken;
		// if(CONFIG.fbID)
		// 	joinObj.fbID = CONFIG.fbID;	
		socket.emit("join", joinObj);
		return true;
	}
}

/*function isLoggedIn() {
	return CONFIG.fbID && CONFIG.fbToken && CONFIG.alias;
}*/

function validate(alias, select, input) { // TODO
	var aliasValid = false; 
	var roomValid = false;
	var err = "";

	if(!(select || input))
		err += "Choose a room to join or name a new one. ";

	if(select)
		roomValid = true;

	if(input)
		if(input.length >= 3  && input.length < 80)
			roomValid = true;			
		else 
			err += "Room name must be longer than 4 character and shorter than 20 characters. ";

	if(alias)
		if(alias.length < 40)
			aliasValid = true;
		else 
			err += "Screen name must be shorter than 20 characters. ";
	else
		err+= "Enter a nickname.";

	/* if (/([A-Za-z0-9-\w]+)/.exec(input).length != 1) { // contains invalid characters
	 	showConnect("No weird room names allowed. Use only letters, numbers, spaces and hyphens.");
	 	return false;
	 }*/
	if(err != "")
		showConnect(err);

	return (aliasValid && roomValid);
}


//updates the users link to reflect the number of active users
function updateUserLinks ( ) {
	var t = CONFIG.users.length.toString() + " user";
	if (CONFIG.users.length != 1) t += "s";
	$("#usersLink").text(t);
}

//inserts an event into the stream for display
//the event may be a msg, join or part type
//from is the user, text is the body and time is the timestamp, defaulting to now
//_class is a css class to apply to the message, usefull for system events
//users is global for better or for worse...
function updateUserList() {
	$('#whoList').html('');
	var content = "";
	//console.log(users);
	for(var i in CONFIG.users) { //An attempt to make a drop down menu with the flag option
		var user = CONFIG.users[i];
		//console.log(user);		
		// content += '<ul class="dropv">'
		// content += '<li class="person"><a href = "#">';
		// content += alias;
		// content +='</a>';
		// content += '<ul>';
		// content += '<li><a href = "#">';
		// content += "Flag User";
		// content += '</a></li>';
		// content += '</ul>';
		// content += '</li>';
		// content +='</ul>';
		content += '<div class="person">';
		content += user; // for now user = alias
		content += '</div>';
		//content += '</br>';
	}
	$('#whoList').html(content);
}
function updateRoomList(rooms) {
	var content = "";
	console.log(rooms);
	for(var x in rooms) {
		console.log(rooms[x].coords);
		content += '<option value="'+rooms[x].roomID+'">';
		content += rooms[x].name;
		if(rooms[x].numUsers > 0)
			content += " ("+rooms[x].numUsers+")";
		//if(data[x].roomNum!= "000") {
		//	content+=" - "+data[x].roomNum;
		//}
		content += "</option>";
	}
	$('#roomSelect').html(content);
}
/*
function flagUser(){
	content = "";
	$('#dropv').click(onFlag(content));
	send(content);
}
*/
function addMessage(from, text, time, _class) {
	
	if (!text) {
		console.log("addMessage() just received a null message.");
		return;
	}
	
	if (!time)
		time = new Date();
	else if ((time instanceof Date) === false)
		time = new Date(time);
	

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

// show a count of unread messages when the window does not have focus
function updateTitle(){
	if (CONFIG.unread) {
		document.title = "(" + CONFIG.unread.toString() + ") #PeopleNearby.me";
	} else {
		document.title = "#PeopleNearby.me";
	}
}

function updateRoomTitle() {
	if(CONFIG.room) {
		$('#roomTitle').html(CONFIG.room.name);
	} else {
		console.log("CONFIG.room undefined for updateRoomTitle()");
	}
}

//Transition the page to the state that prompts the user for a alias
function showConnect(errorMessage) {
	if (errorMessage) {
		$("#error").html(errorMessage);
		$("#error").css('display', 'block');
	}
	$("#logout").css('display', 'none');
	$("#connect").css('display','block');
	$("#loading").css('display','none');
	$("#toolbar").css('display','none');
	$("#map_canvas").css('display','block');
	$("#chat").css('display','none');
	$("#aliasInput").focus();
}

//transition the page to the loading screen
function showLoad () {
	$("#logout").css('display', 'inline');	
	$("#error").css('display', 'none');
	$("#connect").css('display','none');
	$("#loading").css('display','block');
	$("#toolbar").css('display','none');
	$("#chat").css('display','none');
}

//transition the page to the main chat view, putting the cursor in the textfield
function showChat () {
	$("#logout").css('display', 'inline');	
	$("#map_canvas").css('display','none');
	$("#toolbar").css('display','block');
	$("#chat").css('display','block');
	$("#entry").focus();
	$("#error").css('display', 'none');
	$("#connect").css('display','none');
	$("#loading").css('display','none');

	scrollDown();
}

// called upon socket.io connection
function onConnect () {}

// handler for when another user joins a room.
function onSomeoneJoin(data) {
	var userAlias = data.user.alias;
	var userTimestamp = data.timestamp;      
	for (var i = 0; i < CONFIG.users.length; i++)
		if (CONFIG.users[i] == userAlias) return;
	CONFIG.users.push(userAlias);
	addMessage(userAlias, "joined", userTimestamp, "join");
	updateUserList();
	updateTitle();	
	updateUserLinks();
}

// Handles when a user leaves the chatroom

function onSomeonePart(data) {
	var userAlias = data.alias;
	var userTimestamp = data.timestamp;

	for (var i = 0; i < CONFIG.users.length; i++) {
		if (CONFIG.users[i] == userAlias) {
			CONFIG.users.splice(i,1);
			break;
		}
	}
	addMessage(userAlias, "left", userTimestamp, "part");
    updateUserList();
	updateTitle();
	updateUserLinks();
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
	socket.emit("send", { text: msg});
}

// Called when page is randomly left with no warning.
/*function part() {
	jQuery.ajax({
        url: '/part',
        async: false
    });
}*/

// Called when logout button is pressed.
function logout () {
	socket.emit("logout", {});
	FB.logout(onFbLogout);
 	CONFIG.room = null;
 	CONFIG.alias = null;
 	showConnect();
	//socket.server.close();
 	//socketConnect();
}

// Called when switch button is pressed.
function switchRoom () {
	socket.emit("switch", {});
 	CONFIG.room = null;
 	CONFIG.alias = null;
 	showConnect();
	//socket.server.close();
 	//socketConnect();
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

//handle the server's response to our alias and join request
function onJoin (data) {
	console.log(data);
	if (data.error) {
		showConnect(data.error);
		return;
	}

	CONFIG.alias = data.alias;
	CONFIG.room = data.room;
  CONFIG.users = data.users;

	// updateRoomTitle();
  updateUserList();
  console.log('show chat');
	showChat();

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

var socket = null;
function socketConnect() {
	socket = io.connect(); // DEVELOPMENT
	//socket = io.connect("http://www.peoplenearby.me"); // PRODUCTION
}

$(document).ready(function() {
	socketConnect();
	$("#aliasInput").focus();
	getLocation();
	bindEvents();
});