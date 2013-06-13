PeopleNearby.me
===============
## 	A website for chatting with people nearby.

### Deployment

1. Change server address in client/init.js line 2. Uncomment the appropriate line:
	//var socket = io.connect(); // DEVELOPMENT
	var socket = io.connect("http://www.peoplenearby.me"); // PRODUCTION
2. Disable verbose logging in app/init.js line 37. Uncomment it.
	io.set('log level', 1); // reduce logging FOR PRODUCTION ONLY
3. Recompile source:
	./make.sh
4. Commit locally to git:
	git add .
	git commit -m "Deploying"
5. Push to heroku:
	git push heroku
6. Reverse your changes in steps 1+2 and re-commit locally to prevent pushing production settings to github.

### TODO

* Convert session store over to [MongoDB](https://github.com/masylum/connect-mongodb)
* Maintain user list on client side.
* Convert timestamps to 12-hour.
* Add multiple chatroom functionality.
