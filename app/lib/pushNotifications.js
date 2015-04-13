var args = arguments[0] || {};

var Cloud = require('ti.cloud');
var AndroidPush = OS_ANDROID ? require('ti.cloudpush') : null;

exports.initialize = function(_user, _pushRcvCallback, _callback) {
	USER_ID = _user.get("id");
	
	if (Ti.Platform.model === 'Simulator') {
		alert("Push ONLY works on Devices!");
		return;
	}
	
	// only register push if we have a user logged in
	var userId = _user.get("id");
	
	if (userId) {
		if (OS_ANDROID) {
			// ANDROID SPECIFIC CODE GOES HERE
			// reset any settings
			AndroidPush.clearStatus();
			
			// set some properties
			AndroidPush.debug = true;
			AndroidPush.showTrayNotificationsWhenFocused = true;
			
			AndroidPush.retrieveDeviceToken({
				success : function(_data) {
					Ti.API.debug("received device token", _data.deviceToken);
					
					// what to call when push is received
					AndroidPush.addEventListener('callback', _pushRcvCallback);
					
					// set some more properties
					AndroidPush.enabled = true;
					AndroidPush.focusAppOnPush = false;
					
					PushRegisterSuccess(userId, _data, function(_response) {
						// save the device token locally
						Ti.App.Properties.setString('android.deviceToken', _data.deviceToken);
						
						_callback(_response);
					});
				},
				error : function(_data) {
					AndroidPush.enabled = false;
					AndroidPush.focusAppOnPush = false;
					AndroidPush.removeEventListener('callback', _pushRcvCallback);
					
					pushRegisterError(_data, _callback);
				}
			});
		} else {
			Ti.Network.registerForPushNotifications({
				types : [Ti.Network.NOTIFICATION_TYPE_BADGE, Ti.Network.NOTIFICATION_TYPE_ALERT, Ti.Network.NOTIFICATION_TYPE_SOUND],
				success : function(_data) {
					pushRegisterSuccess(userId, _data, _callback);
				},
				error : function(_data) {
					pushRegisterError(_data,_callback);
				},
				callback : function(_data) {
					// what to call when push is recieved
					_pushRcvCallback(_data.data);
				}
			});
		}
	} else {
		_callback && _callback({
			success : false,
			msg : 'Must have User for Push Notifications',
		});
	}
};

function pushRegisterError(_data, _callback) {
	_callback && _callback({
		success : false,
		error : _data
	});
}

function pushRegisterSuccess(_userId, _data, _callback) {
	var token = _data.deviceToken;
	
	// clean up any previous registration of this device
	// using saved device token
	Cloud.PushNotifications.unsubscribe({
		device_token : Ti.App.Properties.getString('android.deviceToken'),
		user_id : _userId,
		type : (OS_ANDROID) ? 'android' : 'ios'
	}, function(e) {
		
		exports.subscribe("friends", token, function(_resp) {
			
			// if successful subscribe to the platform-specific channel
			if (_resp.success) {
				
				_callback({
					success : true,
					msg : "Subscribe to channel : friends",
					data : _data,
				});
			} else {
				_callback({
					success : false,
					error : _resp2.data,
					msg : "Error Subscribing to chennel : friends"
				});
			}
		});
	});
}

exports.subscribe = function(_channel, _token, _callback) {
	Cloud.PushNotifications.subscribe({
		channel : _channel,
		device_token : _token,
		type : OS_IOS ? 'ios' : 'android'
	}, function(_event) {
		
		var msgStr = "Subscribed to " + _channel + " Channel";
		Ti.API.debug(msgStr + ': ' + _event.success);
		
		if (_event.success) {
			_callback({
				success : true,
				error : null,
				msg : msgStr
			});
		} else {
			_callback({
				success : false,
				error : _event.data,
				msg : "Error Subscribing to All Channels"
			});
		}
	});
};

exports.sendPush = function(_params, _callback) {
	
	if (Alloy.Globals.pushToken === null) {
		_callback({
			success : false,
			error : "Device Not Registered For Notifications!"
		});
		return;
	}
	// set the default parameters, sent to user subscribed to friends channel
	var data = {
		channel : 'friends',
		payload : _params.payload,
	};
	
	// add optional parameter to determine if it should be
	// sent to all friends or to a specific friend
	_params.friends && (data.friends = _params.friends);
	_params.to_ids && (data.to_ids = _params.to_ids);
	
	Cloud.PushNotifications.notify(data, function(e) {
		if (e.success) {
			// it worked
			_callback({
				success : true
			});
		} else {
			var eStr = (e.error && e.message) || JSON.stringify(e);
			Ti.API.error(eStr);
			_callback({
				success : false,
				error : eStr
			});
		}
	});
};

exports.pushUnsubscribe = function(_data, _callback) {
	Cloud.pushNotifications.unsubscribe(_data, function(e) {
		if (e.succes) {
			Ti.API.debug('Unsubscribed from : ' + _data.channel);
			_callback({
				success : true,
				error : null
			});
		} else {
			Ti.API.error('Error unsubscribing: ' + _data.channel);
			Ti.API.error(JSON.stringify(e, null, 2));
			_callback({
				success : false,
				error : e
			});
		}
	});
};
