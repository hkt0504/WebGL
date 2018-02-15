
// --- main

 function vgMain( workspace )
 {
    this.dc=VG.Data.Collection( "MainData" );
    this.dc.items=[];

    // --- Setup the Toolbar

    var toolbar=VG.UI.Toolbar();

    var convertButton=VG.UI.ToolButton( "Convert" );
    convertButton.clicked=function() {

        // --- Get the texture from the original

        var texture=VG.Renderer().getTexture( this.original.image );

        VG.log( "texture dimensions", texture.getWidth(), texture.getHeight(), texture.getRealWidth(), texture.getRealHeight() );

        // --- Convert to Image

        var image=VG.Utils.textureToImage( texture );
        this.converted.image=image;

        VG.log( "converted dimensions", image.getWidth(), image.getHeight(), image.getRealWidth(), image.getRealHeight() );

        VG.update();
    };

    toolbar.addItem( convertButton );
    workspace.addToolbar( toolbar );
     
    // --- Statusbar

    workspace.statusbar=VG.UI.Statusbar();

    // --- The two text edits

    this.original=new ImageTestWidget( VG.Utils.getImageByName( "vgstyle_status_question.png" ) ); // another image test.
    this.converted=new ImageTestWidget();

    // --- Main Layout

    var mainLayout=VG.UI.SplitLayout( this.original, 50, this.converted, 50 );
    mainLayout.margin.set( 0, 0, 0, 0 );

    workspace.content=mainLayout;     
 }

ImageTestWidget=function( image )
{
    VG.UI.Widget.call( this );

    this.image=image;
    this.minimumSize.width=100;
};

ImageTestWidget.prototype=VG.UI.Widget();

ImageTestWidget.prototype.paintWidget=function( canvas )
{
    if ( this.image ) {
        canvas.drawImage( VG.Core.Point( this.rect.x + ( this.rect.width-this.image.width )/2,
            this.rect.y + ( this.rect.height-this.image.height ) /2 ), this.image );
    }
};
