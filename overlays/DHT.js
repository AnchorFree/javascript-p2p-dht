// Distributed Hash Table Overlay
// ---------------------------------

// Read [annotated source code](http://www.explainjs.com/explain?src=https://raw.githubusercontent.com/AnchorFree/javascript-p2p-dht/master/overlays/DHT.js)

(function (exports) {
    'use strict';

    // NOTE: Make sure Util is loaded before PeerMap
    exports.P2P.Util.namespace('P2P.Overlays.DHT');

    /**
     * Create a DHT overlay on top of the peer 2 peer network.  This overlay is responsible for distributing information to peers that are closest in terms of ID.
     *
     * protocol is expected to be an instance of P2P.Protocol
     * config is an optional parameter
     */
    exports.P2P.Overlays.DHT = function (protocol, config) {
        if (!protocol instanceof exports.P2P.Protocol) {
            // Bail out if the protocol is not valid because this whole module is useless
            throw 'protocol must be an instance of P2P.Protocol';
        }

        this.protocol = protocol;

        this.config = exports.P2P.Util.extend({
            pid: this.protocol.pid || uuid.v4()
        }, config);

        this.pid = this.config.pid;

        // Hashmap of keys and values that belong to this node
        this.dataCache = {};

        // The peerMap keeps track of other connected peers and their health statistics
        this.peerMap = new exports.P2P.PeerMap(this.config.pid);

        /**
         * Handle new peer connections
         */
        this.onConnected = function (e) {
            this.peerMap.onPeerFound(e.pid);
        };

        /**
         * Handle new peer data events
         */
        this.onData = function (e) {
            if (typeof e.data === 'object' && e.data.hasOwnProperty('q')) {
                // If the key belongs to a piece of data that is available locally, return the data.
                // Otherwise, find a closer neighbor and pass on the request
                if (e.data.q === 'find_peer') {
                    if (this.dataCache.hasOwnProperty(e.data.id)) {

                        e.reply({q: 'peer_found', data: this.dataCache[e.data.id]});
                    } else {
                        // Do I know of a peer that is closer to this key?
                        var neighbor = this.peerMap.nearestPeer(e.data.id);

                        e.reply({q: 'peer_found', id: e.data.id, redirect: neighbor[1]});
                    }

                    return;
                }

                if (e.data.q === 'peer_found') {
                    // If this is a redirect, then follow the path and continue asking for data.
                    // Otherwise, the data is not reachable in the DHT
                    if (e.data.hasOwnProperty('redirect')) {
                        // TODO: Connect to peer
                    } else if (e.data.hasOwnProperty('data')) {
                        // TODO: Display data.data
                    } else {
                        // TODO: Data not found in this path
                    }

                    return;
                }

                if (e.data.q === 'announce_peer') {
                    // Do I have any keys that are closer to the new peer?
                    this.peerMap.onPeerFound(e.data.id, e.pid);

                    return;
                }

                if (e.data.q === 'store') {
                    this.addData(e.data.id, e.data.value);

                    e.reply({q: 'store_verified', id: e.data.id });

                    return;
                }

                if (e.data.q === 'store_verified') {
                    delete this.dataCache[e.data.id];

                    return;
                }
            }
        };

        /**
        * Add a (Key,Value) pair to the distributed hash table
        */
        this.addData = function(key, value) {
            this.dataCache[key] = value;
        };

        /**
         * Search for a value across the distributed hash table by key
        */
        this.findData = function(key) {
            // Check if the data is locally available.
            if (this.dataCache.hasOwnProperty(key)) {
                return this.dataCache[key];
            }

            // TODO: Request this data from each peer
        };

        // Wire up events to handle protocol communication
        this.protocol.on('connected', this.onConnected.bind(this));
        this.protocol.on('data', this.onData.bind(this));
    };
})(this);

