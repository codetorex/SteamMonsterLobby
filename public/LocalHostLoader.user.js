// ==UserScript==
// @name LOCALHOST LOADER
// @namespace https://github.com/codetorex/SteamMonsterLobby
// @description A script that runs the Steam Monster Minigame for you.  Now with megajump.  Brought to you by the Ye Olde Wormhole Schemers and DannyDaemonic
// @version 5.0.2
// @match *://steamcommunity.com/minigame*
// @match *://steamcommunity.com//minigame*
// @match *://steamcommunity.com/minigame/towerattack*
// @match *://steamcommunity.com//minigame/towerattack*
// @grant       GM_xmlhttpRequest
// ==/UserScript==

(function (x) {
    
    // Options
    var script_url = 'http://localhost:3900/script';
    var loader_version = '5.0.2';
    
    // Load the actual script
    GM_xmlhttpRequest({
        method: "GET",
        url: script_url,
        onload: function (response) {
            var scriptElement = document.createElement("script");
            scriptElement.type = "text/javascript";
            scriptElement.innerHTML = response.responseText;
            document.body.appendChild(scriptElement);
        }
    });
    
}(window));
