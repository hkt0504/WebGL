
// --- main

 function vgMain( workspace )
 {
    this.dc=VG.Data.Collection( "MainData" );
    this.dc.items=[];

    // --- Setup the Toolbar & Statusbar

    var toolbar=VG.UI.Toolbar();
    workspace.addToolbar( toolbar );
    workspace.statusbar=VG.UI.Statusbar();

    // --- Setup the left DockWidget with its ListWidget

    var dockWidget=VG.UI.DockWidget( "Backend Tests" );

    var listWidget=VG.UI.ListWidget();

    this.testsController=listWidget.bind( this.dc, "items" );
    this.testsController.addObserver( "selectionChanged", itemChanged );

    dockWidget.addItem( listWidget );

    // --- The result view text edit

    this.resultView=VG.UI.TextEdit( "" );
    this.resultView.readOnly=true;

    // --- Setup all available widgets for backend tests

    this.signUpWidget=new SignUpWidget( this.resultView );
    this.logInWidget=new LogInWidget( this.resultView );

    // --- Create the StackedLayout and add the listview items

    this.stackedLayout=VG.UI.StackedLayout( this.signUpWidget, this.logInWidget );

    this.testsController.add( { text: "Sign Up", widget : this.signUpWidget } );
    this.testsController.add( { text: "Log In", widget : this.logInWidget } );

    // --- Main Layout

    var mainLayout=VG.UI.SplitLayout( this.stackedLayout, 50, this.resultView, 50 );
    mainLayout.vertical=true;
    mainLayout.margin.set( 0, 0, 0, 0 );

    // --- Setting up the workspace

    workspace.addDockWidget( dockWidget, VG.UI.DockWidgetLocation.Left );
    workspace.content=mainLayout;  
 }

// --- A new test item was selected

function itemChanged()
{
    this.stackedLayout.current=this.testsController.selected.widget;
}

// ----------------------------------- SignUp Test Widget

SignUpWidget=function( resultView )
{
    VG.UI.Widget.call( this );

    this.resultView=resultView;

    this.layout=VG.UI.LabelLayout();

    this.userNameEdit=VG.UI.TextLineEdit( "" );
    this.eMailEdit=VG.UI.TextLineEdit( "" );
    this.passwordEdit=VG.UI.TextLineEdit( "" );
    this.signUpButton=VG.UI.Button("Sign Up!");

    this.layout.addChild( "Username", this.userNameEdit );
    this.layout.addChild( "eMail", this.eMailEdit );
    this.layout.addChild( "Password", this.passwordEdit );    
    this.layout.addChild( "", this.signUpButton ); 

    this.signUpButton.clicked=function() {
        var parameters={email : this.eMailEdit.text, username : this.userNameEdit.text, password : this.passwordEdit.text };

        this.resultView.text="Parameters: " + JSON.stringify(parameters) + "\n" + "Waiting for Response...";

        VG.sendBackendRequest( "/user/signup", JSON.stringify(parameters),
            function(response) {
              this.resultView.text = response;
              VG.update();
            }.bind(this),
            function(response) {
              this.resultView.text = response;
              VG.update();
            }.bind(this)
        );
        VG.update();            
    }.bind( this );
}

SignUpWidget.prototype=VG.UI.Widget();

SignUpWidget.prototype.paintWidget=function( canvas )
{
    this.layout.rect.set( this.rect );
    this.layout.layout( canvas );
}

// ----------------------------------- LogIn Test Widget

LogInWidget=function( resultView )
{
    VG.UI.Widget.call( this );

    this.resultView=resultView;

    this.layout=VG.UI.LabelLayout();

    this.userNameEdit=VG.UI.TextLineEdit( "" );
    this.passwordEdit=VG.UI.TextLineEdit( "" );
    this.logInButton=VG.UI.Button("Login!");

    this.layout.addChild( "Username", this.userNameEdit );
    this.layout.addChild( "eMail", this.passwordEdit );
    this.layout.addChild( "", this.logInButton ); 

    this.logInButton.clicked=function() {
        var parameters={ username : this.userNameEdit.text, password : this.passwordEdit.text };

        this.resultView.text="Parameters: " + JSON.stringify(parameters) + "\n" + "Waiting for Response...";

        VG.sendBackendRequest( "/user/login", JSON.stringify(parameters),
            function( response ) {
              var
                jsonResponse = JSON.parse(response);

              if (jsonResponse.status && jsonResponse.status === "ok") {
                /* Dialog should be closed here, but I don't know how to do this :-)
                 */
                this.resultView.text = "Login successful"
              } else {
                /* Show error from server
                 */
                this.resultView.text = jsonResponse.errorMessage || 'Unknown error';
              }
              VG.update();
            }.bind( this ), "POST" );
        VG.update();    
    }.bind( this );
}

LogInWidget.prototype=VG.UI.Widget();

LogInWidget.prototype.paintWidget=function( canvas )
{
    this.layout.rect.set( this.rect );
    this.layout.layout( canvas );
}