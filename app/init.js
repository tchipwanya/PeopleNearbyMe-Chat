/* Mongodb connection */

var mongo = require('mongodb')
  , Server = mongo.Server
  , Db = mongo.Db
  , server = new Server('localhost', 27017, {auto_reconnect: true})
  , BSON = mongo.BSONPure
  , db = new Db('peoplenearbyme', server)
  , MongoStore = require('connect-mongodb');
/* Ensure geospatial indexing */
db.collection('rooms', function(err, collection) {
  db.collection('rooms',{ coords : "2d" }, function() {
    console.log("Geospatial Index Created.");
  });
});


/* Express init */

var express = require('express')
  , routes = require('./routes')
  , io = require('socket.io')
  , sessionStore = new MongoStore({db: db, reapInterval: 1000 * 60 * 60 })
  , connect = require('connect')
  , Session = connect.middleware.session.Session
  , parseCookie = connect.utils.parseCookie
  , app = module.exports = express.createServer()
  , io = io.listen(app);

/* Configuration */

app.configure(function() {
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.static(__dirname + '/public'));
  app.use(express.cookieParser());
  app.use(express.session({store: sessionStore, secret: 'JHgzU1IWXZmAJpETpPgTYsjtiojqn7mseIbzboQW', key: 'express.sid'}));
  app.use(app.router);
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
  app.use(express.errorHandler());
});


io.configure(function () {
  //io.set('log level', 1); // reduce logging FOR PRODUCTION ONLY
  io.set("transports", ["xhr-polling"]);
  io.set("polling duration", 10);
  io.set('authorization', function (data, accept) {
    if (data.headers.cookie) {
        data.cookie = parseCookie(data.headers.cookie);
        data.sessionID = data.cookie['express.sid'];
        data.sessionStore = sessionStore;
        sessionStore.get(data.sessionID, function (err, session) {
            if (err) {
              accept(err, false);
            } else if (!session) {
              accept('Error null session', false);
            } else {
                data.session = new Session(data, session);
                accept(null, true);
            }
        });
    } else {
       return accept('No cookie transmitted.', false);
    }
  });
});

/* Routes */

app.get('/', routes.index);

var PORT = process.env.PORT || 3000;
if (!module.parent) {
  app.listen(PORT, function(){
    console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
  });
}


