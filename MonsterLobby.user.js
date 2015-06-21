
console.log("Initializing lobby script...");

var lobbyScriptVersion = '3.1.4';

//var server_address = 'http://localhost:3900';
var server_address = 'http://188.166.36.23:3900';

var lobbyRun = function ($) {
    
    
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
        GreaseMonkeyRequester.prototype.request = function (url, data, timeout, callback, fail) {
            this.isrequesting = true;
            var self = this;
            GM_xmlhttpRequest({
                method: "POST",
                url: url,
                data: data,
                timeout: timeout,
                headers: {
                    "Content-Type": "application/json"
                },
                onload: function (response) {
                    callback(response.responseText);
                    self.isrequesting = false;
                },
                ontimeout: function (response) {
                    fail(response);
                    self.isrequesting = false;
                },
                onerror: function (response) {
                    fail(response);
                    self.isrequesting = false;
                },
            });
        };
        return GreaseMonkeyRequester;
    })();
    var XMLHttpRequester = (function () {
        function XMLHttpRequester() {
            this.isrequesting = false;
        }
        XMLHttpRequester.prototype.request = function (url, data, timeout, callback, fail) {
            this.isrequesting = true;
            var self = this;
            var xmlhttp = new XMLHttpRequest();
            xmlhttp.onload = function () {
                self.isrequesting = false;
                if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
                    callback(xmlhttp.responseText);
                }
            };
            xmlhttp.timeout = timeout;
            xmlhttp.onerror = function () {
                self.isrequesting = false;
                fail(xmlhttp);
            };
            xmlhttp.ontimeout = function () {
                self.isrequesting = false;
                fail(xmlhttp);
            };
            xmlhttp.open("POST", url, true);
            xmlhttp.setRequestHeader("Content-Type", "application/json");
            xmlhttp.send(data);
        };
        return XMLHttpRequester;
    })();
    var PollenClient = (function () {
        function PollenClient(requester) {
            this.interval = null;
            this.packets = [];
            this.domain = '/pollen/';
            this.internalEvents = {};
            this.connected = false;
            this.reconnecting = false;
            Emitter(this.internalEvents);
            this.requester = requester;
            this.socketId = this.randomStr(16);
            var self = this;
            self.on('connect', function (data) {
                self.setSocketInterval(data.delay);
                self.reconnecting = false;
                self.connected = true;
            });
            self.on('reinterval', function (data) {
                self.setSocketInterval(data.delay);
            });
        }
        PollenClient.prototype.addPacket = function (event, data) {
            this.packets.push({ event: event, data: data });
        };
        PollenClient.prototype.emit = function (event, data) {
            if (!this.connected)
                return;
            this.packets.push({ event: event, data: data });
        };
        PollenClient.prototype.on = function (event, callback) {
            this.internalEvents.on(event, callback);
        };
        PollenClient.prototype.received = function (body) {
            var packets;
            if (typeof body == "string") {
                packets = JSON.parse(body);
            }
            else {
                packets = body;
            }
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
            if (this.requester.isrequesting) {
                return;
            }
            var url = this.url;
            var body = JSON.stringify(this.packets);
            this.packets = [];
            var self = this;
            var timeout = 10000;
            if (this.reconnecting == true || this.connected) {
                timeout = 0;
            }
            this.requester.request(this.url + this.domain + this.socketId, body, timeout, function (data) {
                self.received(data);
            }, function () {
                if (self.reconnecting == false) {
                    if (self.connected) {
                        self.internalEvents.emit('disconnect');
                        self.connected = false;
                    }
                    else {
                        self.internalEvents.emit('offline');
                    }
                }
                else {
                    self.packets = [];
                    self.addPacket('connect');
                    self.request();
                }
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
            this.packets = [];
            this.addPacket('connect');
            this.request();
        };
        PollenClient.prototype.reconnect = function () {
            this.reconnecting = true;
            this.packets = [];
            this.addPacket('connect');
            this.request();
        };
        return PollenClient;
    })();
    

    var lobbyList;
    var socket;
    
    var mustGameId;
    
    var getHeartBeatData = null;
    
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
        
        
        if (chat[0] && chat[0].scrollHeight) {
            var height = chat[0].scrollHeight;
            chat.scrollTop(height);
        }
    }
    
    
    
    
    function lobbyStart() {
        lobbyStart2(".page_background");
    }
    
    function lobbyStart2(page) {
        "use strict";
        console.log($);
        
        console.log("Loading Steam Monster Lobby...");
        
        $('body').append('<style>.lobbies button {\
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
			.systemStatsBar .stat , .gameStatsBar .stat {\
				display: table-cell;\
			}\
			.systemStatsBar .stat span, .gameStatsBar .stat span {\
				display:block;\
				margin-top:10px;\
			}\
			.chatmessage{\
			margin-top: 5px;\
			font-size:16px;\
			}\
			.chat .user {\
color: darkorange;\
}</style>');
        
        var steamId = window.g_steamID;
        var steamName = $('a.username').text().trim();
        
        console.log(steamId);
        console.log(steamName);
        
        
        
        var inject_elem = $(page); // use page here
        var injected = $('<div class="monsterlobby"></div>');
        inject_elem.prepend(injected);
        
        injected.attr("style" , 'width: 948px; color:black;margin-left:auto;margin-right:auto;border-bottom: 2px solid black;background-color: rgba(255,255,255,0.8); padding-bottom: 10px;font-family: "Press Start 2P","Lucida Console",Consolas,Arial;');
        
        injected.append('<div class="lobbyheader" style="text-align:center;padding-top:20px;padding-bottom:10px; border-bottom: 2px solid black;">MSG215 Botnet Lobbiers ' + lobbyScriptVersion + '</div>');
        
        injected.append('<div class="chatHeader" style="text-align:center;padding-top:20px;padding-bottom:0px;">Announcements</div>');
        
        lobbyList = $('<div class="lobbies" style="position:relative; padding-top: 10px;"></div>');
        injected.append(lobbyList);
        
        
        var chat = $('<div class="chat" style="border: 2px solid black; margin: 10px 10px 0px 10px;height:250px; position:relative;overflow-y: scroll;"></div>');
        console.log(chat);
        lobbyList.append(chat);
        
        injected.append('<div class="systemStatsHeader" style="text-align:center;padding-top:20px;color:Chocolate ;">System Stats</div>');
        var systemStatsBar = $('<div class="systemStatsBar" style="margin: 20px 0px; text-align:center;width:100%;display: table;"></div>');
        var status = '<div class="stat">System Status <span id="systemStatus">N/A</span></div>';
        status += '<div class="stat">Player Status <span id="playerStatus">N/A</span></div>';
        status += '<div class="stat">Total Players <span id="lobbyPlayerCount">N/A</span></div>';
        status += '<div class="stat">Ingame Players <span id="gamePlayerCount">N/A</span></div>';
        systemStatsBar.html(status);
        injected.append(systemStatsBar);
        
        
        injected.append('<div class="gameStatsHeader" style="text-align:center;color:Chocolate  ;">Game Stats</div>');
        var gameStatsBar = $('<div class="gameStatsBar" style="margin: 20px 0px; text-align:center;width:100%;display: table;"></div>');
        var newStatus = '<div class="stat">Current Room <span id="gameRoom">N/A</span></div>';
        newStatus += '<div class="stat">Lobby Wormholes <span id="gameWormholes">N/A</span></div>';
        newStatus += '<div class="stat">Lobby Like-News <span id="gameLNs">N/A</span></div>';
        newStatus += '<div class="stat">Lobby Players <span id="gamePlayers">N/A</span></div>';
        gameStatsBar.html(newStatus);
        injected.append(gameStatsBar);
        
        var statsBar = $('<div class="statsBar" style="margin: 5px 10px 10px 10px;"></div>');
        lobbyList.append(statsBar);
        
        
        socket = new PollenClient(new XMLHttpRequester());
        socket.socketId = steamId;
        
        var heartbeater;
        var beating = false;
        socket.on('connect', function (data) {
            console.log("connected");
            
            
            addChatMessage('SYSTEM', 'You are connected to the server.');
            
            // send user info
            socket.emit('hello', { id: steamId, name: steamName });
            $('#systemStatus').text("Online");
            
            
            socket.emit("heartbeat");
            
            if (beating) return;
            beating = true;
            
            console.log("Setting heartbeat");
            
            heartbeater = setInterval(function () {
                
                var hbdata = null;
                if (getHeartBeatData != null) {
                    hbdata = getHeartBeatData();
                }
                
                
                
                socket.emit("heartbeat", hbdata);
            }, 4000);
        });
        
        socket.on('disconnect', function () {
            addChatMessage('SYSTEM', 'Disconnected from server. Reconnected when server is available.');
            socket.reconnect();
            $('#systemStatus').text("Offline");
        });
        
        socket.on('offline', function () {
            addChatMessage('SYSTEM', 'Server unavailable at the moment. Reconnected when server is available.');
            socket.reconnect();
            $('#systemStatus').text("Offline");
        });
        
        console.log("Created lobby elements...");
        
        
        var lastHB = (new Date()).getTime();
        
        var playerStates = ["Waiting", "Selected", "Joining", "Loading", "Correct Room", "Wrong Room"];
        
        var helloOnce = false;
        
        var previousState = 0;
        
        getHeartBeatData = function () {
            return { gameid: getGameId() };
        }
        
        function isLeaveBar() {
            return $('.leaveBar').size() > 0;
        }
        
        function stateChanged(data) {
            previousState = data.state;
            console.log("STATE CHANGED " + previousState + " TO " + data.state);
            
            if (data.state == 4) {
                $('.leaveBar').remove();
                return;
            }
            
            if (previousState == 3 && data.state == 0) {
                $('.joinBar').remove();
                return;
            }
            
            if (data.state == 2) {
                addChatMessage("SYSTEM", "YOU ARE JOINING GAME: " + data.gameid);
                tryJoinGame(data.gameid);
            }
            
            if (data.state == 5) {
                
                if (isLeaveBar()) return;
                
                var leaveBar = $('<div class="leaveBar" style="height:30px; margin: 5px 30px 10px 10px;"><button id="leaveButton" style="width:100%;">You are in wrong game! You must leave, click this!</button></div>');
                
                lobbyList.append(leaveBar);
                
                $('#leaveButton').click(function () {
                    leaveCurrentGame();
                });
            }
            
            if (data.state == 0 && checkInGame()) {
                if (isLeaveBar()) return;

                var leaveBar = $('<div class="leaveBar" style="height:30px; margin: 5px 30px 10px 10px;"><button id="leaveButton" style="width:100%;">You better leave your game to join others, click this!</button></div>');
                
                lobbyList.append(leaveBar);
                
                $('#leaveButton').click(function () {
                    leaveCurrentGame();
                });
            }
            
            if (data.state == 3 && !checkInGame() && data.gameid != getGameId()) {
                addChatMessage("SYSTEM", "YOU ARE LATE TO JOIN THE GAME. ADDING BUTTON TO JOIN MANUALLY.");
                
                var joinBar = $('<div class="joinBar" style="height:30px; margin: 5px 30px 10px 10px;"><button id="joinButton" style="width:100%;">You are late, click to try manually join game ' + data.gameid + '</button></div>');
                lobbyList.append(joinBar);
                
                $('#joinButton').click(function () {
                    tryJoinGame(data.gameid);
                });
            }
            
            
            if (data.state == 3 && checkInGame()) {
                
                if (data.gameid != getGameId()) {
                    console.log(data.gameid);
                    console.log(getGameId());
                }
                else {
                    addChatMessage("SYSTEM", "CONGRATS YOU ARE IN CORRECT GAME.");
                }
				
            }
        }
        
        socket.on('hello', function (data) {
            console.log("Update received...");
            $('#lobbyPlayerCount').text(data.playerCount);
            $('#gamePlayerCount').text(data.playersInGame);
            
            $('#playerStatus').text(playerStates[data.state]);
            
            mustGameId = data.gameid;
            $('#gameRoom').text(data.gameid ? data.gameid : "N/A");
            
            $('#gameWormholes').text(data.wormholes ? data.wormholes : "N/A");
            $('#gameLNs').text(data.likenews ? data.likenews : "N/A");
            $('#gamePlayers').text(data.likenews ? data.brothers : "N/A");
            
            if (data.state != previousState) {
                stateChanged(data);
            }
            
            if (getGameId() == 0) {
                $('.leaveBar').remove();
            }
        });
        
        addChatMessage('SYSTEM', 'Initiating connection.');
        socket.connect(server_address);
        
        
        function getGameId() {
            if (typeof window.g_GameID !== "undefined") {
                return window.g_GameID;
            }
            
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
				{ 'gameid' : gameid, 'sessionid' : window.g_sessionID }
            ).done(function () {
                console.log("it is done");
                window.location.reload();
            });
        }
        
        
        
        socket.on('announce', function (data) {
            if (!data.message) return;
            addChatMessage(data.user, data.message);
        });
        
        var alreadyJoining = false;
        function tryJoinGame(gameId) {
            if (alreadyJoining) return;
            alreadyJoining = true;
            
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
            
            console.log(window.JoinGame);
            
            console.log("Joining the Game");
            
            window.JoinGame(gameId);
            var joinLoop = setInterval(function () {
                window.$J('div.btn_grey_white_innerfade.btn_medium').click();
                
                if (typeof window.g_GameID === 'undefined') {
                    addChatMessage("SYSTEM", "STILL NOT IN GAME, TRYING AGAIN");
                    console.log("Still not in game. Keep trying to enter the game...");
                }
                else {
                    addChatMessage("SYSTEM", "DONE!!!");
                    window.location.reload();
                    return;
                }
                
                
                window.JoinGame(gameId);
            }, 2000);
        }
        
        socket.on('leaveGame', function (data) {
            leaveCurrentGame();
        });
        
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
        return window.g_Minigame.m_CurrentScene;
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
        
        lobbyStart2(".pagecontent");
        
        
        
        var steamId = window.g_steamID;
        var gameId = window.g_GameID;
        
        console.log(steamId);
        console.log(gameId);
        
        getHeartBeatData = function () {
            
            var remaining_wormholes = getItemCount(ABILITIES.WORMHOLE);
            var remaining_likenew = getItemCount(ABILITIES.LIKE_NEW);
            
            return { wormholes: remaining_wormholes, likenews: remaining_likenew, gameid: gameId };

        }
    }
    
    //boilerplate greasemonkey to wait until jQuery is defined...
    var hasTower = window.location.href.indexOf('towerattack');
    console.log(hasTower);
    if (hasTower > -1) {
        console.log("game informer starting");
        // gameInformer();
    }
    else {
        console.log("Lobby UI starting");
        lobbyStart();
    }
};


function GM_wait() {
    if (typeof window.$J === 'undefined') {
        console.log("waiting");
        window.setTimeout(GM_wait, 100);
    }
    else {
        console.log("rocks");
        lobbyRun(window.$J);
    }
}
GM_wait();

console.log(window);
