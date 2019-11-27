# LuaView #

A plugin for Vera Home Automation Controllers that makes scene Lua editable in a single location.

Vera's UI7 only lets you see scene Lua in the scene editor, and it's several clicks deep within it. Not very convenient. This plugin brings all the Lua onto a single page, where it's easier to see all of it. Editing is possible in place, and changes are saved immediately. The field will turn red when flagged "dirty" (modified), and will return to normal color when the background save process has completed.

In theory, this could be a Lua-less plugin itself--the entire implementation in the JavaScript UI. I almost got away with it, but there does not seem to be a clean, supportable way to write the startup Lua from Vera's JavaScript API, so I chose to implement a request handler in the plugin implementation to make the "save" in Lua.

## Troubleshooting and Known Issues ##

Some older versions of Vera firmware/UI cause unannounced Luup reloads or are slow to load `userdata`, and this can cause JavaScript runtime errors when you try to enter LuaView. Don't sweat it. Just go back to the dashboard, give the system a few seconds to settle down, then go back into LuaView and everything should be fine. 

LuaView is very dependent on two-way communication with the Vera or openLuup host when editing scenes, so if the host isn't responding at the moment LuaView attempts to load or save a scene, you'll get a message to that effect. Just make a nonsense change (like add trailing spaces, which LuaView then removes anyway) and click out of the field to trigger another save attempt.

Remember that if your return boolean *false* from scene Lua, no other actions in the scene will run (this is a feature).

If you are copy-pasting Lua from the forums or through other editors, the quotation marks in the code can get mangled from the "programmer's quotes" to "pretty quotes". This is particularly true on Macs, and using various editors on mobile devices. If your code won't pass/run and you can't figure out why, always check your quotes.

Also, if you're snagging code from the forums, there's a widespread and ongoing error in many code fragments that has huge potential to cause you grief. Read about it here: https://community.getvera.com/t/the-allow-meme-in-scene-scripts-must-die/210048
