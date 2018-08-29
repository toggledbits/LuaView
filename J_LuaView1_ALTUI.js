//# sourceURL=J_LuaView1_ALTUI.js
/**
 * J_LuaView1_ALTUI.js
 * Configuration interface for LuaView.
 */
/* globals api,jQuery,ace */

//"use strict"; // fails on ALTUI, works fine with ALTUI

var LuaViewALTUI = (function(api) {

	/* unique identifier for this plugin... */
	var uuid = '7513412a-a7e8-11e8-afe3-74d4351650de';

	var myModule = {};

	var serviceId = "urn:toggledbits-com:serviceId:LuaView1";
	// var deviceType = "urn:schemas-toggledbits-com:device:LuaView:1";
	var configModified = false;
	var isOpenLuup = false;

	function D(m) {
		console.log("J_LuaView1_ALTUI.js: " + m);
	}

	function initModule() {
		D("jQuery version is " + String( jQuery.fn.jquery ) );
		var ud = api.getUserData();
		for (var i=0; i < ud.devices.length; ++i ) {
			if ( ud.devices[i].device_type == "openLuup" ) {
				isOpenLuup = true;
				break;
			}
		}
	}

	/* Push header to document head */
	function header() {
        jQuery("head").append('<link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">');
        
		var html = "";
		html = '<style>';
		html += 'input.narrow { max-width: 8em; }';
		html += 'div.coderow { padding: 12px 0px 12px 0px; border-top: 1px dotted black; }';
		html += 'textarea.luacode { font-family: monospace; resize: vertical; }';
		html += 'div.modified { background-color: #ffcccc; }';
		html += 'div#tbcopyright { display: block; margin: 12px 0 12px; 0; }';
		html += 'div#tbbegging { display: block; font-size: 1.25em; line-height: 1.4em; color: #ff6600; margin-top: 12px; }';
		html += '</style>';
		jQuery('head').append( html );
	}

	/* Return footer */
	function footer() {
		var html = '';
		html += '<div class="clearfix">';
		html += '<div id="tbbegging"><em>Find LuaView useful?</em> Please consider a small one-time donation to support this and my other plugins on <a href="https://www.toggledbits.com/donate" target="_blank">my web site</a>. I am grateful for any support you choose to give!</div>';
		html += '<div id="tbcopyright">LuaView ver 1.2 <a href="https://www.toggledbits.com/" target="_blank">Patrick H. Rigney (rigpapa)</a>' +
			' Please use the ' +
			' <a href="http://forum.micasaverde.com/index.php/topic,103404.0.html" target="_blank">forum thread</a> for support.</div>';
		return html;
	}

	/* Closing the control panel. */
	function onBeforeCpanelClose(args) {
		D( 'onBeforeCpanelClose args: ' + JSON.stringify(args) );
	}

	function handleEditorChange( editor, session, delta ) {
		configModified = true;
		jQuery( editor.container ).closest('div.row').addClass('modified');
	}

	function handleEditorSave( editor, session, ev ) {
		var url = api.getDataRequestURL();
		var f = jQuery( ev.currentTarget ).closest( 'div.row' );
		f.addClass("modified");
		var lua = session.getValue();
		lua = lua.replace( /[\r\n\s]+$/m, "" ); // rtrim
		var scene = f.attr( 'id' );
		D("Changed " + scene);
		if ( scene == "__startup" ) {
			D("Posting startup lua change to to " + url);
			jQuery.ajax({
				url: url,
				method: "POST",
				data: { id: "lr_LuaView", action: "saveStartupLua", lua: lua },
				dataType: "text",
				timeout: 5000
			}).done( function( data, statusText, jqXHR ) {
				if ( data == "OK" ) {
					f.removeClass("modified");
					if ( ! isOpenLuup ) {
						alert("Startup Lua saved, but you must hard-refresh your browser to get the UI to show it consistently. Sorry. Trying to figure out a way around this.");
					}
					configModified = false;
				} else {
					throw new Error( "Save returned: " + data );
				}
			}).fail( function( jqXHR, textStatus, errorThrown ) {
				// Bummer.
				D("Failed to load scene: " + textStatus + " " + String(errorThrown));
				D(jqXHR.responseText);
				alert("Save failed! Vera may be busy/restarting. Wait a moment, and try again.");
			});
		} else {
			if ( lua !== "" ) {
				var lines = lua.split( /(\r|\n)+/ );
				/* Remove trailing comments. Always leave one line, so test works if Lua is all comments (still needs return) */
				while ( lines.length > 1 && ( lines[lines.length-1].match(/^\s*--/) || lines[lines.length-1].match(/^\s*$/) ) ) {
					lines.pop();
				}
				if ( lines.length > 0 && ! lines[lines.length-1].match(/^\s*return/) ) {
					alert( 'Your scene Lua may not return "true" or "false", which Luup expects. This can cause unpredictable scene behavior. If your returns are buried in conditionals or loops, I can\'t see them; just make sure your code always exits with a return value.' );
				}
			}
			D("Loading scene data from " + url);
			scene = parseInt( scene );
			/* Query the scene as it currently is. */
			jQuery.ajax({
				url: url + "?id=scene&action=list&scene=" + scene,
				dataType: "json",
				timeout: 5000
			}).done( function( data, statusText, jqXHR ) {
				// Excellent.
				D( "Loaded the scene, updating..." );
				if ( lua == "" || isOpenLuup ) {
					data.encoded_lua = 0;
					data.lua = lua;
				} else {
					data.encoded_lua = 1;
					data.lua = btoa( lua );
				}
				// Save it.
				var ux = JSON.stringify( data );
				/* PHR 2018-08-25: jQuery.post() fails on older firmware due to jQuery version/bug, but ajax()+method seems to work fine. */
				jQuery.ajax({
					url: url,
					method: "POST",
					data: { id: "scene", action: "create", json: ux },
					dataType: "text",
					timeout: 5000
				}).done( function( data, statusText, jqXHR ) {
					D("Save returns " + jqXHR.responseText);
					if ( data == "OK" ) {
						f.removeClass("modified");
						configModified = false;
					} else {
						throw new Error( "Save replied: " + String(data) );
					}
				}).fail( function( jqXHR, textStatus, errorThrown ) {
					D("Failed to save scene: " + textStatus + " " + String(errorThrown));
					D(jqXHR.responseText);
					alert("Save failed! Vera may be busy/restarting. Wait a moment, and try again.");
				});
			}).fail( function( jqXHR, textStatus, errorThrown ) {
				// Bummer.
				D("Failed to load scene: " + textStatus + " " + String(errorThrown));
				D(jqXHR.responseText);
				alert("Save failed! Vera may be busy/restarting. Wait a moment, and try again.");
			});
		}
	}

	function makeEditor( elem, scene ) {
		var editor = ace.edit( jQuery(elem).get(0), {
			minLines: 8,
			maxLines: 32,
			theme: "ace/theme/xcode",
			mode: "ace/mode/lua",
			fontSize: "16px",
			tabSize: 4
		});
		var exopts = api.getDeviceState( api.getCpanelDeviceId(), serviceId, "AceOptions" ) || "";
		if ( exopts !== "" ) {
			try {
				var opts = JSON.parse( exopts );
				if ( opts !== undefined ) {
					editor.setOptions( opts );
				}
			} catch( e ) {
				alert("Can't apply your custom AceOptions: " + String(e));
			}
		}
		var code;
		if ( ( scene.encoded_lua || 0 ) != 0 ) {
			code = atob( scene.lua ) || "??";
		} else {
			code = scene.lua || "";
		}
		var session = editor.session;
		session.setValue( code );
		editor.on( 'change', function( delta ) { handleEditorChange( editor, session, delta ); } );
		editor.on( 'blur', function( ev ) { handleEditorSave( editor, session, ev ); } );
	}
    
    function updateDisplay( sort ) {
        var ud = api.getUserData();
        var list = jQuery("div#codelist");
        list.empty();

        var el = jQuery('<div class="sortrow row form-inline"></div>');
        el.append('<div class="col-xs-12">Sort by: <select id="sortby" class="form-control form-control-sm"><option value="name">Name</option><option value="id">ID</option></select><select id="sortasc" class="form-control form-control-sm"><option value="asc">ascending</option><option value="desc">descending</option></select></div>');
        list.append(el);
        if ( sort === undefined ) {
            sort = api.getDeviceState( api.getCpanelDeviceId(), serviceId, "Sort" ) || "name,asc";
        }
        var sortopt = sort.split(/,/);
        if ( sortopt.length < 2 ) {
            sortopt = [ "name", "asc" ];
        }
        jQuery('select#sortby', el).val( sortopt[0] );
        jQuery('select#sortasc', el).val( sortopt[1] );
        jQuery('select', el).on( 'change', handleSortChange );

        el = jQuery('<div class="coderow row"></div>');
        el.attr('id', '__startup');
        el.append('<div class="col-xs-12 col-md-3 col-lg-2">Startup Lua</div>');
        el.append('<div id="editorStartup" class="ace-field col-xs-12 col-md-9 col-lg-10"></div>');
        list.append(el);
        makeEditor( '#editorStartup', { id: "__startup", encoded_lua: ud.encoded_lua, lua: ud.StartupCode } );

        var scenes = api.cloneObject( ud.scenes );
        scenes.sort( 
            function( a, b ) {
                if ( sortopt[0] == "id" ) {
                    if ( sortopt[1] == 'desc' ) {
                        return a.id < b.id ? 1 : -1;
                    } else {
                        return a.id < b.id ? -1 : 1;
                    }
                } else {
                    if ( sortopt[1] == 'desc' ) {
                        return a.name.toLowerCase() < b.name.toLowerCase() ? 1 : -1;
                    } else {
                        return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1;
                    }
                }
            } 
        );
        for (var i=0; i<scenes.length; ++i) {
            el = jQuery('<div class="coderow row"></div>');
            el.attr('id', scenes[i].id);
            el.append('<div class="scenename col-xs-12 col-md-3 col-lg-2"></div>');
            jQuery( 'div.scenename', el ).text( scenes[i].name + ' (' + scenes[i].id + ')' );
            el.append('<div class="ace-field col-xs-12 col-md-9 col-lg-10"></div>');
            jQuery('div.ace-field', el).attr('id', 'editor' + scenes[i].id);
            list.append( el );
            makeEditor( '#editor'+scenes[i].id, scenes[i] );
        }
    }
    
    function handleSortChange() {
        var sortby = jQuery('select#sortby').val();
        var sortasc = jQuery('select#sortasc').val();
        var sort = sortby + "," + sortasc;
        api.setDeviceStatePersistent( api.getCpanelDeviceId(), serviceId, "Sort", sort );
        updateDisplay( sort );
    }

	/* */
	function doSceneLua()
	{
		initModule();

		var html = '<div><div id="codelist">';
		html += '</div></div>'; // codelist

		html += footer();

		header();

		api.setCpanelContent( html );

        updateDisplay();
	}

	myModule = {
		initModule: initModule,
		onBeforeCpanelClose: onBeforeCpanelClose,
		doSceneLua: doSceneLua
	};
	return myModule;
})(api);