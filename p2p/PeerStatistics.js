// Peer Statistics Data Model
// ---------------------------------

// Read [annotated source code](http://www.explainjs.com/explain?src=https://raw.githubusercontent.com/AnchorFree/javascript-p2p-dht/master/p2p/PeerStatistics.js)

(function(exports) {
    // NOTE: Make sure Util is loaded before PeerStatistics
    
    exports.P2P.Util.namespace('P2P.PeerStatistics');
    
    // Create a new PeerStatistics object and optionally assign it a peerId
    // This object is used to keep track of peers in an encapsulated way
	exports.P2P.PeerStatistics = function(peerId)
    {
        this.peerId = peerId;
        this.created = new Date().getTime();
        this.lastSeenOnline = 0;
        this._successfullyChecked = 0;
        this._failed = 0;
    };

    // Call this whenever the peer has a successful interaction.  It will update
    // the internal counters to show that the peer is still healthy
    exports.P2P.PeerStatistics.prototype.successfullyChecked = function()
    {
        this.lastSeenOnline = new Date().getTime();
        this._failed = 0;
        this._successfullyChecked = this._successfullyChecked + 1;
    };

    // Call this whenever the peer has an unsuccessful interaction.  It will update
    // the internal counters to show the peer is not healthy anymore
    exports.P2P.PeerStatistics.prototype.failed = function()
    {
        this._failed = this._failed + 1;
    };

    // The number of ticks between the first interaction with the peer
    // and the latest successful interaction with a peer.
    exports.P2P.PeerStatistics.onlineTime = function()
    {
        return this.lastSeenOnline - this.created;
    };
})(this);