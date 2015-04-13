var args = arguments[0] || {};

//load Geolocation library
var geo = require("geo");
//load sharing library
var sharing = require("sharing");
var push = require("pushNotifications");
//this captures the event
OS_IOS && $.cameraButton.addEventListener("click", function(_event) {
	$.cameraButtonClicked(_event);
});

$.feedTable.addEventListener("click", processTableClicks);
$.filter.addEventListener(OS_IOS ? 'click':'change', filterTabbedBarClicked);
$.mapview.addEventListener('click', mapAnnotationClicked);

//Handlers
$.cameraButtonClicked = function(_event) {
	alert("User clicked the camera button");

	var photoSource = Titanium.Media.getIsCameraSupported() ?
		Titanium.Media.showCamera : Titanium.Media.openPhotoGallery;
		
photoSource ({
	success : function(event) {
		processImage(event.media, function(processResponse) {
			//create the row
			if(processResponse.success) {			
				//create the row
			var rowController = Alloy.createController("feedRow", processResponse.model);
			//add the controller view, which is a row to the table
			if ($.feedTable.getData().length === 0) {
				$.feedTable.setData([]);
				$.feedTable.appendRow(row.getView(), true);
			} else {
				$.feedTable.insertRowBefore(0, rowController.getView(), true);
			}
			} else {
				alert("Error saving photo " + processResponse.message);
			}
		});
	},
	cancel : function() {
		//called when user cancels taking a picture
	},
	error : function(error) {
		//display alert on error
			if (error.code == Titanium.Media.NO_CAMERA) {
				alert('Please run this test on device');
			} else {
				alert('Unexpected error: ' + error.code);
			}
	},
	saveToPhotoGallery : false,
	allowEditing : true,
	//only allow for photos, no video
	mediaTypes : [Ti.Media.MEDIA_TYPE_PHOTO]
});
};

function processImage(_mediaObject, _callback) {
	//since there is no ACS integration yet, we will fake it 
	var parameters = {
		"photo" : _mediaObject,
		"title" : "Sample Photo " + new Date(),
		"photo_sizes[preview]" : "200x200#",
		"photo_sizes[iphone]" : "320x320#",
		//since we are showing the image immediately
		"photo_sync_sizes[]" : "preview",
	};
	
	//if we got a location, then set it
	if (_coords) {
		parameters.custom_fields = {
			coordinates : [_coords.coords.longitude, _coords.coords.latitude],
			location_string : _coords.title
		};
	}
	
	var photo = Alloy.createModel('Photo', parameters);
	
	photo.save({}, {
		success : function(_model, _response) {
			Ti.API.debug('success: ' + _model.toJSON());
			_callback({
				model : _model,
				message : null,
				success : true
			});
			notifyFollowers(_photoResp.model, "New Photo Added");
		},
		error : function(e) {
			Ti.API.error('error: ' + e.message);
			_callback({
				model : parameters,
				message : e.message,
				succes : false
			});
		}
	});
}//end ProcessImage
	
	function loadPhotos() {
		var rows = [];
		var photos = Alloy.Collections.photo || Alloy.Collections.instance("Photos");
		
		var where = {
			title : {
				"$exists" : true
			}
		};
		
		photos.fetch({
			data : {
				order : '-created_at',
				where : where
			},
				success : function(model, response) {
					photos.each(function(photo) {
						var photoRow = Alloy.createController("feedRow", photo);
						rows.push(photorow.getView());
						});
						$.feedTable.data = rows;
						Ti.API.info(JSON.stringify(data));
						},
						error : function(error) {
							alert('Error loading Feed' + e.message);
							Ti.API.error(JSON.stringify(error));
							}
						});
}//end loadPhoto

function handleLocationButtonClicked(_event) {
	var collection = Alloy.Collections.instance("Photo");
	var model = collection.get(_event.row.row_id);
	
	var customFields = model.get("Custom_fields");
	
	if (customFields && customFields.coordinates) {
		var mapController = Alloy.createController("mapView", {
			photo : model,
			parentController : $
		});
		
		//open the view
		Alloy.Globals.openCurrentTabWindow(mapController.getView());
	} else {
		alert("No Location was Saved with Photo");
	}
}//handleLocationButtonClicked

function filterTabbedBarClicked(_event) {
	var itemSelected = OS_IOS ? _event.index : _event.rowIndex;
	switch (itemSelected) {
		case 0 : 
			//list view display
			$.mapView.visible = false;
			$.feedTable.visible = true;
			break;
		case 1 : 
			//map view display
			$.feedTable.visible = false;
			$.mapView.visible = true;
			showLocalImages();
			break;
	}
}//end filterTabbedBarClicked

function showLocalImages() {
	//create new photo collection
	$.locationCollection = Alloy.createCollection('photo');
	
	//find all photos within five miles of current location
	geo.getCurrentLocation(function(_coords) {
		var user = Alloy.Globals.currentUser;
		
		$.locationCollection.findPhotosNearMe(user, _coords, 5, {
			success : function(_collection, _respnose) {
				Ti.API.info(JSON.stringify(_collection));
				
				//add the annotation/map pins to map
				if (_collection.models.length) {
					addPhotosToMap(_collection);
				} else {
					alert("No Local Images Found");
					filterTabbedBarClicked({
						index : 0,
						rowIndex : 0,
					});
					if (OS_ANDROID) {
						$.filter.setSelectedRow(0, 0, false);
					} else {
						$.filter.setIndex(0);
					}
				}
			},
			error : function(error) {
				alert('Error loading Feed ' + e.message);
				Ti.API.error(JSON.stringify(error));
			}
		});
	});
}//end showLocalImages.

function addPhotosToMap(_collection) {
	var annotationArray = [];
	var lastLat;
	
	//remove all annotations from map
	$.mapview.removeAllAnnotations();
	
	var annotationRightButton = function() {
		var button = Ti.UI.createButton({
			title : "X",
		});
		return button;
	};
	
	for (var i in _collection.models) {
		var mapData = _collection.models[i].toJSON();
		var coords = mapData.custom_fields.coordinates;
		var annotation = Alloy.Globals.Map.createAnnotation({
			latitude : Number(coords[0][1]),
			longitude : Number(coords[0][0]),
			subtitle : mapData.custome_fields.location_string,
			title : mapData.title,
			//animate : true,
			data : _collection.models[i].clone()
		});
		
		if (OS_IOS) {
			annotation.setPincolo(Allou.Globals.Map.ANNOTATION_RED);
			annotation.setRightButton(Titanium.UI.iPhone.SystemButton.DISCLOSURE);
		} else {
			annotation.setRightButton(annotationRightButton);
		}
		annotationArray.push(annotation);
	}
	//calculate the map region based on the annotations
	var region = geo.calculateMapRegion(annotationArray);
	$.mapview.setRegion(region);
	
	//add the annotation to the map
	$.mapview.setAnnotations(annotationArray);
}//end addPhotosToMap

function mapAnnotationClicked(_event) {
	//get even porperties
	var annotation = _event.annotation;
	//get the Myid from annotation
	var clickSource = _event.clicksource;
	
	var showDetails = false;
	
	if (OS_IOS) {
		showDetails = (clickSource === 'rightButton');
	} else {
		showDetails = (clickSource === 'subtitle' || clickSource === 'title');
	}
	
	if (showDetails) {
		//load the mapDetail controller 
		var mapDetailCtrl = Alloy.createController('mapDetail', {
			photo : annotation.data,
			parentController : $,
			clickHandler : processTableClicks
		});
		
		//open the view
		Alloy.Globals.openCurrentTabWindow(mapDetailCtrl.getView());
		
	} else {
		Ti.API.info('clickSource ' + clickSource);
	}
};//end mapAnnotationClicked
	
	$.initialize = function() {
		loadPhotos();
	};
function processTableClicks(_event) {
	if (_event.source.id === "commentButton") {
		handleCommentButtonClicked(_event);
	} else if (_event.source.id === "locationButton") {
		handleLocationButtonClicked(_event);
	} else if (_event.source.id === "shareButton") {
		handleShareButtonClicked(_event);
	}
}//end processTabkeCLicks

function handleCommentButtonClicked(_event) {
	var collection, model = null;
	//handle call from mapDetail or feedRow
	if (!_event.row) {
		model = _event.data;
	} else {
		collection = Alloy.Collections.instance("Photo");
		mode = collection.get(_event.row.row_id);
	}
	
	var controller = Alloy.createController("comment", {
		photo : model,
		parentController : $
	});
	
//initialize the data in the view, load content 
	controller.initialize();

//open the view

	Alloy.Globals.openCurrentTabWindow(controller.getView());
}//end handleCommentButtonClicked

function handleShareButtonClicked(_event) {
	var collection, model;
	
	if (!_event.row) {
		model = _event.data;
	} else {
		collection = Alloy.Collections.instance("Photo");
		model = collection.get(_event.row.row_id);
	}
	
	//commonjs library for sharing
	sharing.sharingOptions({
		model : model
	});
}//end handleShareButtonClicked

//Get the parameters passed into the controller
var parameters = arguments[0] || {};
var currentPhoto = parameters.photo || {};
var parentController = parameters.parentController || {};

$.image.image = currentPhoto.attributes.urls.preview;
$.titleLabel.text = currentPhoto.attributes.title || '';

//get comment count from object
var count = currentPhoto.attributes.reviews_count !== undefined ? currentPhoto.attributes.reviews_count : 0;

//modify the button title to show the comment count
//if there are comments already associated to photo
if (count !== 0 ) {
	$.commentButton.title = "Comments (" + count + ")";
}

$.buttonContainer.addEventListener('click', function(_event) {
	//add the model information as data to event
	_event.data = currentPhoto;
	parameters.clickHandler(_event);
});

$.getView().adEventListener("androidback", androidBackEventHandler);

function androidBackEventHandler(_event) {
	_event.cancelBubble = true;
	_event.bubbles = false;
	$.getView().removeEventListener("androidback", androidBackEventHandler);
	$.getView().close();
}



//get all of my friends/followers
function notifyFollowers(_model, _message) {
	var currentUser = Alloy.Globals.currentUser;
	
	currentUser.getFollowers(function(_resp) {
		if (_resp.success) {
			$.followersList = _.pluck(_resp.collection.models, "id");
			
			//send a push notification to all friends
			var msg = _message + " " + currentUser.get("email");
			
			//make the api call using the library
			push.sendPush({
				payload : {
					custom : {
						photo_id : _model.get("id"),
					},
					sound : "default",
					alert : msg
				},
				to_ids : $.followersList.join(),
			}, function(_responsePush) {
				if (_responsePush.success) {
					alert("Notified frineds of new photo");
				} else {
					alert("Error notifying friends of new photo");
				}
			});
		} else {
			alert("Error updating friends and followers");
		}
	});
}//end notifyFollowers.

//set up the menus and actionBar for android if necessary
$.getView().addEventListener("open", function() {
	OS_ANDROID && ($.getView().activity.onCreateOptionsMenu = function() {
		var actionBar = $.getView().activity.actionBar;
		if (actionBar) {
			actionBar.displayHomeAsUp = true;
			actionBar.onHomeIconItemSelected = function() {
				$.getView().removeEventListener("androidback", androidBackEventHandler);
				$.getView().close();
			};
		}
	});
});
