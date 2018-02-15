// ----------------------------------------------------------------- ShapeEditor

ShapeEditor=function()
{ 
    if ( !(this instanceof ShapeEditor) ) return new ShapeEditor();

    VG.UI.Widget.call( this );

    this.dc=VG.Data.Collection( "MainData" );

    this.shapeBuilder=new ShapeBuilder( this.dc );

    // --- Segment Editor 
    this.segmentEditor=new SegmentEditor( this );

    // --- Shape Widget
    this.shapeWidget=new ShapeWidget( this );

    this.segmentController.addObserver( "selectionChanged", this.segmentChanged, this );
    this.clear();

    //this.segmentController.addObserver( "selectionChanged", this.segmentChanged, this );
    //this.segmentController.selected=segment;

    this.layout=VG.UI.SplitLayout( this.segmentEditor, 75,  this.shapeWidget, 25 );
    this.layout.margin.clear();
};

ShapeEditor.prototype=VG.UI.Widget();

ShapeEditor.prototype.clear=function()
{
    this.dc.segments=[];
    var segment=this.createDefaultSegment( true );

    // --- Generate Mesh    
    generateMesh( this.shapeBuilder, this.shapeWidget.previewWidget.object );
};

ShapeEditor.prototype.update=function()
{
    // --- After Undo / Redo

    var segment=this.segmentController.selected;
    if ( !segment.selPoints ) segment.selPoints=[];

    this.segmentEditor.setSegment( segment );    

    this.segmentEditor.update(); 
};

ShapeEditor.prototype.segmentChanged=function()
{
    var segment=this.segmentController.selected;
    this.segmentEditor.setSegment( segment );
};

ShapeEditor.prototype.createDefaultSegment=function( noUndo )
{
    var segment=new Segment();

    if ( !noUndo ) {
        // --- For Undo Use only, prefill the points array as the controller will stringify it
        segment.points=[ new SegmentCPoint( 0, -1 ), new SegmentCPoint( 1, 0 ), new SegmentCPoint( 0, 1 ) ];
    }

    this.segmentController.add( segment, noUndo );
    if ( !noUndo ) segment.points=[];

    this.segmentController.selected=segment;

    var p=new SegmentCPoint( 0, -1 );
    this.pointController.add( p, true );

    p=new SegmentCPoint( 1, 0 );
    this.pointController.add( p, true );

    p=new SegmentCPoint( 0, 1 );
    this.pointController.add( p, true );

    this.shapeBuilder.calcSegmentSeams( segment, 0.1 );

    return segment;
};

ShapeEditor.prototype.paintWidget=function( canvas )
{
	this.layout.rect.copy( this.rect );
	this.layout.layout( canvas );
};

// ----------------------------------------------------------------- SegmentEditor

SegmentEditor=function( shapeEditor )
{ 
    if ( !(this instanceof SegmentEditor) ) return new SegmentEditor( shapeEditor );

    VG.UI.Widget.call( this );

    this.shapeEditor=shapeEditor;
    this.shapeEditor.pointController=this.bind( shapeEditor.dc, "segments.points" );

    // --- Edit Point Segment

    this.viewModeButton=VG.UI.PopupButton( "Segment Front View", "Segment Side View" );
    this.viewModeButton.changed=function( index ) {

        this.hullSeparator.visible=!index;
        this.cubicHullButton.visible=!index;
        this.roundHullButton.visible=!index;

        this.pointModSeparator.visible=!index;
        this.pointIsSplineButton.visible=!index;
        this.pointIsCircleButton.visible=!index;
        this.pointIsExtensionButton.visible=!index;

        this.pointSeparator.visible=!index;
        this.pointLabel.visible=!index;
        this.pointXLabel.visible=!index;
        this.pointXEdit.visible=!index;
        this.pointYLabel.visible=!index;
        this.pointYEdit.visible=!index;

        this.pointZFrontLabel.visible=index;
        this.pointZFrontEdit.visible=index;
        this.pointYFrontLabel.visible=index;
        this.pointYFrontEdit.visible=index;

        this.pointZBackLabel.visible=index;
        this.pointZBackEdit.visible=index;
        this.pointYBackLabel.visible=index;
        this.pointYBackEdit.visible=index;
        
        if ( !index ) this.stackedLayout.current=this.pointEditor;
        else this.stackedLayout.current=this.pointSegmentEditor;
    }.bind( this );

    // --- Reset Origin

    this.resetOriginButton=VG.UI.ToolButton( "Reset Origin" );
    this.resetOriginButton.clicked=function() {

        if ( this.stackedLayout.current === this.pointEditor ) {
            this.pointEditor.originXOffset=0;
            this.pointEditor.originYOffset=0;
        } else
        if ( this.stackedLayout.current === this.pointSegmentEditor ) {
            this.pointSegmentEditor.originZOffset=0;
            this.pointSegmentEditor.originYOffset=0;
        }

        VG.update();
    }.bind( this );

    // --- Hull : Cubic

    this.cubicHullButton=VG.UI.ToolButton( "Cubic" );
    this.cubicHullButton.changed=function( value, userChanged ) {
        if ( !userChanged ) return;

        this.segment.cubic=value;
        this.segment.round=!value;

        if ( value ) this.update();
    }.bind( this );
    this.cubicHullButton.bind( shapeEditor.dc, "segments.cubic" );

    // --- Hull : Round

    this.roundHullButton=VG.UI.ToolButton( "Round" );
    this.roundHullButton.changed=function( value, userChanged ) {
        if ( !userChanged ) return;

        this.segment.round=value;
        this.segment.cubic=!value;

        if ( value ) this.update();
    }.bind( this );
    this.roundHullButton.bind( shapeEditor.dc, "segments.round" );
    this.roundHullButton.addExclusions( this.cubicHullButton );

    // --- Point : Spline

    this.pointIsSplineButton=VG.UI.ToolButton( "Spline" );
    this.pointIsSplineButton.changed=function( value, userChanged ) {

        if ( !userChanged ) return;

        var tempP=this.shapeEditor.pointController.selected;
        for ( var i=0; i < this.segment.selPoints.length; ++i )
        {
            var p=this.segment.selPoints[i]

            this.shapeEditor.pointController.selected=p;
            this.shapeEditor.dc.storeDataForPath( "segments.points.spline", value );
            this.segment.selPoints[i].spline=value;
        }
        this.shapeEditor.pointController.selected=tempP;
        this.update();

    }.bind( this );

    this.pointIsSplineButton.checkable=true;
    this.pointIsSplineButton.disabled=true;    
    this.pointIsSplineButton.bind( shapeEditor.dc, "segments.points.spline" );

    // --- Point : Circle

    this.pointIsCircleButton=VG.UI.ToolButton( "Circle" );
    this.pointIsCircleButton.changed=function( value, userChanged ) {

        if ( !userChanged ) return;

        var tempP=this.shapeEditor.pointController.selected;
        for ( var i=0; i < this.segment.selPoints.length; ++i )
        {
            var p=this.segment.selPoints[i]

            this.shapeEditor.pointController.selected=p;
            this.shapeEditor.dc.storeDataForPath( "segments.points.circle", value );
            this.segment.selPoints[i].circle=value;
        }
        this.shapeEditor.pointController.selected=tempP;
        this.update();

    }.bind( this );
    this.pointIsCircleButton.checkable=true;
    this.pointIsCircleButton.disabled=true;    
    this.pointIsCircleButton.bind( shapeEditor.dc, "segments.points.circle" );    

    // --- Point : Extension

    this.pointIsExtensionButton=VG.UI.ToolButton( "Extension" );
    this.pointIsExtensionButton.changed=function( value, userChanged ) {
        if ( !userChanged ) return;

        var tempP=this.shapeEditor.pointController.selected;
        for ( var i=0; i < this.segment.selPoints.length; ++i )
        {
            var p=this.segment.selPoints[i]

            this.shapeEditor.pointController.selected=p;
            this.shapeEditor.dc.storeDataForPath( "segments.points.extension", value );
            this.segment.selPoints[i].extension=value;
        }
        this.shapeEditor.pointController.selected=tempP;
        this.update();

    }.bind( this );
    this.pointIsExtensionButton.checkable=true;
    this.pointIsExtensionButton.disabled=true;    
    this.pointIsExtensionButton.bind( shapeEditor.dc, "segments.points.extension" );

    // --- Front View Point

    this.pointXEdit=VG.UI.NumberEdit( 0, -100, +100, 2 );
    this.pointXEdit.maximumSize.width=60;
    this.pointXEdit.bind( shapeEditor.dc, "segments.points.x" );
    //this.pointXEdit.changed=function() { this.update(); }.bind( this );
    this.pointXEdit.disabled=true;
    this.pointXLabel=VG.UI.Label( "X" ); this.pointXLabel.disabled=true;

    this.pointYEdit=VG.UI.NumberEdit( 0, -100, +100, 2 );
    this.pointYEdit.maximumSize.width=60;
    this.pointYEdit.bind( shapeEditor.dc, "segments.points.y" );
    //this.pointYEdit.changed=function() { this.update(); }.bind( this );
    this.pointYEdit.disabled=true;
    this.pointYLabel=VG.UI.Label( "Y" ); this.pointYLabel.disabled=true;

    // --- Side View Point

    this.pointZFrontEdit=VG.UI.NumberEdit( 0, -100, +100, 2 );
    this.pointZFrontEdit.maximumSize.width=60;
    this.pointZFrontEdit.bind( shapeEditor.dc, "segments.points.zFrontMod" );
    //this.pointZFrontEdit.changed=function() { this.update(); }.bind( this );
    this.pointZFrontEdit.disabled=true;
    this.pointZFrontLabel=VG.UI.Label( "Front Modifiers Z" ); this.pointZFrontLabel.disabled=true; this.pointZFrontLabel.visible=false;
    this.pointZFrontEdit.visible=false;

    this.pointYFrontEdit=VG.UI.NumberEdit( 0, -100, +100, 2 );
    this.pointYFrontEdit.maximumSize.width=60;
    this.pointYFrontEdit.bind( shapeEditor.dc, "segments.points.yFrontMod" );
    //this.pointYFrontEdit.changed=function() { this.update(); }.bind( this );
    this.pointYFrontEdit.disabled=true;
    this.pointYFrontLabel=VG.UI.Label( "Y" ); this.pointYFrontLabel.disabled=true; this.pointYFrontLabel.visible=false;
    this.pointYFrontEdit.visible=false;    

    this.pointZBackEdit=VG.UI.NumberEdit( 0, -100, +100, 2 );
    this.pointZBackEdit.maximumSize.width=60;
    this.pointZBackEdit.bind( shapeEditor.dc, "segments.points.zBackMod" );
    //this.pointZBackEdit.changed=function() { this.update(); }.bind( this );
    this.pointZBackEdit.disabled=true;
    this.pointZBackLabel=VG.UI.Label( "Back Modifiers Z" ); this.pointZBackLabel.disabled=true; this.pointZBackLabel.visible=false;
    this.pointZBackEdit.visible=false;

    this.pointYBackEdit=VG.UI.NumberEdit( 0, -100, +100, 2 );
    this.pointYBackEdit.maximumSize.width=60;
    this.pointYBackEdit.bind( shapeEditor.dc, "segments.points.yBackMod" );
    //this.pointYBackEdit.changed=function() { this.update(); }.bind( this );
    this.pointYBackEdit.disabled=true;
    this.pointYBackLabel=VG.UI.Label( "Y" ); this.pointYBackLabel.disabled=true; this.pointYBackLabel.visible=false;
    this.pointYBackEdit.visible=false;        

    // --- Zoom

    this.zoomSlider=VG.UI.Slider( 0, 10, 1 );
    this.zoomSlider.changed=function( value ) {
        if ( !value ) value=0.1;
        this.pointEditor.zoom=value/2;
        this.pointSegmentEditor.zoom=value/2;
        VG.update();
    }.bind( this );
    this.zoomSlider.value=1.0;
    this.zoomSlider.maximumSize.width=200;

    // ---

    this.hullSeparator=VG.UI.ToolSeparator();
    this.extensionSeparator=VG.UI.ToolSeparator();
    this.pointModSeparator=VG.UI.ToolSeparator();
    this.pointSeparator=VG.UI.ToolSeparator();
    this.pointLabel=VG.UI.Label( "Point:" )

    // --- Panel

    this.panel=VG.UI.ToolPanel( /*VG.UI.Label( "View:" ),*/ this.viewModeButton, this.resetOriginButton, 
        this.hullSeparator, this.cubicHullButton, this.roundHullButton,

        this.pointModSeparator, this.pointIsSplineButton, this.pointIsCircleButton,
        this.extensionSeparator, this.pointIsExtensionButton, 

        this.pointSeparator, //this.pointLabel,
        this.pointXLabel, this.pointXEdit, this.pointYLabel, this.pointYEdit, 
        this.pointZFrontLabel, this.pointZFrontEdit, this.pointYFrontLabel, this.pointYFrontEdit,
        this.pointZBackLabel, this.pointZBackEdit, this.pointYBackLabel, this.pointYBackEdit,
        VG.UI.LayoutHSpacer(), this.zoomSlider );
    
    this.pointEditor=new PointEditor( shapeEditor );
    this.pointSegmentEditor=new PointSegmentEditor( shapeEditor );
    this.pointEditor.update=this.update.bind( this );

    // ---

    this.childWidgets=[ this.previewWidget, this.panel ];

    this.dragOrigin=VG.Core.Point();

    this.stackedLayout=VG.UI.StackedLayout( this.pointEditor, this.pointSegmentEditor )
    this.layout=VG.UI.Layout( this.panel, this.stackedLayout );
    this.layout.margin.clear();
    this.layout.vertical=true;
    this.layout.spacing=0;
};

SegmentEditor.prototype=VG.UI.Widget();

SegmentEditor.prototype.bind=function( collection, path )
{
    this.controller=collection.controllerForPath( path );
    if ( !this.controller ) {
        this.controller=VG.Controller.Array( collection, path );
        collection.addControllerForPath( this.controller, path );
    }

    this.controller.addObserver( "selectionChanged", this.selectionChanged.bind( this ) );
    return this.controller;
};

SegmentEditor.prototype.selectionChanged=function()
{
    var point=this.controller.selected;

    this.pointIsExtensionButton.disabled=!point;
    this.pointIsSplineButton.disabled=!point;
    this.pointIsCircleButton.disabled=!point;

    this.pointXEdit.disabled=!point;
    this.pointYEdit.disabled=!point;
    this.pointXLabel.disabled=!point;
    this.pointYLabel.disabled=!point;

    this.pointZFrontLabel.disabled=!point;
    this.pointZFrontEdit.disabled=!point;
    this.pointYFrontLabel.disabled=!point;
    this.pointYFrontEdit.disabled=!point;

    this.pointZBackLabel.disabled=!point;
    this.pointZBackEdit.disabled=!point;
    this.pointYBackLabel.disabled=!point;
    this.pointYBackEdit.disabled=!point;    
};

SegmentEditor.prototype.setSegment=function( segment )
{
    this.segment=segment;
    this.pointEditor.setSegment( segment );
    this.pointSegmentEditor.setSegment( segment );
};

SegmentEditor.prototype.update=function()
{
    if ( !this.segment ) return;
    var meshStep=0.1;

    this.shapeEditor.shapeBuilder.calcSegmentSeams( this.segment, 0.1 );
    var quads=generateMesh( this.shapeEditor.shapeBuilder, this.shapeEditor.shapeWidget.previewWidget.object );
    this.shapeEditor.shapeWidget.facesLabel.text=quads + " quads";
    VG.update();
};

SegmentEditor.prototype.paintWidget=function( canvas )
{
    this.layout.rect.copy( this.rect );
    this.layout.layout( canvas );
};
