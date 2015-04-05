var args = arguments[0] || {};

//this captures the event
OS_IOS && $.cameraButton.addEventListener("click", function(_event) {
	$.cameraButtonClicked(_event);
});

//event handlers
$.feedTable.addEventListener("click", processTableClicks);

//handlers


function processTableClicks(_event) {
	if (_event.source.id === "commentButton") {
		handleCommentButtonClicked(_event);
	} else if (_event.source.id === "locationButton") {
		handleLocationButtonClicked(_event);
	} else if (_event.source.id === "shareButton") {
		handleShareButtonClicked(_event);
	}
}


/**
 * work on handling comments through the comment model
 */
function handleCommentButtonClicked(_event) {
	var collection,
	    model = null;

	// handle call from mapDetail or feedRow
	if (!_event.row) {
		model = _event.data;
	} else {
		collection = Alloy.Collections.instance("Photo");
		model = collection.get(_event.row.row_id);
	}

	var controller = Alloy.createController("comment", {
		photo : model,
		parentController : $
	});

	// initialize the data in the view, load content
	controller.initialize();

	// open the view
	Alloy.Globals.openCurrentTabWindow(controller.getView());
}

/**
 * In this code, we retrieve a picture and the event.media object holding the picture
 * taken by the user.  We need to place the image into a table view according to the wireframes
 * we worked up.  We do this by adding items to a row, then inserting the row into the table view
 *
 * see: http://docs.appcelerator.com/titanium/latest/#!/guide/TableViews
 */
$.cameraButtonClicked = function(_event) {
	//alert("user clicked the camera button");
	
	var photoSource;
	
	Ti.API.debug('Ti.Media.isCameraSupported ' + Ti.Media.isCameraSupported);	
	
	if(Titanium.Media.getIsCameraSupported()){
		photoSource = Titanium.Media.showCamera;
	} else {
		photoSource = Titanium.Media.openPhotoGallery;
	}


	photoSource({
		success : function(_event) {
			//second argument is the callback
			processImage(event.media, function(processResponse) {

				if(processResponse.success){
					//create a row
					var row = Alloy.createController("feedRow", processResponse.model);
	
					//add the controller view, which is a row to the table
					if ($.feedTable.getData().length === 0) {
						$.feedTable.setData([]);
						$.feedTable.appendRow(row.getView(), true);
					} else {
						$.feedTable.insertRowBefore(0, row.getView(), true);
					}
	
					//photoObject = photoResp;					
				} else {
					alert('Error saving photo ' + processResponse.message);					
				}

			});
		},
		cancel : function() {
			//called when the user cancels taking a picture
		},
		error : function(error) {
			//display alert on error
			if (error.code == Titanium.Media.NO_CAMERA) {
				alert("Please run this test on a device");
			} else {
				alert("Unexpected error" + error.code);
			}
		},
		saveToPhotoGallery : false,
		allowEditing : true,
		//only allow for photos, no video
		mediaTypes : [Ti.Media.MEDIA_TYPE_PHOTO]
	});
};

/*
function processImage(_mediaObject, _callback){
//we are not yet integrating with ACS, so we fake it
var photoObject = {
image: _mediaObject,
title: "Sample Photo " + new Date()
};

//return the object to the caller
_callback(photoObject);

}*/

//utility methods

/**
 *
 * @param {Object} _mediaObject object from the camera
 * @param {Function} _callback where to call when the function is completed
 */
var geo = require("geo");
function processImage(_mediaObject, _callback) {
	var parameters = {
		"photo" : _mediaObject,
		"title" : "Sample Photo " + new Date(),
		"photo_sizes[preview]" : "200x200#",
		"photo_sizes[iphone]" : "320x320#",
		// We need this since we are showing the image immediately
		"photo_sync_sizes[]" : "preview"
	};
	
	if (_coords) {
		parameters.custom_fields = {
			coordinates : [_coords.coords.longitude,
			               _coords.coords.latitude],
			               location_string: _coords.title
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
		},
		error : function(e) {
			
			Ti.API.error('error: ' + e.message);
			_callback({
				model : parameters,
				message : e.message,
				success : false
			});
		}
	});
}


/**
 * Loads photos from ACS
 */
function loadPhotos() {
	var rows = [];

	// creates or gets the global instance of photo collection
	var photos = Alloy.Collections.photo || Alloy.Collections.instance("Photo");

	// be sure we ignore profile photos;
	var where = {
		title : {
			"$exists" : true
		}
	};

	//this is a method in the model - from backbone.js
	photos.fetch({
		data : {
			order : '-created_at',
			where : where
		},
		success : function(model, response) {
			photos.each(function(photo) {
				var photoRow = Alloy.createController("feedRow", photo);
				rows.push(photoRow.getView());
			});
			$.feedTable.data = rows;
			Ti.API.info(JSON.stringify(data));
		},
		error : function(error) {
			alert('Error loading Feed ' + error.message);
			Ti.API.error(JSON.stringify(error));
		}
	});
}

function handleLocationButtonClicked(_event) {
	var collection = Alloy.Collections.instance("Photo");
	var model = collection.get(_event.row.row_id);
	
	var customFields = model.get("custom_fields");
	
	if (customFields && customFields.coordinates) {
		var mapController = Alloy.createController("mapView", {
			photo : model,
			parentController : $
		});
		
		Alloy.Globals.openCurrentTabWindow(mapController.getView());
	} else {
		alert("No Location was saved with photo");
	}
}

$.filter.addEventListener(OS_IOS ? 'click' : 'change', filterTabbedBarClicked);

function filterTabbedBarClicked(_event) {
	var itemSelected = OS_IOS ? _event.index : _event.rowIndex;
	switch (itemSelected) {
		case 0 :
		$.mapview.visible = false;
		$.feedTable.visible = true;
		break;
		case 1 :
		$.feedTable.visible = false;
		$.mapview.visible = true;
		showLocalImages();
		break;
	}
}

function showLocalImages() {
	
	$.locationCollection = Alloy.createCollection('photo');
	
	geo.getCurrentLocation(function(_coords) {
		var user = Alloy.Globals.currentUser;
		
		$.locationCollection.findPhotosNearMe(user, _coords, 5, {
			success : function(_collection, _response) {
				Ti.API.info(JSON.stringify(_collection));
				
				if(_collection.models.length) {
					addPhotosToMap(_collection);
				} else {
					alert("No local images found");
					filterTabbedBarClicked({
						index : 0,
						rowIndex : 0,
					});
					
					if (OS_ANDROID) {
						$.filter.setSelectedRow(0,0,false);
						
					} else {
						$.filter.setIndex(0);
					}
				}
			},
			error : function(error) {
				alert('Error loading feed' + e.message);
				Ti.API.error(JSON.stringify(error));
			}
		});
	});
}

function addPhotosToMap(_collection) {
	var annotationArray = [];
	var lastLat;
	
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
			longitude : Number(coords[0[0]]),
			subtitle : mapData.custom_fields.location_string,
			title : mapData.title,
			data : _collection.models[i].clone()
		});
		
		if (OS_IOS) {
			annotation.setPincolor(Alloy.Globals.Map.ANNOTATION_RED);
			annotation.setRightButton(Titanium.UI.iPhone.SystemButton.DISCLOSURE);
		} else {
			annotation.setRightButton(annotationRightButton);
			
		}
		annotationArray.push(annotation);
	}
	
	var region = geo.calculateMapRegion(annotationArray);
	$.mapview.setRegion(region);
	
	$.mapview.setAnnotations(annotationArray);
}

$.mapview.addEventListener('click', mapAnnotationClicked);
//load photos on startup
$.initialize = function() {
  loadPhotos();
};
