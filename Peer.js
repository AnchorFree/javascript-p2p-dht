    var myId = Util.guid(), myConn;
    var connectedPeers = {};
    
    var peer = new Peer(null, {
        key: 'gm6cty1w0ptrcnmi',

        // Set highest debug level (log everything!).
        debug: 3,

        // Set a logging function:
        logFunction: function() {
            var copy = Array.prototype.slice.call(arguments).join(' ');
            $('.log').append(copy + '<br>');
        },
        
        // Use a TURN server for more network support
        config: {'iceServers': [
            { url: 'stun:stun.l.google.com:19302' }
        ]} /* Sample servers, please use appropriate ones */
    });
    
    peer.on('open', function(id) {
        Util.log('Connected established as ' + id);
        
        myConn = id;
    });
    
    peer.on('connection', handlePeer);
    
    function handlePeer(conn) {
        Util.log('Connection from : ' + conn.peer);
        
        if (conn.label === 'peer') {
            connectedPeers[conn.peer] = conn;
            
            conn.on('data', function (data) {
                Util.log('Data from : ' + conn.peer + ' : ' + data);
                
                if (data === 'ping') {
                    conn.send('pong');
                } else if (data === 'pong') {
                    console.log('PONG!!!');
                }
            });
            
            conn.on('close', function () {
                Util.log('Connection close with ' + conn.peer);
                
                delete connectedPeers[conn.peer];
            });
        }
    }

    var peerMap = new PeerMap(peer.id);
    var tracker = peer.connect('TRACKER', { metadata: { id: myId }});

    tracker.on('open', function() {
        Util.log('Connected to tracker. Requesting bootstrap.');

        tracker.send('bootstrap');
    });
    
    peer.on('data', function(data) {
        Util.log('Received : ' + data);
    });

    tracker.on('data', function(data) {
        Util.log('Received bootstrap. ' + data);

        if (data instanceof Array) {        
            data.forEach(function(element) {
                var tmp;
                
                // TODO: Check peer statistics before connecting
                if (myConn !== element) {
                    Util.log('Connecting to peer : ' + element);
                    
                    tmp = peer.connect(element, {
                        label: 'peer',
                        serialization: 'none',
                        reliable: false,
                        metadata: { id: myId }
                    });
                    
                    tmp.on('open', function () {
                        handlePeer(tmp);
                        
                        tmp.send('ping');
                    });
                }
            });
        } else {
            Util.log('No bootstrap received.  Retry in 10 seconds');

            setTimeout(function() {
                tracker.send('bootstrap');
            }, 10000);
        }
        
        setInterval(function() {
            if (connectedPeers.length === 0) {
                tracker.send('bootstrap');
            }
        }, 10000);
    })

    window.onunload = window.onbeforeunload = function(e) {
        if (!! peer && !peer.destroyed) {
            peer.destroy();
        }
    };