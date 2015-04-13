function S4() {
	return ((1 + Math.random()) * 65536 | 0).toString(16).substring(1);
}

function guid() {
	return S4() + S4() + "-" + S4() + "-" + S4() + "-" + S4() + "-" + S4() + S4() + S4();
}

function InitAdapter(config) {
	Cloud = require("ti.cloud");
	Cloud.debug = !0;
	config.Cloud = Cloud;
}

function sync(method, model, options) {
	var object_name = model.config.adapter.collection_name;
	
	if (object_name === "photos") {
		processACSPhotos(model, method, opts);
	} else if (object_name === "users") {
		processACSUsers(model, method, opts);
	} else if (object_name === "reviews") {
		processACSComments(model, method, opts);
	} else if (object_name === "friends") {
		processACSFriends(model, method, opts);
	}
}

function processACSPhotos(model, method, options) {
	switch (method) {
		case "create":
		Cloud.Photos.create(model.toJSON(), function(e) {
			if (e.success) {
				model.meta = e.meta;
				options.success(e.photos[0]);
				model.trigger("fetch");
			} else {
				Ti.API.error("Photos.create " + e.message);
				options.error(e.error && e.message || e);
			}
		});
		break;
		case "read":
			model.id && (opts.data.photo_id = model.id);
			
			var method = model.id ? Cloud.Photos.show : Cloud.Photos.query;
			
			method((opts.data || {}), function(e) {
				if (e.success) {
					model.meta = e.meta;
					if (e.photos.length === 1) {
						opts.success(e.photos[0]);
					} else {
						opts.success(e.photos);
					}
					model.trigger("fetch");
					return;
				} else {
					Ti.API.error("Cloud.Photos.query " + e.message);
					opts.error(e.error && e.message || e);
				}
			});
			break;
		case "update":
		case "delete":
			alert("Not implemented yet");
			break;
	}
}

function processACSUsers(model, method, options) {
	switch (method) {
		case "update":
			var params = model.toJSON();
			Cloud.Users.update(params, function(e) {
				if (e.success) {
					model.meta = e.meta;
					options.success && options.success(e.users[0]);
					model.trigger("fetch");
				} else {
					Ti.API.error("Cloud.Users.update " + e.message);
					options.error && options.error(e.error && e.message || e);
				}
			});
			break;
		case "read": 
			
			opts.data = opts.data || {};
			_model.id && (opts.data.user_id = _model.id);
			
			var readMethod = _model.id ? Cloud.Users.show : Cloud.Users.query;
			readMethod((opts.data || {}), function(e) {
				if (e.success) {
					_model.meta = e.meta;
					if (e.users.length ===1) {
						opts.success(e.users[0]);
					} else {
						opts.success(e.users);
					}
					_model.trigger("fetch");
					return;
				} else {
					Ti.API.error("Cloud.Users.query " + e.message);
					opts.error(e.error && e.message || e);
				}
			});
			break;
	}//end of the switch method
}

function processACSFriends(model, method, opts) {
	switch (method) {
		case "create" :
			var params = model.toJSON();
			
			Cloud.Friends.add(params, function(e) {
				if (e.success) {
					model.meta = e.meta;
					opts.success && opts.success({});
					model.trigger("fetch");
					return;
				}
				Ti.API.error(e);
				opts.error && opts.error(e.error && e.message || e);
				model.trigger("error");
			});
			break;
		case "read" :
			opts.data = opts.data || {};
			_model.id && (opts.data.user_id = _model.id);
			
			Cloud.Friends.search((opts.data || {}), function(e) {
				if (e.success) {
					_model.meta = e.meta;
					opts.success(e.users);
					_model.trigger("fetch");
					return;
				} else {
					Ti.API.error("Cloud.Friends.query " + e.message);
					opts.error(e.error && e.message || e);
					_model.trigger("error");
				}
			}) ;
			break;
		case "delete" :
			Cloud.Friends.remove({
				user_ids : opts.data.user_ids.join(",")
			}, function(e) {
				Ti.API.debug(JSON.stringify(e));
				if (e.success) {
					_model.meta = e.meta;
					opts.success && opts.success({});
					_model.trigger("fetch");
					return;
				}
				Ti.API.error("Cloud.Friends.remove: " + e);
				opts.error && opts.error(e.error && e.message || e);
				_model.trigger("error");
			});
			break;
	}
}//end ProcessACSFriends

function processACSComments(model, method, opts) {

	switch (method) {
	case "create":
		var params = model.toJSON();

		Cloud.Reviews.create(params, function(e) {
			if (e.success) {
				model.meta = e.meta;
				opts.success && opts.success(e.reviews[0]);
				model.trigger("fetch");
			} else {
				Ti.API.error("Comments.create " + e.message);
				opts.error && opts.error(e.message || e);
			}
		});
		break;

	case "read":
		Cloud.Reviews.query((opts.data || {}), function(e) {
			if (e.success) {
				model.meta = e.meta;
				if (e.reviews.length === 1) {
					opts.success && opts.success(e.reviews[0]);
				} else {
					opts.success && opts.success(e.reviews);
				}
				model.trigger("fetch");
				return;
			} else {
				Ti.API.error("Reviews.query " + e.message);
				opts.error && opts.error(e.message || e);
			}
		});
		break;
	case "update":
		var params = {};

		// look for the review id in opts or on model
		params.review_id = model.id || (opts.data && opts.data.id);

		// get the id of the associated photo
		params.photo_id = opts.data && opts.data.photo_id;

		Cloud.Reviews.remove(params, function(e) {
			if (e.success) {
				model.meta = e.meta;
				opts.success && opts.success(model.attributes);
				model.trigger("fetch");
				return;
			}
			Ti.API.error(e);
			opts.error && opts.error(e.error && e.message || e);
		});
		break;
	case "delete":
		var params = {};
		//look for the review id in opts or on model
		params.review_id = model.id || (opts.data && opts.data.id);
		
		//get the id of the associated photo
		params.photo_id = opts.data && opts.data.photo_id;
		
		Cloud.Reviews.remove(params, function(e) {
			if (e.success) {
				model.meta = e.meta;
				opts.success && opts.success(model.attributes);
				model.trigger("fetch");
				return;
			}
			Ti.API.error(e);
			opts.error && opts.error(e.error && e.message || e);
		});
		break;

	}
}

var _ = require("alloys/underscore")._;

module.exports.sync = sync;

module.exports.beforeModelCreate = function(config) {
	config = config || {};
	config.data = {};
	InitAdapter(config);
	return config;
};

module.exports.afterModelCreate = function(Model) {
	Model = Model || {};
	Model.prototype.config.Model = Model;
	return Model;
};
