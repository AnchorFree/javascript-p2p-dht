var myId = uuid.v4();

var peer = new Peer(myId, {
    key : 'gm6cty1w0ptrcnmi',

    // Set highest debug level (log everything!).
    debug : 3,

    // Set a logging function:
    logFunction : function() {
        var copy = Array.prototype.slice.call(arguments).join(' ');
        $('#log').append(copy + '<br>');
    },

    // Use a TURN server for more network support
    config : {
        'iceServers' : [{
            url : 'stun:stun.l.google.com:19302'
        }]
    } /* Sample servers, please use appropriate ones */
});

var p2pEngine = new P2P.Protocol({
    pid : myId
});

p2pEngine.on('peer_discovered', function(e) {
    if (e.connectedPeerCount < 3 && !p2pEngine.connectedPeers.hasOwnProperty(e.key)) {
        connectToPeer(e.key);
    }
});

var syncEngine = new P2P.Overlays.Sync(p2pEngine);

var tracker = peer.connect('TRACKER1');

peer.on('connection', function(dataConnection) {
    dataConnection.on('open', function() {
        p2pEngine.raiseIncomingConnection(dataConnection.peer, function(data) {
            dataConnection.send(data);
        });

        dataConnection.on('data', function(data) {
            p2pEngine.raiseIncomingData(dataConnection.peer, data);
        });

        dataConnection.on('close', function() {
            p2pEngine.raiseDropConnection(dataConnection.peer);
        });

        dataConnection.on('error', function(err) {
            // Do something...
        });
    });
});

tracker.on('open', function() {
    P2P.Util.log('Connected to tracker. Requesting bootstrap.');

    tracker.send('bootstrap');
});

tracker.on('data', function(data) {
    P2P.Util.log('Received bootstrap. ' + data);

    if ( data instanceof Array) {
        data.forEach(function(element) {
            connectToPeer(element);
        });
    } else {
        P2P.Util.log('No bootstrap received.  Retry in 10 seconds');
    }

    /*setInterval(function() {
     if (connectedPeers.length === 0) {
     tracker.send('bootstrap');
     }
     }, 10000);*/
});

window.onunload = window.onbeforeunload = function(e) {
    if (!!peer && !peer.destroyed) {
        peer.destroy();
    }
};

function connectToPeer(peerConnId, onConnect) {
    var tmp;

    if (myId !== peerConnId) {
        P2P.Util.log('Connecting to peer : ' + peerConnId);

        tmp = peer.connect(peerConnId, {
            label : 'peer'
        });

        tmp.on('open', function() {
            p2pEngine.raiseIncomingConnection(tmp.peer, function(data) {
                tmp.send(data);
            });

            tmp.on('data', function(data) {
                p2pEngine.raiseIncomingData(tmp.peer, data);
            });

            tmp.on('close', function() {
                p2pEngine.raiseDropConnection(tmp.peer);
            });

            tmp.on('error', function(err) {
                // Do something...
            });

            if ( typeof onConnect === 'function') {
                onConnect(tmp);
            } else if ( typeof onConnect === 'object') {
                tmp.send(onConnect);
            }
        });
    }
}

function put(key, value) {
    dataCache[key] = value;
}

function get(key) {
    // Do we have it locally?
    if (dataCache.hasOwnProperty(key)) {
        return dataCache[key];
    }

    // Do I know of a peer that is closer to this key?
    var neighbor = peerMap.nearestPeer(key);

    connectedPeers[neighbor[1]].send({
        q : 'find_peer',
        id : key
    });
}

function maintenance() {
    var myParsedId = uuid.parse(myId), nearest;

    /*if (Object.keys(connectedPeers).length < 4) {
     P2P.Util.log('Rebalancing failed. No enough peers.  Attempting to bootstrap again.');

     tracker.send('bootstrap');
     }*/

    P2P.Util.log('Rebalancing.');

    for (var key in dataCache) {
        // Find peer that is closest to the key in question

        var x = Object.keys(peerMap.verifiedPeers).map(function(x) {
            return [x, peerMap.config.distanceCalc(uuid.parse(x), uuid.parse(key))];
        });

        // Add ourself as a peer in case we are the closest
        x.unshift([myId, peerMap.config.distanceCalc(myParsedId, uuid.parse(key))]);

        nearest = x.sort(function (a, b) { return a[1]>b[1]; })[0][0];

        if (nearest !== myId) {
            P2P.Util.log('Sending key ' + key + ' to ' + peerMap.verifiedPeers[nearest].peerId);

            if ( typeof connectedPeers[peerMap.verifiedPeers[nearest].peerId] === 'undefined') {
                delete connectedPeers[peerMap.verifiedPeers[nearest].peerId];
            } else {
                connectedPeers[peerMap.verifiedPeers[nearest].peerId].send({
                    q : 'store',
                    id : key,
                    value : dataCache[key]
                });
            }
        }
    }
}

//setInterval(maintenance, 10000);

 setInterval(function() {
     var container = $('#data tbody'), cache = [];

     container.empty();

     for (var key in syncEngine.dataCache) {
         if (syncEngine.dataCache.hasOwnProperty(key)) {
            cache.push('<tr><td>' + key + '</td><td>' + syncEngine.dataCache[key] + '</td></tr>');
         }
     }

     container.append(cache);
 }, 1000);


setInterval(function() {
    var container = $('#peers tbody'), cache = [];

    container.empty();

    for (var key in p2pEngine.connectedPeers) {
        if (p2pEngine.connectedPeers.hasOwnProperty(key)) {
            cache.push('<tr><td>' + p2pEngine.connectedPeers[key].peerId + '</td></tr>');
        }
    }

    container.append(cache);
}, 1000);
