PeopleNearby.me
===============

An geosocial app for conversing with people nearby you.
-------------------------------------------------------

# To run locally:

1. Install Node.js. Requires that Homebrew be installed. (http://mxcl.github.com/homebrew/)
	$ brew install node
2. Install dependencies with NPM:
	$ npm install
3. "Compile" source from subfiles:
	$ ./make.sh
4. Run application:
	$ node app.js
4. In your browser, navigate to [http://localhost:3000](http://localhost:3000).

# To deploy to Heroku:

1. In client/init.js line 2 uncomment the appropriate line:
	//var socket = io.connect(); // DEVELOPMENT
	var socket = io.connect("http://www.peoplenearby.me"); // PRODUCTION
2. Recompile source:
	./make.sh
3. Commit to git:
	git add .
	git commit -m "Deploying"
4. Push to heroku:
	git push heroku