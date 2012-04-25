

var mongodb = require('mongodb');
var collection;
var server = new mongodb.Server("127.0.0.1", 27017, {});
var db = new mongodb.Db('nodechat', server, {});
db.open(function (error, client) {
	if (error) throw error;
	collection = new mongodb.Collection(client, 'user');
});


/*
Database
o	Users
o	ID
o	Email
o	Facebook Hash
o	Password Hash
o	Chat Room ID
o	Username
o	Valid?

*/
function User() {
	var id,email,fbToken,chatroomID,username,valid;
	
	this.create = function(username,email,password) {
		this.username=username;
		this.email=email;
		this.password=password;
		var user = {username:username,email:email,password:password};
		db.user.insert(user);
	
	};	
	this.login = function(user,password) {
		collection.find({username:username,password:password});
	
	};
	this.logout = function() {
		this.chatroomID=null;
	};
	this.enterRoom = function(roomID) {
		this.chatroomID=roomID;
	};
<<<<<<< HEAD
	this.updateUsername = function(name) {
		//check to see if a username is already in use
		var check = collection.find({name:{$exists : true}});
		if(check !=true){
			return false;	//need to tell the user the name is invalid	
		};
	};
	this.updateEmail = function(email) {
		var check = collection.find({email:{$exists : true}});
		if(check != true){
			return false;	//need to tell the user the name is invalid	
		};
=======
	this.updateUsername = function() {
		write("You're current username is" + username);
		var username = prompt("Username", "type username here");
		write("You're new username is" + username);
	};
	this.updateEmail = function() {
		write("You're current email is" + email);
		var email = prompt("Email", "type email here");
		write("You're new email is" + email);
>>>>>>> Updated User Model, just filled it out a bit
	};
	this.setRoom = function() {
		write("You're current room is" + roomID);
		var roomID = prompt("Room", "type room here");
		this.chatroomID=roomID;
	};

}

var will = new User();
will.create("william","william@wpotter.me","asdf");
will.updateUsername("Will");
will.updateEmail("will@middlebury.edu);

var trevor =new User();
trevor.create("trevor","tharron@middlebury.edu","1234");

