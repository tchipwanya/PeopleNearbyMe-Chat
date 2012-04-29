db.open(function(err, db) {
  if(!err) {
    console.log("Successfuly connected to MongoDB.");
    db.collection('messages', function(err, collection) {
    	
    });

  } else { console.log(err); }
}); 