//# sourceURL=J_LuaView1_UI7.js
/**
 * J_LuaView1_UI7.js
 * Configuration interface for LuaView.
 */
/* globals api,jsonp,jQuery */

//"use strict"; // fails on UI7, works fine with ALTUI

var LuaView = (function(api) {

	/* unique identifier for this plugin... */
	var uuid = '7513412a-a7e8-11e8-afe3-74d4351650de';

	var myModule = {};

	var serviceId = "urn:toggledbits-com:serviceId:LuaView1";
	// var deviceType = "urn:schemas-toggledbits-com:device:LuaView:1";
	var configModified = false;
	var isOpenLuup = false;

	function D(m) {
		console.log("J_LuaView1_UI7.js: " + m);
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
		var html = "";

        jQuery('head').append( '<meta charset="utf-8">' );
        
		html = '<style>';
		html += 'input.narrow { max-width: 8em; }';
		html += 'textarea.luacode { font-family: monospace; resize: vertical; }';
		html += 'textarea.modified { background-color: #ffcccc; }';
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
		html += '<div id="tbcopyright">LuaView ver 1.2+utf8+1pg <a href="https://www.toggledbits.com/" target="_blank">Patrick H. Rigney (rigpapa)</a>' +
			' Please use the ' +
			' <a href="http://forum.micasaverde.com/index.php/topic,103404.0.html" target="_blank">forum thread</a> for support.</div>';
		return html;
	}

	/* Closing the control panel. */
	function onBeforeCpanelClose(args) {
		D( 'onBeforeCpanelClose args: ' + JSON.stringify(args) );
	}

	/* */
	function handleSaveClick( ev ) {
		/* context?? */
	}

	function handleTextChange( ev ) {
		var url = api.getDataRequestURL();
		var f = jQuery( ev.currentTarget );
		f.addClass("modified");
		var lua = f.val() || "";
        lua = lua.replace( /\r\n/g, "\n" );
		lua = lua.replace( /[\r\n\s]+$/m, "" ); // rtrim
        lua = unescape( encodeURIComponent( lua ) ); // Fanciness to keep UTF-8 chars well
		var scene = f.closest('div.row').attr( 'id' );
		D("Changed " + scene);
		if ( scene == "__startup" ) {
			D("Posting startup lua change to to " + url);
			jQuery.ajax({
				url: url,
				method: "POST",
                scriptCharset: "utf-8",
                contentType: "application/x-www-form-urlencoded; charset=utf-8",
				data: { id: "lr_LuaView", action: "saveStartupLua", lua: lua },
				dataType: "text",
				timeout: 5000
			}).done( function( data, statusText, jqXHR ) {
				if ( data == "OK" ) {
					f.removeClass("modified");
					if ( ! isOpenLuup ) {
						alert("Startup Lua saved, but you must hard-refresh your browser to get the UI to show it consistently. Sorry. Trying to figure out a way around this.");
					}
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
                    scriptCharset: "utf-8",
                    contentType: "application/x-www-form-urlencoded; charset=utf-8",
					data: { id: "scene", action: "create", json: ux },
					dataType: "text",
					timeout: 5000
				}).done( function( data, statusText, jqXHR ) {
					D("Save returns " + jqXHR.responseText);
					if ( data == "OK" ) {
						f.removeClass("modified");
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

	/* */
	function doSceneLua()
	{
		initModule();

		var html = '<div id="codelist">';
		html += '</div>'; // codelist

		html += footer();

		header();

		api.setCpanelContent( html );

		var ud = api.getUserData();
		var scenes = api.cloneObject( ud.scenes );
		scenes.sort( function( a, b ) { return a.name < b.name ? -1 : 1; } );
        
		var list = jQuery("div#codelist");
        
		var el = jQuery('<div class="coderow row"></div>');
		el.attr('id', '__startup');
		el.append('<div class="col-xs-12 col-md-3 col-lg-2">Startup Lua</div>');
        el.append('<div class="col-xs-12 col-md-9 col-lg-10"><textarea class="luacode form-control" rows="8"></textarea></div>');
		if ( ( ud.encoded_lua || 0 ) != 0 && ud.StartupCode ) {
			jQuery('textarea', el).val( atob( ud.StartupCode ) || "??" );
		} else {
			jQuery('textarea', el).val( ud.StartupCode || "" );
		}
		list.append(el);
		jQuery( 'textarea', el ).on( 'change.luaview', handleTextChange );
        
		for (var i=0; i<scenes.length; ++i) {
			el = jQuery('<div class="coderow row"></div>');
			el.attr('id', scenes[i].id);
			el.append('<div class="scenename col-xs-12 col-md-3 col-lg-2"></div>');
            jQuery('div.scenename', el).text( scenes[i].name + ' (' + scenes[i].id + ')' );
			el.append('<div class="col-xs-12 col-md-9 col-lg-10"><textarea class="luacode form-control" rows="8"></textarea></div>');
            var lua = scenes[i].lua || "";
			if ( ( scenes[i].encoded_lua || 0 ) != 0 ) {
				lua = atob( lua );
			}
            lua = decodeURIComponent( escape( lua ) ); // Fanciness to keep UTF-8 chars well
            jQuery('textarea', el).val( lua );
			list.append(el);
			jQuery( 'textarea', el ).on( 'change.luaview', handleTextChange );
		}
	}
    
    function doStartupLua() {
        var html;
        
        header();
        
        html = '<p>Startup Lua now appears on the scene Lua page. This stub will go away when the entire plugin is updated at the next revision.</p>';
        html += footer();
		api.setCpanelContent( html );
        
    }
    

	myModule = {
		initModule: initModule,
		onBeforeCpanelClose: onBeforeCpanelClose,
		doSceneLua: doSceneLua,
        doStartupLua: doStartupLua
	};
	return myModule;
})(api);
