// Distributed Hash Table Overlay
// ---------------------------------

// Read [annotated source code](http://www.explainjs.com/explain?src=https://raw.githubusercontent.com/AnchorFree/javascript-p2p-dht/master/dht/DHT.js)

(function (exports) {
    'use strict';

    // NOTE: Make sure Util is loaded before PeerMap
    exports.P2P.Util.namespace('P2P.Overlays.Sync');

    /**
     * Create a Sync overlay on top of the peer 2 peer network.  This overlay is reposnible for distributing a set of information to all peers.
     *
     * protocol is expected to be an instance of P2P.Protocol
     * config is an optional parameter
     */
    exports.P2P.Overlays.Sync = function (protocol, config) {
        if (!protocol instanceof exports.P2P.Protocol) {
            // Bail out if the protocol is not valid because this whole module is useless
            throw 'protocol must be an instance of P2P.Protocol';
        }

        this.protocol = protocol;

        this.config = exports.P2P.Util.extend({
            pid: this.protocol.pid || uuid.v4()
        }, config);

        this.pid = this.config.pid;

        this.dataCache = {};

        /**
         * Handle new peer data events
         */
        this.onData = function (e) {
            var reply = [];

            if (typeof e.data === 'object' && e.data.hasOwnProperty('q')) {
                // Initiate sync negotiation once a ping is detected
                if (e.data.q === 'ping' || e.data.q === 'pong') {
                    e.reply({
                        q: 'sync_keys',
                        keys: Object.keys(this.dataCache)
                    });

                    return;
                }

                // When a list of keys is received, check if we already have them all
                // Get any missing keys
                if (e.data.q === 'sync_keys') {
                    for (var i = 0, j = e.data.keys.length; i < j; i++) {
                        if (!this.dataCache.hasOwnProperty(e.data.keys[i])) {
                            reply.push(e.data.keys[i]);
                        }
                    }

                    if (reply.length > 0) {
                        e.reply({
                            q: 'get_keys',
                            keys: reply
                        });
                    }

                    return;
                }

                // Peer requested a set of keys, send them with data
                if (e.data.q === 'get_keys') {
                    for (var x = 0, y = e.data.keys.length; x < y; x++) {
                        if (this.dataCache.hasOwnProperty(e.data.keys[x])) {
                            reply.push({ key: e.data.keys[x], value: this.dataCache[e.data.keys[x]] });
                        }
                    }

                    if (reply.length > 0) {
                        e.reply({
                            q: 'set_keys',
                            items: reply
                        });
                    }

                    return;
                }

                if (e.data.q === 'set_keys') {
                    //TODO: Add verification method here. Either JWT-style signatures or WOT-style verification

                    for (var k = 0, l = e.data.items.length; k < l; k++) {
                        this.dataCache[e.data.items[k].key] = e.data.items[k].value;
                    }

                    for (var t = 0, peer_keys = Object.keys(this.protocol.connectedPeers), u = peer_keys.length; t < u; t++) {
                        if (e.data.pid !== peer_keys[t]) {
                            this.protocol.connectedPeers[peer_keys[t]].send({q: "sync_keys", keys: Object.keys(this.dataCache)});
                        }
                    }

                    return;
                }
            }
        };

        /**
         * Add data to this node
         *
         * key (string) is an optional parameter. A UUID will be generated if a key is not provided.
         */
        this.addData = function (data, key) {
            var sanitized_key = key || uuid.v4();
            this.dataCache[sanitized_key] = data;

            for (var i = 0, keys = Object.keys(this.protocol.connectedPeers), j = keys.length; i < j; i++) {
                this.protocol.connectedPeers[keys[i]].send({q: "sync_keys", keys: Object.keys(this.dataCache)});
            }
        }.bind(this);

        // Wire up events to handle protocol communication
        this.protocol.on('data', this.onData.bind(this));
    };
})(this);