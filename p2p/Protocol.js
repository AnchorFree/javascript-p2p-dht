// Peer Communication Base Layer
// ---------------------------------

// Read [annotated source code](http://www.explainjs.com/explain?src=https://raw.githubusercontent.com/AnchorFree/javascript-p2p-dht/master/p2p/Protocol.js)

(function(exports) {
    'use strict';

    // NOTE: Make sure Util is loaded before PeerMap
    exports.P2P.Util.namespace('P2P.Protocol');

    /**
     * The base Peer to Peer protocol handler.  It handles connecting to peers and not much else.
     */
    exports.P2P.Protocol = function(config) {
        this.config = exports.P2P.Util.extend({
            pid: uuid.v4(),
            announcePeerTTL: 3
        }, config);

        // Generate an ID for this peer
        this.pid = this.config.pid;

        // Track all peers that are connected to this peer
        this.connectedPeers = {};

        // Wire up events for the protocol
        exports.P2P.Util.EventEmitter.call(this);

        // Set timer to send periodic messages to all hosts
        setInterval(function() {
            for(var i=0,keys=Object.keys(this.connectedPeers),j=keys.length; i<j; i++){
                this.emit('tick', { send: this.connectedPeers[keys[i]].send });
            }
        }.bind(this), 5000);
    };

    exports.P2P.Util.inherits(exports.P2P.Protocol, exports.P2P.Util.EventEmitter);

    /**
     * Notify all listening protocol implementations of incoming connection.
     *
     * pid is the WebRTC peer id to be used for transport purposes.
     * The listeners will expect the replyCallback to take one argument which is the data to be serialized and sent back to the other peer.
     */
    exports.P2P.Protocol.prototype.raiseIncomingConnection = function(pid, replyCallback) {
        var e = {};

        // If this peer is already tracked as connected, do not throw a new event
        if (this.connectedPeers.hasOwnProperty(pid)) {
            return;
        } else {
            this.connectedPeers[pid] = exports.P2P.Util.extend(new exports.P2P.PeerStatistics(pid), { send: replyCallback });
        }

        // This peer had a successful interaction
        this.connectedPeers[pid].successfullyChecked();

        // Send initial ping
        this.connectedPeers[pid].send({ q: 'ping', id: this.pid });

        // pid should be a string
        e.pid = typeof pid === 'string' ? e.pid = pid : '';

        // Peer statistics
        e.stats = this.connectedPeers[pid];

        // replyCallback should be a function
        e.reply = typeof replyCallback === 'function' ? replyCallback : function() { };

        // Raise the event for all other protocols to handle the message (if needed).
        this.emit('connected', e);
    };

    /**
     * Notify all listening protocol implementations of incoming data.
     *
     * data is the incoming data object and replyCallback is a function that will send data back to the caller.
     */
    exports.P2P.Protocol.prototype.raiseIncomingData = function(pid, data) {
        var e = {};

        if (!this.connectedPeers.hasOwnProperty(pid)) {
            return;
        }

        // This peer is still healthy
        this.connectedPeers[pid].successfullyChecked();

        // Handle base protocol messages
        if ( typeof data === 'object' && data.hasOwnProperty('q')) {

            // Respond to pings with a pong
            if (data.q === 'ping') {
                this.connectedPeers[pid].send({
                    q : 'pong',
                    id : this.pid
                });
            }

            // Respond to pong (which confirms communication) by announcing the peer
            if (data.q === 'pong') {
                for (var peer1 in this.connectedPeers) {
                    if (peer1 !== pid && this.connectedPeers.hasOwnProperty(peer1)) {
                        this.connectedPeers[peer1].send({
                            q : 'announce_peer',
                            id : data.id,
                            conn : pid,
                            ttl: this.config.announcePeerTTL
                        });
                    }
                }
            }

            if (data.q === 'announce_peer') {
                if (data.ttl > 0) {
                    for (var peer2 in this.connectedPeers) {
                        if (peer2 !== pid && this.connectedPeers.hasOwnProperty(peer2)) {
                            this.connectedPeers[peer2].send({
                                q : 'announce_peer',
                                id : data.id,
                                conn : data.conn,
                                ttl: data.ttl - 1
                            });
                        }
                    }
                }

                this.emit('peer_discovered', { pid: data.conn, key: data.id, connectedPeerCount: Object.keys(this.connectedPeers).length });
            }
        }

        // pid should be a string
        e.pid = typeof pid === 'string' ? e.pid = pid : '';

        // The protocol communicates via JSON objects, so make sure we have one
        e.data = typeof data === 'object' ? e.data = data : {};

        // Peer statistics
        e.stats = this.connectedPeers[pid];

        // replyCallback should be a function
        e.reply = e.stats.send;

        // Raise the event for all other protocols to handle the message (if needed).
        this.emit('data', e);
    };

    /**
     * Notify all listening protocol implementations of peer disconnect.
     *
     * pid is the peer id of the remote peer.
     */
    exports.P2P.Protocol.prototype.raiseDropConnection = function(pid) {
        var e = {};

        if (!this.connectedPeers.hasOwnProperty(pid)) {
            return;
        }

        // pid should be a string
        e.pid = typeof pid === 'string' ? e.pid = pid : '';

        // Raise the event for all other protocols to handle the message (if needed).
        this.emit('disconnect', e);

        delete this.connectedPeers[pid];
    };
})(this);