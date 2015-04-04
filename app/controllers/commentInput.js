var parameters = arguments[0] || {};
var currentPhoto = parameters.photo || {};
var parentController = parameters.parentController || {};
var callbackFunction = parameters.callback || null;

//again, if IOS, then handle things a bit differently
OS_IOS && $.saveButton.addEventListener("click", handleButtonClicked);
OS_IOS && $.cancelButton.addEventListener("click", handleButtonClicked);

// EVENT HANDLERS
//this method supports both IOS and Android.  With IOS, we more-or-less use this directly
//with Android, we had to adjust to its GUI expectations prior to being able to use
//this method.
function handleButtonClicked(_event) {
	// set default to false
	var returnParams = {
		success : false,
		content : null
	};

	// if saved, then set properties
	if (_event.source.id === "saveButton") {
		returnParams = {
			success : true,
			content : $.commentContent.value
		};
	}

	// return to comment.js controller to add new comment
	// remember what code like this says: if callBackFunction exists, then we'll evaluate
	// the right operand of the && operator and do the callback
	// otherwise, nothing happens here.
	callbackFunction && callbackFunction(returnParams);

}

//otherwise, we are in ANDROID world, so we work with activities and action bars
function doOpen() {

	//since android is fundamentally different in terms of how it works
	//we move to an activity/actionbar/menu approach that is "native"
	//to android GUIs
	if (OS_ANDROID) {

		$.getView().activity.onCreateOptionsMenu = function(_event) {

			var activity = $.getView().activity;
			var actionBar = $.getView().activity.actionBar;

			if (actionBar) {
				actionBar.displayHomeAsUp = true;
				actionBar.onHomeIconItemSelected = function() {
					$.getView().close();
				};
			} else {
				alert("No Action Bar Found");
			}

			// add the button to the titlebar
			var mItemSave = _event.menu.add({
				id : "saveButton",
				title : "Save Comment",
				showAsAction : Ti.Android.SHOW_AS_ACTION_ALWAYS,
				icon : Ti.Android.R.drawable.ic_menu_save
			});

			// add save menu item
			mItemSave.addEventListener("click", function(_event) {
				_event.source.id = "saveButton";
				handleButtonClicked(_event);
			});

			var mItemCancel = _event.menu.add({
				id : "cancelButton",
				title : "Cancel",
				showAsAction : Ti.Android.SHOW_AS_ACTION_ALWAYS,
				icon : Ti.Android.R.drawable.ic_menu_close_clear_cancel
			});

			// add cancel menu item
			mItemCancel.addEventListener("click", function(_event) {
				_event.source.id = "cancelButton";
				handleButtonClicked(_event);
			});
		};
	}

	// set focus to the text input field, but
	// use set time out to give window time to draw
	setTimeout(function() {
		$.commentContent.focus();
	}, 400);

};