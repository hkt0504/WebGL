var VG = {};

VG.HostProperty={ 
	"Platform" : 0,
	"PlatformWeb" : 1,
	"PlatformDesktop" : 2,
	"PlatformTablet" : 3,
	"PlatformMobile" : 4,

	"OperatingSystem" : 5,
	"OSWindows" : 6,
	"OSMac" : 7,
	"OSUnix" : 8,
	"OSLinux" : 9,

	"DrawMenus" : 12,

	"ProjectChangedState" : 20,

	"Docs.Enum" : 9000
};

VG.AnimationTick=1000.0 / 60.0;

// --- Application Context

VG.context={};

// --- Global Redraw

VG.update=function()
{
    if ( VG.context && VG.context.workspace ) VG.context.workspace.needsRedraw=true;
    if ( VG.hostUpdate ) VG.hostUpdate();
};

// --- Log & Error Functions, these will be overriden by V-IDE

VG.log=function()
{
	/** Prints the arguments on the native console. If V-IDE is running also prints the arguments in V-IDEs Runtime Log.
	**/

	var string="";

	for( var i=0; i < arguments.length; ++i ) string+=String( arguments[i] ) + " ";

	if ( typeof console == "object" ) console.log( string );
	else if ( VG.print ) VG.print( string );

	if ( VG.globalVIDEInstance ) VG.globalVIDEInstance.addToRuntimeLog( string );
};

VG.error=function()
{
	/** Prints the arguments on the console. V-IDE replaces this function and prints the arguments in its Runtime Window.
	**/

	var string="Error: ";

	for( var i=0; i < arguments.length; ++i ) string+=String( arguments[i] ) + " ";

	if ( typeof console == "object" ) console.log( string );
	else if ( VG.print ) VG.print( string );

	if ( VG.globalVIDEInstance ) VG.globalVIDEInstance.addToRuntimeLog( string );	
};