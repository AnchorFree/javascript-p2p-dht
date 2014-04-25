function PeerStatistics(peerId)
{
    // Maintain statistics on Peer
    
    this.peerId = peerId;
    this.created = new Date().getTime();
    this.lastSeenOnline = 0;
    this._successfullyChecked = 0;
    this._failed = 0;
}

PeerStatistics.prototype.successfullyChecked = function()
{
    this.lastSeenOnline = new Date().getTime();
    this._failed = 0;
    this._successfullyChecked = this._successfullyChecked + 1;
}

PeerStatistics.prototype.failed = function()
{
    this._failed = this._failed + 1;
}

PeerStatistics.prototype.onlineTime = function()
{
    return this.lastSeenOnline - this.created;
}