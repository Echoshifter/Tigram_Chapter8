var args = arguments[0] || {};

$.image.image = model.attributes.urls.preview;

//this is a JavaScript feature that says:
//if the first thing is empty, then use the second thing
$.titleLabel.text = args.title || "";

$.row_id = model.id || "";