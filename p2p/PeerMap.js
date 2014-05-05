function PeerMap(selfId, config) {
    // Basic implementation of a p2p routing table
    
    this.verifiedPeers = {};
    this.overflowPeers = {};
    this.offlineMap = {};
    this.shutdownMap = {};
    this.exceptionMap = {};
    this.config = config || {
        bagSizeVerified: 10,
        bagSizeOverflow: 10,
        offlineTimeout: 60,
        shutdownTimeout: 20,
        exceptionTimeout: 120,
        offlineCount: 3,
        peerVerification: true,
        defaultNearPeers: 3,
        peerFilter: function(peerId) {
            // Filter peers - default is no filter

            return false;
        },
        distanceCalc: function(bytes1, bytes2) {
                var result = [];

                for (var i = 0; i < bytes1.length; i++) {
                    result.push(bytes1[i] ^ bytes2[i])
                }

                return result.reduce(function(a, b, i, arr) {
                                    return a + (b * Math.pow(10,  i))
                                }, 0);
            }
        };
    this.selfId = selfId || '';
}

PeerMap.prototype.peerFound = function(peerId, referrer, connId) {
    // Adds a neighbor to the neighbor list. If the bag is full, the id zero or the same as our id, the neighbor is not added.
    var firstHand = typeof referrer === 'undefined' || !this.config.peerVerification,
        secondHand = peerId == referrer,
        thirdHand = !firstHand && !secondHand,
        stat;

    if (firstHand) {
        delete this.offlineMap[peerId];
        delete this.shutdownMap[peerId];
    }

    // Do not add zero, myself or banned Ids
    if (peerId == 0 || peerId == this.selfId || this.config.peerFilter(this.selfId)) {
        Util.log('PeerTracker rejected peer ' + peerId + ' for rule: Do not add zero, myself or banned Ids');

        return;
    }

    // Do not add 'probably dead' peers that are thirdHand knowledge
    if (thirdHand && (this.offlineMap.hasOwnProperty(peerId) || this.shutdownMap.hasOwnProperty(peerId) || this.exceptionMap.hasOwnProperty(peerId))) {
        Util.log('PeerTracker rejected peer ' + peerId + ' for rule: Do not add "probably dead" peers that are third-hand knowledge');

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
        stat = new PeerStatistics(connId);

        stat.successfullyChecked();

        this.verifiedPeers[peerId] = stat;

        delete this.overflowPeers[peerId];

        Util.log('PeerTracker added peer ' + peerId + ' reason : first-hand knowledge');

    } else {
        stat = this.overflowPeers[peerId] || new PeerStatistics(connId);

        if (firstHand) {
            stat.successfullyChecked();
        }

        this.overflowPeers[peerId] = stat;

        Util.log('PeerTracker added peer ' + peerId + ' reason : overflow candidate');
    }
}

PeerMap.prototype.peerFailed = function(peerId, reason) {
    // Remove a peer from the list. In order to not reappear, the node is put for a certain time in a cache list to keep the node removed.
    // Valid reasons are Timeout, ProbablyOffline, Shutdown, Exception
    
    // Do not remove zero or myself
    if (peerId == 0 || peerId == this.selfId) {
        Util.log('PeerTracker failed to remove peer ' + peerId + ' for rule: Do not remove zero or myself');

        return;
    }
    
    var stat = this.verifiedPeers[peerId] || this.overflowPeers[peerId] || new PeerStatistics();
    
    if (reason !== 'Timeout') {
        if(reason === 'ProbablyOffline') {
            this.offlineMap[peerId] = stat;
        } else if(reason === 'Shutdown') {
            this.shutdownMap[peerId] = stat;
        } else { // reason is exception
            this.exceptionMap[peerId] = stat;
        }
        
        return;
    }
    
    stat.failed();
    
    if (stat._failed >= this.config.offlineCount) {
        delete this.verifiedPeers[peerId];
        delete this.overflowPeers[peerId];
    }
}

PeerMap.prototype.nearPeers = function(peerId, atLeast, peerMap) {
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
        if( peerMap.hasOwnProperty( prop ) ) {
            result.push([[this.config.distanceCalc(uuid.parse(peerId), uuid.parse(prop))], peerMap[prop].peerId]);
        } 
    }
    
    result.sort();
    
    tmp = result.slice(0, atLeast);
    
    result.length = 0;
    
    tmp.map(function (x) { result.push(x[1]); });
    
    return result;
}

PeerMap.prototype.nearestPeer = function(peerId, peerMap) {
    var result = [], tmp;
    
    if (typeof peerMap === 'undefined') {
        peerMap = {};
        
        for (var property in this.verifiedPeers)
            peerMap[property] = this.verifiedPeers[property];
        
        for (var property in this.overflowPeers)
            peerMap[property] = this.overflowPeers[property];
    }
    
    for (var prop in peerMap) {
        if( peerMap.hasOwnProperty( prop ) ) {
            result.push([[this.config.distanceCalc(uuid.parse(peerId), uuid.parse(prop))], peerMap[prop].peerId]);
        } 
    }
    
    result.sort();
    
    return result[0];
}

PeerMap.prototype.size = function() {
    // The number of the peers in the verified map
    return Object.keys(this.verifiedPeers).reduce(function(previousValue, currentValue, index, array) {
        return previousValue + Object.keys(this.verifiedPeers[index]).length;
    }, 0);
}