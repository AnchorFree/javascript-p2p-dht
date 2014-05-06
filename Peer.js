    var myId = uuid.v4(), myConn;
    var connectedPeers = {};
    var dataCache = {};

    var peer = new Peer(null, {
        key: 'gm6cty1w0ptrcnmi',

        // Set highest debug level (log everything!).
        debug: 3,

        // Set a logging function:
        logFunction: function() {
            var copy = Array.prototype.slice.call(arguments).join(' ');
            $('#log').append(copy + '<br>');
        },

        // Use a TURN server for more network support
        config: {'iceServers': [
            { url: 'stun:stun.l.google.com:19302' }
        ]} /* Sample servers, please use appropriate ones */
    });

    var peerMap = new P2P.PeerMap(myId);
    var tracker = peer.connect('TRACKER', { metadata: { id: myId }});

    peer.on('open', function(id) {
        P2P.Util.log('Connected established as ' + id + ' with id ' + myId);

        myConn = id;
    });

    peer.on('connection', handlePeer);

    function handlePeer(conn) {
        P2P.Util.log('Connection from : ' + conn.peer);

        if (conn.label === 'peer') {
            connectedPeers[conn.peer] = conn;

            conn.on('data', function (data) {
                P2P.Util.log('Data from : ' + conn.peer + ' : ' + JSON.stringify(data));

                if (typeof data === 'object') {
                    if (data.hasOwnProperty('q')) {
                        if (data.q === 'ping') {
                            peerMap.peerFound(data.id, undefined, conn.peer);

                            conn.send({q: 'pong', id: myId});
                        } else if (data.q === 'pong') {
                            peerMap.peerFound(data.id, undefined, conn.peer);

                            // Peer verified... announce it to my other peers (except itself)
                            for (var property in peerMap.verifiedPeers) {
                                if (peerMap.verifiedPeers.hasOwnProperty(property)) {
                                    if (typeof connectedPeers[peerMap.verifiedPeers[data.id].peerId] === 'undefined') {
                                        peerMap.peerFailed(peerMap.verifiedPeers[data.id].peerId, 'ProbablyOffline');

                                        delete connectedPeers[peerMap.verifiedPeers[data.id].peerId];
                                    } else {
                                        connectedPeers[peerMap.verifiedPeers[data.id].peerId].send({q: 'announce_peer', id: data.id, conn: conn.peer });
                                    }
                                }
                            }
                        } else if (data.q === 'find_peer') {
                            // Do I have this key?
                            if (dataCache.hasOwnProperty(data.id)) {
                                P2P.Util.log('Data found for key ' + data.id);

                                conn.send({q: 'peer_found', data: dataCache[data.id]});
                            } else {
                                // Do I know of a peer that is closer to this key?
                                var neighbor = peerMap.nearestPeer(data.id);

                                P2P.Util.log('Redirecting to peer ' + neighbor[1]);
                                conn.send({q: 'peer_found', id: data.id, redirect: neighbor[1]});
                            }
                        } else if (data.q === 'peer_found') {
                            if (data.hasOwnProperty('redirect')) {
                                connectToPeer(data.redirect, {q: 'find_peer', id: data.id });
                            } else if (data.hasOwnProperty('data')) {
                                // Data found!
                                P2P.Util.log('Data found: ' + data.data);
                            } else {
                                P2P.Util.log('Data not found anywhere on the network');
                            }
                        } else if (data.q === 'announce_peer') {
                            // Do I have any keys that are closer to the new peer?
                            peerMap.peerFound(data.id, conn.peer, conn.peer);

                            if (Object.keys(connectedPeers).length < 3) {
                                // Connect to the peer
                                connectToPeer(data.conn, {q: 'ping', id: myId});
                            }
                        } else if (data.q === 'store') {
                            put(data.id, data.value);

                            conn.send({q: 'store_verified', id: data.id });
                        } else if (data.q === 'store_verified') {
                            delete dataCache[data.id];
                        }
                    }
                }
            });

            conn.on('close', function () {
                P2P.Util.log('Connection closed with ' + conn.peer);

                //peerMap.peerFailed(conn.peer, )

                delete connectedPeers[conn.peer];
            });

            conn.on('error', function (err) {
                // TODO: Add error handling here
            });
        }
    }

    tracker.on('open', function() {
        P2P.Util.log('Connected to tracker. Requesting bootstrap.');

        tracker.send('bootstrap');
    });

    tracker.on('data', function(data) {
        P2P.Util.log('Received bootstrap. ' + data);

        if (data instanceof Array) {
            data.forEach(function(element) {
                connectToPeer(element, {q: 'ping', id: myId});
            });
        } else {
            P2P.Util.log('No bootstrap received.  Retry in 10 seconds');
        }

        setInterval(function() {
            if (connectedPeers.length === 0) {
                tracker.send('bootstrap');
            }
        }, 10000);
    });

    window.onunload = window.onbeforeunload = function(e) {
        if (!! peer && !peer.destroyed) {
            peer.destroy();
        }
    };

    function connectToPeer(peerConnId, onConnect) {
        var tmp;

        // TODO: Check peer statistics before connecting
        if (myConn !== peerConnId) {
            P2P.Util.log('Connecting to peer : ' + peerConnId);

            tmp = peer.connect(peerConnId, {
                label: 'peer',
                metadata: { id: myId }
            });

            tmp.on('open', function () {
                handlePeer(tmp);

                if (typeof onConnect === 'function') {
                    onConnect(tmp);
                } else if (typeof onConnect === 'object') {
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

        connectedPeers[neighbor[1]].send({q: 'find_peer', id: key });
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

            var x = Object.keys(peerMap.verifiedPeers).map(function (x) {
                return [x, peerMap.config.distanceCalc(uuid.parse(x), uuid.parse(key))];
            });

            // Add ourself as a peer in case we are the closest
            x.unshift([myId, peerMap.config.distanceCalc(myParsedId, uuid.parse(key))]);

            nearest = x.sort(function (a, b) { return a[1]>b[1]; })[0][0];

            if (nearest !== myId) {
                P2P.Util.log('Sending key ' + key + ' to ' + peerMap.verifiedPeers[nearest].peerId);

                if (typeof connectedPeers[peerMap.verifiedPeers[nearest].peerId] === 'undefined') {
                    delete connectedPeers[peerMap.verifiedPeers[nearest].peerId];
                } else {
                    connectedPeers[peerMap.verifiedPeers[nearest].peerId].send({q: 'store', id: key, value: dataCache[key] });
                }
            }
        }
    }

    setInterval(maintenance, 10000);

    setInterval(function () {
        var container = $('#data tbody'), cache = [];

        container.empty();

        for (var key in dataCache) {
            if (dataCache.hasOwnProperty(key)) {
                cache.push('<tr><td>' + key + '</td><td>' + dataCache[key] + '</td></tr>');
            }
        }

        container.append(cache);
    }, 1000);

    setInterval(function () {
        var container = $('#peers tbody'), cache = [];

        container.empty();

        for (var key in peerMap.verifiedPeers) {
            if (peerMap.verifiedPeers.hasOwnProperty(key)) {
                cache.push('<tr><td>' + peerMap.verifiedPeers[key].peerId + '</td><td>' + key + '</td></tr>');
            }
        }

        container.append(cache);
    }, 1000);