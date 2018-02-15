var htmlText="<a href=\"SomeLinkHere\"><font size=\"82\" color='orange'>&vg</font></a><h1>Main</h1><font face = 'Open Sans Semibold' color='red' size='20'>ThisIsAReallyLongWordThatNeedsToBeBrokenUpMultipleTimesToFitInTheSmallContentRect.</font> "
                + "<font size='8'>This is smaller text starting right after big text.</font><br><br><br>Content "
                + "<font face = 'Open Sans Semibold Italic' color='purple' size='64'>Area</font>. The content depends on the toolbar selection. Transitions will be used to"
                + " change content, like fade and rotations.<i> Main Content Area. The content depends on the toolbar selection. Transitions will be used to change content, "
                + "like fade and rotations.</i><b> Main Content Area. The content depends on the toolbar selection. Transitions will be used to change content, like fade and "
                + "rotations.</b> Main Content Area. The content depends on the toolbar selection. Transitions will be used to change content, like fade and rotations."
                + "<ul>"
                + "<li><font color='green'><i>one</i> - this is a long list item that spans across 2 or more lines.</font></li>"
                + "<li>two</li>"
                + "between a list"
                + "<li>three</li>"
                + "four"
                + "</ul>"
                + "five"
                + "<ol>"
                + "<li>first</li>"
                + "<li>second</li>"
                + "Between"
                + "<li>Third</li>"
                + "</ol>"
                + "The End.";

var newHtmlText="Link clicked! <a href=\"PrevText\"><font color=\"red\">Click here to go back! This is a multiline hyper link, click anywhere to go back.</font></a>";

var mainTextArea=VG.UI.HtmlView( htmlText );
 
 function callback ( link )
 {
    var argLink = link;

    if( link.indexOf("SomeLinkHere") === 0)
        mainTextArea.html=newHtmlText;
    else if ( link.indexOf("PrevText") === 0 )
        mainTextArea.html=htmlText;
 }

 function vgMain( workspace )
 {
	//this.theme.style.ToolButtonMinimumWidth=95;

    // --- Setup the Toolbar

    /*var toolbar=VG.UI.Toolbar();
    workspace.addToolbar( toolbar );
     
    //toolbar.addItem( VG.UI.ToolSeparator() );

    this.homeButton=VG.UI.ToolButton( "Home" );
    toolbar.addItem( this.homeButton );

    this.aboutButton=VG.UI.ToolButton( "About" );
    toolbar.addItem( this.aboutButton );

    this.featuresButton=VG.UI.ToolButton( "Features" );
    toolbar.addItem( this.featuresButton );

    this.downloadButton=VG.UI.ToolButton( "Download" );
    toolbar.addItem( this.downloadButton );

    this.examplesButton=VG.UI.ToolButton( "Examples" );
    toolbar.addItem( this.examplesButton );

    // --- Vertical Layout
*/
    var mainLayout=VG.UI.Layout();
    mainLayout.vertical=true;
/*
    // --- Header

    var header=VG.UI.Label( "\nImage Header\nShows some nice VisualGraphics Artwork Image\nLater to be replaced by some live 3D Animation / Particles\n");
    header.frameType=VG.UI.Frame.Type.Box;
    //header.minimumSize.height=500;
    header.verticalExpanding=false;

    // --- Content
*/

    var contentLayout=VG.UI.Layout();
    mainTextArea.linkCallback=callback;
    mainTextArea.maximumSize = VG.Core.Size( 260, 300 );

    // --- Right Content Area
/*
    var rightContentLayout=VG.UI.Layout();
    rightContentLayout.layoutDirection=VG.UI.Layout.Direction.Vertical;
    rightContentLayout.margin.set( 0, 0, 0, 0 );

    var rightTextArea1=VG.UI.TextEdit( "Global Content Area #1\n\nIndependent from main\narea" );
    rightTextArea1.maximumSize.width=240;

    var rightTextArea2=VG.UI.TextEdit( "Global Content Area #2\n\nIndependent from main\narea"  );
    rightTextArea2.maximumSize.width=240;

    var rightTextArea3=VG.UI.TextEdit( "Global Content Area #3\n\nIndependent from main\narea"  );
    rightTextArea3.maximumSize.width=240;

	rightContentLayout.addChild( rightTextArea1 );
	rightContentLayout.addChild( rightTextArea2 );
	rightContentLayout.addChild( rightTextArea3 );

	// ---
*/
	contentLayout.addChild( mainTextArea );
	//contentLayout.addChild( rightContentLayout );

    mainLayout.addChild( contentLayout );
    workspace.content=mainLayout;
 };
