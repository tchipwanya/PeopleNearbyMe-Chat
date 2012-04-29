exports.index = function(req, res){
	res.render('index', { loggedIn: req.session.hasOwnProperty("user") })
};
