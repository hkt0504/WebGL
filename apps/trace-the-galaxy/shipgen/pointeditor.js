// ----------------------------------------------------------------- PointEditor

PointEditor=function( shapeEditor )
{ 
    if ( !(this instanceof PointEditor) ) return new PointEditor( shapeEditor );

    VG.UI.Widget.call( this );

    this.shapeEditor=shapeEditor;
    this.pointController=shapeEditor.pointController;
    this.supportsFocus=true;

    this.zoom=1.0;
    this.unit=1.0;
    this.pixelPerUnit=100;

    this.originXOffset=0;
    this.originYOffset=0;

    this.childWidgets=[];

    // --- Setup Context Menu

    this.contextMenu=VG.UI.ContextMenu();

    this.extensionMenuItem=this.contextMenu.addItem( "Extension", null, function() { 

        var p=this.shapeEditor.pointController.selected;
        if ( p ) {
            if ( !p.extension ) {
                p.extension=true;
                this.extensionMenuItem.checked=true;
            } else {
                p.extension=false;
                this.extensionMenuItem.checked=false;
            }
        }

        this.mouseIsDown=false;
        this.update();
    }.bind( this ));
    this.extensionMenuItem.checkable=true;

    // ---

    this.dragOrigin=VG.Core.Point();
    this.selectionRect=VG.Core.Rect();
};

PointEditor.prototype=VG.UI.Widget();

PointEditor.prototype.setSegment=function( segment )
{
    this.segment=segment;
};

PointEditor.prototype.mouseWheel=function( step )
{
    var value=this.shapeEditor.segmentEditor.zoomSlider.value;
    if ( step > 0 ) 
    {
        if ( value < 10 ) {
            this.shapeEditor.segmentEditor.zoomSlider.value+=1;
            this.shapeEditor.segmentEditor.zoomSlider.changed( this.shapeEditor.segmentEditor.zoomSlider.value );
        }
    } else 
    {
        if (  value > 0 ) {
            this.shapeEditor.segmentEditor.zoomSlider.value-=1;
            this.shapeEditor.segmentEditor.zoomSlider.changed( this.shapeEditor.segmentEditor.zoomSlider.value );     
        }
    }
};

PointEditor.prototype.mouseDown=function( event )
{
    if ( !this.rect.contains( event.pos ) ) return;

    this.mouseIsDown=true; this.hasDraggedPoints=false; this.hasDraggedOrigin=false;

    var originX=this.rect.width/2 - 1 + this.originXOffset, originY=this.rect.height/2 - 1 + this.originYOffset;

    // --- Hit Test for Points

    for ( var i=0; i < this.segment.points.length; ++i ) 
    {
        var p=this.segment.points[i];

        var x=this.rect.x + originX + p.x * this.pixelPerUnit * this.zoom - 3;
        var y=this.rect.y + originY - p.y * this.pixelPerUnit * this.zoom - 3;

        if ( x <= event.pos.x && x+8 >= event.pos.x && y <= event.pos.y && y+8 >= event.pos.y ) 
        {
            var selIndex=this.segment.selPoints.indexOf( p );
            if ( event.keysDown.indexOf( VG.Events.KeyCodes.Shift ) !== -1 )
            {
                // --- Shift Multi Select

                if ( selIndex === -1 ) {
                    this.segment.selPoints.push( p );
                } else this.segment.selPoints.splice( selIndex, 1 );

            } else this.segment.selPoints=[ p ];

            this.dragOrigin.copy( event.pos );

            this.shapeEditor.pointController.selected=p;
            VG.update();

            this.hasDraggedPoints=false;

            return;
        }
    }

    var ctrl = VG.Events.KeyCodes.Ctrl;
    if ( VG.context.workspace.operatingSystem === VG.HostProperty.OSMac )
        ctrl = VG.Events.KeyCodes.AppleLeft;

    if ( event.keysDown.indexOf( ctrl ) !== -1 ) 
    {
        // --- This will start an origin drag
        this.dragOrigin.copy( event.pos );
        this.dragOrigin.x-=this.originXOffset;
        this.dragOrigin.y-=this.originYOffset;
        this.hasDraggedOrigin=true;
    } else {
        // --- As nothing else, start a rectangle selection

        this.hasRectangleSelection=true;
        this.dragOrigin.copy( event.pos );
        this.selectionRect.set( this.dragOrigin.x, this.dragOrigin.y, 0, 0 );        
    }

    this.segment.selPoints=[];
    this.shapeEditor.pointController.selected=undefined;
};

PointEditor.prototype.mouseMove=function( event )
{
    if ( !this.mouseIsDown ) return;
    if ( !this.rect.contains( event.pos ) ) return;

    var meshUpdate=false;

    // --- Dragging Origin

    if ( this.hasDraggedOrigin ) {
        this.originXOffset=(event.pos.x - this.dragOrigin.x);// / this.pixelPerUnit / this.zoom;
        this.originYOffset=(event.pos.y - this.dragOrigin.y);// / this.pixelPerUnit / this.zoom;

        VG.update();
    } else
    if ( this.hasRectangleSelection )
    {
        // --- Rectangle Selection Drag

        if ( event.pos.x > this.dragOrigin.x ) {
            this.selectionRect.x=this.dragOrigin.x; this.selectionRect.width=event.pos.x - this.dragOrigin.x;
        } else {
            this.selectionRect.x=event.pos.x; this.selectionRect.width=this.dragOrigin.x - event.pos.x;
        }

        if ( event.pos.y > this.dragOrigin.y ) {
            this.selectionRect.y=this.dragOrigin.y; this.selectionRect.height=event.pos.y - this.dragOrigin.y;
        } else {
            this.selectionRect.y=event.pos.y; this.selectionRect.height=this.dragOrigin.y - event.pos.y;
        }

        var originX=this.rect.width/2 - 1 + this.originXOffset, originY=this.rect.height/2 - 1 + this.originYOffset;
        var pt=VG.Core.Point();

        for ( var i=0; i < this.segment.points.length; ++i ) 
        {
            var p=this.segment.points[i];

            pt.x=this.rect.x + originX + p.x * this.pixelPerUnit * this.zoom;
            pt.y=this.rect.y + originY - p.y * this.pixelPerUnit * this.zoom;

            var selIndex=this.segment.selPoints.indexOf( p );
            if ( this.selectionRect.contains( pt ) ) {                
                if ( selIndex === -1 ) {
                    this.segment.selPoints.push( p );
                    if ( !this.shapeEditor.pointController.selected ) 
                        this.shapeEditor.pointController.selected=p;
                }
            } else {
                if ( selIndex !== -1 ) {
                    this.segment.selPoints.splice( selIndex, 1 );
                    if ( p === this.shapeEditor.pointController.selected ) 
                    {
                        if ( this.segment.selPoints.length ) this.shapeEditor.pointController.selected=this.segment.selPoints[0];
                        else this.shapeEditor.pointController.selected=undefined;
                    }
                }
            }
        }
        
        VG.update();
    } else
    if ( this.segment.selPoints.length )
    {
        if ( !this.hasDraggedPoints ) {
            // --- User is starting to drag selected points, copy all original point data so that they can be restored later

            for ( var i=0; i < this.segment.selPoints.length; ++i ) {
                var p=this.segment.selPoints[i]

                p.temp.dragOriginalX=p.x;
                p.temp.dragOriginalY=p.y;
            }
        }

        var x=(event.pos.x - this.dragOrigin.x) / this.pixelPerUnit / this.zoom;
        var y=(this.dragOrigin.y - event.pos.y) / this.pixelPerUnit / this.zoom;

        for ( var i=0; i < this.segment.selPoints.length; ++i ) 
        {
            // --- Dragging Points

            var p=this.segment.selPoints[i]

            var fixedX=false;

            if ( p === this.segment.points[0] || p === this.segment.points[this.segment.points.length-1] )
                fixedX=true;

            if ( p.x + x >= 0 && !fixedX ) {
                p.x+=x;
                this.dragOrigin.x=event.pos.x;
            } else p.x=0;

            p.y+=y;
            this.dragOrigin.y=event.pos.y;

            if ( p === this.shapeEditor.pointController.selected ) {
                this.shapeEditor.segmentEditor.pointXEdit.value=p.x;
                this.shapeEditor.segmentEditor.pointYEdit.value=p.y;
            }

            this.hasDraggedPoints=true;
            meshUpdate=true;
        }
    };

    if ( meshUpdate )
        this.update();
};

PointEditor.prototype.mouseUp=function( event )
{
    this.mouseIsDown=false;
    this.hasRectangleSelection=false;

    if ( this.hasDraggedPoints ) 
    {
        var tempP=this.shapeEditor.pointController.selected;

        for ( var i=0; i < this.segment.selPoints.length; ++i ) 
        {
            var p=this.segment.selPoints[i]

            var tempX=p.x, tempY=p.y;

            p.x=p.temp.dragOriginalX;
            p.y=p.temp.dragOriginalY;

            this.shapeEditor.pointController.selected=p;

            var undo=this.shapeEditor.dc.storeDataForPath( "segments.points.x", tempX, false, true );
            undo.addSubItem( "segments.points.y", tempY );

            p.x=tempX;
            p.y=tempY;
        }
        this.shapeEditor.pointController.selected=tempP;
        this.shapeEditor.segmentEditor.pointXEdit.value=tempP.x;
        this.shapeEditor.segmentEditor.pointYEdit.value=tempP.y;

        this.update();
    }
};

PointEditor.prototype.mouseDoubleClick=function( event )
{
    if ( !this.rect.contains( event.pos ) ) return;

    function pointDistance( p, x, y )
    {
        var deltaX=p.x - x;
        var deltaY=p.y - y;

        return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    }

    var originX=this.rect.width/2 - 1 + this.originXOffset, originY=this.rect.height/2 - 1 + this.originYOffset;
    var x=(event.pos.x - originX - this.rect.x) / this.pixelPerUnit / this.zoom;
    var y=(originY - (event.pos.y - this.rect.y)) / this.pixelPerUnit / this.zoom;

    var index=-1, distance=100000, extension;

    for ( var i=0; i < this.segment.points.length; ++i ) 
    {
        var p=this.segment.points[i];

        var dist=pointDistance( p, x, y );

        if ( dist < distance ) { 
            distance=dist;
            index=i;
            extension=p.extension;
        }
    };

    if ( index > 0 ) {
        var p=this.segment.points[index];
        var prevp=this.segment.points[index-1];

        index++;

        if ( prevp.y < p.y && y < p.y && y > prevp.y ) index--;
        else
        if ( prevp.y > p.y && y > p.y && y < prevp.y ) index--;
    }

    if ( index === 0 ) index=1;
    else
    if ( index === -1 || index >= this.segment.points.length ) index=this.segment.points.length - 1;

    var p=new SegmentCPoint( x, y );
    p.extension=extension;
    this.shapeEditor.pointController.insert( index, p );
    this.shapeEditor.pointController.selected=p;

    this.update();
};

PointEditor.prototype.keyDown=function( keyCode, keysDown )
{
    if ( keyCode == VG.Events.KeyCodes.Backspace )
    {
        for ( var i=0; i < this.segment.selPoints.length; ++i ) {
            var p=this.segment.selPoints[i];

            if ( p !== this.segment.points[0] && p !== this.segment.points[this.segment.points.length-1] )
                this.shapeEditor.pointController.remove( p );
        }
        this.segment.selPoints=[];
        this.update();
    }
 };

PointEditor.prototype.paintWidget=function( canvas )
{
    canvas.pushClipRect( this.rect );

    // --- Origin

    var rect=this.contentRect;
    var originX=this.rect.width/2 - 1 + this.originXOffset, originY=this.rect.height/2 - 1 + this.originYOffset;

    rect.set( this.rect.x + originX, this.rect.y, 1, this.rect.height );
    canvas.draw2DShape( VG.Canvas.Shape2D.Rectangle, rect, VG.Core.Color() );

    rect.set( this.rect.x, this.rect.y + originY, this.rect.width, 1 );
    canvas.draw2DShape( VG.Canvas.Shape2D.Rectangle, rect, VG.Core.Color() );

    // --- Grid

    rect.set( this.rect.x + originX, this.rect.y, 0.5, this.rect.height );
    var rectX=rect.x, rectY=rect.y;
    var gridMult=1.0;

    while ( this.pixelPerUnit * this.zoom * gridMult < 10 ) gridMult++;

    // --- Right

    do
    {
        rect.x+=this.pixelPerUnit * this.zoom * gridMult;
        canvas.draw2DShape( VG.Canvas.Shape2D.Rectangle, rect, VG.Core.Color( 100, 100, 100 ) );
    }  while ( rect.x < (this.rect.x + this.rect.width) );

    // --- Left

    rect.x=rectX;
    do
    {
        rect.x-=this.pixelPerUnit * this.zoom * gridMult;
        canvas.draw2DShape( VG.Canvas.Shape2D.Rectangle, rect, VG.Core.Color( 100, 100, 100 ) );
    }  while ( rect.x > this.rect.x );

    // --- Bottom

    rect.set( this.rect.x, this.rect.y + originY, this.rect.width, 1 );

    do
    {
        rect.y+=this.pixelPerUnit * this.zoom * gridMult;
        canvas.draw2DShape( VG.Canvas.Shape2D.Rectangle, rect, VG.Core.Color( 100, 100, 100 ) );
    }  while ( rect.y < (this.rect.y + this.rect.height) );

    // --- Top

    rect.y=rectY + originY;
    do
    {
        rect.y-=this.pixelPerUnit * this.zoom * gridMult;
        canvas.draw2DShape( VG.Canvas.Shape2D.Rectangle, rect, VG.Core.Color( 100, 100, 100 ) );
    }  while ( rect.y > this.rect.y );

    // --- Rectangle Selection

    if ( this.hasRectangleSelection ) {
        //rect.set( this.dragOrigin.x, this.dragOrigin.y, event.pos.x - this.dragOrigin.x, event.pos.y - this.dragOrigin.y );
        canvas.draw2DShape( VG.Canvas.Shape2D.Rectangle, this.selectionRect, VG.Core.Color( 100, 100, 100 ) );
    }

    // ---

    if ( !this.segment ) { canvas.popClipRect(); return; }

    for ( var i=0; i < this.segment.points.length; ++i ) 
    {
        var p=this.segment.points[i];

        rect.set( this.rect.x + originX + p.x * this.pixelPerUnit * this.zoom - 3, this.rect.y + originY - p.y * this.pixelPerUnit * this.zoom - 3, 8, 8 );

        if ( this.segment.selPoints.indexOf( p ) === -1 ) {

            if ( 1 )//!p.closed )
                canvas.draw2DShape( VG.Canvas.Shape2D.Rectangle, rect, VG.Core.Color() );
            else
                canvas.draw2DShape( VG.Canvas.Shape2D.Rectangle, rect, VG.Core.Color( 255, 255, 0 ) );
        } else
        {
            if ( !p.closed )
                canvas.draw2DShape( VG.Canvas.Shape2D.Rectangle, rect, VG.Core.Color( 255, 255, 255 ) );
            else
                canvas.draw2DShape( VG.Canvas.Shape2D.Rectangle, rect, VG.Core.Color( 255, 255, 200 ) );
        }
    }

    if ( !this.segment.hullSeams ) { canvas.popClipRect(); return; }

    // --- Hull Seams

    for ( var i=0; i < this.segment.hullSeams.length; ++i ) 
    {
        var p=this.segment.hullSeams[i];

        rect.set( this.rect.x + originX + p.x * this.pixelPerUnit * this.zoom - 0.5, this.rect.y + originY - p.y * this.pixelPerUnit * this.zoom - 0.5, 3, 3 );
        canvas.draw2DShape( VG.Canvas.Shape2D.Circle, rect, VG.Core.Color( 0, 255, 0 ) );
    }

    // --- Mirror the Hull Seams

    for ( var i=0; i < this.segment.hullSeams.length; ++i ) 
    {
        var p=this.segment.hullSeams[i];

        rect.set( this.rect.x + originX - p.x * this.pixelPerUnit * this.zoom - 0.5, this.rect.y + originY - p.y * this.pixelPerUnit * this.zoom - 0.5, 3, 3 );
        canvas.draw2DShape( VG.Canvas.Shape2D.Circle, rect, VG.Core.Color( 0, 255, 0 ) );
    }

    if ( !this.segment.extensionSeams ) { canvas.popClipRect(); return; }

    // --- Extension Seams

    for ( var i=0; i < this.segment.extensionSeams.length; ++i ) 
    {
        var p=this.segment.extensionSeams[i];

        rect.set( this.rect.x + originX + p.x * this.pixelPerUnit * this.zoom - 0.5, this.rect.y + originY - p.y * this.pixelPerUnit * this.zoom - 0.5, 3, 3 );
        canvas.draw2DShape( VG.Canvas.Shape2D.Circle, rect, VG.Core.Color( 255, 255, 0 ) );
    }

    // --- Mirror the Extension Seams

    for ( var i=0; i < this.segment.extensionSeams.length; ++i ) 
    {
        var p=this.segment.extensionSeams[i];

        rect.set( this.rect.x + originX - p.x * this.pixelPerUnit * this.zoom - 0.5, this.rect.y + originY - p.y * this.pixelPerUnit * this.zoom - 0.5, 3, 3 );
        canvas.draw2DShape( VG.Canvas.Shape2D.Circle, rect, VG.Core.Color( 255, 255, 0 ) );
    }

    /*
    {  
        for ( var i=0; i < this.segment.seams.length; ++i ) 
        {
            var p=this.segment.seams[i];

            rect.set( this.rect.x + originX + p.x * this.pixelPerUnit * this.zoom - 0.5, this.rect.y + originY - p.y * this.pixelPerUnit * this.zoom - 0.5, 3, 3 );
            canvas.draw2DShape( VG.Canvas.Shape2D.Circle, rect, VG.Core.Color( 0, 255, 0 ) );
        }  

        for ( var i=0; i < this.segment.openSeams.length; ++i ) 
        {
            var p=this.segment.openSeams[i];

            rect.set( this.rect.x + originX + p.x * this.pixelPerUnit * this.zoom - 0.5, this.rect.y + originY - p.y * this.pixelPerUnit * this.zoom - 0.5, 3, 3 );
            canvas.draw2DShape( VG.Canvas.Shape2D.Circle, rect, VG.Core.Color( 255, 0, 0 ) );
        }           
    }*/

    canvas.popClipRect();    
};