/* callback function for getCurrentLocation */
var locationCallback = null;

/**
 * The Appcelerator provides functionality for reverse geocoding so that, with a lat/long,
 * we can get some description of where we are.  With a list of coordinates, we can get
 * a list of place names.
 *
 * The Callback returns a JS object containing the coordinates and a title string for the location.
 * We'll use these when saving the photo
 *
 * @param {Object} _lat
 * @param {Object} _lng
 * @param {Object} _callback
 */
function reverseGeocoder(_lat, _lng, _callback) {
	var title;

	Ti.Geolocation.purpose = "Wiley Alloy App Demo";

	// callback method converting lat lng into a location/address
	Ti.Geolocation.reverseGeocoder(_lat, _lng, function(_data) {
		if (_data.success) {
			
			//let's look at the results in the debug window
			Ti.API.debug("reverseGeocoder " + JSON.stringify(_data, null, 2));

			var place = _data.places[0];
			if (place.city === "") {
				title = place.address;
			} else {
				title = place.street + " " + place.city;
			}
		} else {
			title = "No Address Found: " + _lat + ", " + _lng;
		}
		_callback(title);
	});
}

/**
 * We must detect and handle errors here before we use the data.
 * @param {Object} _location
 */
function locationCallbackHandler(_location) {

	// remove the event handler since we've already received the location
	Ti.Geolocation.removeEventListener('location', locationCallbackHandler);

	//if there are no errors, we have a location object, and it has coordinates, let's rock
	if (!_location.error && _location && _location.coords) {

		//to store lat and long
		var lat, lng;

		//in debug, let's look at the location data in the raw
		Ti.API.debug("locationCallback " + JSON.stringify(_location, null, 2));

		//pull lt and long
		lat = _location.coords.latitude;
		lng = _location.coords.longitude;

		//based on lat and long, where are we?
		reverseGeocoder(lat, lng, function(_title) {
			locationCallback({
				coords : _location.coords,
				title : _title
			}, null);
			locationCallback = null;
		});
	} else {
		//no bueno
		alert('Location Services Error: ' + _location.error);
		locationCallback(null, _location.error);
	}
}

/**
 * Uses Ti.Geolocation to obtain the device's current location determined
 * by its onboard sensors.
 * @param {Object} _callback
 */
exports.getCurrentLocation = function(_callback) {

	if (!Ti.Geolocation.getLocationServicesEnabled()) {
		alert('Location Services are not enabled');
		_callback(null, 'Location Services are not enabled');
		return;
	}

	// save in global for use in locationCallbackHandler
	locationCallback = _callback;

	Ti.Geolocation.purpose = "Wiley Alloy App Demo";
	
	//the documentation describes these settings in greater detail
	//http://docs.appcelerator.com/titanium/latest/#!/api/Titanium.Geolocation
	Ti.Geolocation.accuracy = Ti.Geolocation.ACCURACY_HIGH;
	Ti.Geolocation.distanceFilter = 10;
	Ti.Geolocation.addEventListener('location', locationCallbackHandler);
};
