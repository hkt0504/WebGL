VG.DB = {};

VG.DB.getAppId=function( callback, url )
{
    /**Returns the appId of the current app, or of any app identified by its Url, go the given callback or does nothing if the appId could not be retrieved.
     * @param {function} Callback - The callback to be called with the found appId.
     * @param {string} url - Optional, the url of the application to retrieve the appId for. If not given, the appId of the current application is
     * returned if possible.
     */

	if ( !url ) {
    	if ( VG.App && VG.App.url ) url=VG.Utils.decompressFromBase64( VG.App.url );	
	}

	var serverUrl="/app/check/?url=" + url;// + "&domain="

	VG.sendBackendRequest( serverUrl, "", function( responseText ) {
		var response=JSON.parse( responseText );
		var array=response.check;
                
        for( var i=0; i < array.length; ++i ) {
        	if ( array[i].name === "url" ) {
        		if ( array[i].exists )
        			if ( callback ) callback( array[i].appid );
        	}
        }
    }, "GET" );
};

VG.DB.userLogOut=function( callback )
{
    /**Logs out the currently logged in user from the Visual Graphics session.
     * @param {function} Callback - The callback to be called on success.
     */

	VG.sendBackendRequest( "/user/logout", "", function( responseText ) {
		if ( responseText === "OK" && callback ) callback();
    }, "GET" );
};

VG.DB.userChangePassword=function( password, callback )
{
    /**Changes the password of the currently logged in user.
     * @param {string} Password - The new password for the current user.
     * @param {function} Callback - The callback to be called when the operation finishes, either a true or false value is passed to the
     * function as its first argument, depending on the success of the password change.
     */

	VG.sendBackendRequest( "/user/password", JSON.stringify( { "password": password } ), function( responseText ) {
    	var response=JSON.parse( responseText );

    	if ( callback ) {
			if ( response.status === "ok" ) callback( true );
    		else callback( false );
    	}
    
    }, "PUT" );
};

VG.DB.userLogIn=function( userName, password, callback )
{
    /**Changes the password of the currently logged in user.
     * @param {string} Password - The new password for the current user.
     * @param {function} Callback - The callback to be called when the operation finishes, either a true or false value is passed to the
     * function as its first argument, depending on the success of the password change.
     */

    var parameters={username : userName, password : password};

	VG.sendBackendRequest( "/user/login", JSON.stringify( parameters ), function( responseText ) {
    	var response=JSON.parse( responseText );

    	if ( callback ) {
			if ( response.status === "ok" && response.user.username && response.user.username.length )
			{
				callback( true, response.user.username, response.user.userid, response.user.admin );
			}
    		else callback( false );
    	}
    
    }, "POST" );
};

VG.DB.userIsAppAdmin=function( appId, userId, callback )
{
    /**Checks if the given user is an admin of the given application.
     * @param {string} appId - The appId of the application.
     * @param {string} userId - The userId.
     * @param {function} Callback - The callback to be called when the operation finishes, either a true or false value is passed to the
     * function as its first argument, depending on whether the user is an admin or not.
     */

	VG.sendBackendRequest( "/group/app/" + appId, "", function( responseText ) {
		var response=JSON.parse( responseText );

		if ( response.status === "ok" )
		{
			for( var g=0; g < response.groups.length; ++g ) 
			{
				var group=response.groups[g];

				if ( group.app === appId ) 
				{
					var users=group.users;
                
        			for( var i=0; i < users.length; ++i ) {
        				if ( users[i]._id === userId && callback ) {
        					callback( true );
        					return;
        				}
        			}
        		}
        	}
        }
        if ( callback ) callback( false );
    }, "GET" );	
};

VG.DB.getAppChatMessages=function( appId, callback, since )
{
    /**Retrieves all chat messages for the given Application, optionally since a given timestamp.
     * @param {string} appId - The id of the application.
     * @param {function} Callback - The callback to be called when the operation finishes. The callback will be passed the list of messages as its first argument.
     * @param {string} since - Optional, the ISO String Date timestamp indicating only to get messages since the given date. Otherwise get all messages.
     */

    var cmd="/chat/" + appId;
    if ( since ) cmd+="?msgdate=" + since;

    VG.sendBackendRequest( cmd, "", function( responseText ) {
        var response=JSON.parse( responseText );
        if ( callback ) callback( response );
    }, "GET" );    
};

VG.DB.postAppChatMessage=function( appId, message )
{
    /**Posts a community chat message for the given Application.
     * @param {string} appId - The id of the application to receive the chat message.
     * @param {string} message - The chat message.
     */

    var parameters={ msg: message };
    VG.sendBackendRequest( "/chat/" + appId, JSON.stringify( parameters ), function( responseText ) {
        var response=JSON.parse( responseText );
    }, "POST" );
};