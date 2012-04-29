db.open(function(err, db) {
  if(!err) {
    console.log("Successfuly connected to MongoDB.");
    db.ollection('messages', function(err, collection) {

    });

  } else { console.log(err); }
}); 