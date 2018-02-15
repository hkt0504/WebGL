TracerSample=function( setupDefaultScene )
{
    VG.UI.RenderWidget.call(this);

    this.init();

    if ( setupDefaultScene )
        this.setupDefaultScene( this.context, this.scene);

    var mouseDown = false;

    var x = 0;
    var y = 0;

    var storedDelta = 0.001;

    this.mouseMove = function(e)
    {
        var dx = VG.Math.clamp(x - e.pos.x, -1, 1);
        var dy = VG.Math.clamp(y - e.pos.y, -1, 1);

        x = e.pos.x;
        y = e.pos.y;

        if (mouseDown)
        {
            this.camera.incRotation(90 * dx * storedDelta, 0, 0);

            //make sure we have a trace context
            if (this.context.traceContext)
            {
                /* whenever we move either the camera or geometry we have to set this to true 
                 * so the tracing starts from zero again. */
                this.context.traceContext.resetAccumulation = true;
            }
        } 
    }

    this.keyDown = function(e)
    {
        var scaleRatio = context.traceContext.scaleRatio;

        if (e == VG.Events.KeyCodes.One) context.traceContext.scaleRatio = 0.25;
        if (e == VG.Events.KeyCodes.Two) context.traceContext.scaleRatio = 0.50;
        if (e == VG.Events.KeyCodes.Three) context.traceContext.scaleRatio = 1.0;

        if (context.traceContext.scaleRatio != scaleRatio)
        {
            context.traceContext.resetAccumulation = true;
        }
    }

    this.mouseDown = function(e) { mouseDown = true; }
    this.mouseUp = function(e) { mouseDown = false; }

 
    this.render = function(delta)
    {
        storedDelta = delta;
        //TODO update aspect ratio on a resize callback not here / everyframe
        this.camera.aspect = this.rect.width / this.rect.height;
        this.camera.updateProjection();

        this.context.size2D.set(this.rect.width, this.rect.height);
        
        /* Draws the scene with the pipeline and the given render context */
        this.pipeline.drawScene(this.context, this.scene, delta);
    }
}

TracerSample.prototype = Object.create(VG.UI.RenderWidget.prototype);

TracerSample.prototype.init = function()
{
    var context = new VG.Render.Context();
    // camera
    this.camera = context.camera;
    this.camera.setProjection(60, this.rect.width / this.rect.height);
    this.camera.setRotation(0, 0, 0);
    this.camera.position.z = 20.0;
    this.camera.position.y = 5.0;

    //enable tracing
    context.trace = false;
    this.context=context;

    this.pipeline = new VG.Render.Pipeline();
    this.scene = new VG.Render.SceneManager();
};

TracerSample.prototype.setupDefaultScene = function(context, scene)
{
    this.clearColor = new VG.Core.Color();

	// wall thickness
    var wt = 0.1;

	/// Lights
	// ambient light
	var ambientLight = new VG.Render.AmbientLight([0.2, 0.2, 0.2, 1]);
	context.lights.push(ambientLight);

	// light 1
	var light_1 = new VG.Render.NormalLight(scene);
    light_1.position.y += 9;
	// set point light
	light_1.lightPosition.set(0, 0, 0, 1);
	light_1.setLightColor({default:[0.8, 0.8, 0.8]});
	light_1.attenuation1 = 0.02;

	// register light to context
	context.lights.push(light_1);

	/// materials
	var darkMat = new VG.Render.NormalMaterial.MaterialInfo();
	var whiteMat = new VG.Render.NormalMaterial.MaterialInfo({default:[0.5, 0.5, 0.5]});
	var greenMat = new VG.Render.NormalMaterial.MaterialInfo({default:[0.5, 0.8, 0.5], factor:1.5, ambient:[0.1, 0.5, 0.1]});
	var redMat = new VG.Render.NormalMaterial.MaterialInfo({default:[0.8, 0.5, 0.5], ambient:[0.5, 0.1, 0.1]});
	var blueMat = new VG.Render.NormalMaterial.MaterialInfo({default:[0.5, 0.5, 0.8], specular:[0.3, 0.3, 0.8], ambient:[0.2, 0.2, 0.3]});
	var otherMat = new VG.Render.NormalMaterial.MaterialInfo({default:[1, 0.8, 1], ambient:[0.5, 0.2, 0.5]});

	/// room
	// back wall
    var backWall = new VG.Render.BoxMesh(scene);
	backWall.setGeometry(10, 10, wt);
	backWall.update();
    backWall.position.z = -5 + wt/2;
    backWall.position.y = 5;

	backWall.material = new VG.Render.NormalMaterial(whiteMat);

	// left wall
    var leftWall = new VG.Render.BoxMesh(scene);
	leftWall.setGeometry(wt, 10, 10);
	leftWall.makeSubFacets(); // make sub-facets
	leftWall.update();

    leftWall.position.x -= 5 - wt / 2;
    leftWall.position.y = 5;

	// default-material and sub-materials[left, right, bottom, top, back, front]
	leftWall.material = new VG.Render.NormalMaterial(greenMat);

	// right wall
    var rightWall = new VG.Render.BoxMesh(scene);
	rightWall.setGeometry(wt, 10, 10);
	rightWall.makeSubFacets(); // make sub-facets
	rightWall.update();
    rightWall.position.x += 5 - wt / 2;
    rightWall.position.y = 5;

	// default-material and sub-materials[left, right, bottom, top, back, front]
	rightWall.material = new VG.Render.NormalMaterial(redMat, [redMat]);

	// floor wall
    var floor = new VG.Render.BoxMesh(scene);
	floor.setGeometry(10, wt, 10);
	floor.update();
    floor.position.y -= wt / 2;

	floor.material = new VG.Render.NormalMaterial(whiteMat);

	// ceiling wall
    var ceiling = new VG.Render.BoxMesh(scene);
	ceiling.setGeometry(10, wt, 10);
	ceiling.update();
    ceiling.position.y += 10 + wt / 2;

	ceiling.material = floor.material;

	// lamp geometry (pseudo)
	var lamp = new VG.Render.BoxMesh(scene);
	lamp.setGeometry(3, 0.1, 3);
	lamp.update();
	lamp.position.y += 10;

	material = new VG.Render.NormalMaterial();
	material.makeLampMaterial(light_1.getLightColor());
	lamp.material = material;

    // props
    var box1 = new VG.Render.BoxMesh(scene);
	box1.setGeometry(3, 7, 3);
	box1.update();
    box1.position.y += 3.5;
    box1.position.z += 0.0;
    box1.position.x += 3;
    box1.setRotation(45, 0, 0);

	box1.material = new VG.Render.NormalMaterial(blueMat);

	//
    var box2 = new VG.Render.BoxMesh(scene);
	box2.setGeometry(3, 3, 3);
	box2.makeSubFacets(); // make sub-facets
	box2.update();

    box2.position.y += 1.5;
    box2.position.z += 2;
    box2.position.x -= 2.5;
    box2.setRotation(-5, 0, 0);
	// default-material and sub-materials[left, right, bottom, top, back, front]
	box2.material = new VG.Render.NormalMaterial(otherMat, [greenMat, greenMat, blueMat, blueMat, redMat, redMat]);
}

TracerSample.prototype.loadFromOBJ = function( obj, zoom, mtl )
{
    this.context.lights=[];
    this.scene.children=[];

    var ambientLight = new VG.Render.AmbientLight([0.8, 0.8, 0.8, 1]);
    this.context.lights.push(ambientLight);

    var redMat = new VG.Render.NormalMaterial.MaterialInfo({default:[0.8, 0.5, 0.5], ambient:[0.5, 0.1, 0.1]});

    var mesh = new VG.Render.Mesh(this.scene);

    mesh.loadFromOBJ( obj, zoom, mtl );
    mesh.position.y = 5;

    mesh.material = new VG.Render.NormalMaterial(redMat);
    mesh.update();
    
    this.context.setSceneChanged(true);
}

// --------------------------------- OBJ Import Dialog

ImportOBJDialog=function( renderWidget )
{
    if ( !(this instanceof ImportOBJDialog) ) return new ImportOBJDialog( renderWidget );

    VG.UI.Dialog.call( this, "Import OBJ" );

    var openOBJButton=VG.UI.Button( "Select OBJ..." );
    var openMTLButton=VG.UI.Button( "Select MTL..." );
    var zoomSlider=VG.UI.Slider( 1, 10, 1 );

    var leftLayout=VG.UI.Layout( openOBJButton, openMTLButton );
    leftLayout.vertical=true;
    var previewWidget=new TracerSample();

    this.layout=VG.UI.Layout( leftLayout, previewWidget );

    this.objContent=undefined;
    this.mtlContent=undefined;
    this.zoomValue=1;

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

    this.addButton( "Close", function() { this.close( this ); }.bind( this ) );

    this.addButton( "Accept", function() { 
        renderWidget.loadFromOBJ( this.objContent, this.zoomValue, this.mtlContent );
        this.close( this );
    }.bind( this ) );

};

ImportOBJDialog.prototype=VG.UI.Dialog();

// ---

function vgMain(workspace)
{
    var renderWidget = new TracerSample( true ); 
    var renderButton=VG.UI.ToolButton( "Render" );
    var renderQuality=VG.UI.PopupButton( "Low", "Medium", "High" );
    var importOBJButton=VG.UI.ToolButton( "Import OBJ" );

    renderButton.clicked=function() {
        if ( !renderWidget.context.trace ) renderButton.text="Stop";
        else renderButton.text="Render";
        renderWidget.context.trace = !renderWidget.context.trace;
    }.bind( this );

    renderQuality.changed=function( index ) {
        switch( index ) {
            case 0 : renderWidget.context.traceContext.scaleRatio=0.25; break;
            case 1 : renderWidget.context.traceContext.scaleRatio=0.5; break;
            case 2 : renderWidget.context.traceContext.scaleRatio=1; break;
        }
        renderWidget.context.traceContext.resetAccumulation=true;
    }.bind( this );
    renderQuality.index=1;

    importOBJButton.clicked=function() {
        var dialog=ImportOBJDialog( renderWidget );
        workspace.showWindow( dialog );

    }.bind( this );

    if ( VG.getHostProperty( VG.HostProperty.Platform ) !== VG.HostProperty.PlatformDesktop ) {
        // --- On Platforms other than Desktop disable Render Button as no Network Rendering yet
        renderButton.disabled=true;
        renderQuality.disabled=true;
    }

    var toolbar=VG.UI.Toolbar( renderButton, VG.UI.Label("Quality"), renderQuality, VG.UI.ToolSeparator(), importOBJButton );
    workspace.addToolbar( toolbar );

    var mainLayout = VG.UI.Layout(renderWidget);
    workspace.content = mainLayout;
    mainLayout.margin.clear();
}
