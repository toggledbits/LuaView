# LuaView #

A plugin for Vera Home Automation Controllers that makes scene Lua editable in a single location.

Vera's UI7 only lets you see scene Lua in the scene editor, and it's several clicks deep within it. Not very convenient. This plugin brings all the Lua onto a single page, where it's easier to see all of it. Editing is possible in place, and changes are saved immediately. The field will turn red when flagged "dirty" (modified), and will return to normal color when the background save process has completed.

In theory, this could be a Lua-less plugin itself--the entire implementation in the JavaScript UI. I almost got away with it, but there does not seem to be a clean, supportable way to write the startup Lua from Vera's JavaScript API, so I chose to implement a request handler in the plugin implementation to make the "save" in Lua. It works fine.

Note that some older versions of firmware cause Luup reloads or are slow to load user_data, and this can cause JavaScript runtime errors when you try to bring up the UI. Don't sweat it. Just give the system a minute to settle down, then go back into LuaView and everything should be fine.
