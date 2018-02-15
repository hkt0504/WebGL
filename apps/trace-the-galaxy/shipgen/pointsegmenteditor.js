// ----------------------------------------------------------------- Generate the Mesh

PointSegmentDialog=function( shapeEditor )
{
    if ( !(this instanceof PointSegmentDialog) ) return new PointSegmentDialog( shapeEditor );

    VG.UI.Dialog.call( this, "Import OBJ" );
/*
    var openOBJButton=VG.UI.Button( "Select OBJ..." );
    var openMTLButton=VG.UI.Button( "Select MTL..." );
    var zoomSlider=VG.UI.Slider( 1, 10, 1 );

    var leftLayout=VG.UI.Layout( openOBJButton, openMTLButton );
    leftLayout.vertical=true;
    var previewWidget=new TracerSample();
*/
    var pointSegmentEditor=PointSegmentEditor( shapeEditor );
    pointSegmentEditor.setSegment( shapeEditor.segmentController.selected );
    var rightLayout=VG.UI.Layout();

    this.layout=VG.UI.Layout( pointSegmentEditor, rightLayout );
/*
    openOBJButton.clicked=function() {
        var fileDialog=VG.OpenFileDialog( VG.UI.FileDialog.Text, function( name, content ) {
            previewWidget.loadFromOBJ( content, this.zoomValue );
            this.objContent=content;
        }.bind( this ) );
    }.bind( this );

    openMTLButton.clicked=function() {
        var fileDialog=VG.OpenFileDialog( VG.UI.FileDialog.Text, function( name, content ) {
            previewWidget.loadFromOBJ( this.objContent, this.zoomValue, content );
            this.mtlContent=content;
        }.bind( this ) );
    }.bind( this );

    zoomSlider.changed=function( value ) {
        this.zoomValue=value;
        previewWidget.loadFromOBJ( this.objContent, this.zoomValue, this.mtlContent );
    }.bind( this );

    this.buttonLayout.removeChild( this.buttonLayout.childAt( 0 ) );
    this.buttonLayout.addChilds( VG.UI.Label( "Zoom" ), zoomSlider, VG.UI.LayoutHSpacer() );
*/
    this.addButton( "Close", function() { this.close( this ); }.bind( this ) );

/*
    this.addButton( "Accept", function() { 
        renderWidget.loadFromOBJ( this.objContent, this.zoomValue, this.mtlContent );
        this.close( this );
    }.bind( this ) );*/

};

PointSegmentDialog.prototype=VG.UI.Dialog();

// ----------------------------------------------------------------- PointEditor

PointSegmentEditor=function( shapeEditor )
{ 
    if ( !(this instanceof PointSegmentEditor) ) return new PointSegmentEditor( shapeEditor );

    VG.UI.Widget.call( this );

    this.shapeEditor=shapeEditor;
    this.pointController=shapeEditor.pointController;
    this.supportsFocus=true;

    this.zoom=1.0;
    this.unit=1.0;
    this.pixelPerUnit=100;

    this.originZOffset=0;
    this.originYOffset=0;

    this.childWidgets=[];

    // --- Setup Context Menu

    this.contextMenu=VG.UI.ContextMenu();

    this.closePointsMenuItem=this.contextMenu.addItem( "Close Point for Transition", null, function() { 

        var p=this.shapeEditor.pointController.selected;
        if ( p ) p.closed=true;

        this.mouseIsDown=false;
        this.update();
    }.bind( this ));

    this.openPointsMenuItem=this.contextMenu.addItem( "Open Point for Transition", null, function() {

        var p=this.shapeEditor.pointController.selected;
        if ( p ) p.closed=false;

        this.mouseIsDown=false;
        this.update();
    }.bind( this ));

    // ---

    this.dragPoints=[];
    this.dragOrigin=VG.Core.Point();
};

PointSegmentEditor.prototype=VG.UI.Widget();

PointSegmentEditor.prototype.setSegment=function( segment )
{
    this.segment=segment;
};

PointSegmentEditor.prototype.mouseWheel=function( step )
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

PointSegmentEditor.prototype.mouseDown=function( event )
{
    if ( !this.rect.contains( event.pos ) ) return;

    this.mouseIsDown=true; this.hasDraggedPoints=false; this.hasDraggedOrigin=false;

    var originX=this.rect.width/2 - 1 + this.originZOffset, originY=this.rect.height/2 - 1 + this.originYOffset;
    var segSizeInPixel=(this.segment.size - this.segment.transSize) * this.pixelPerUnit * this.zoom;

    // --- Hit Test for Points

    this.frontSelected=this.backSelected=false;

    for ( var i=0; i < this.segment.points.length; ++i ) 
    {
        var p=this.segment.points[i];

        var x=this.rect.x + originX + p.zFrontMod * this.pixelPerUnit * this.zoom - 3 - segSizeInPixel / 2;
        var y=this.rect.y + originY - (p.y + p.yFrontMod) * this.pixelPerUnit * this.zoom - 3;

        //VG.log( x, y, event.pos.x, event.pos.y );

        if ( x <= event.pos.x && x+8 >= event.pos.x && y <= event.pos.y && y+8 >= event.pos.y ) 
            this.frontSelected=true;
        else
        {
            x=this.rect.x + originX + p.zBackMod * this.pixelPerUnit * this.zoom - 3 + segSizeInPixel / 2;
            y=this.rect.y + originY - (p.y + p.yBackMod) * this.pixelPerUnit * this.zoom - 3;

            if ( x <= event.pos.x && x+8 >= event.pos.x && y <= event.pos.y && y+8 >= event.pos.y ) 
                this.backSelected=true;
        }

        if ( this.frontSelected || this.backSelected ) {

            var selIndex=this.segment.selPoints.indexOf( p );
            if ( event.keysDown.indexOf( VG.Events.KeyCodes.Shift ) !== -1 )
            {
                // --- Shift Multi Select

                if ( selIndex === -1 ) {
                    this.segment.selPoints.push( p );
                } else this.segment.selPoints.splice( selIndex, 1 );

            } else this.segment.selPoints=[ p ];

            if ( this.frontSelected ) {
                this.pDragOriginalX=p.zFrontMod;
                this.pDragOriginalY=p.yFrontMod;
            } else
            if ( this.backSelected ) {
                this.pDragOriginalX=p.zBackMod;
                this.pDragOriginalY=p.yBackMod;
            }            

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
        this.dragOrigin.x-=this.originZOffset;
        this.dragOrigin.y-=this.originYOffset;
        this.hasDraggedOrigin=true;
    }

    this.segment.selPoints=[];
    this.shapeEditor.pointController.selected=undefined;
};

PointSegmentEditor.prototype.mouseMove=function( event )
{
    if ( !this.mouseIsDown ) return;
    if ( !this.rect.contains( event.pos ) ) return;

    if ( !this.dragPoints.length && this.segment.selPoints.length ) this.dragPoints=this.segment.selPoints;

    // --- Dragging Origin

    if ( this.hasDraggedOrigin ) {
        this.originZOffset=(event.pos.x - this.dragOrigin.x);// / this.pixelPerUnit / this.zoom;
        this.originYOffset=(event.pos.y - this.dragOrigin.y);// / this.pixelPerUnit / this.zoom;

        VG.update();
    } else
    if ( this.segment.selPoints.length )    
    {
        // --- Dragging Points

        var segSize=this.segment.size - this.segment.transSize;
        var segSizeInPixel=(this.segment.size - this.segment.transSize) * this.pixelPerUnit * this.zoom;

        for ( var i=0; i < this.dragPoints.length; ++i ) 
        {
            var p=this.dragPoints[i]

            var x=(event.pos.x - this.dragOrigin.x) / this.pixelPerUnit / this.zoom;
            var y=(this.dragOrigin.y - event.pos.y) / this.pixelPerUnit / this.zoom;

            if ( this.frontSelected ) 
            {
                if ( p.zFrontMod + x >= 0 && p.zFrontMod + x <= segSize )
                {
                    p.zFrontMod+=x;
                    this.dragOrigin.x=event.pos.x;
                } else {
                    if ( p.zFrontMod + x < 0 ) p.zFrontMod=0;
                    if ( p.zFrontMod + x > segSize ) p.zFrontMod=segSize;
                }

                p.yFrontMod+=y;
                this.dragOrigin.y=event.pos.y;

                this.shapeEditor.segmentEditor.pointZFrontEdit.value=p.zFrontMod;
                this.shapeEditor.segmentEditor.pointYFrontEdit.value=p.yFrontMod;
            } else
            if ( this.backSelected )         
            {
                if ( p.zBackMod + x <= 0 && p.zBackMod + x >= -segSize )
                {
                    p.zBackMod+=x;
                    this.dragOrigin.x=event.pos.x;
                } else {
                    if ( p.zBackMod + x > 0 ) p.zBackMod=0;
                    if ( p.zBackMod + x < -segSize ) p.zBackMod=-segSize;
                }

                p.yBackMod+=y;
                this.dragOrigin.y=event.pos.y;

                this.shapeEditor.segmentEditor.pointZBackEdit.value=p.zBackMod;
                this.shapeEditor.segmentEditor.pointYBackEdit.value=p.yBackMod;            
            }

            this.hasDraggedPoints=true;
            this.shapeEditor.segmentEditor.pointEditor.update();
        }
    };
};

PointSegmentEditor.prototype.mouseUp=function( event )
{
    this.dragPoints=[];
    this.mouseIsDown=false;

    if ( this.hasDraggedPoints ) {

        var p=this.pointController.selected;

        if ( this.frontSelected ) 
        {
            p.zFrontMod=this.pDragOriginalX;
            p.yFrontMod=this.pDragOriginalY;

            var undo=this.shapeEditor.dc.storeDataForPath( "segments.points.zFrontMod", this.shapeEditor.segmentEditor.pointZFrontEdit.value, false, true );
            undo.addSubItem( "segments.points.yFrontMod", this.shapeEditor.segmentEditor.pointYFrontEdit.value );

            p.zFrontMod=this.shapeEditor.segmentEditor.pointZFrontEdit.value;
            p.yFrontMod=this.shapeEditor.segmentEditor.pointYFrontEdit.value;
        } else
        {
            p.zBackMod=this.pDragOriginalX;
            p.yBackMod=this.pDragOriginalY;

            var undo=this.shapeEditor.dc.storeDataForPath( "segments.points.zBackMod", this.shapeEditor.segmentEditor.pointZBackEdit.value, false, true );
            undo.addSubItem( "segments.points.yBackMod", this.shapeEditor.segmentEditor.pointYBackEdit.value );

            p.zBackMod=this.shapeEditor.segmentEditor.pointZBackEdit.value;
            p.yBackMod=this.shapeEditor.segmentEditor.pointYBackEdit.value;            
        }
    }
};

PointSegmentEditor.prototype.mouseDoubleClick=function( event )
{
    return;
    if ( !this.rect.contains( event.pos ) ) return;

    var originX=this.rect.width/2 - 1 + this.originZOffset, originY=this.rect.height/2 - 1 + this.originYOffset;
    var x=(event.pos.x - originX - this.rect.x) / this.pixelPerUnit / this.zoom;
    var y=(originY - (event.pos.y - this.rect.y)) / this.pixelPerUnit / this.zoom;

    var index=-1;

    for ( var i=1; i < this.segment.points.length-1; ++i ) 
    {
        var p=this.segment.points[i];

        if ( p.y > y ) {
            index=i;
            break;
        }
    };

    if ( index === 0 ) {
        index=1;
    } else if ( index === -1 ) index=this.segment.points.length - 1;

    var p=new SegmentCPoint( x, y );
    this.shapeEditor.pointController.insert( index, p );
    this.shapeEditor.pointController.selected=p;

    this.update();
};

PointSegmentEditor.prototype.keyDown=function( keyCode, keysDown )
{
    if ( keyCode == VG.Events.KeyCodes.Backspace )
    {
        for ( var i=0; i < this.segment.selPoints.length; ++i )
        {
            var p=this.segment.selPoints[i];
            this.segment.points.splice( this.segment.points.indexOf(p), 1 );
        }
        this.segment.selPoints=[];
        this.update();
    }
 };

PointSegmentEditor.prototype.paintWidget=function( canvas )
{
    canvas.pushClipRect( this.rect );
    
    var thickColor=VG.Core.Color(), thinColor=VG.Core.Color( 100, 100, 100 );

    var rect=this.contentRect;
    var originX=this.rect.width/2 - 1 + this.originZOffset, originY=this.rect.height/2 - 1 + this.originYOffset;

    var segSizeInPixel=(this.segment.size - this.segment.transSize) * this.pixelPerUnit * this.zoom;

    // --- Origin

    rect.set( this.rect.x + originX, this.rect.y, 0.5, this.rect.height );
    canvas.draw2DShape( VG.Canvas.Shape2D.Rectangle, rect, VG.Core.Color( 100, 100, 100 ) );

    rect.set( this.rect.x, this.rect.y + originY, this.rect.width, 0.5 );
    canvas.draw2DShape( VG.Canvas.Shape2D.Rectangle, rect, VG.Core.Color( 100, 100, 100 ) );

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

    // ---

    if ( !this.segment ) { canvas.popClipRect(); return; }

    // --- Paint all unselected points

    for ( var i=0; i < this.segment.points.length; ++i ) 
    {
        var p=this.segment.points[i];

        rect.set( this.rect.x + originX + p.zFrontMod * this.pixelPerUnit * this.zoom - 3 - segSizeInPixel / 2, 
                  this.rect.y + originY - (p.y + p.yFrontMod) * this.pixelPerUnit * this.zoom - 3, 8, 8 );
              
        if ( p !== this.shapeEditor.pointController.selected )
            canvas.draw2DShape( VG.Canvas.Shape2D.Rectangle, rect, thinColor );

        rect.set( this.rect.x + originX + p.zBackMod * this.pixelPerUnit * this.zoom - 3 + segSizeInPixel / 2, 
                  this.rect.y + originY - (p.y + p.yBackMod) * this.pixelPerUnit * this.zoom - 3, 8, 8 );
        
        if ( p !== this.shapeEditor.pointController.selected )            
            canvas.draw2DShape( VG.Canvas.Shape2D.Rectangle, rect, thinColor );
    }

    // --- Paint the selected point now to make sure it is visible

    var p=this.shapeEditor.pointController.selected;
    if ( p ) 
    {
        rect.set( this.rect.x + originX + p.zFrontMod * this.pixelPerUnit * this.zoom - 3 - segSizeInPixel / 2, 
                  this.rect.y + originY - (p.y + p.yFrontMod) * this.pixelPerUnit * this.zoom - 3, 8, 8 );

        if ( this.frontSelected )
            canvas.draw2DShape( VG.Canvas.Shape2D.Rectangle, rect, VG.Core.Color( 255, 255, 255 ) );
        else
            canvas.draw2DShape( VG.Canvas.Shape2D.Rectangle, rect, VG.Core.Color( 175, 175, 175 ) );

        rect.set( this.rect.x + originX + p.zBackMod * this.pixelPerUnit * this.zoom - 3 + segSizeInPixel / 2, 
                  this.rect.y + originY - (p.y + p.yBackMod) * this.pixelPerUnit * this.zoom - 3, 8, 8 );

        if ( this.backSelected )
            canvas.draw2DShape( VG.Canvas.Shape2D.Rectangle, rect, VG.Core.Color( 255, 255, 255 ) );
        else
            canvas.draw2DShape( VG.Canvas.Shape2D.Rectangle, rect, VG.Core.Color( 175, 175, 175 ) );
    }


    canvas.popClipRect();    
};