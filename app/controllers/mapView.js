var args = arguments[0] || {};

var coords = args.photo.get("custom_fields") .coordinates[0];
var locationString = args.photo.get("custom_fields").location_string;

var annotation = Alloy.Globals.Map.createAnnotation({
	latitude : Number(coords[1]),
	longitude : Number(coords[0]),
	title : args.photo.get("title"),
	subtitle : locationString,
	myid : args.photo.id
});

$.thumb.image = args.photo.get("urls")["preview"];
$.title.text = args.photo.get("title");
$.location.text = locationString;

$.mapView.setAnnotations([annotation]);

$.mapView.setRegion({
	latitude : annotation.latitude,
	longitude : annotation.longitude,
	latitudeDelta : 0.040,
	longitudeDelta : 0.040
});

$.getView() .addEventListener("androidback", androidBackEventHandler);

function androidBackEventHandler(_event) {
	_event.cancelBubble = true;
	_event.Bubbles = false;
	$.getView().removeEventListener("androidback", androidBackEventHandler);
	$.getView().close();
}

$.getView() .addEventListener("open", function() {
	OS_ANDROID && ($.getView() .activity.onCreateOptionsMenu = function() {
		var actionBar = $.getView().activity.actionBar;
		if (actionBar) {
			actionBar.displayHomeAsUp = true;
			actionBar.onHomeIconItemSelected = function() {
				$.getView() .removeEventListener("androidback", androidBackEventHandler);
				$.getView().close();
			};
		}
	});
});
