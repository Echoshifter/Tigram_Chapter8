var args = arguments[0] || {};

var updating = false;

// EVENT LISTENERS
// on android, we need the change event not the click event
$.filter.addEventListener( OS_ANDROID ? 'change' : 'click', filterClicked);

//the android OS has a "back" button, ios does not
$.friendsWindow.addEventListener("androidback", androidBackEventHandler);

/**
 * called when the back button is clicked, we will close the window
 * and stop event from bubble up and closing the app
 *
 * @param {Object} _event
 */
function androidBackEventHandler(_event) {
	
	//event bubbling is a natural aspect of events (in most languges and platforms that support the concpets of
	//events and event-handling).  What it means is that events "bubble" up to parent UI elements and, if an event is 
	//handled here, on the spot, a parent UI element can handle the event.  These two lines of code prevent further
	//bubbling up the UI hierarchy
	_event.cancelBubble = true;
	_event.bubbles = false;
	
	//debug message that prints in the IDE
	Ti.API.debug("androidback event");
	$.friendsWindow.removeEventListener("androidback", androidBackEventHandler);
	$.friendsWindow.close();
}

/**
 * This function takes the event and determines which list of users should be displayed.  Since the
 * Android and iOS UI elements are different, we must handle the indicies in each list differently. 
 *
 * @param {Object} _event 
 */
function filterClicked(_event) {
	var itemSelected;
	
	//since the UI element being used is different on each platform
	//we do another ternary operator 
	itemSelected = !OS_ANDROID ? _event.index : _event.rowIndex;

	// clear the ListView display
	$.section.deleteItemsAt(0, $.section.items.length);

	// call the appropriate function to update the display
	switch (itemSelected) {
		case 0 :
			//filters for all users - except friends
			getAllUsersExceptFriends();
			break;
		case 1 :
			//filters for just friends
			loadFriends();
			break;
	}
}

/**
 * Event handler for following/friending a user in the ListView.  When complete
 * we call the updateFollowersFriendsLists method to reflect the new selection. We next
 * update the $.friendUserCollection by calling getAllUsersExceptFriends.  As soon as the
 * $.friendUserCollection is updated, the UI ListView will update
 * 
 * @param {Object} _event
 */
function followBtnClicked(_event) {

	Alloy.Globals.PW.showIndicator("Updating User");

	var currentUser = Alloy.Globals.currentUser;
	var selUser = getModelFromSelectedRow(_event);

	currentUser.followUser(selUser.model.id, function(_resp) {
		if (_resp.success) {

			// update the lists IF it was successful
			updateFollowersFriendsLists(function() {

				// update the UI to reflect the change
				getAllUsersExceptFriends(function() {
					Alloy.Globals.PW.hideIndicator();
				});
			});

		} else {
			alert("Error trying to follow " + selUser.displayName);
		}
		Alloy.Globals.PW.hideIndicator();

	});

	_event.cancelBubble = true;
};

/**
 * Gets the model (an object), from the collection, for the selected user using 
 * the model's id.  This is why it is important to specify this in the 
 * transform for the ListSection
 * 
 * @param {Object} _event
 */
function getModelFromSelectedRow(_event) {
	var item = _event.section.items[_event.itemIndex];
	var selectedUserId = item.properties.modelId;
	return {
		model : $.friendUserCollection.get(selectedUserId),
		displayName : item.userName.text,
	};
}

/**
 * This shows a list of those who have already been freinded.  We call it "following" as that
 * is the language of the API in ACS. We can unfollow here as this would be the event handler
 * for the button showing in the list of friends.
 *
 *  @param {Object} _event
 */
function followingBtnClicked(_event) {

	Alloy.Globals.PW.showIndicator("Updating User");

	var currentUser = Alloy.Globals.currentUser;
	var selUser = getModelFromSelectedRow(_event);

	currentUser.unFollowUser(selUser.model.id, function(_resp) {
		if (_resp.success) {

			// update the lists
			updateFollowersFriendsLists(function() {
				Alloy.Globals.PW.hideIndicator();

				// update the UI to reflect the change
				loadFriends(function() {
					Alloy.Globals.PW.hideIndicator();
					alert("You are no longer following " + selUser.displayName);
				});
			});

		} else {
			alert("Error unfollowing " + selUser.displayName);
		}

	});
	_event.cancelBubble = true;
};

/**
 * Shows a list of all users you are following and all users (all those who aren't friends)
 */
function initialize() {
	$.filter.index = 0;

	Alloy.Globals.PW.showIndicator("Loading...");

	updateFollowersFriendsLists(function() {
		Alloy.Globals.PW.hideIndicator();

		// get the users
		//this also selects the correct template for the ListView
		$.collectionType = "fullItem";

		getAllUsersExceptFriends();

	});
};

/**
 * This is a helper method that allows getAllUsersExceptFriends access
 * to an up-to-date list of a user's friends
 * @param {Object} _callback
 */
function updateFollowersFriendsLists(_callback) {
	var currentUser = Alloy.Globals.currentUser;

	// get the followers/friends id for the current user
	currentUser.getFollowers(function(_resp) {
		if (_resp.success) {
			$.followersIdList = _.pluck(_resp.collection.models, "id");

			// get the friends
			currentUser.getFriends(function(_resp) {
				if (_resp.success) {
					$.friendsIdList = _.pluck(_resp.collection.models, "id");
				} else {
					alert("Error updating friends and followers");
				}
				_callback();
			});
		} else {
			alert("Error updating friends and followers");
			_callback();
		}

	});
}

/**
 *  load a list of all friends
 * @param {Object} _callback
 */
function loadFriends(_callback) {
	var user = Alloy.Globals.currentUser;

	Alloy.Globals.PW.showIndicator("Loading Friends...");

	user.getFriends(function(_resp) {
		if (_resp.success) {
			if (_resp.collection.models.length === 0) {
				$.friendUserCollection.reset();
			} else {
				$.collectionType = "friends";
				$.friendUserCollection.reset(_resp.collection.models);
				$.friendUserCollection.trigger("sync");
			}
		} else {
			alert("Error loading followers");
		}
		Alloy.Globals.PW.hideIndicator();
		_callback && _callback();
	});
};

/**
 * This finds all users, save for friends.  Method uses the current list of friends
 * and calls the helper method updateFollowersFriendsList so that friends can be 
 * excluded from this colleciton.  
 * @param {Object} _callback
 */
function getAllUsersExceptFriends(_callback) {
	var where_params = null;

	// which template to use when rendering listView
	$.collectionType = "fullItem";

	Alloy.Globals.PW.showIndicator("Loading Users...");

	// remove all items from the collection
	$.friendUserCollection.reset();

	if ($.friendsIdList.length) {
		// set up where parameters using the $.friendsIdList
		// from the updateFollowersFriendsLists function call
		var where_params = {
			"_id" : {
				"$nin" : $.friendsIdList, // means NOT IN
			},
		};
	}

	// set the where params on the query
	$.friendUserCollection.fetch({
		data : {
			per_page : 100,
			order : '-last_name',
			where : where_params && JSON.stringify(where_params),
		},
		success : function() {
			// user collection is updated into
			// $.friendUserCollection variable
			Alloy.Globals.PW.hideIndicator();
			_callback && _callback();
		},
		error : function() {
			Alloy.Globals.PW.hideIndicator();
			alert("Error Loading Users");
			_callback && _callback();
		}
	});
}

/**
 * We need to produce just a subset of model attributes that conform to what
 * is specified in the ListSection element in the view.  We transform the original
 * model object into a reduced JavaScript object which contains just the properties we need
 * it is important to include the model id so that we can work with ACS and other
 * aspects of the application should that ListItem be selected in the User Interface 
 *
 *  @param {Object} model
 */
function doTransform(model) {

	var displayName,
	    image,
	    user = model.toJSON();

	// get the photo
	if (user.photo && user.photo.urls) {
		image = user.photo.urls.square_75 || user.photo.urls.thumb_100 || user.photo.urls.original || "missing.gif";
	} else {
		image = "missing.gif";
	}

	// get the display name
	if (user.first_name || user.last_name) {
		displayName = (user.first_name || "") + " " + (user.last_name || "");
	} else {
		displayName = user.email;
	}

	// return the object
	var modelParams = {
		title : displayName,
		image : image,
		modelId : user.id,
		template : $.collectionType
	};

	return modelParams;
};

/**
 * Any filtering desired as the collection is sent to the UI element - the ListView
 * can be specified here.  In this case, we leave own user (the user running the app), and
 * any administrative users, out of the list.
 * @param {Object} _collection
 */
function doFilter(_collection) {
	return _collection.filter(function(_i) {
		var attrs = _i.attributes;
		return ((_i.id !== Alloy.Globals.currentUser.id) && (attrs.admin === "false" || !attrs.admin));
	});
};

//call the initialize method when the view gets focus - to ensure that the correct list shows at first
$.getView().addEventListener("focus", function() {
	!$.initialized && initialize();
	$.initialized = true;
});
