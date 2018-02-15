// ----------------------------------------------------------------- VG.UI.TreeWidget

VG.UI.TreeWidgetItem=function( item, rect )
{    
    if ( !(this instanceof VG.UI.TreeWidgetItem) ) return new VG.UI.TreeWidgetItem( item, rect );

    this.item=item;
    this.rect=VG.Core.Rect( rect );
};

VG.UI.TreeWidget=function()
{
    if ( !(this instanceof VG.UI.TreeWidget) ) return new VG.UI.TreeWidget();
    
    VG.UI.Widget.call( this );
    this.name="TreeWidget";

    this.offset=0;
    this.spacing=3;//VG.context.style.skin.ListWidgetItemDistance;

    this.minimumSize.set( 100, 100 );
    this.supportsFocus=true;

    this.items=[];
    this.vScrollbar=0;
    this.needsVScrollbar=false;
    this.verified=false;
    this.previousRect=VG.Core.Rect();
};

VG.UI.TreeWidget.prototype=VG.UI.Widget();

VG.UI.TreeWidget.prototype.bind=function( collection, path )
{
    this.controller=collection.controllerForPath( path );
    if ( !this.controller ) {
        this.controller=VG.Controller.Tree( collection, path );
        collection.addControllerForPath( this.controller, path );
    }

    this.controller.addObserver( "changed", this.changed, this );    
    this.controller.addObserver( "selectionChanged", this.selectionChanged, this );

    return this.controller;
};

VG.UI.TreeWidget.prototype.focusIn=function()
{
};

VG.UI.TreeWidget.prototype.focusOut=function()
{
};

VG.UI.TreeWidget.prototype.mouseWheel=function( step )
{
    if ( !this.needsVScrollbar ) return false;

    if ( step > 0 ) {
        this.offset-=this.itemHeight + this.spacing;
        this.vScrollbar.scrollTo( this.offset );   
    } else
    {
        this.offset+=this.itemHeight + this.spacing;
        this.vScrollbar.scrollTo( this.offset );            
    }

    return true;
};

VG.UI.TreeWidget.prototype.keyDown=function( keyCode )
{        
    if ( !this.controller.selected ) return;

    var index=this.controller.indexOf( this.controller.selected );
    if ( index === -1 ) return;

    if ( keyCode === VG.Events.KeyCodes.ArrowUp && index > 0 )
    {
        if ( this.offset >= index ) {
            this.offset=index-1;
            this.vScrollbar.scrollTo( this.offset * this.itemHeight + (this.offset-1) * this.spacing );
        }
        this.controller.selected=this.controller.at( index - 1 );
    } else
    if ( keyCode === VG.Events.KeyCodes.ArrowDown && index < this.controller.length-1 )
    {
        if ( Math.floor( this.offset + this.visibleItems ) <= index +1 ) {
            this.offset=index+2-Math.floor(this.visibleItems);
            this.vScrollbar.scrollTo( this.offset * this.itemHeight + (this.offset-1) * this.spacing );            
        }

        this.controller.selected=this.controller.at( index + 1 );
    } 
}

VG.UI.TreeWidget.prototype.mouseMove=function( event )
{
};

VG.UI.TreeWidget.prototype.mouseDown=function( event )
{
    if ( this.needsVScrollbar && this.vScrollbar && this.vScrollbar.rect.contains( event.pos ) ) {
        this.vScrollbar.mouseDown( event );
        return;
    }

    if ( !this.rect.contains( event.pos ) ) return;

    var item=this.getItemAtPos( event.pos );
    if ( item ) {
        if ( item.children ) {
            item.open=item.open ? false : true;

            if ( item.selectable ) this.controller.selected=item;
        } else
        {
            this.controller.selected=item;
        }
    }
    this.verified=false;    
};

VG.UI.TreeWidget.prototype.mouseDoubleClicked=function( event )
{
};

VG.UI.TreeWidget.prototype.vHandleMoved=function( offsetInScrollbarSpace )
{
    this.offset=offsetInScrollbarSpace * this.vScrollbar.totalSize / this.vScrollbar.visibleSize;
};

VG.UI.TreeWidget.prototype.verifyScrollbar=function( text )
{
    // --- Check if we have enough vertical space for all items

    this.needsVScrollbar=false;

    this.totalVisibleItemCount=this.countVisibleControllerItems();

    //console.log( this.totalVisibleItemCount );

    this.totalItemHeight=this.totalVisibleItemCount * this.itemHeight + (this.totalVisibleItemCount-1) * this.spacing;
    this.heightPerItem=this.totalItemHeight / this.controller.length;
    this.visibleItems=this.contentRect.height / this.heightPerItem;
    this.lastTopItem=Math.ceil( this.totalVisibleItemCount - this.visibleItems );

    if ( this.totalItemHeight > this.contentRect.height )
        this.needsVScrollbar=true;

    if ( this.needsVScrollbar && !this.vScrollbar ) {
        this.vScrollbar=VG.UI.Scrollbar( "TreeWidget Scrollbar" );
        this.vScrollbar.callbackObject=this;
    }    

    this.verified=true;
};

VG.UI.TreeWidget.prototype.changed=function()
{
    this.verified=false;    
    VG.update();
};

VG.UI.TreeWidget.prototype.selectionChanged=function()
{
    VG.update();
};

VG.UI.TreeWidget.prototype.paintWidget=function( canvas )
{
    if ( !this.rect.equals( this.previousRect ) ) this.verified=false;
    VG.context.style.drawTreeWidgetBorder( canvas, this );
    canvas.pushClipRect( this.contentRect );

    if ( !this.controller.length ) { canvas.popClipRect(); return; }

    this.itemHeight=canvas.style.skin.TreeWidget.ItemFont.size + canvas.style.skin.TreeWidget.ItemHeightAdder;
    this.contentRect=this.contentRect.shrink( VG.context.style.skin.TreeWidget.ContentBorderSize.width, VG.context.style.skin.TreeWidget.ContentBorderSize.height );

    if ( !this.verified || canvas.hasBeenResized )
        this.verifyScrollbar();

    // ---

    this.items=null;
    this.items=[];
    this._itemsCount=-1;
    
    var selBackgroundRect=VG.Core.Rect( this.contentRect );
    if ( this.needsVScrollbar )
        selBackgroundRect=selBackgroundRect.add( 0, 0, -VG.context.style.skin.Scrollbar.Size -3, 0 );

    // ---

    var paintRect=VG.Core.Rect( this.contentRect );
    paintRect.height=this.itemHeight;

    if ( this.needsVScrollbar )
        paintRect.width-=VG.context.style.skin.Scrollbar.Size;

    var oldWidth=paintRect.width;
    paintRect.y=this.contentRect.y - this.offset;

    // --- Check if top level items should be indented as there are other items with childs

    var indentTop=false;

    for ( var i=0; i < this.controller.length; ++i ) 
    {
        // --- Iterate and Draw the Top Level Items

        var item=this.controller.at( i );
        if ( item.children ) { indentTop=true; break; }
    }

    // --- 

    for ( var i=0; i < this.controller.length; ++i ) 
    {
        // --- Iterate and Draw the Top Level Items
    
        var item=this.controller.at( i ) ;
        ++this._itemsCount;

        if ( 1 )//paintRect.y + this.itemHeight <= this.contentRect.bottom() ) 
        {
            if ( 1 )//this._itemsCount >= this.offset )
            {
                this.items.push( VG.UI.TreeWidgetItem( item, paintRect ) );
                VG.context.style.drawTreeWidgetItem( canvas, item, this.controller.isSelected( item ), paintRect, selBackgroundRect, indentTop );

                paintRect.y+=this.itemHeight + this.spacing;    
            }

            if ( item.children && item.open ) this.drawItemChildren( canvas, paintRect, item, selBackgroundRect );

            paintRect.x=this.contentRect.x;
            paintRect.width=oldWidth;
        } else break;
    }

    if ( this.needsVScrollbar ) {
        this.vScrollbar.rect=VG.Core.Rect( this.rect.right() - VG.context.style.skin.Scrollbar.Size - 3, this.contentRect.y, VG.context.style.skin.Scrollbar.Size, this.contentRect.height );

        // this.totalItemHeight == Total height of all Items in the list widget including spacing
        // visibleHeight == Total height of all currently visible items
        // this.contentRect.height == Height of the available area for the list items

        this.vScrollbar.setScrollbarContentSize( this.totalItemHeight, this.contentRect.height );
        this.vScrollbar.paintWidget( canvas );
    }    

    this.previousRect.set( this.rect );
    canvas.popClipRect();
};

VG.UI.TreeWidget.prototype.drawItemChildren=function( canvas, paintRect, item, selBackgroundRect )
{
    if ( item.children && item.open )
    {
        var oldXOffset=paintRect.x;
        var oldWidth=paintRect.width;

        paintRect.x+=VG.context.style.skin.TreeWidget.ItemHierarchyOffset
        paintRect.width-=VG.context.style.skin.TreeWidget.ItemHierarchyOffset

        // --- Draw all childs

        for ( var i=0; i < item.children.length; ++i ) 
        {
            var child=item.children[i];

            ++this._itemsCount;

            if ( 1 )//paintRect.y + this.itemHeight < ( this.rect.y+this.rect.height-2 ) ) 
            {                
                if ( 1 )//this._itemsCount >= this.offset )
                {                
                    this.items.push( VG.UI.TreeWidgetItem( child, paintRect ) );
                    VG.context.style.drawTreeWidgetItem( canvas, child, this.controller.isSelected( child ), paintRect, selBackgroundRect );  

                    paintRect.y+=this.itemHeight + this.spacing;    
                }

                if ( child.children && child.open ) 
                    this.drawItemChildren( canvas, paintRect, child, selBackgroundRect );
            }
        }

        paintRect.x=oldXOffset;
        paintRect.width=oldWidth;
    }
};

VG.UI.TreeWidget.prototype.getItemAtPos=function( pos )
{
    for ( var i=0; i < this.items.length; ++i ) {
        if ( this.items[i].rect.contains( pos ) )
            return this.items[i].item;
    }
    return null;
};

VG.UI.TreeWidget.prototype.countVisibleControllerItems=function()
{
    var count=0;
    for ( var i=0; i < this.controller.length; ++i ) {
        var item=this.controller.at( i );

        ++count;

        if ( item.children && item.open ) 
            count+=this.countVisibleControllerChildItems( item );
    }

    return count;
};

VG.UI.TreeWidget.prototype.countVisibleControllerChildItems=function( item )
{
    var count=0;

    for ( var i=0; i < item.children.length; ++i ) 
    {
        var child=item.children[i];

        ++count;

        if ( child.children && child.open ) {
            count+=this.countVisibleControllerChildItems( child );
        }
    }

    return count;
};