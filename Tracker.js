var peerTracker = [];

var peer = new Peer('TRACKER1', {
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
    P2P.Util.log('Connection established from: ' + conn.peer);

    peerTracker.push({ pid: conn.peer, ttl: 3 });

    conn.on('data', function(data) {
        if (data === 'bootstrap') {
            P2P.Util.log(conn.peer + ' : request bootstrap');
            var list = [];

            for(var i=0,j=peerTracker.length>3 ? 3 : peerTracker.length; i<j; i++){
                peerTracker[i].ttl = peerTracker[i].ttl - 1;

                if (peerTracker[i].ttl > 0) {
                    list.push(peerTracker[i].pid);
                }
            }

            conn.send(list);
        }
    });
});

window.onunload = window.onbeforeunload = function(e) {
    if (!!peer && !peer.destroyed) {
        peer.destroy();
    }
};