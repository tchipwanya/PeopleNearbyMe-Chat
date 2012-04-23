

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
	this.login = function(user,password) {
		collection.find({username:username,password:password});
	};
	this.logout = function() {
		this.chatroomID=null;
	};
	this.enterRoom = function(roomID) {
		this.chatroomID=roomID;
	};
	this.updateUsername = function() {

	};
	this.updateEmail = function(email) {

	};
	this.setRoom = function(roomID) {
		this.chatroomID=roomID;
	};
	this.create = function(username,email,password) {
		this.username=username;
		this.email=email;
		this.password=password;
		var user = {username:username,email:email,password:password};
		db.user.insert(user);
	};
}

var will = new User();
will.create("william","william@wpotter.me","asdf");

