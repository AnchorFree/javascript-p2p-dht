var peerTracker = new PeerMap('TRACKER');

var peer = new Peer('TRACKER', {
    key: 'gm6cty1w0ptrcnmi',
    
    // Set highest debug level (log everything!).
    debug: 3,
    
    // Set a logging function:
    logFunction: function() {
        var copy = Array.prototype.slice.call(arguments).join(' ');
        $('.log').append(copy + '<br>');
    }
});

peer.on('connection', function(conn) {
    Util.log('Connection established from: ' + conn.peer);
    
    peerTracker.peerFound(conn.metadata.id, undefined, conn.peer);
    
    conn.on('data', function(data) {
        if (data === 'bootstrap') {
            Util.log(conn.peer + ' : request bootstrap');
            
            conn.send(peerTracker.nearPeers(conn.peer, 3));
        }
    });
});

window.onunload = window.onbeforeunload = function(e) {
    if (!!peer && !peer.destroyed) {
        peer.destroy();
    }
};