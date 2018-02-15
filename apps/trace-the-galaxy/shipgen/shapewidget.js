// ----------------------------------------------------------------- ShapeWidget

ShapeWidget=function( shapeEditor )
{ 
    if ( !(this instanceof ShapeWidget) ) return new ShapeWidget( shapeEditor );

    VG.UI.Widget.call( this );

    this.shapeEditor=shapeEditor;

    // --- Segment Area

    this.segmentWidget=new SegmentWidget( shapeEditor );

    this.segmentAddButton=VG.UI.ToolButton( "Add" );
    this.segmentAddButton.clicked=function() {
        var segment=this.shapeEditor.createDefaultSegment();
        this.shapeEditor.segmentEditor.update();
    }.bind( this )

    this.segmentRemoveButton=VG.UI.ToolButton( "Remove" );
    this.segmentRemoveButton.clicked=function() {
        this.shapeEditor.segmentController.remove( this.shapeEditor.segmentController.selected );
    }.bind( this )
    this.segmentRemoveButton.disabled=true;

    this.segmentSizeEdit=VG.UI.NumberEdit( 1, 0.01, 10000 );
    this.segmentSizeEdit.changed=function( value ) {
        //var segment=this.shapeEditor.segmentController.current;
        this.shapeEditor.segmentEditor.update();
    }.bind( this )
    this.segmentSizeEdit.maximumSize.width=60;
    this.segmentSizeEdit.bind( this.shapeEditor.dc, "segments.size" );

    this.segmentTransSizeEdit=VG.UI.NumberEdit( 0, 0, 10000 );
    this.segmentTransSizeEdit.changed=function( value ) {
        //var segment=this.shapeEditor.segmentController.current;
        this.shapeEditor.segmentEditor.update();
    }.bind( this )
    this.segmentTransSizeEdit.maximumSize.width=60;
    this.segmentTransSizeEdit.bind( this.shapeEditor.dc, "segments.transSize" );

    this.segmentPanel=VG.UI.ToolPanel( this.segmentAddButton, this.segmentRemoveButton, VG.UI.ToolPanelSeparator(), VG.UI.Label( " Size " ), this.segmentSizeEdit,
        VG.UI.Label( "Trans." ), this.segmentTransSizeEdit );

    this.segmentLayout=VG.UI.Layout( this.segmentWidget, this.segmentPanel );
    this.segmentLayout.vertical=true;
    this.segmentLayout.spacing=2;
    this.segmentLayout.margin.clear();

    this.shapeEditor.segmentController=this.segmentWidget.bind( shapeEditor.dc, "segments" );
    this.shapeEditor.segmentController.addObserver( "changed", this.segmentSelectionChanged.bind( this ) );
    this.shapeEditor.segmentController.addObserver( "selectionChanged", this.segmentSelectionChanged.bind( this ) );

    // --- Preview Area

    this.facesLabel=VG.UI.Label( "" );
    this.previewPanel=VG.UI.ToolPanel( this.facesLabel );

    this.previewWidget=new PreviewWidget();
    VG.context.workspace.autoRedrawInterval=2000;

    this.previewLayout=VG.UI.Layout( this.previewWidget, this.previewPanel );
    this.previewLayout.vertical=true;
    this.previewLayout.spacing=0;
    this.previewLayout.margin.clear();

    // ---

    //this.layout=VG.UI.SplitLayout( this.previewWidget, 30, this.segmentLayout, 70 );
    this.layout=VG.UI.SplitLayout( this.segmentLayout, 70, this.previewLayout, 30 );
    this.layout.margin.clear();
    this.layout.vertical=true;
    this.layout.spacing=0;
};

ShapeWidget.prototype=VG.UI.Widget();

ShapeWidget.prototype.paintWidget=function( canvas )
{
	this.layout.rect.copy( this.rect );
	this.layout.layout( canvas );
};

ShapeWidget.prototype.segmentsChanged=function()
{
};

ShapeWidget.prototype.segmentSelectionChanged=function()
{
    if ( this.shapeEditor.segmentController.canRemove() && this.shapeEditor.segmentController.length > 1 )
        this.segmentRemoveButton.disabled=false;
    else
        this.segmentRemoveButton.disabled=true;
};

// ----------------------------------------------------------------- ShapeWidget

SegmentWidget=function( shapeEditor )
{ 
    if ( !(this instanceof SegmentWidget) ) return new SegmentWidget( shapeEditor );

    VG.UI.Widget.call( this );

    this.shapeEditor=shapeEditor;

    this.minimumSize.height=200;
/*
    this.shapeSeamsEdit=VG.UI.NumberEdit( 10, 1, 1000 );
    this.shapeSeamsEdit.maximumSize.width=60;
    this.shapeSeamsEdit.changed=function( value ) {
        this.shapeEditor.shape.dc.seamsPerSegment=value;

        for( var i=0; i < this.shapeEditor.dc.segments.length; ++i ) {
            this.shapeEditor.shape.dc.segments[i].calcSeams( this.shapeEditor.dc.seamsPerSegment );
        }
        this.shapeEditor.segmentEditor.update();
    }.bind( this );
    this.shapeSeamsEdit.bind( shapeEditor.dc, "seamsPerSegment" );

    this.shapeSeamsLayout=VG.UI.LabelLayout( "Seams per Segment", this.shapeSeamsEdit );
    this.shapeSeamsLayout.spacing=0;

    this.childWidgets=[ this.shapeSeamsEdit ];
*/
    //this.pointLayout=VG.UI.LabelLayout( "Point", this.pointEdit );
/*
    this.layout=VG.UI.Layout( this.segmentLayout, this.pointLayout );
    this.layout.margin.clear();
    this.layout.vertical=true;
    this.layout.spacing=0;*/
};

SegmentWidget.prototype=VG.UI.Widget();

SegmentWidget.prototype.bind=function( collection, path )
{
    this.controller=collection.controllerForPath( path );
    if ( !this.controller ) {
        this.controller=VG.Controller.Array( collection, path );
        collection.addControllerForPath( this.controller, path );
    }

    //this.controller.addObserver( "changed", this.changed, this );    
    this.controller.addObserver( "selectionChanged", this.selectionChanged, this );

    return this.controller;
};

SegmentWidget.prototype.selectionChanged=function()
{
    //VG.update();
};

SegmentWidget.prototype.setSegment=function( segment )
{
    this.segment=segment;
    //VG.log( this.shape.segments.indexOf( segment ) );
    //this.segmentPopupButton.index=this.shape.segments.indexOf( segment );
};

SegmentWidget.prototype.mouseDown=function( event )
{
    for ( var i=0; i < this.controller.length; ++i )
    {
        var segment=this.controller.at( i );

        if ( this.segmentRects[i].contains( event.pos ) )
        {
            this.controller.selected=segment;
            break;
        }
    }
};

SegmentWidget.prototype.paintWidget=function( canvas )
{
    //if ( !this.shapeSeamsLayoutSize) this.shapeSeamsLayoutSize=this.shapeSeamsLayout.calcSize( canvas );

    //VG.log( "paint" );

    var box=this.shapeEditor.shapeBuilder.getBBox();

    //this.shapeSeamsLayout.rect.set( this.rect.x + 20, this.rect.y, this.rect.width-120, this.shapeSeamsLayoutSize.height );
    //this.shapeSeamsLayout.layout( canvas );

    var rect=this.contentRect;
    rect.copy( this.rect );

    rect.x+=20; rect.y+=10;//this.shapeSeamsLayoutSize.height;
    rect.width=rect.width - 100;
    rect.height=rect.height - 20;// - this.shapeSeamsLayoutSize.height - 10;

    //canvas.draw2DShape( VG.Canvas.Shape2D.Rectangle, rect, VG.Core.Color( 80, 80, 80) );

    var xDistancePerPixel=rect.width / box.x;
    var yDistancePerPixel=rect.height / box.z;

    var offset=0;

    this.segmentRects=[];

    for ( var i=0; i < this.controller.length; ++i )
    {
        var segment=this.controller.at( i );
        var size=segment.size - segment.transSize;

        var col;

        if ( this.controller.isSelected( segment ) ) col=VG.Core.Color( 108, 125, 216 );
        else col=VG.Core.Color( 80, 80, 80 );

        //VG.log( this.shapeEditor.shape.getDepth(), distancePerPixel, rect.height, offset * distancePerPixel );

        var segmentRect=VG.Core.Rect( rect.x, rect.y + offset * yDistancePerPixel, segment.statistics.maxValues.x * xDistancePerPixel, size *  yDistancePerPixel );
        this.segmentRects.push( VG.Core.Rect( rect.x, rect.y + offset * yDistancePerPixel, rect.width, (size+segment.transSize) *  yDistancePerPixel ) );

        canvas.draw2DShape( VG.Canvas.Shape2D.Rectangle, segmentRect, col );

        if ( segmentRect.height > 15 && segmentRect.width > 50 )
            canvas.drawTextRect( segment.statistics.maxValues.x.toFixed(2), segmentRect, VG.Core.Color( 255, 255, 255 ), 2, 0 );

        // --- Display the Transition

        if ( segment.transSize && i < this.controller.length - 1 ) {
            var nextSegment=this.controller.at( i+1 );

            var transRect=VG.Core.Rect( rect.x, rect.y + segmentRect.height, 0, 1 );
            var yLines=segment.transSize *  yDistancePerPixel;
            var step=(segment.transSize / yLines);
            var transOffset=0;

            while ( transOffset <= segment.transSize )
            {
                var tValue=this.shapeEditor.shapeBuilder.calcValueForSegmentTrans( segment, nextSegment, transOffset, 0 );
                //VG.log( yLines, t, "tvalue", tValue );

                transRect.width=tValue * xDistancePerPixel;
                canvas.draw2DShape( VG.Canvas.Shape2D.Rectangle, transRect, col );

                transRect.y+=1;
                transOffset+=step;
            }
        }

        // ---

        var segmentRect=VG.Core.Rect( rect.x, rect.y + offset * yDistancePerPixel, rect.width + 20, 2 );
        canvas.draw2DShape( VG.Canvas.Shape2D.Rectangle, segmentRect, VG.Core.Color( 200, 200, 200 ) );

        offset+=segment.size;
    }
};

