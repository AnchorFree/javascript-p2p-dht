// Peer Map
// ---------------------------------

// Read [annotated source code](http://www.explainjs.com/explain?src=https://raw.githubusercontent.com/AnchorFree/javascript-p2p-dht/master/p2p/PeerMap.js)

(function(exports) {
    // NOTE: Make sure Util is loaded before PeerMap
    exports.P2P.Util.namespace('P2P.PeerMap');

    /* Basic implementation of a p2p routing table
     */
    exports.P2P.PeerMap = function(selfId, config) {
        this.verifiedPeers = {};
        this.overflowPeers = {};
        this.offlineMap = {};
        this.shutdownMap = {};
        this.exceptionMap = {};

        this.config = exports.P2P.Util.extend({
            bagSizeVerified : 10,
            bagSizeOverflow : 10,
            offlineTimeout : 60,
            shutdownTimeout : 20,
            exceptionTimeout : 120,
            offlineCount : 3,
            peerVerification : true,
            defaultNearPeers : 3,

            /* When overridden, this function allows the PeerMap to filter peers as they are discovered.
             * Override this with your own function that returns true (to filter a peer out) and false to keep a peer.
             * Default implementaiton is a no-op.
             */
            peerFilter : function(peerId) {
                return false;
            },

            /* Calculates the distance between two keys which are represented as byte arrays.  The default implementation
             * uses an XOR distance similar to the original Kad network implementation.
             */
            distanceCalc : function(bytes1, bytes2) {
                var result = [];

                for (var i = 0; i < bytes1.length; i++) {
                    result.push(bytes1[i] ^ bytes2[i]);
                }

                return result.reduce(function(a, b, i, arr) {
                    return a + (b * Math.pow(10, i));
                }, 0);
            }
        }, config);

        this.selfId = selfId || '';
    };

    /* Adds a neighbor to the neighbor list. If the bag is full, the id zero or the same as our id, the neighbor is not added.
     */
    exports.P2P.PeerMap.prototype.peerFound = function(peerId, referrer, connId) {
        var firstHand = typeof referrer === 'undefined' || !this.config.peerVerification, secondHand = peerId == referrer, thirdHand = !firstHand && !secondHand, stat;

        if (firstHand) {
            delete this.offlineMap[peerId];
            delete this.shutdownMap[peerId];
        }

        // Do not add zero, myself or banned Ids
        if (peerId == 0 || peerId == this.selfId || this.config.peerFilter(this.selfId)) {
            exports.P2P.Util.log('PeerTracker rejected peer ' + peerId + ' for rule: Do not add zero, myself or banned Ids');

            return;
        }

        // Do not add 'probably dead' peers that are thirdHand knowledge
        if (thirdHand && (this.offlineMap.hasOwnProperty(peerId) || this.shutdownMap.hasOwnProperty(peerId) || this.exceptionMap.hasOwnProperty(peerId))) {
            exports.P2P.Util.log('PeerTracker rejected peer ' + peerId + ' for rule: Do not add "probably dead" peers that are third-hand knowledge');

            return;
        }

        // Handle a notification about an existing verified peer
        if (this.verifiedPeers.hasOwnProperty(peerId)) {
            this.verifiedPeers[peerId].successfullyChecked();

            this.verifiedPeers[peerId].peerId = this.verifiedPeers[peerId].peerId || peerId;

            return;
        }

        // New first-hand peer information
        if (!thirdHand && (Object.keys(this.verifiedPeers).length < this.config.bagSizeVerified)) {
            stat = new exports.P2P.PeerStatistics(connId);

            stat.successfullyChecked();

            this.verifiedPeers[peerId] = stat;
            delete this.overflowPeers[peerId];

            exports.P2P.Util.log('PeerTracker added peer ' + peerId + ' reason : first-hand knowledge');
        } else {
            stat = this.overflowPeers[peerId] || new exports.P2P.PeerStatistics(connId);

            if (firstHand) {
                stat.successfullyChecked();
            }

            this.overflowPeers[peerId] = stat;

            exports.P2P.Util.log('PeerTracker added peer ' + peerId + ' reason : overflow candidate');
        }
    };

    // Remove a peer from the list. In order to not reappear, the node is put for a certain time in a cache list to keep the node removed.
    // Valid reasons are Timeout, ProbablyOffline, Shutdown, Exception
    exports.P2P.PeerMap.prototype.peerFailed = function(peerId, reason) {
        // Do not remove zero or myself
        if (peerId == 0 || peerId == this.selfId) {
            exports.P2P.Util.log('PeerTracker failed to remove peer ' + peerId + ' for rule: Do not remove zero or myself');

            return;
        }

        var stat = this.verifiedPeers[peerId] || this.overflowPeers[peerId] || new PeerStatistics();

        if (reason !== 'Timeout') {
            // Do not add Timeouts to any maps, just increment the failed counter

            if (reason === 'ProbablyOffline') {
                // Add to the Offline map
                this.offlineMap[peerId] = stat;
            } else if (reason === 'Shutdown') {
                // Add to the Shutdown map
                this.shutdownMap[peerId] = stat;
            } else {
                // reason is exception
                this.exceptionMap[peerId] = stat;
            }

            return;
        }

        // Increment failed counter
        stat.failed();

        // If the failed counter is past the configured thresholds, remove this peer from the verified and overflow peers
        if (stat._failed >= this.config.offlineCount) {
            delete this.verifiedPeers[peerId];
            delete this.overflowPeers[peerId];
        }
    };

    /* Return peers that are closest to the peerId that is provided.
     * * peerId - return peers that are closest to this uuid
     * * atLeast - (optional) try to get this number of peers in the returned list
     * ** NOTE: The result might be less peers than requested
     * ** If there are not enough peers that are verified to fulfill the request, pull peers from overflow list as well
     * * peerMap - (optional) which peermap contains the list of peers to search. Defaults to verified and overflow
     */
    exports.P2P.PeerMap.prototype.nearPeers = function(peerId, atLeast, peerMap) {
        var result = [], tmp;

        atLeast = atLeast || this.config.defaultNearPeers;

        if (typeof peerMap === 'undefined') {
            peerMap = {};

            for (var property in this.verifiedPeers)
            peerMap[property] = this.verifiedPeers[property];

            if (Object.keys(peerMap).length < atLeast) {
                for (var property in this.overflowPeers)
                    peerMap[property] = this.overflowPeers[property];
            }
        }

        for (var prop in peerMap) {
            if (peerMap.hasOwnProperty(prop)) {
                result.push([[this.config.distanceCalc(uuid.parse(peerId), uuid.parse(prop))], peerMap[prop].peerId]);
            }
        }

        result.sort();

        tmp = result.slice(0, atLeast);

        result.length = 0;

        tmp.map(function(x) {
            result.push(x[1]);
        });

        return result;
    };

    /* Returns the nearest peer to the specified peerId.
     */
    exports.P2P.PeerMap.prototype.nearestPeer = function(peerId, peerMap) {
        var result = [], tmp;

        // Default to using both the verified peers and the overflow peers
        if (typeof peerMap === 'undefined') {
            peerMap = {};

            for (var property in this.verifiedPeers)
                peerMap[property] = this.verifiedPeers[property];

            for (var property in this.overflowPeers)
                peerMap[property] = this.overflowPeers[property];
        }

        for (var prop in peerMap) {
            if (peerMap.hasOwnProperty(prop)) {
                result.push([[this.config.distanceCalc(uuid.parse(peerId), uuid.parse(prop))], peerMap[prop].peerId]);
            }
        }

        result.sort();

        return result[0];
    };

    /* Get the number of the peers in the verified map.
     */
    exports.P2P.PeerMap.prototype.size = function() {
        return Object.keys(this.verifiedPeers).reduce(function(previousValue, currentValue, index, array) {
            return previousValue + Object.keys(this.verifiedPeers[index]).length;
        }, 0);
    };
})(this);
