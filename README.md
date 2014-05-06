javascript-p2p
==============

Experiment for building a JavaScript-based DHT for storage.

Instructions
------------
1. Launch tracker.htm in a browser (Chrome 32+ or FF 29+)
1. Launch one or more copies of peer.htm in a browser (Chrome 32+ or FF 29+) - (NOTE: can be launched on multiple computers)
1. On any one of the peers, click the +100 items link to create random data and watch it propogate to other peers
1. Open DevTools on any peers, run function get('uuid-here') to search the network for data belonging to that uuid

Documentation
-------------

P2P Framework
* [PeerStatistics](http://www.explainjs.com/explain?src=https://raw.githubusercontent.com/AnchorFree/javascript-p2p-dht/master/p2p/PeerStatistics.js)
* [PeerMap](http://www.explainjs.com/explain?src=https://raw.githubusercontent.com/AnchorFree/javascript-p2p-dht/master/p2p/PeerMap.js)
* [Util](http://www.explainjs.com/explain?src=https://raw.githubusercontent.com/AnchorFree/javascript-p2p-dht/master/p2p/Util.js)

DHT Framework
* TBD