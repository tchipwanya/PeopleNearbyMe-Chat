var Browser = require("zombie");
var assert = require("assert");

// just little test at beginning
// Load the page from localhost
browser = new Browser()

browser.on("error", function(error) {
  console.error(error);
})

browser.visit("http://localhost:3000/").
  then(function() {
    assert.equal(browser.text("title"), "");
  }).
  fail(function(error) {
    console.log("Oops", error);
});

// need to add more later