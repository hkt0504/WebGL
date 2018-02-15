
function vgMain( workspace, argc, arg )
{
    var path=VG.Utils.splitPath( arg[0] );

    VG.File.setCurrentDir( path.path );

    //for( var i=0; i < argc; ++i ) VG.log( arg[i] );

    var makefile=VG.File.read( path.fileName );

    if ( !makefile ) {
        VG.log( ".vg file not found");
        return;
    }

    var vide=parseMakefile( makefile );
    if ( vide ) {
        var outName=path.fileName.split(".")[0] + ".vide";

        if ( !VG.File.write( outName, vide ) ) VG.log( "Error during writing " + outName );
    }
};

function parseMakefile( file )
{
    function addOptionalParams( saveData, lines ) {
        for( var i=2; i < arguments.length; ++i ) 
        {
            var arg=arguments[i];
            var rc=extractTokenList( lines, arg );
            VG.log( arg, rc[0] );
            if ( rc && rc.length )
                saveData[arg]=VG.Utils.compressToBase64( rc[0] );
        }
    }


    //VG.log( "parseMakefile", file );
    var lines=file.split(/\r\n|\r|\n/);
    lines=cleanArray( lines );

    var saveData={};

    // --- Basics

    // name
    var name=extractTokenList( lines, "name" );
    if ( !name || !name.length ) { VG.log( "Error no \"name\" parameter supplied" ); return; }
    saveData.name=VG.Utils.compressToBase64( name[0] );

    // url
    addOptionalParams( saveData, lines, "url", "version", "description", "title", "domain", "author", "keywords" );
/*
    saveData.name=VG.Utils.compressToBase64( project.getChildOfName( "Settings" ).name );
    saveData.url=VG.Utils.compressToBase64( project.getChildOfName( "Settings" ).url );
    saveData.version=VG.Utils.compressToBase64( project.getChildOfName( "Settings" ).version );
    saveData.description=VG.Utils.compressToBase64( project.getChildOfName( "Settings" ).description );
    saveData.title=VG.Utils.compressToBase64( project.getChildOfName( "Settings" ).title );
    saveData.domain=VG.Utils.compressToBase64( project.getChildOfName( "Settings" ).domain );
    saveData.author=VG.Utils.compressToBase64( project.getChildOfName( "Settings" ).author );
    saveData.keywords=VG.Utils.compressToBase64( project.getChildOfName( "Settings" ).keywords );
*/
    // --- Sources

    saveData.sources={};
    var sources=extractTokenList( lines, "sources" );
    for ( var i=0; i < sources.length; ++i ) 
    {
        var source=VG.File.read( sources[i] );
        var name;

        if ( source.indexOf( "vgMain" ) !== -1 ) name="main.js";
        else name=VG.Utils.fileNameFromPath( sources[i] );

        saveData.sources[name]=VG.Utils.compressToBase64( source );
    }

    return "VG.App=" + JSON.stringify( saveData );
};

function extractTokenList( lines, token )
{
    var rc=[];

    for( var i=0; i < lines.length; ++i ) {
        var line=String( lines[i] );

        if ( line.indexOf( "=" ) !== -1 ) {
            var arr=line.split("=");

            var left=arr[0].trim().toLowerCase();
            if ( left === token ) {
                var right=arr[1].split( "," );
                for ( var s=0; s < right.length; ++s ) {
                    var code=right[s].trim();
                    if ( code && code.length ) rc.push( code );
                }
            }
        }
    }

    return rc;
};

function cleanArray( actual )
{
    // http://stackoverflow.com/questions/281264/remove-empty-elements-from-an-array-in-javascript
    var newArray = new Array();
    for(var i = 0; i<actual.length; i++) {
        if (actual[i])
            newArray.push(actual[i]);
    }
    return newArray;
}

/*
   var project=this.currProject;
    var saveData={};

    saveData.name=VG.Utils.compressToBase64( project.getChildOfName( "Settings" ).name );
    saveData.url=VG.Utils.compressToBase64( project.getChildOfName( "Settings" ).url );
    saveData.version=VG.Utils.compressToBase64( project.getChildOfName( "Settings" ).version );
    saveData.description=VG.Utils.compressToBase64( project.getChildOfName( "Settings" ).description );
    saveData.title=VG.Utils.compressToBase64( project.getChildOfName( "Settings" ).title );
    saveData.domain=VG.Utils.compressToBase64( project.getChildOfName( "Settings" ).domain );
    saveData.author=VG.Utils.compressToBase64( project.getChildOfName( "Settings" ).author );
    saveData.keywords=VG.Utils.compressToBase64( project.getChildOfName( "Settings" ).keywords );

    var styleData=project.getChildOfName( "Style / Skin" );
    if ( styleData ) {
        saveData.styleIndex=styleData.styleIndex;
        saveData.skinIndex=styleData.skinIndex;
    }
    
    var splashScreenData=project.getChildOfName( "Splash Screen" );
    saveData.showSplashScreen=splashScreenData.showSplashScreen;
    saveData.showSplashScreenVIDE=splashScreenData.showSplashScreenVIDE;
    saveData.splashScreen=VG.Utils.compressToBase64( splashScreenData.splashScreen );

    var webData=project.getChildOfName( "Web" );
    saveData.webMaximize=webData.webMaximize;
    saveData.webCustomWidth=VG.Utils.compressToBase64( webData.webCustomWidth );
    saveData.webCustomHeight=VG.Utils.compressToBase64( webData.webCustomHeight );
    saveData.webBorderColor=VG.Utils.compressToBase64( webData.webBorderColor );
    saveData.webGoogleAnalytics=VG.Utils.compressToBase64( webData.webGoogleAnalytics );

    // --- Write the sources
    var sources=project.getChildOfName( "Sources" ).children;
    saveData.sources={};

    for( var i=0; i < sources.length; ++i )
        saveData.sources[sources[i].text]=VG.Utils.compressToBase64( sources[i].code );

    // --- Write the images
    var images=project.getChildOfName( "Images" ).children;
    saveData.images={};

    for( var i=0; i < images.length; ++i )
        saveData.images[images[i].text]=images[i].imageData;

    // --- Write the Texts
    var texts=project.getChildOfName( "Texts" ).children;
    saveData.texts={};

    for( var i=0; i < texts.length; ++i )
        saveData.texts[texts[i].text]=VG.Utils.compressToBase64( texts[i].textData );
        
    // --- Write the fonts
    var fonts=project.getChildOfName( "Fonts" ).children;
    saveData.fonts={};

    for( var i=0; i < fonts.length; ++i )
        saveData.fonts[fonts[i].text]=VG.Utils.compressToBase64( fonts[i].code );

    // ---

    return this.appString + JSON.stringify( saveData );
*/