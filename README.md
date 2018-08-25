# LuaView #

A plugin for Vera Home Automation Controllers that makes scene Lua editable in a single location.

Vera's UI7 only lets you see scene Lua in the scene editor, and it's several clicks deep within it. Not very convenient. This plugin brings all the Lua onto a single page, where it's easier to see all of it. Editing is possible in place, and changes are saved immediately. The field will turn red when flagged "dirty" (modified), and will return to normal color when the background save process has completed.

In theory, this could be a Lua-less plugin itself--the entire implementation in the JavaScript UI. I almost got away with it, but there does not seem to be a clean, supportable way to write the startup Lua from Vera's JavaScript API, so I chose to implement a request handler in the plugin implementation to make the "save" in Lua.

## Troubleshooting and Known Issues ##

Some older versions of firmware/UI cause unannounced Luup reloads or are slow to load `userdata`, and this can cause JavaScript runtime errors when you try to enter LuaView. Don't sweat it. Just go back to the dashboard, give the system a few seconds to settle down, then go back into LuaView and everything should be fine. 

LuaView is very dependent on two-way communication with the Vera when editing scenes, so if the Vera isn't responding at the moment LuaView attempts to load or save a scene, you'll get a message to that effect. Just make a nonsense change (like add trailing spaces, which LuaView then removes anyway) and tab out of the field to trigger another save attempt.

LuaView doesn't check syntax. Be very careful editing Startup Lua in particular. There be monsters there.

Remember that *all* scene Lua must end with a `return` statement returning a boolean value (*true* or *false*). Even if you just add a comment as the entire Lua, you need a return statement, or your scenes may behave unpredictably. For clarity, returning *true* tells Luup to continue running the scene, and *false* tells Luup not to run the scene. Since the scene Lua runs before the scene's device actions, this effectively gives you a last chance to keep the scene from running if you need to (e.g. don't turn on lights at night).