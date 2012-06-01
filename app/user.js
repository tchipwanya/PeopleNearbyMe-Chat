
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

		db.open(function(err, db) {
			if(!err) {
				console.log("Successfuly connected to MongoDB.");
				db.collection('user', function(err, collection) {
					collection.insert({username: username,email:email,password:password});
				});
			} else { console.log(err); }
		});
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

	this.updateUsername = function(name) {
		//check to see if a username is already in use

		db.open(function(err, db) {
			if(!err) {
				console.log("Successfuly connected to MongoDB.");
				db.collection('user', function(err, collection) {
					collection.find();
				});
			} else { console.log(err); }
		});
	};
	this.updateEmail = function(email) {
		var check = collection.find({email:{$exists : true}});
		if(check !== true){
			return false;
		}
	};

	this.updateUsername = function() {

	};
	this.updateEmail = function() {

	};
	this.setRoom = function(roomID) {
		this.chatroomID=roomID;
	};
	
	this.checkFlags = function(flagCount){
		
	};

};