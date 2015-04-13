var locationCallback = null;

function reverseGeocoder(_lat, _lng, _callback) {
	var title;
	Ti.Geolocation.purpose = "CIDM4385 TiGram App Demo";
	
	// callback method converting lat lng into a location/address
	Ti.Geolocation.reverseGeocoder(_lat, _lng, function(_data) {
		if (_data.success) {
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

function locationCallbackHandler(_location) {

	// remove event handler since event was recieved
	Ti.Geolocation.removeEventListener('location', locationCallbackHandler);

	if (!_location.error && _location && _location.coords) {

		var lat,
		    lng;

		Ti.API.debug("locationCallback " + JSON.stringify(_location, null, 2));

		lat = _location.coords.latitude;
		lng = _location.coords.longitude;

		reverseGeocoder(lat, lng, function(_title) {
			locationCallback({
				coords : _location.coords,
				title : _title
			}, null);
			locationCallback = null;
		});
	} else {
		alert('Location Services Error: ' + _location.error);
		locationCallback(null, _location.error);
	}
}

exports.getCurrentLocation = function(_callback) {

	if (!Ti.Geolocation.getLocationServicesEnabled()) {
		alert('Location Services are not enabled');
		_callback(null, 'Location Services are not enabled');
		return;
	}

	// save in global for use in locationCallbackHandler
	locationCallback = _callback;

	Ti.Geolocation.purpose = "CIDM4385 TiGram App Demo";
	
	Ti.Geolocation.accuracy = Ti.Geolocation.ACCURACY_HIGH;
	Ti.Geolocation.distanceFilter = 10;
	Ti.Geolocation.addEventListener('location', locationCallbackHandler);
};