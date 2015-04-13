exports.definition = {
	config: {

		adapter: {
			type: "acs",
			collection_name: "users"
		}
	},
	extendModel: function(Model) {
		_.extend(Model.prototype, 
		{
			// extended functions and properties go here
			// it is a comma-seperated list of functions and properties
			/**
			 * log user in with username and password
			 */
			login: function(_login, _password, _callback)
			{
				var self = this;
				this.config.Cloud.Users.login(
					//remember, these curly-braced key-value pairs are JavaScript
					//object literals - they are usually what is sent as 
					//arguments to many methods in the API
					{
						login: _login,
						password: _password,
					}, function(e)
					{
						if(e.success){
							var user = e.users[0];
							
							//save session id
							Ti.App.Properties.setString('sessionId', e.meta.session_id);
							Ti.App.Properties.setString('user', JSON.stringify(user));
							
							//this syntax means: take the existing callback
							//and add the extra behavior/stuff
							_callback && _callback(
								{
									success : true,
									model: new model(user)
								}
							);
						} else {
							Ti.API.error(e);
							_callback && _callback(
								{
									success: false,
									model: null,
									error: e
								}
							);						
						}
					}
				);
			}, //end login

			createAccount: function(_ucerInfo, _callback)
			{
				var cloud = this.config.Cloud;
				var TAP = Ti.App.Properties;
				
				//bad data, so return to caller
				if(!_userInfo)
				{
					_callback && _callback(
						{
							success: false,
							model: null
						}
					);
				} else {
					cloud.Users.create(_userInfo, function(e){
						if(e.success)
						{
							var user = e.users[0];
							TAP.setString("sessionId", e.meta.session_id);
							TAP.setString("user", JSON.stringify(user));
							
							//setting this for ACS to track session connected
							cloud.sessionId = e.meta.session_id;
							
							//callback with newly created user
							_callback && callback(
								{
									success: true,
									model: new model(user)
								}
							);
						} else {
							Ti.API.error(e);
							__callback && _callback(
								{
									success: false,
									model: null,
									error: e
								}
							);
						}
					});
				}
			},
					

			logout: function(_callback)
			{
				var cloud = this.config.Cloud;
				var TAP = Ti.App.Properties;

				cloud.Users.logout(function(e)
					{
						if(e.success)
						{
							var user = e.users[0];
							TAP.removeProperty("sessionId");
							TAP.removeProperty("user");
							
							//callback which clears out the user model
							_callback && _callback(
								{
									success: true,
									model: null
								}
							);
						} else {
							Ti.API.error(e);
							_callback && _callback(
								{
									success: false,
									model: null,
									error: e
								}
							);
						}
					}
				);
			},
			
			
			authenticated: function()
			{
				var cloud = this.config.Cloud;
				var TAP = Ti.App.Properties;
				
				if(TAP.hasPropert("sessionId")){
					Ti.API.info("SESSION ID: " + TAP.getString("SessionId"));
					cloud.sessionId = TAP.getString("SessionId");
					return true;
				}
				return false;
			},
			

			showMe: function(_callback)
			{
				var cloud = this.config.Cloud;
				var TAP = Ti.App.Properties;
				
				cloud.Users.showMe(function(e)
					{
						if(e.success)
						{
							var user = e.users[0];
							TAP.setString("sessionId", e.meta.session_id);
							TAP.setString("user", JSON.stringify(user));
							_callback && _callback(
								{
									success: true,
									model: new model(user)
								}
							);
						} else {
							Ti.App.error(e);
							TAP.removeProperty("sessionId");
							TAP.removeProperty("user");
							_callback && _callback(
								{
									success: false,
									model: null,
									error: e
								}
							);
						}
					}
				);
			},
			
			updateFacebookLoginStatus : function(_accessToken, _opts) {
				
				var cloud = this.config.Cloud;
				var TAP = Ti.App.Properties;
				
				// if not logged into facebook, then exit function
				if (Alloy.Globals.FB.loggedIn == false) {
					_opts.error && _opts.error(
						{
							success : false,
							model : null,
							error : "Not Logged into Facebook"
						}
					);
          			alert('Please Log Into Facebook first');
          			return;
        		}

        		// we have facebook  access token so we are good
        		cloud.SocialIntegrations.externalAccountLogin({
        			type : "facebook",
        			token : _accessToken
        			}, function(e) {
        				if (e.success) {
        					var user = e.users[0];
        					TAP.setString("sessionId", e.meta.session_id);
        					TAP.setString("user", JSON.stringify(user));
        					
        					// save how we logged in
        					TAP.setString("loginType", "FACEBOOK");
        					
        					_opts.success && _opts.success(
        						{
        							success : true,
        							model : new model(user),
        							error : null
        						}
        					);
          				} else {
          					Ti.API.error(e);
          					_opts.error && _opts.error(
          						{
          							success : false,
          							model : null,
          							error : e
          						}
          					);
          				}
          			}
          		);
      		},
      		
      		getFollowers : function(_callback, _followers) {
				var followers = Alloy.createCollection("Friend");
				followers.fetch(
					{
						data : {
            				per_page : 100,
            				q : " ",
            				user_id : this.id,
            				followers : _followers || "true"
          				},
          				success : function(_collection, _response) {
            				_callback && _callback(
            					{
              						success : true,
              						collection : _collection
            					}
            				);
          				},
          				error : function(_model, _response) {
            				_callback && _callback(
            					{
              						success : false,
              						collection : {},
              						error : _response
              					}
              				);
          				}
        			}
        		);

      		},
      		
      		getFriends : function(_callback) {
        		this.getFollowers(_callback, false);
      		},
      		
	      	followUser : function(_userid, _callback) {
	        	var friendItem = {
	          		"user_ids" : _userid,
	          		"approval_required" : "false"
	        	};
	        	
	        	var friendItemModel = Alloy.createModel('Friend');
	        	
	        	friendItemModel.save(friendItem, 
        			{
        				success : function(_model, _response) {
            				_callback(
            					{
              						success : true
            					}
            				);
          				},
          				error : function(_model, _response) {
            				_callback(
            					{
              						success : false
            					}
            				);
          				}
        			}
        		);
	        },

      		unFollowUser : function(_userid, _callback) {
      			var friendItemModel = Alloy.createModel('Friend');
      			
      			friendItemModel.id = _userid;
      			
      			friendItemModel.destroy(
      				{
          				data : {
            				"user_ids" : [_userid]
          				},
          				success : function(_model, _response) {
            				_callback(
            					{
              						success : true
            					}
            				);
          				},
          				error : function(_model, _response) {
            				_callback(
								{
									success : false
								}
							);
          				}
        			}
        		);
      		},
      					
		});
	
		return Model;
	},
	extendCollection: function(Collection) {
		_.extend(Collection.prototype, {
			// extended functions and properties go here
		});

		return Collection;
	}
};