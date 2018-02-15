VG.Data = {};

VG.Data.Binding=function( object, path )
{
    if ( !(this instanceof VG.Data.Binding) ) return new VG.Data.Binding();
    
    this.object=object;
    this.path=path;
};

VG.Data.Base=function()
{
    if ( !(this instanceof VG.Data.Base) ) return new VG.Data.Base();

	Object.defineProperty( this, "__vgControllerBindings", { 
        enumerable: false, 
        writable: true
    });

	Object.defineProperty( this, "__vgValueBindings", { 
    	enumerable: false, 
        writable: true
    });

    Object.defineProperty( this, "__vgUndo", { 
        enumerable: false, 
        writable: true
    });

    this.__vgControllerBindings=[];
    this.__vgValueBindings=[];
};

VG.Data.Base.prototype.addControllerForPath=function( controller, path )
{
	var binding=new VG.Data.Binding( controller, path );
	this.__vgControllerBindings.push( binding );
};

VG.Data.Base.prototype.addValueBindingForPath=function( object, path )
{
	var binding=new VG.Data.Binding( object, path );
	this.__vgValueBindings.push( binding );
};

VG.Data.Base.prototype.removeAllValueBindingsForPath=function( path )
{
    //console.log( "removeAllValueBindingsForPath", path );

    var array=[];

    for( var i=0; i < this.__vgValueBindings.length; ++i ) {
        var bind=this.__vgValueBindings[i];
        if ( path !== bind.path ) array.push( bind );
    }    
    this.__vgValueBindings=array;    
};

VG.Data.Base.prototype.controllerForPath=function( path )
{
	for( var i=0; i < this.__vgControllerBindings.length; ++i ) {
		var cont=this.__vgControllerBindings[i];
		if ( path === cont.path ) return cont;
	}
	return 0;
};

VG.Data.Base.prototype.valueBindingForPath=function( path )
{
    for( var i=0; i < this.__vgValueBindings.length; ++i ) {
        var valueBinding=this.__vgValueBindings[i];
        if ( path === valueBinding.path ) return valueBinding;
    }
    return 0;
};

VG.Data.Base.prototype.dataForPath=function( path )
{
    if ( path.indexOf( '.' ) === -1 ) return this[path];
    else {
    	var object=this.objectForPath( path );

    	if ( object ) {
	    	return object[this.valueSegmentOfPath(path)];
    	} 
/*
        else {
            var controller=this.controllerForPath( path );

            if ( controller )
            {
                object=controller.object.selected;

                //console.log( controller.path );
                console.log( "dataForPath returning", controller.path, controller.object, controller.object.selected );
                return object[this.valueSegmentOfPath(path)];

                if ( !object ) return null;
                else return object;
            }
        }*/
    }

    return null;
};

VG.Data.Base.prototype.storeDataForPath=function( path, value, noUndo, forceStorage )
{
    /**Stores a given value for the given path and creates an undo step. Widgets like a Checkbox widget use this function to store
     * user changes inside the model. However this function can also be used directly to store value changes.
     * @param {string} path - The path of the value to store.
     * @param {object} value - The data value to store inside the model.
     * @param {boolean} noUndo - Optional, if true blocks the creation of an undo step for the value change.
     * @param {boolean} forceStorage - Optional, if true forces storing of the value. Normally if the model value is the same as the new value
     * this function will not store it, however to make sure this value is always stored set forceStorage to true. This is useful for undo groups
     * where the initial value may be the same as in the model but other value changes inside the group will change values.
     * @returns {VG.Data.UndoItem} The undo item created for this data value step. To add further undo steps into this group just call addSubItem() on the
     * undo item. 
     */

    var undo=undefined;
    if ( path.indexOf( '.' ) === -1 ) 
    {
        if ( this.__vgUndo && !noUndo ) undo=this.__vgUndo.pathValueAboutToChange( this, path, value );        
        this[path]=value;
    } else 
    {
    	var object=this.objectForPath( path );
    	if ( object ) {

            if ( object[this.valueSegmentOfPath(path)] !== value || forceStorage ) {

                if ( this.__vgUndo && !noUndo ) undo=this.__vgUndo.pathValueAboutToChange( this, path, value );
                object[this.valueSegmentOfPath(path)]=value;
            }
    	}
    }
    return undo;
};

VG.Data.Base.prototype.objectForPath=function( path )
{
	var parts=path.split( '.' );
	var object=null;
	var travelingPath="";

    for( var i=0; i < parts.length-1; ++i ) {
    	var segment=parts[i];

		if ( object ) travelingPath+=".";
		travelingPath+=segment;

		var controller=this.controllerForPath( travelingPath );
		if ( controller ) {
			object=controller.object.selected;
			if ( !object ) return null;
		} else return null;
    }

	return object;
};

VG.Data.Base.prototype.valueSegmentOfPath=function( path )
{
	if ( path.indexOf( '.' ) === -1 ) return path;

	var parts=path.split( '.' );
	return parts[parts.length-1];
};

/**
 * Update the top level bindings after the model changed from the outside, like after "New" and "Open" operations.
 * <br><br>
 */

VG.Data.Base.prototype.updateTopLevelBindings=function()
{
    for( var i=0; i < this.__vgControllerBindings.length; ++i ) {
        var cont=this.__vgControllerBindings[i];

        if  ( cont.path.indexOf(".") === -1 ) {
            cont.object.selected=0;
        }

        if ( cont.object.modelChanged ) cont.object.modelChanged();
    }

    for( var i=0; i < this.__vgValueBindings.length; ++i ) {
        var val=this.__vgValueBindings[i];

        if  ( val.path.indexOf(".") === -1 ) {
            val.object.valueFromModel( this.dataForPath( val.path ) );
        }
    }    
};

VG.Data.Base.prototype.clearUndo=function()
{
    if ( this.__vgUndo ) 
        this.__vgUndo.clear();
};

// -------------

VG.Data.Collection=function( name )
{
    if ( !(this instanceof VG.Data.Collection) ) return new VG.Data.Collection( name );

    VG.Data.Base.call( this );
};

VG.Data.Collection.prototype=VG.Data.Base();
