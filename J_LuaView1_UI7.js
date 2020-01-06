//# sourceURL=J_LuaView1_UI7.js
/**
 * J_LuaView1_UI7.js
 * Configuration interface for LuaView.
 */
/* globals api,jsonp,jQuery,$,unescape,MultiBox,ace */

//"use strict"; // fails on UI7, works fine with ALTUI

var LuaView = (function(api, $) {

	/* unique identifier for this plugin... */
	var uuid = '7513412a-a7e8-11e8-afe3-74d4351650de';

	var pluginVersion = "1.7develop-20005";

	var myModule = {};

	var serviceId = "urn:toggledbits-com:serviceId:LuaView1";
	// var deviceType = "urn:schemas-toggledbits-com:device:LuaView:1";
	var configModified = false;
	var isOpenLuup = false;
	var logTab = false;
	var logAtBottom = false;
	var logSeenEOF = false;

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

		logTab = false;
		logAtBottom = false;
		logSeenEOF = false;
	}

	/* Push header to document head */
	function header() {
		var html = "";

		jQuery('head').append( '<meta charset="utf-8">' );

		var s = api.getDeviceState( api.getCpanelDeviceId(), serviceId, "LoadACE" ) || "1";
		if ( "0" !== s && ! window.ace ) {
			s = api.getDeviceState( api.getCpanelDeviceId(), serviceId, "ACEURL" ) || "";
			if ( "" === s ) s = "https://cdnjs.cloudflare.com/ajax/libs/ace/1.4.2/ace.js";
			jQuery( "head" ).append( '<script src="' + s + '"></script>' );
			// jQuery( "head" ).append( '<script src="https://cdnjs.cloudflare.com/ajax/libs/ace/1.4.2/mode-lua.js"></script>' );
			// jQuery( "head" ).append( '<script src="https://cdnjs.cloudflare.com/ajax/libs/ace/1.4.2/theme-xcode.js"></script>' );
		}

		html = '<style>';
		html += 'input.narrow { max-width: 8em; }';
		html += 'div.coderow { padding: 12px 0px 12px 0px; border-top: 1px dotted black; }';
		html += 'div.coderow.modified { background-color: #ffc; }';
		html += 'div.tberrmsg { color: red; padding: 4px 4px 4px 4px; border: 2px solid red; }';
		html += 'textarea.luacode { font-family: monospace; resize: vertical; }';
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
		html += '<div id="tbcopyright">LuaView ver ' +
			pluginVersion +
			' <a href="https://www.toggledbits.com/" target="_blank">Patrick H. Rigney (rigpapa)</a>' +
			' Please use the ' +
			' <a href="http://forum.micasaverde.com/index.php/topic,103404.0.html" target="_blank">forum thread</a> for support.</div>';
		return html;
	}

	/* Closing the control panel. */
	function onBeforeCpanelClose(args) {
		D( 'onBeforeCpanelClose args: ' + JSON.stringify(args) );
	}

	/* Return a Promise that resolves when Luup is reloaded and ready, as evidenced
	   by the functional state of the Reactor plugin's request handler. */
	function waitForReloadComplete( msg ) {
		return new Promise( function( resolve, reject ) {
			var expire = Date.now() + 90000;
			var dlg = false;
			function tryAlive() {
				$.ajax({
					url: api.getDataRequestURL(),
					data: {
						id: "lr_LuaView",
						action: "alive"
					},
					dataType: "json",
					timeout: 5000
				}).done( function( data ) {
					if ( data && data.status ) {
						if (dlg) $("#myModal").modal("hide");
						resolve( true );
					} else {
						if ( ! $("#myModal").is(":visible") ) {
							api.showCustomPopup( msg || "Waiting for Luup ready before operation...", { autoHide: false, category: 3 } );
							dlg = true;
						}
						if ( Date.now() >= expire ) {
							if (dlg) $("#myModal").modal("hide");
							reject( "timeout" );
						} else {
							setTimeout( tryAlive, 2000 );
						}
					}
				}).fail( function() {
					if ( Date.now() >= expire ) {
						if (dlg) $("#myModal").modal("hide");
						reject( "timeout" );
					} else {
						if ( ! $("#myModal").is(":visible") ) {
							api.showCustomPopup( msg || "Waiting for Luup ready before operation...", { autoHide: false, category: 3 } );
							dlg = true;
						}
						setTimeout( tryAlive, 5000 );
					}
				});
			}
			tryAlive();
		});
	}


	/* Swiped from Reactor, this function checks the Lua fragment */
	function testLua( lua, row ) {
		jQuery( 'div.tberrmsg', row ).remove();
		$.ajax({
			url: api.getDataRequestURL(),
			method: 'POST', /* data could be long */
			data: {
				id: "lr_LuaView",
				action: "testlua",
				lua: lua
			},
			cache: false,
			dataType: 'json',
			timeout: 5000
		}).done( function( data, statusText, jqXHR ) {
			if ( data.status ) {
				/* Good Lua */
				return;
			} else if ( data.status === false ) { /* specific false, not undefined */
				jQuery( 'div.editor', row ).prepend( jQuery( '<div class="tberrmsg"/>' ).text( data.message || "Error in Lua" ) );
			}
		}).fail( function( stat ) {
			console.log("Failed to check Lua: " + stat);
		});
	}

	function handleTextAreaChange( ev ) {
		var url = api.getDataRequestURL();
		var f = jQuery( ev.currentTarget );
		var row = f.closest( 'div.row' );
		row.addClass("modified");
		var lua = f.val() || "";
		lua = lua.replace( /\r\n/gm, "\n" ).replace( /\r/gm, "\n" ).trimEnd();
		lua = unescape( encodeURIComponent( lua ) ); // Fanciness to keep UTF-8 chars well
		testLua( lua, row );
		var scene = row.attr( 'id' );
		D("Changed " + scene);
		if ( scene == "__startup" ) {
			D("Posting startup lua change to " + url);
			jQuery.ajax({
				url: url,
				method: "POST",
				scriptCharset: "utf-8",
				contentType: "application/x-www-form-urlencoded; charset=utf-8",
				data: { id: "lr_LuaView", action: "saveStartupLua", lua: lua },
				dataType: "text",
				timeout: 5000
			}).done( function( data, statusText, jqXHR ) {
				if ( "OK" === data ) {
					row.removeClass("modified");
					if ( ! isOpenLuup ) {
						try {
							/* ??? Discovered/undocumented/unpublished */
							api.application.sendCommandSaveUserData(true);
						}
						catch( e ) {
							alert("Startup Lua saved, but you must hard-refresh your browser to get the UI to show it consistently.");
						}
					}
					configModified = false;
				} else {
					alert("An error occurred while trying to save. Luup may be restarting. Try again in a moment.");
					throw new Error( "Save returned: " + data );
				}
			}).fail( function( jqXHR, textStatus, errorThrown ) {
				// Bummer.
				D("Failed to load scene: " + textStatus + " " + String(errorThrown));
				D(jqXHR.responseText);
				alert("Save failed! Vera may be busy/restarting. Wait a moment, and try again.");
			});
		} else {
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
						row.removeClass("modified");
						if ( ! isOpenLuup ) {
							try {
								/* ??? Discovered/undocumented/unpublished */
								api.application.sendCommandSaveUserData(true);
							}
							catch( e ) {
								console.log( e );
							}
						}
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

	function doTextArea( el, code ) {
		var t = jQuery( '<textarea class="luacode form-control" rows="8"></textarea>' );
		t.val( code || "" );
		t.on( 'change.luaview', handleTextAreaChange );
		el.append( t );
	}

	function handleEditorChange( editor, session, delta ) {
		configModified = true;
		jQuery( editor.container ).closest('div.row').addClass('modified');
	}

	function handleEditorSave( editor, session, ev ) {
		var url = api.getDataRequestURL();
		var f = jQuery( ev.currentTarget );
		var row = f.closest( 'div.row' );
		row.addClass("modified");
		var lua = session.getValue();
		lua = lua.replace( /\r\n/gm, "\n" ).replace( /\r/gm, "\n" ).trimEnd();
		lua = unescape( encodeURIComponent( lua ) ); // Fanciness to keep UTF-8 chars well
		testLua( lua, row );
		var scene = row.attr( 'id' );
		D("Changed " + scene);
		if ( scene == "__startup" ) {
			D("Posting startup lua change to " + url);
			jQuery.ajax({
				url: url,
				method: "POST",
				data: { id: "lr_LuaView", action: "saveStartupLua", lua: lua },
				dataType: "text",
				timeout: 5000
			}).done( function( data, statusText, jqXHR ) {
				if ( "OK" === data ) {
					row.removeClass("modified");
					if ( ! isOpenLuup ) {
						try {
							/* ??? Discovered/undocumented/unpublished */
							api.application.sendCommandSaveUserData(true);
						}
						catch( e ) {
							alert("Startup Lua saved, but you must hard-refresh your browser to get the UI to show it consistently.");
						}
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
						row.removeClass("modified");
						if ( ! isOpenLuup ) {
							try {
								/* ??? Discovered/undocumented/unpublished */
								api.application.sendCommandSaveUserData(true);
							}
							catch( e ) {
								console.log( e );
							}
						}
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

	function doEditor( el, code ) {
		var editor = ace.edit( jQuery(el).get(0), {
			minLines: 8,
			maxLines: 32,
			theme: "ace/theme/xcode",
			mode: "ace/mode/lua",
			fontSize: "16px",
			tabSize: 4
		});
		/* Apply options from state if set */
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
		var session = editor.session;
		session.setValue( code );
		editor.on( 'change', function( delta ) { handleEditorChange( editor, session, delta ); } );
		editor.on( 'blur', function( ev ) { handleEditorSave( editor, session, ev ); } );
	}

	function handleReloadClick( ev ) {
		var btn = jQuery( ev.target );
		btn.prop( 'disabled', true );
		api.showCustomPopup( "Reloading Luup...", { autoHide: false, category: 3 } );
		setTimeout( function() {
			api.performActionOnDevice( 0, "urn:micasaverde-com:serviceId:HomeAutomationGateway1", "Reload",
				{ actionArguments: { Reason: "User-requested reload from LuaView UI" } } );
			setTimeout( function() {
				waitForReloadComplete().finally( function() {
					$("#myModal").modal("hide");
					btn.prop( 'disabled', false );
				});
			}, 5000 );
		}, 2000 );
	}

	function handleBackupClick( ev ) {
		var txt = '';
		txt += '-- INSTRUCTIONS: RIGHT-CLICK in this window and choose "Save as..." to save this display as a backup of your Lua.';
		txt += "\n--               To restore all or part later, just copy/paste from the saved file.";
		txt += "\n-- Snapshot time is " + String( new Date() );
		txt += "\n\n";

		var ud = api.getUserData();

		var code = ( parseInt(ud.encoded_lua || 0) ? atob( ud.StartupCode ) : ud.StartupCode ) || "";
		if ( "" !== code ) {
			txt += "-- Startup Lua\n";
			txt += code;
			txt += "\n\n";
		}

		var scenes = api.cloneObject( ud.scenes );
		for (var i=0; i<scenes.length; ++i) {
			if ( undefined !== scenes[i].notification_only ) {
				continue;
			}
			var scene = scenes[i];
			code = ( parseInt( scene.encoded_lua || 0 ) ? atob( scene.lua ) : scene.lua ) || "";
			if ( "" !== code ) {
				txt += '-- ' + '-'.repeat( 117 ) + "\n";
				txt += '-- Scene #' + String( scene.id ) + ": " + String( scene.name ) + "\n";
				txt += code;
				txt += "\n\n";
			}
		}

		var win = window.open(api.getDataRequestURL() + '?id=lr_LuaView&action=blank', 'lvbackup');
		if (win) {
			setTimeout( function() {
				var $body = jQuery( win.document.body );
				var $pre = jQuery( '<pre/>' ).text( txt );
				$body.empty().append( $pre );
			}, 1000 );
			win.focus();
		} else {
			alert('Please allow popups for this interface.');
		}
	}

	function updateDisplay( sort ) {
		var ud = api.getUserData();
		var list = jQuery("div#codelist");
		list.empty();

		if ( sort === undefined ) {
			sort = api.getDeviceState( api.getCpanelDeviceId(), serviceId, "Sort" ) || "name,asc";
		}
		var sortopt = sort.split(/,/);
		if ( sortopt.length < 2 ) {
			sortopt = [ "name", "asc" ];
		}

		var el = jQuery('<div class="sortrow row form-inline" />');
		el.append('<div class="col-xs-8">Sort by: <select id="sortby" class="form-control form-control-sm"><option value="name">Name</option><option value="id">ID</option></select><select id="sortasc" class="form-control form-control-sm"><option value="asc">ascending</option><option value="desc">descending</option></select></div>');
		jQuery('select#sortby', el).val( sortopt[0] );
		jQuery('select#sortasc', el).val( sortopt[1] );
		jQuery('select', el).on( 'change', handleSortChange );
		var col = jQuery( '<div class="col-xs-4 text-right"></div>' )
			.appendTo( el );
		jQuery( '<button id="backup" class="btn btn-sm btn-primary">Back Up Lua</button>' )
			.on( 'click.luaview', handleBackupClick )
			.appendTo( col );
		jQuery( '<button id="reload" class="btn btn-sm btn-warning">Reload Luup</button>' )
			.on( 'click.luaview', handleReloadClick )
			.appendTo( col );
		list.append(el);

		var code = ( parseInt(ud.encoded_lua || 0) ? atob( ud.StartupCode ) : ud.StartupCode ) || "";
		el = jQuery('<div class="coderow row" />');
		el.attr('id', '__startup');
		el.append('<div class="scenename col-xs-12 col-md-3 col-lg-2">Startup Lua</div>');
		el.append('<div id="editorStartup" class="editor col-xs-12 col-md-9 col-lg-10" />');
		if ( ! window.ace ) {
			doTextArea( jQuery("div.editor", el), code );
		} else {
			jQuery( 'div.editor', el ).append( '<div class="luacode"/>' );
			doEditor( jQuery("div.luacode", el), code );
		}
		list.append(el);

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
			if ( undefined !== scenes[i].notification_only ) {
				continue;
			}
			el = jQuery('<div class="coderow row" />');
			el.attr('id', scenes[i].id);
			el.append('<div class="scenename col-xs-12 col-md-3 col-lg-2" />');
			var sn = (scenes[i].name || scenes[i].id) + ' (' + scenes[i].id + ')';
			if ( scenes[i].hidden ) {
				sn += " (hidden)";
			}
			jQuery('div.scenename', el).text( sn );
			el.append('<div id="editor' + scenes[i].id + '" class="editor col-xs-12 col-md-9 col-lg-10" />');
			code = ( parseInt( scenes[i].encoded_lua || 0 ) ? atob( scenes[i].lua ) : scenes[i].lua ) || "";
			if ( ! window.ace ) {
				doTextArea( jQuery("div.editor", el), code );
			} else {
				jQuery( 'div.editor', el ).append( '<div class="luacode"/>' );
				doEditor( jQuery("div.luacode", el), code );
			}
			list.append(el);
		}
	}

	function handleSortChange() {
		var sortby = jQuery('select#sortby').val();
		var sortasc = jQuery('select#sortasc').val();
		var sort = sortby + "," + sortasc;
		api.setDeviceStatePersistent( api.getCpanelDeviceId(), serviceId, "Sort", sort );
		updateDisplay( sort );
	}

	function waitForAce( since ) {
		var s = api.getDeviceState( api.getCpanelDeviceId(), serviceId, "LoadACE" ) || "1";
		if ( "0" == s || window.ace || ( Date.now() - since ) >= 5000 ) {
			updateDisplay();
			return;
		}
		setTimeout( function() { waitForAce( since ); }, 500 );
	}

	function doLua()
	{
		initModule();

		header();

		var html = '<div id="codelist">Loading... please wait...</div>';
		html += footer();
		api.setCpanelContent( html );

		waitForAce( Date.now() );
	}

	var logTask = false;
	var chunkSize = 250;

	function loadNextLogChunk( tries ) {
		if ( !logTab ) {
			console.log("Log tab no longer foreground; ignoring.");
			return;
		}
		tries = tries || 1;
		if ( tries > 10 ) return; /* give up */
		var container = jQuery( 'div#tblogdata' );
		var lastline = parseInt( container.data( 'lastline' ) || 0 );
		if ( isNaN(lastline) ) lastline = 0;
		// $( "div.tbloadstatus", container ).text( "Fetching log data" + ( lastline > 0 ? ( " after " + lastline ) : "" ) );
		jQuery.ajax( {
			url: api.getDataRequestURL() +
				"?id=lr_LuaView&action=log&first=" + String( lastline + 1 ) +
				"&count=" + chunkSize,
			dataType: "text",
			timeout: 15
		}).done( function( data ) {
			data = data.replace( /\r\n/g, "\n" ).replace( /\r/g, "\n" ).replace( /[\u2028\u2029]/g, "\n" );
			data = data.replace( /&/, "&amp;" ).replace( /[<]/g, "&lt;" ).replace( /[>]/g, "&gt;" );
			data = data.replace( /\x1b\[(\d+);1m(.*)\x1b\[0m/g, function( m, p1, p2 ) {
				var colors = { '30':'white', '31':'red', '32':'green', '33':'#c90',
							   '34':'blue', '35':'#f3f', '36':'#3ff', '37':'black' };
				return '<span style="color: ' + colors[p1] + '">' + p2 + '</span>';
			});
			data = data.replace( /\x1b\[1m(.*)\x1b\[0m/g, '<strong>$1</strong>' );
			data = data.replace( /\x1b\[4m(.*)\x1b\[0m/g, '<u>$1</u>' );
			data = data.replace( /\x1b\[7m(.*)\x1b\[0m/g, '<span style="background-color: white; color: black;">$1</span>' );
			/* Below skips tab, NL */
			data = data.replace( /[\x00-\x08\x0b-\x1f\x7f]/g, function( c ) {
				return '<span style="color: #999">&lt;0x' + c.charCodeAt(0).toString(16) + '&gt;</span>';
			});
			var nl = 0;
			if ( data.match( /^[\n\s]*$/ ) ) {
				console.log("Reached current EOF at " + lastline);
				logSeenEOF = true;
			} else {
				/* Count lines */
				data.replace( /\n/g, function( w ) {
					nl = nl + 1;
				});
				logSeenEOF = false;
			}
			console.log("Received line count: " + nl );
			var ll = parseInt( container.data( 'lastline' ) || 0 );
			if ( nl > 0 ) {
				if ( ll === lastline ) {
					var $blk = jQuery( 'div#tblogdata pre' );
					ll += nl;
					container.data( 'lastline', ll ).attr( 'data-lastline', ll );
					$blk.append( data );
					logAtBottom = ( $(window).scrollTop() + $(window).height() ) > ( $blk.position().top + $blk.height() );
					console.log("data handler: logAtBottom = " + logAtBottom);
				}
			}
			if ( !logTask && ( logAtBottom || !logSeenEOF ) ) {
				logTask = window.setTimeout( function() {
					logTask = false;
					loadNextLogChunk( 0 );
				}, ( logSeenEOF && logAtBottom ) ? 2000 : 500 );
				$( "div.tbloadstatus", container ).text(
					logSeenEOF ? ( ll + " lines" + ( logAtBottom ? "; waiting for more..." : "" ) )
							   : ( ll + " so far, requesting more..." )
				);
			} else {
				console.log("Update not scheduled; logTask="+logTask+", logAtBottom="+logAtBottom+
					", logSeenEOF="+logSeenEOF);
				if ( logSeenEOF ) {
					$( "div.tbloadstatus", container ).text( ll + " lines displayed. Scroll to bottom to load more." );
				}
			}
		}).fail( function() {
			console.log( "Request failed... retrying" );
			$( "div.tbloadstatus", container ).text("Error... Luup may be reloading... retrying... " + String(tries));
			if ( !logTask ) {
				logTask = window.setTimeout( function () {
					logTask = false;
					loadNextLogChunk( tries+1 );
				}, 10000 );
			}
		});
	}

	function doLog()
	{
		initModule();

		header();

		var html = '<div><button id="rotatelogs" class="btn btn-sm btn-warning">Rotate Log File</button></div><div id="tblogdata"><div class="tbloadstatus">Loading... please wait...</div><pre/><div class="tbloadstatus"/></div>';
		html += footer();
		api.setCpanelContent( html );

		logTab = true;
		logSeenEOF = false;

		$(window).scroll(function() {
			if ( logTab ) {
				// logAtBottom = ( $(window).scrollTop() + $(window).height() ) > ( $(document).height() - 108 );
				// Bottom of scroll window > bottom of <pre> block
				var $blk = jQuery( 'div#tblogdata pre' );
				logAtBottom = ( $(window).scrollTop() + $(window).height() ) > ( $blk.position().top + $blk.height() );
				console.log("scroll handler: logAtBottom = " + logAtBottom);
				if ( logAtBottom ) {
					if ( !logTask ) {
						loadNextLogChunk( 0 );
					}
				}
			}
		});

		jQuery( 'div#tblogdata' ).data( 'lastline', 0 ).attr( 'data-lastline', 0 );
		loadNextLogChunk( 0 );

		jQuery( 'button#rotatelogs' ).on( 'click.lauview', function( ev ) {
			var $el = jQuery( ev.target );
			$el.prop( 'disabled', true );
			if ( logTask ) {
				clearTimeout( logTask );
				logTask = false;
			}
			$( 'div.tbloadstatus' ).text( "Please wait... requesting log rotation..." );
			$( 'div#tblogdata pre').empty();
			$( 'div#tblogdata' ).data( 'lastline', 0 ).attr( 'data-lastline', 0 );
			jQuery.ajax({
				url: api.getDataRequestURL,
				data: {
					id: "lr_LuaView",
					action: "rotatelogs"
				},
				dataType: "text",
				timeout: 30
			}).always( function() {
				$el.prop( 'disabled', false );
				loadNextLogChunk( 0 );
			});
		});
	}

	function doDonate()
	{
		api.setCpanelContent('<p>If you find LuaView useful, please consider <a href="https://www.toggledbits.com/donate" target="_blank">making a small donation</a> toward its ongoing support! I am grateful for any support you give!</p>');
	}

	myModule = {
		initModule: initModule,
		onBeforeCpanelClose: onBeforeCpanelClose,
		doLua: function() { try { doLua(); } catch (ex) { console.log(ex); alert(ex); } },
		doLog: function() { try { doLog(); } catch (ex) { console.log(ex); alert(ex); } },
		doDonate: doDonate
	};
	return myModule;
})(api, $);
