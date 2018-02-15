
// --- main

 function vgMain( workspace )
 {
    this.dc=VG.Data.Collection( "MainData" );
    this.dc.items=[];

    // --- Setup the Toolbar

    var toolbar=VG.UI.Toolbar();
    workspace.addToolbar( toolbar );
     
    // --- Statusbar

    workspace.statusbar=VG.UI.Statusbar();

    // --- Setup the left DockWidget with its ListWidget

    var dockWidget=VG.UI.DockWidget( "Help Index" );

    this.filterEdit=VG.UI.TextLineEdit( "" );
    this.filterEdit.textChanged=function() { filterTextChanged.call( this ); };
    this.filterEdit.defaultText="Filter";

    var helpItemsWidget=VG.UI.TreeWidget();

    this.helpItemsController=helpItemsWidget.bind( this.dc, "items" );
    this.helpItemsController.addObserver( "selectionChanged", itemChanged );

    var helpItemsLayout=VG.UI.Layout( this.filterEdit, helpItemsWidget );
    helpItemsLayout.vertical=true;
    dockWidget.addItem( helpItemsLayout );

    // --- The two text edits

    this.sourceCodeEdit=VG.UI.TextEdit( "" );
    this.htmlView=VG.UI.HtmlView( "" );

    // --- Set the link callback for HtmlView
    this.htmlView.linkCallback=linkCallback.bind(this);

    // --- Main Layout

    var mainLayout=VG.UI.SplitLayout( this.sourceCodeEdit, 50, this.htmlView, 50 );
    mainLayout.margin.set( 0, 0, 0, 0 );

    // --- Setting up the workspace

    workspace.addDockWidget( dockWidget, VG.UI.DockWidgetLocation.Left );
    workspace.content=mainLayout;    

    // --- Build the Database
    this.docs=VG.Docs.Database();

    filterTextChanged.call( this );    
 }

// --- A new help item was selected

function itemChanged()
{
    var listObj=this.helpItemsController.selected;

    this.sourceCodeEdit.text=listObj.func;
    var html=this.docs.getHtml( listObj, this.helpItemsController );
    
    this.htmlView.html=html;
}

function linkCallback( link )
{
    var helpObject = this.docs.getHelpObject( link );

    if( helpObject ) {

        var html=this.docs.getHtml( helpObject, this.helpItemsController );
        this.htmlView.html=html;

        this.helpItemsController.selected=helpObject;
    }
}

// --- The filter text has changed, get the available items for the new filter text.

function filterTextChanged() 
{   
    this.dc.items=[];

    for( var i=0; i < this.docs.helpObjects.length; ++i )
    {
        var item=this.docs.helpObjects[i];
        this.helpItemsController.add( "", item );
    }

    VG.context.workspace.statusbar.message( this.helpItemsController.length + " help items available." );
}
