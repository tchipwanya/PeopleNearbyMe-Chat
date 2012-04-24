/* client.js subfile 4 */

$(document).ready(function() {

  /* Event binding */

  //submit new messages when the user hits enter if the message isnt blank
  $("#entry").keypress(function (e) {
    if (e.keyCode != 13 /* Return */) return;
    var msg = $("#entry").attr("value").replace("\n", "");
    if (!util.isBlank(msg)) send(msg);
    $("#entry").attr("value", ""); // clear the entry field.
  });

  $("#usersLink").click(outputUsers);

  //try joining the chat when the user clicks the connect button
  $("#connectButton").click(function () {
    //lock the UI while waiting for a response
    showLoad();
    var alias = $("#aliasInput").attr("value");

    //dont bother the backend if we fail easy validations
    if (alias.length > 50) {
      alert("alias too long. 50 character max.");
      showConnect();
      return false;
    }

    //more validations
    if (/[^\w_\-^!]/.exec(alias)) {
      alert("Bad character in alias. Can only have letters, numbers, and '_', '-', '^', '!'");
      showConnect();
      return false;
    }
    
    //make the actual join request to the server
    $.ajax({ cache: false,
             type: "GET", // XXX should be POST
             dataType: "json",
             url: "/join",
             data: { alias: alias },
             error: function (xhr, ajaxOptions, thrownError) {
                console.log(xhr);
                console.log(ajaxOptions);
                console.log(thrownError);
                alert("Error connecting to server. "+thrownError);
                showConnect();
             },
             success: onConnect
           });
    return false;
  });

  // update the daemon uptime every 10 seconds
  setInterval(function () {
    updateUptime();
  }, 10*1000);

  if (CONFIG.debug) {
    $("#loading").hide();
    $("#connect").hide();
    scrollDown();
    return;
  }

  // remove fixtures
  $("#log div").remove();

  //begin listening for updates right away
  //interestingly, we don't need to join a room to get its updates
  //we just don't show the chat stream to the user until we create a session
  longPoll();

  showConnect();
});

//if we can, notify the server that we're going away.
$(window).unload(function () {
  jQuery.get("/part", {id: CONFIG.id}, function (data) { }, "json");
});