window.fbAsyncInit = function() {
	FB.init({
		appId			:'262579080505640', // PRODUCTION
//		appId			:'408731785826423', // DEVELOPMENT		
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

function fbLogin() {
	FB.login(function(response) {
		if (response.authResponse) {
			FB.api('/me', function(response) {
				CONFIG.fbid = response.name;
				console.log(response.name);
				$('#aliasInput').val(response.name);
				$('#fbLogin').css('display','none');
				$('#aliasDisplay').html(response.name);
				$('#aliasDisplay').css('display','block');
			});
		} else {
		}
	});
};