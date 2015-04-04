
//these variables are for UI components and other flag variables
//to determine if the progress window is currently being displayed
var activityIndicator,
    showingIndicator,
    activityIndicatorWindow,
    progressTimeout;
var progressIndicator = null;

//this is moving ahead a bit, but we need to behave differently in Android
var androidContainer = null;

//the exports keyword below, at the start of each method name,
//comes from CommonJS and is a means of making:
// a) a module that can be then used by the "require" statement
// b) can be used in other files/code (as mentioned in a above)

/**
 * showIndicator will make an "progress" window and can be updated
 * by the progress of some external progress bar
 * @param {Object} _messageString
 * @param {Object} _progressBar
 */
exports.showIndicator = function(_messageString, _progressBar) {
	
	//debug info
	Ti.API.info('showIndicator: ' + _messageString);

	// if adroid, we need a container for progress bar to make
	// it more visible - this doesn't come up until later in the book
	// so this code comes from the author's repo
	if (OS_ANDROID) {
		
		//this is straight-up titanium code - no Alloy here
		androidContainer = Ti.UI.createView({
			top : "200dp",
			width : Ti.UI.FILL,
			height : Ti.UI.SIZE,
			opacity : 1.0,
			backgroundColor : 'black',
			color : 'black',
			visible : true
		});
	}

	//create the window
	activityIndicatorWindow = Titanium.UI.createWindow({
		top : 0,
		left : 0,
		width : "100%",
		height : "100%",
		backgroundColor : "#58585A",
		opacity : .7,
		fullscreen : true
	});

	//this is the code from the repo and not early in the chapter.
	if (_progressBar === true) {
		// adjust spacing, size and color based on platform
		activityIndicator = Ti.UI.createProgressBar({
			//style : OS_IOS && Titanium.UI.iPhone.ProgressBarStyle.PLAIN,
			style : OS_IOS ? Titanium.UI.iPhone.ProgressBarStyle.DARK : Ti.UI.ActivityIndicatorStyle.DARK, 
			top : ( OS_IOS ? "200dp" : '10dp'),
			bottom : ( OS_ANDROID ? '10dp' : undefined),
			left : "30dp",
			right : "30dp",
			min : 0,
			max : 1,
			value : 0,
			message : _messageString || "Loading, please wait.",
			color : "white",
			font : {
				fontSize : '20dp',
				fontWeight : "bold"
			},
			opacity : 1.0,
			backgroundColor : ( OS_ANDROID ? 'black' : 'transparent')
		});
	} else {
		
		//this is the code from early in the chapter
		activityIndicator = Ti.UI.createActivityIndicator({
			style : OS_IOS ? Ti.UI.iPhone.ActivityIndicatorStyle.BIG : Ti.UI.ActivityIndicatorStyle.BIG,
			top : "10dp",
			right : "30dp",
			bottom : "10dp",
			left : "30dp",
			message : _messageString || "Loading, please wait.",
			color : "white",
			font : {
				fontSize : '20dp',
				fontWeight : "bold"
			},
			// style : 0
		});
	}

	// if android, you need to account for container when
	// setting up window for display
	if (OS_ANDROID) {
		//this code comes later in the book/chapter
		androidContainer.add(activityIndicator);
		activityIndicatorWindow.add(androidContainer);
		activityIndicatorWindow.open();
	} else {
		//this is the original code from early in the chapter
		activityIndicatorWindow.add(activityIndicator);
		activityIndicatorWindow.open();
	}
	
	//show the indicator
	activityIndicator.show();
	//flip on the flag variable
	showingIndicator = true;

	// safety catch all to ensure the screen eventually clears
	// after 25 seconds <- this is the original comment, however, the value below is 35 seconds
	// it is printed this way in the book too.
	progressTimeout = setTimeout(function() {
		exports.hideIndicator();
	}, 35000);
};

exports.setProgressValue = function(_value) {
	activityIndicator && activityIndicator.setValue(_value);
};

/**
 * Hides the activity/progress indicator
 */
exports.hideIndicator = function() {

	//this is set to true when the progress window was closed due to a timeout
	//that timeout is also what called this function
	if (progressTimeout) {
		//resets the timeout timer
		clearTimeout(progressTimeout);
		//nullifies/resets the value
		progressTimeout = null;
	}

	//debug code to be viewed in the IDE
	Ti.API.info("hideIndicator");
	if (!showingIndicator) {
		return;
	}

	//hide the window
	activityIndicator.hide();


	//CLEAN UP
	// if android, you need to account for container when
	// cleaning up window
	if (OS_ANDROID) {
		androidContainer.remove(activityIndicator);
		activityIndicatorWindow.remove(androidContainer);
		androidContainer = null;
	} else {
		//a variation on the code at the beginning of chapter 8
		activityIndicator && activityIndicatorWindow.remove(activityIndicator);
	}
	
	//close out and nullify the object
	activityIndicatorWindow.close();
	activityIndicatorWindow = null;

	// clean up flag variable and UI object variables
	showingIndicator = false;
	activityIndicator = null;
}; 