exports.definition = {
	config: {

		adapter: {
			type: "acs",
			collection_name: "friends"
		}
	},
	extendModel: function(Model) {
		_.extend(Model.prototype, {});
		// end extend
		return Model;
	},
	
	extendCollection: function(Collection) {
		_.extend(Collection.prototype, {});
		// end extend
		return Collection;
	}
};