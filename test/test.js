var Browser = require("zombie");
var assert = require("assert");

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

browser.clickLink("logout", function() {
  	assert.equal(browser.text("title"), "");
});