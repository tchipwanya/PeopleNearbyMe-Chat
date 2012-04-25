exports.index = function(req, res){
  res.render('index', { title: 'this object is sent as a parameter to index.jade' })
};
