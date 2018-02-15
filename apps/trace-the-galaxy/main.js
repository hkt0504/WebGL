
function vgMain( workspace )
{
    //var renderWidget = new TracerSample(); 

    var shapeEditor=new ShapeEditor( this );
    workspace.content = shapeEditor;

    workspace.registerDataCollection( shapeEditor.dc, VG.UI.DataCollectionRole.LoadSaveRole | VG.UI.DataCollectionRole.UndoRedoRole );
    workspace.registerCallback( VG.UI.CallbackType.New, shapeEditor.clear.bind( shapeEditor ) );
    workspace.registerCallback( VG.UI.CallbackType.UndoRedo, shapeEditor.update.bind( shapeEditor ) );

    // --- Setup the Menus

    var menubar=VG.UI.Menubar();
    workspace.addMenubar( menubar );
    
    VG.Utils.addDefaultFileMenu( menubar );
    VG.Utils.addDefaultEditMenu( menubar );
    VG.Utils.addDefaultViewMenu( menubar );

    // --- Setup the Toolbar

    var toolbar=VG.UI.Toolbar();
    workspace.addToolbar( toolbar );
     
    this.workspace.addToolButtonRole( toolbar, VG.UI.ActionItemRole.New );
    toolbar.addItem( VG.UI.ToolSeparator() );
    this.workspace.addToolButtonRole( toolbar, VG.UI.ActionItemRole.Open );
    this.workspace.addToolButtonRole( toolbar, VG.UI.ActionItemRole.SaveAs );
    toolbar.addItem( VG.UI.ToolSeparator() );
    this.workspace.addToolButtonRole( toolbar, VG.UI.ActionItemRole.Undo );
    this.workspace.addToolButtonRole( toolbar, VG.UI.ActionItemRole.Redo );

    // --- Statusbar

    workspace.statusbar=VG.UI.Statusbar();

    workspace.switchToStyle( VG.Styles.pool[1], VG.Styles.pool[1].skins[1] );
}
