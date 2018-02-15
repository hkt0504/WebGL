// ----------------------------------------------------------------- VG.UI.ToolSeparator

VG.UI.ToolSeparator=function()
{
    if ( !(this instanceof VG.UI.ToolSeparator )) return new VG.UI.ToolSeparator();

    VG.UI.Widget.call( this );
    this.name="ToolSeparator";

    this.horizontalExpanding=false;
    this.verticalExpanding=false;
};

VG.UI.ToolSeparator.prototype=VG.UI.Widget();

VG.UI.ToolSeparator.prototype.calcSize=function()
{
    var size=VG.Core.Size( 2, VG.context.style.skin.Toolbar.Separator.Size.height );
    return size;
};

VG.UI.ToolSeparator.prototype.paintWidget=function( canvas )
{
    var size=this.calcSize();
    this.contentRect.set( this.rect );
    
    VG.context.style.drawToolSeparator( canvas, this );
};

// ----------------------------------------------------------------- VG.UI.ToolButton

VG.UI.ToolButton=function( text, iconName )
{
    if ( !(this instanceof VG.UI.ToolButton) ) return new VG.UI.ToolButton( text, iconName );
    
    this.text=text ? text : "";
    this.iconName=iconName ? iconName : undefined;
    
    VG.UI.Widget.call( this );
    this.name="ToolButton";
    
    this.horizontalExpanding=false;
    this.verticalExpanding=false;
    
    this.role=VG.UI.ActionItemRole.None;
    this.minimumSize.width=VG.context.style.skin.ToolButton.MinimumWidth;
    this._icon=0; 

    this.checkable=false;
    this.checked=false;
    this.exclusions=[];
};

VG.UI.ToolButton.prototype=VG.UI.Widget();

Object.defineProperty( VG.UI.ToolButton.prototype, "icon", {
    get: function() {
        return this._icon;
    },
    set: function( icon ) {
        this._icon=icon;
    }    
});

VG.UI.ToolButton.prototype.bind=function( collection, path )
{
    this.collection=collection;
    this.path=path;
    collection.addValueBindingForPath( this, path ); 
};

VG.UI.ToolButton.prototype.valueFromModel=function( value )
{
    //console.log( "TextEdit.valueFromModel: " + value );

    if ( value === null ) this.checked=false;
    else this.checked=value;  

    if ( this.changed )
        this.changed.call( VG.context, value, false, this );   

    VG.update();    
};

VG.UI.ToolButton.prototype.addExclusions=function()
{
    this.checkable=true;

    for ( var i=0; i < arguments.length; ++i ) {
        if ( this.exclusions.indexOf( arguments[i] ) === -1 ) this.exclusions.push( arguments[i] );

        if ( arguments[i].exclusions.indexOf( this ) === -1 )
        {
            arguments[i].exclusions.push( this );
            arguments[i].checkable=true;
        }
    }
};

VG.UI.ToolButton.prototype.calcSize=function()
{
    var size=VG.Core.Size();
    
    this.minimumSize.width=VG.context.style.skin.ToolButton.MinimumWidth;

    if ( !this.icon ) {
        VG.context.workspace.canvas.getTextSize( this.text, size );
        size.width+=10;
        if ( VG.context.style.skin.ToolButton.ScaleToParentHeight )
            size.height=VG.context.style.skin.Toolbar.Height;
        else size.height+=10;
    } else {
        if ( VG.context.style.skin.ToolButton.ScaleToParentHeight )
            size.set( 22 + 10, VG.context.style.skin.Toolbar.Height );
        else size.set( 22 + 10, 22 + 10 );
    }

    if ( size.width < this.minimumSize.width )
        size.width=this.minimumSize.width;

    return size;
};

VG.UI.ToolButton.prototype.mouseDown=function( event )
{
    if ( this.rect.contains( event.pos) )
        this.mouseIsDown=true;
};

VG.UI.ToolButton.prototype.mouseUp=function( event )
{
    if ( this.rect.contains( event.pos) )
    {
        if ( this.checkable && this.mouseIsDown )
        {
            if ( this.exclusions.length && this.checked === false ) 
            {    
                this.checked=true;
                var undo=undefined;

                if ( this.collection && this.path )
                    undo=this.collection.storeDataForPath( this.path, this.checked, false, true );   

                for ( var i=0; i < this.exclusions.length; ++i ) 
                {
                    var exclusion=this.exclusions[i];
                    exclusion.checked=false;

                    if ( this.collection && this.path && undo ) {
                        undo.addSubItem( exclusion.path, exclusion.checked );   

                        if ( exclusion.changed ) exclusion.changed( exclusion.checked, true, exclusion );
                    }
                } 

                if ( this.changed ) this.changed( this.checked, true, this );
            } else
            if ( !this.exclusions.length )
            {
                this.checked=!this.checked;

                if ( this.collection && this.path )
                    this.collection.storeDataForPath( this.path, this.checked );   

                if ( this.changed ) this.changed( this.checked, true, this );
            }
        }
        this.mouseIsDown=false;
    }
};

VG.UI.ToolButton.prototype.paintWidget=function( canvas )
{
    var size=this.calcSize();
    this.contentRect.set( this.rect );
    var size=size.add( -10, 0 );
    
    VG.context.style.drawToolButton( canvas, this );
};

// ----------------------------------------------------------------- VG.UI.Toolbar

VG.UI.Toolbar=function()
{
    if ( !(this instanceof VG.UI.Toolbar) ) return VG.UI.Toolbar.creator( arguments );
    
    VG.UI.Widget.call( this );
    this.name="Toolbar";

    // ---
    
    this.layout=VG.UI.Layout();

    for( var i=0; i < arguments.length; ++i )
        this.addItem( arguments[i] );

    this.maximumSize.height=VG.context.style.skin.Toolbar.Height;
};

VG.UI.Toolbar.prototype=VG.UI.Widget();

VG.UI.Toolbar.prototype.addItem=function( item )
{
    this.layout.addChild( item );
}

VG.UI.Toolbar.prototype.addItems=function()
{
    for( var i=0; i < arguments.length; ++i )
        this.addItem( arguments[i] );    
};

VG.UI.Toolbar.prototype.paintWidget=function( canvas )
{
    this.maximumSize.height=VG.context.style.skin.Toolbar.Height;    
    VG.context.style.drawToolbar( canvas, this );
        
    this.layout.rect.set( this.rect );
    this.layout.layout( canvas );
};
