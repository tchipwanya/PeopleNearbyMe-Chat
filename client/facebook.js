window.fbAsyncInit = function() {
	FB.init({
		appId			:'262579080505640', // App ID
		channelUrl		: '/channel', // Channel File
		status			: true, // check login status
		cookies			: true, // enable cookies to allow the server to access the session
		xfbml			: true  // parse XFBML
	});
};
// Load the SDK Asynchronously
(function(d){
	var js, id = 'facebook-jssdk', ref = d.getElementsByTagName('script')[0];
	if (d.getElementById(id)) {return;}
	js = d.createElement('script'); js.id = id; js.async = true;
	js.src = "//connect.facebook.net/en_US/all.js";
	ref.parentNode.insertBefore(js, ref);
}(document));