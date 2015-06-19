// ==UserScript==
// @name Reddit Botnet Lobby
// @namespace https://github.com/wchill/steamSummerMinigame
// @description A script that joins the Steam Monster Minigame for you.
// @version 1.9.5
// @match *://steamcommunity.com/minigame*
// @match *://steamcommunity.com//minigame*
// @match *://steamcommunity.com/minigame/towerattack*
// @match *://steamcommunity.com//minigame/towerattack*
// @grant GM_xmlhttpRequest
// @grant GM_addStyle
// @grant unsafeWindow
// @updateURL https://raw.githubusercontent.com/codetorex/SteamMonsterLobby/master/public/MonsterLobby.user.js
// @downloadURL https://raw.githubusercontent.com/codetorex/SteamMonsterLobby/master/public/MonsterLobby.user.js
// @require     https://code.jquery.com/jquery-1.11.3.min.js
// ==/UserScript==

console.log("TESTINGGG");

//var server_address = 'http://localhost:3700';
var server_address = 'http://188.166.36.23:3700';
try {
    function Emitter(obj) {
        if (obj)
            return mixin(obj);
    }
    ;
    function mixin(obj) {
        for (var key in Emitter.prototype) {
            obj[key] = Emitter.prototype[key];
        }
        return obj;
    }
    Emitter.prototype.on = Emitter.prototype.addEventListener = function (event, fn) {
        this._callbacks = this._callbacks || {};
        (this._callbacks['$' + event] = this._callbacks['$' + event] || []).push(fn);
        return this;
    };
    Emitter.prototype.once = function (event, fn) {
        function on() {
            this.off(event, on);
            fn.apply(this, arguments);
        }
        on['fn'] = fn;
        this.on(event, on);
        return this;
    };
    Emitter.prototype.off = Emitter.prototype.removeListener = Emitter.prototype.removeAllListeners = Emitter.prototype.removeEventListener = function (event, fn) {
        this._callbacks = this._callbacks || {};
        // all
        if (0 == arguments.length) {
            this._callbacks = {};
            return this;
        }
        // specific event
        var callbacks = this._callbacks['$' + event];
        if (!callbacks)
            return this;
        // remove all handlers
        if (1 == arguments.length) {
            delete this._callbacks['$' + event];
            return this;
        }
        // remove specific handler
        var cb;
        for (var i = 0; i < callbacks.length; i++) {
            cb = callbacks[i];
            if (cb === fn || cb.fn === fn) {
                callbacks.splice(i, 1);
                break;
            }
        }
        return this;
    };
    Emitter.prototype.emit = function (event) {
        this._callbacks = this._callbacks || {};
        var args = [].slice.call(arguments, 1), callbacks = this._callbacks['$' + event];
        if (callbacks) {
            callbacks = callbacks.slice(0);
            for (var i = 0, len = callbacks.length; i < len; ++i) {
                callbacks[i].apply(this, args);
            }
        }
        return this;
    };
    Emitter.prototype.listeners = function (event) {
        this._callbacks = this._callbacks || {};
        return this._callbacks['$' + event] || [];
    };
    Emitter.prototype.hasListeners = function (event) {
        return !!this.listeners(event).length;
    };
    var GreaseMonkeyRequester = (function () {
        function GreaseMonkeyRequester() {
            this.isrequesting = false;
        }
        GreaseMonkeyRequester.prototype.request = function (url, data, callback) {
            this.isrequesting = true;
            var self = this;
            GM_xmlhttpRequest({
                method: "POST",
                url: url,
                data: data,
                headers: {
                    "Content-Type": "application/json"
                },
                onload: function (response) {
                    callback(response.responseText);
                    self.isrequesting = false;
                }
            });
        };
        return GreaseMonkeyRequester;
    })();
    var PollenClient = (function () {
        function PollenClient(requester) {
            this.interval = null;
            this.packets = [];
            this.domain = '/pollen/';
            this.internalEvents = {};
            Emitter(this.internalEvents);
            this.requester = requester;
            this.socketId = this.randomStr(16);
        }
        PollenClient.prototype.emit = function (event, data) {
            this.packets.push({ event: event, data: data });
        };
        PollenClient.prototype.on = function (event, callback) {
            this.internalEvents.on(event, callback);
        };
        PollenClient.prototype.received = function (body) {
            var packets = JSON.parse(body);
            for (var i = 0; i < packets.length; i++) {
                var s = packets[i];
                var eventName = s.event;
                var eventData = s.data;
                this.internalEvents.emit(eventName, eventData);
            }
        };
        PollenClient.prototype.randomStr = function (length) {
            var data = "0123456789abcdefghijklmnoprstqvxyz";
            var result = "";
            for (var i = 0; i < length; i++) {
                result += data.charAt(Math.round(Math.random() * data.length));
            }
            return result;
        };
        PollenClient.prototype.request = function () {
            var url = this.url;
            var body = JSON.stringify(this.packets);
            this.packets = [];
            var self = this;
            this.requester.request(this.url + this.domain + this.socketId, body, function (data) {
                self.received(data);
            });
        };
        PollenClient.prototype.setSocketInterval = function (delay) {
            var self = this;
            if (this.interval != null) {
                clearInterval(this.interval);
            }
            this.interval = setInterval(function () {
                self.request();
            }, delay);
        };
        PollenClient.prototype.connect = function (url) {
            this.url = url;
            var self = this;
            self.emit('connect');
            self.on('connect', function (data) {
                self.setSocketInterval(data.delay);
            });
            self.on('reinterval', function (data) {
                self.setSocketInterval(data.delay);
            });
            this.request();
        };
        return PollenClient;
    })();
    
    
    GM_addStyle('.lobbies button {\
				padding: 5px 10px;\
				background-color: #8AAF05;\
				font-family: "Press Start 2P",arial,sans-serif;\
				color: #D9FF54;\
				border: 2px solid rgb(163, 207, 6);\
				font-size: 12px;\
				text-align: center;\
				cursor: pointer;\
				display: inline-block;\
				box-shadow: 2px 2px 0px #000;\
				text-shadow: 1px 1px 0px rgba(0, 0, 0, 0.5);\
				margin-left: 10px;\
			}\
			.chat .user {\
color: darkorange;\
}');
    var lobbyList;
    var socket;
    
    var getHeartBeatData = null;
    
    function initBasics(page) {
        
        var steamId = unsafeWindow.g_steamID;
        var steamName = $('a.username').text().trim();
        
        console.log(steamId);
        console.log(steamName);
        
        socket = new PollenClient(new GreaseMonkeyRequester());
        socket.socketId = steamId;
        
        
        socket.on('connect', function (data) {
            console.log("connected");
            // send user info
            console.log(data);
            /*if ( !data.resuming )
				{*/
					socket.emit('hello', { id: steamId, name: steamName });
            //}
            
            socket.emit("heartbeat");
            setInterval(function () {
                
                var hbdata = null;
                if (getHeartBeatData != null) {
                    hbdata = getHeartBeatData();
                }
                
                socket.emit("heartbeat", hbdata);
            }, 4000);
        });
        
        socket.on('disconnect', function () {
            $('.monsterlobby').html('Disconnected');
        });
        
        
        var inject_elem = $(page); // use page here
        var injected = $('<div class="monsterlobby"></div>');
        inject_elem.prepend(injected);
        
        console.log(injected.css);
        injected.attr("style" , 'width: 948px; color:black;margin-left:auto;margin-right:auto;border-bottom: 2px solid black;background-color: rgba(255,255,255,0.4); padding-bottom: 10px;font-family: "Press Start 2P","Lucida Console",Consolas,Arial;');
        
        injected.append('<div class="lobbyheader" style="text-align:center;padding-top:20px;padding-bottom:10px; border-bottom: 2px solid black;">Reddit Botnet Lobbies</div>');
        
        lobbyList = $('<div class="lobbies" style="position:relative; padding-top: 10px;"></div>');
        injected.append(lobbyList);
        
        console.log("Created lobby elements...");
    }
    
    function initChat(data, showLeave) {
        if (typeof showLeave === 'undefined') {
            showLeave = true;
        }
        
        lobbyList.html('You are in [' + data.name + '] lobby. <span class="lobbystats">' + data.count + '/' + data.limit + '</span>');
        
        if (showLeave) {
            lobbyList.append('<button class="leave">Leave</button>');
        }
        
        var chat = $('<div class="chat" style="border: 2px solid black; margin: 10px 10px 0px 10px;height:250px; position:relative;overflow-y: scroll;"></div>');
        lobbyList.append(chat);
        
        var chatBar = $('<div class="chatBar" style="height:30px; margin: 5px 10px 10px 10px;"></div>');
        lobbyList.append(chatBar);
        
        var chatTextBox = $('<input type="text" maxlength="160" id="chatText" style="width:839px;height:100%; color: black;font-family: \'Press Start 2P\',arial,sans-serif;"></input>');
        chatBar.append(chatTextBox);
        
        var chatButton = $('<button id="chatButton">Send</button>');
        chatBar.append(chatButton);
        
        var statsBar = $('<div class="statsBar" style="margin: 5px 10px 10px 10px;"></div>');
        lobbyList.append(statsBar);
        
        
        function sendChat() {
            var tbox = $(lobbyList).find('#chatText');
            var msg = tbox.val();
            socket.emit('chat', { message: msg });
            tbox.val('');
        }
        
        $(lobbyList).find('#chatButton').click(function () {
            sendChat();
        });
        
        $(lobbyList).find('#chatText').keyup(function (e) {
            if (e.keyCode == 13) {
                sendChat();
            }
        });
        
        if (showLeave) {
            var leaveButton = $(lobbyList).find('.leave');
            leaveButton.off('click');
            
            leaveButton.click(function () {
                console.log("leaving lobby");
                socket.emit('leaveLobby');
            });
        }
    }
    
    var lobbyGameId = 0;
    
    function lobbyStart($) {
        lobbyStart2($, ".page_background");
    }
    
    function lobbyStart2($, page) {
        "use strict";
        console.log($);
        
        console.log("Loading Steam Monster Lobby...");
        
        initBasics(page);
        
        var lastHB = (new Date()).getTime();
        
        socket.on('hello', function (data) {
            console.log("player joined to server");
            if (data.alreadyInLobby) {
                joinedLobby(data);
            }
            else {
                updateLobbies(data);
            }
        });
        
        socket.connect(server_address);
        
        function joinedLobby(data) {
            console.log(data);
            lobbyGameId = data.gameid;
            var stat = $(lobbyList).find('.lobbystats');
            var statBar = $(lobbyList).find('.statsBar');
            if ($('.chat').size() > 0) {
                stat.text(data.count + '/' + data.limit);
                
                if ("wormholes" in data && "likenews" in data) {
                    statBar.text('Total Wormholes: ' + data.wormholes + '  Total Like-News:' + data.likenews);
                }
                return;
            }
            
            initChat(data);
            
            if (data.state == 1) {
                addChatMessage("SYSTEM", "THIS LOBBY IS JOINING GAME: " + data.gameid);
                tryJoinGame(data.gameid);
            }
            
            if (data.state == 2 && !checkInGame() && data.gameid != getGameId()) {
                addChatMessage("SYSTEM", "YOU ARE LATE TO JOIN THE GAME. ADDING BUTTON TO JOIN MANUALLY.");
                
                var joinBar = $('<div class="joinBar" style="height:30px; margin: 5px 30px 10px 10px;"><button id="joinButton" style="width:100%;">You are late, click to try manually join game ' + data.gameid + '</button></div>');
                lobbyList.append(joinBar);
                
                $('#joinButton').click(function () {
                    tryJoinGame(data.gameid);
                });
            }
            
            if (checkInGame()) {
                
                if (data.gameid != getGameId()) {
                    
                    console.log(data.gameid);
                    console.log(getGameId());
                    
                    
                    
                    var leaveBar = $('<div class="leaveBar" style="height:30px; margin: 5px 30px 10px 10px;"><button id="leaveButton" style="width:100%;">You are in game ' + getGameId() + '! You must leave, click this!</button></div>');
                    lobbyList.append(leaveBar);
                    
                    $('#leaveButton').click(function () {
                        leaveCurrentGame();
                    });
                }
                else {
                    addChatMessage("SYSTEM", "CONGRATS YOU ARE IN GAME OF THIS LOBBY: " + data.gameid);
                }
				
            }
        
        }
        
        function getGameId() {
            var gameid = $("head").html().match(/\'current_gameid\' : \'(.+)\' },/)[1];
            return gameid;
        }
        
        function checkInGame() {
            if (getGameId() == '0') return false;
            
            return true;
        }
        
        
        
        var leavingGame = false;
        function leaveCurrentGame() {
            if (leavingGame) return;
            leavingGame = true;
            
            var gameid = getGameId();
            
            $.post(
                'http://steamcommunity.com/minigame/ajaxleavegame/',
				{ 'gameid' : gameid, 'sessionid' : unsafeWindow.g_sessionID }
            ).done(function () {
                console.log("it is done");
                unsafeWindow.location.reload();
            });
        }
        
        function updateLobbies(data) {
            console.log("lobbies received");
            lobbyList.empty();
            
            var lobbies = data.lobbies;
            
            console.log(data);
            console.log(lobbies);
            if (lobbies.length == 0) {
                lobbyList.text("no lobbies found yet");
            }
            
            for (var i = 0; i < lobbies.length; i++) {
                var curLobby = lobbies[i];
                
                var lobbyStateText;
                var lobbyColor;
                var hasJoinButton;
                switch (curLobby.state) {
                    case 0:
                        lobbyStateText = "Waiting for players";
                        lobbyColor = "yellow";
                        break;
								
                    case 1:
                        lobbyStateText = "Joining a game";
                        lobbyColor = "red";
                        break;
								
                    case 2:
                        lobbyStateText = "Game in progress";
                        lobbyColor = "green";
                        break;
                }
                
                
                
                lobbyList.append('<div class="lobby" data-id="' + curLobby.id + '" style="padding: 10px 20px;">' + curLobby.name + '<span class="state" style="margin-left:20px; color: ' + lobbyColor + ';">[' + lobbyStateText + ']</span>' 
                    + '<span class="lobbystats" style="right:0; position:absolute;padding-right:20px">' + curLobby.count + '/' + curLobby.limit + '<button>Join</button></span></div>')
            }
            
            console.log($(lobbyList).find('.lobby'));
            try {
                $(lobbyList).find('.lobby').each(function () {
                    console.log("LOLOLO");
                    var button = $(this).find('button');
                    console.log(button);
                    button.off('click');
                    var lobbyId = $(this).attr('data-id');
                    console.log(lobbyId);
                    button.click(function () {
                        console.log('sending join request');
                        socket.emit('joinLobby', { id: lobbyId });
                    });
                });
            }
				catch (e) {
                console.log(e);
            }
        }
        
        socket.on('updateLobbies', updateLobbies);
        
        socket.on('joinedLobby', joinedLobby);
        
        function addChatMessage(user, message) {
            var chat = $('.lobbies .chat');
            console.log(chat);
            
            // allow max 
            var curSize = chat.children().size();
            var removeCount = curSize - 50;
            if (removeCount > 0) {
                var selector = '.chatmessage:lt(' + removeCount + ')';
                console.log(selector);
                chat.find(selector).remove();
            }
            
            
            var chatObj = $('<div class="chatmessage"><span class="user">' + user + ' </span>' + message + '</div>');
            chat.append(chatObj);
            
            var height = chat[0].scrollHeight;
            chat.scrollTop(height);
        }
        
        socket.on('chat', function (data) {
            if (!data.message) return;
            addChatMessage(data.user, data.message);
        });
        
        function tryJoinGame(gameId) {
            
            addChatMessage("SYSTEM", "TRYING TO JOIN GAME: " + gameId);
            
            if (checkInGame()) {
                if (getGameId() == gameId) {
                    addChatMessage("SYSTEM", "CONGRATS! YOU ALREADY IN " + gameId);
                    return;
                }
                
                addChatMessage("SYSTEM", "YOU ARE IN ANOTHER GAME LEAVING IT");
                leaveCurrentGame();
                return;
            }
            
            console.log(unsafeWindow.JoinGame);
            
            console.log("Joining the Game");
            
            unsafeWindow.JoinGame(gameId);
            var joinLoop = setInterval(function () {
                unsafeWindow.$J('div.btn_grey_white_innerfade.btn_medium').click();
                
                if (typeof unsafeWindow.g_GameID === 'undefined') {
                    addChatMessage("SYSTEM", "STILL NOT IN GAME, TRYING AGAIN");
                    console.log("Still not in game. Keep trying to enter the game...");
                }
                else {
                    addChatMessage("SYSTEM", "DONE!!!");
                    unsafeWindow.location.reload();
                    return;
                }
                
                
                unsafeWindow.JoinGame(gameId);
            }, 2000);
        }
        
        socket.on('joinGame', function (data) {
            // keep banging doors of fortress steam
            var gameId = data.id;
            
            tryJoinGame(gameId);
        });
        
        /*sendButton.onclick = sendMessage = function () {
            var text = field.value;
            socket.emit('chat', { message: text });
            field.value = "";
        };*/

    }
    
    function s() {
        return unsafeWindow.g_Minigame.m_CurrentScene;
    }
    
    
    var ABILITIES = {
        FIRE_WEAPON: 1,
        CHANGE_LANE: 2,
        RESPAWN: 3,
        CHANGE_TARGET: 4,
        MORALE_BOOSTER: 5,
        GOOD_LUCK_CHARMS: 6,
        MEDICS: 7,
        METAL_DETECTOR: 8,
        DECREASE_COOLDOWNS: 9,
        TACTICAL_NUKE: 10,
        CLUSTER_BOMB: 11,
        NAPALM: 12,
        RESURRECTION: 13,
        CRIPPLE_SPAWNER: 14,
        CRIPPLE_MONSTER: 15,
        MAX_ELEMENTAL_DAMAGE: 16,
        RAINING_GOLD: 17,
        CRIT: 18,
        PUMPED_UP: 19,
        THROW_MONEY_AT_SCREEN: 20,
        GOD_MODE: 21,
        TREASURE: 22,
        STEAL_HEALTH: 23,
        REFLECT_DAMAGE: 24,
        FEELING_LUCKY: 25,
        WORMHOLE: 26,
        LIKE_NEW: 27
    };
    
    function getItemCount(itemId) {
        for (var i = 0; i < s().m_rgPlayerTechTree.ability_items.length; ++i) {
            var abilityItem = s().m_rgPlayerTechTree.ability_items[i];
            if (abilityItem.ability == itemId) {
                return abilityItem.quantity;
            }
        }
        return 0;
    }
    
    
    function gameInformer($) {
        "use strict";
        console.log($);
        
        console.log("Game join informer start...");
        
        lobbyStart2($, ".pagecontent");
        
        
        
        var steamId = unsafeWindow.g_steamID;
        var gameId = unsafeWindow.g_GameID;
        
        console.log(steamId);
        console.log(gameId);
        
        getHeartBeatData = function () {
            if (gameId == lobbyGameId) {
                var remaining_wormholes = getItemCount(ABILITIES.WORMHOLE);
                var remaining_likenew = getItemCount(ABILITIES.LIKE_NEW);
                
                return { wormholes: remaining_wormholes, likenews: remaining_likenew, gameid: gameId };
            }
            else {
                return { gameid: gameId };
            }
        }
        
        socket.connect(server_address);
    }
    
    (function () {
        //boilerplate greasemonkey to wait until jQuery is defined...
        function GM_wait() {
            if (typeof window.jQuery === 'undefined') {
                console.log("waiting");
                window.setTimeout(GM_wait, 100);
            }
            else {
                console.log("rocks");
                var hasTower = window.location.href.indexOf('towerattack');
                console.log(hasTower);
                if (hasTower > -1) {
                    console.log("game informer starting");
                    gameInformer(window.jQuery);
                }
                else {
                    console.log("Lobby UI starting");
                    lobbyStart(window.jQuery);
                }
            }
        }
        GM_wait();
        
        console.log(window);

    })();

}
catch (e) {
    console.log(e);
}