//get the parameters passed to the controller
var parameters = arguments[0] || {};
var currentPhoto = parameters.photo || {};
var parentController = parameters.parentController ||{};

/*
 * WE need to load comments into the view when the controller is opened.
 * 
 * We create two functions:
 * 1) initialization which is exported (via the $ variable) so we can initialize or re-initialize the controller - 
 *    we call loadComments
 * 2) loadComments - query ACS to get a list of comments associated with the current photo object
 */


//we'll use this comments collection throughout the controller
var comments = Alloy.Collections.instance("Comment");

//platform-specific settings and associations
OS_IOS && $.newComentButton.addEventListener("click", handleNewCommentButtonClicked);
OS_IOS && $.commentTable.addEventListener("delete", handleDeleteRow);
OS_ANDROID && $.commentTable.addEventListener("longpress", handleDeleteRow);

$.commentTable.editable = true;


/**
 * deletes a comment by working with the backbone.js destroy method
 */
function deleteComment(_comment) {
	_comment.destroy({
		data : {
			photo_id : currentPhoto.id, // comment on
			id : _comment.id // id of the comment object
		},
		success : function(_model, _response) {
			loadComments(null);
		},
		error : function(_e) {
			Ti.API.error('error: ' + _e.message);
			alert("Error deleteing comment");
			loadComments(null);
		}
	});
}

/**
 * event handler for deleting comment when a table row is deleted 
 */
function handleDeleteRow(_event) {
	var collection = Alloy.Collections.instance("Comment");
	var model = collection.get(_event.row.comment_id);

	if (!model) {
		alert("Could not find selected comment");
		return;
	} else {

		if (OS_ANDROID) {
			var optionAlert = Titanium.UI.createAlertDialog({
				title : 'Alert',
				message : 'Are You Sure You Want to Delete the Comment',
				buttonNames : ['Yes', 'No']
			});

			optionAlert.addEventListener('click', function(e) {
				if (e.index == 0) {
					deleteComment(model);
				}
			});
			optionAlert.show();
		} else {
			deleteComment(model);
		}
	}
}


/**
 * Load comments from ACS
 * @param {Object} _photo_id
 */
function loadComments(_photo_id) {

	var params = {
		photo_id : currentPhoto.id,
		order : '-created_at',
		per_page : 100
	};
	
	var rows = [];	

	//this is a backbone method - fetch
	comments.fetch({
		data : params,
		success : function(model, response) {
			comments.each(function(comment) {
				var commentRow = Alloy.createController("commentRow", comment);
				rows.push(commentRow.getView());
			});
			// set the table rows
			$.commentTable.data = rows;
		},
		error : function(error) {
			alert('Error loading comments ' + e.message);
			Ti.API.error(JSON.stringify(error));
		}
	});
}

/* we create the doOpen function to provide Android support when the
 * comments view opens
 */

function doOpen()
{
	if(OS_ANDROID)
	{
		var activity = $.getView().activity;
		var actionBar = activity.actionBar;
		
		activity.onCreateOptionsMenu = function(_event){
			if(actionBar)
			{
				actionBar.displayHomeAsUp = true;
				actionBar.onHomeIconSelected = function(){
					$.getView().close();
				};
			}
			else{
				alert("No Action Bar Found");
			}
		};
		
		//add the button and menu to the titlebar
		var menuItem = _event.menu.add(
			{
				title: "New Comment",
				showAsAction: Ti.Android.SHOW_AS_ACTION_ALWAYS,
				icon: Ti.Android.R.drawable.ic_menu_edit
			}
		);
		
		//event listener
		menuItem.addEventListener("click", function(e){
			handleNewCommentButtonClicked();
		});
	}
}

/**
 * The callback function for handling new comments
 */
function inputCallback(_event) {
	if (_event.success) {
		addComment(_event.content);
	} else {
		alert("No Comment Added");
	}
}


//the event-handling function
/**
 * Fired when the button for adding a new comment is clicked 
 *
 * @param {Object} _event
 */
function handleNewCommentButtonClicked(_event) {
	var navWin;
	
	//we'll use the callback to capture the comment text
	//the inputCallback method is defined seperately within this file
	var inputController = Alloy.createController("commentInput", {
		photo : currentPhoto,
		parentController : $,
		callback : function(_event) {
			inputController.getView().close();
			inputCallback(_event);
		}
	});

	// open the window
	inputController.getView().open();
}

/**
 * Add Comment - handles adding comment into the GUI
 *               and ACS calls
 * @param {String} _content
 */
function addComment(_content) {
	var comment = Alloy.createModel('Comment');
	var params = {
		photo_id : currentPhoto.id,
		content : _content,
		allow_duplicate : 1
	};

	//backbone.js method called on the model
	comment.save(params, {
		success : function(_model, _response) {
			Ti.API.debug('success: ' + _model.toJSON());
			var row = Alloy.createController("commentRow", _model);

			// add the controller view, which is a row to the table
			if ($.commentTable.getData().length === 0) {
				$.commentTable.setData([]);
				$.commentTable.appendRow(row.getView(), true);
			} else {
				$.commentTable.insertRowBefore(0, row.getView(), true);
			}

			notifyFollowers(_model, currentPhoto, "New comment posted by");
		},
		error : function(e) {
			Ti.API.error('error: ' + e.message);
			alert('Error saving new comment ' + e.message);
		}
	});
};

//before opening the view, we initialiaze the data
$.initialize = function()
{
	loadComments();
};


