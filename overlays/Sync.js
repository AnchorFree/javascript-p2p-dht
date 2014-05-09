// Distributed Hash Table Overlay
// ---------------------------------

// Read [annotated source code](http://www.explainjs.com/explain?src=https://raw.githubusercontent.com/AnchorFree/javascript-p2p-dht/master/dht/DHT.js)

(function(exports) {
    // NOTE: Make sure Util is loaded before PeerMap
    exports.P2P.Util.namespace('P2P.Overlays.Sync');

    /**
     * Create a Sync overlay on top of the peer 2 peer network.  This overlay is reposnible for distributing a set of information to all peers.
     *
     * protocol is expected to be an instance of P2P.Protocol
     * config is an optional parameter
     */
    exports.P2P.Overlays.Sync = function(protocol, config) {
        if (!protocol instanceof exports.P2P.Protocol) {
            // Bail out if the protocol is not valid because this whole module is useless
            throw 'protocol must be an instance of P2P.Protocol';
        }

        this.protocol = protocol;

        this.config = exports.P2P.Util.extend({
            pid : this.protocol.pid || uuid.v4()
        }, config);

        this.pid = this.config.pid;

        // Wire up events to handle protocol communication
        this.protocol.on('data', this.onData.bind(this));

        this.dataCache = {};

        this.dirtyUntil = 0;

        this.protocol.on('tick', function(e) {
            if (new Date().getTime() < this.dirtyUntil) {
                e.send({
                    q : 'sync_keys',
                    keys : Object.keys(this.dataCache)
                });
            }
        }.bind(this));
    };

    /**
     * Handle new peer data events
     */
    exports.P2P.Overlays.Sync.prototype.onData = function(e) {
        var reply = [];

        if ( typeof e.data === 'object' && e.data.hasOwnProperty('q')) {
            // Initiate sync negotiation once a ping is detected
            if (e.data.q === 'ping' || e.data.q === 'pong') {
                e.reply({
                    q : 'sync_keys',
                    keys : Object.keys(this.dataCache)
                });

                return;
            }

            // When a list of keys is recieved, check if we already have them all
            // Get any missing keys
            if (e.data.q === 'sync_keys') {
                for (var i = 0, j = e.data.keys.length; i < j; i++) {
                    if (!this.dataCache.hasOwnProperty(e.data.keys[i])) {
                        reply.push(e.data.keys[i]);
                    }
                }

                e.reply({
                    q : 'get_keys',
                    keys : reply
                });

                return;
            }

            // Peer requested a set of keys, send them with data
            if (e.data.q === 'get_keys') {
                for (var i = 0, j = e.data.keys.length; i < j; i++) {
                    if (this.dataCache.hasOwnProperty(e.data.keys[i])) {
                        reply.push({ key: e.data.keys[i], value: this.dataCache[e.data.keys[i]] });
                    }
                }

                e.reply({
                    q : 'set_keys',
                    items : reply
                });

                return;
            }

            if (e.data.q === 'set_keys') {
                //TODO: Add verification method here. Either JWT-style signatures or WOT-style verification

                for(var i=0,j=e.data.items.length; i<j; i++){
                    this.dataCache[e.data.items[i].key] = e.data.items[i].value;
                };

                return;
            }
        }
    };

    /**
     * Add data to this node
     *
     * key is an optional parameter that should be a UUID v4
     */
    exports.P2P.Overlays.Sync.prototype.addData = function(data, key) {
        this.dataCache[key || uuid.v4()] = data;

        // Mark myself as dirty for 60 seconds so we can force a sync with other peers
        this.dirtyUntil = new Date().getTime() + 1500;
    };
})(this);

