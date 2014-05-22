(function (angular, Peer, uuid, P2P) {
    'use strict';

    var app = angular.module('app', ['ngRoute', 'ui.bootstrap']);

    /**
     * Manage the different views of the demo using routes.
     *
     * Default view is /dashboard
     */
    app.config(['$routeProvider', function ($routeProvider) {
        $routeProvider.when('/dashboard', {
            templateUrl: 'ui/template/dashboard.html', controller: 'P2PCtrl'
        }).when('/p2p/sync', {
            templateUrl: 'ui/template/sync.html', controller: 'SyncCtrl'
        }).when('/p2p/dht', {
            templateUrl: 'ui/template/dht.html', controller: 'DHTCtrl'
        }).otherwise({
            redirectTo: '/dashboard'
        });
    }]);

    /**
     * SidebarController
     * ---
     *
     * Responsible for enabling/disabling navigation from the sidebar.
     */
    app.controller('SidebarController', ['$scope', '$location', 'peerJS', function ($scope, $location, peerJS) {
        $scope.isActive = function (viewLocation) {
            return viewLocation === $location.path();
        };

        $scope.peerJsKeySet = function () {
            return peerJS.getConfig().key !== null;
        };

        $scope.navigateIfPeerJsKeySet = function (viewLocation) {
            return peerJS.getConfig().key === null ? '#' : viewLocation;
        };
    }]);

    /**
     * Main controller responsible for managing the PeerJS key entry form.
     */
    app.controller('P2PCtrl', ['$scope', 'peerJS', 'peerJSTracker', function ($scope, peerJS, peerJSTracker) {
        $scope.name = 'P2PCtrl';

        $scope.peerJSKey = peerJS.getConfig().key;
        $scope.alerts = [];

        $scope.isPeerJSKeySet = function () {
            var c = peerJS.getConfig();

            return typeof c.key === 'string' && peerJS.getConfig().key.length > 0;
        };

        $scope.updatePeerJSKey = function () {
            peerJS.setPeerJSKey($scope.peerJSKey);

            // TODO: Actually verify if the key is valid

            // Ensure a tracker exists
            peerJSTracker.ensureTracker();

            $scope.alerts = [
                { type: 'success', msg: 'Well done! Are ready to start using the demos from the menu.' }
            ];
        };

        $scope.closeAlert = function (index) {
            $scope.alerts.splice(index, 1);
        };
    }]);

    /**
     * SyncCtrl
     * ---
     *
     * Runs the demo of the Sync overlay for P2P
     */
    app.controller('SyncCtrl', ['$scope', 'peerJS', 'peerJSTracker', function ($scope, peerJS, peerJSTracker) {
        $scope.name = 'SyncCtrl';

        $scope.alerts = [];

        // Initialize the P2P System
        $scope.peerCount = 0;

        $scope.newData = '';

        $scope.$watch(function () { return peerJS.peerCount(); }, function (newVal) {
            $scope.peerCount = newVal;
        });

        $scope.connectedToCloud = function () {
            return peerJSTracker.connected();
        };

        $scope.connectToCloud = function () {
            if (!peerJSTracker.connected()) {
                peerJSTracker.bootstrap(peerJS.connect);
            }
        };

        $scope.closeAlert = function (index) {
            $scope.alerts.splice(index, 1);
        };

        $scope.addData = function () {
            peerJS.addData($scope.newData);

            $scope.newData = '';
        };

        $scope.pid = function () {
            return peerJS.pid;
        };

        $scope.data = peerJS.getData;
    }]);

    app.controller('DHTCtrl', ['$scope', function ($scope) {
        $scope.name = 'DHTCtrl';
    }]);

    app.factory('peerJSTracker', ['$log', '$rootScope', 'peerJS', function ($log, $rootScope, peerJS) {
        var peerTracker = [],
            trackerServer,
            trackerClient;
        var trackerPid = 'TRACKER';

        function ensureTracker() {
            trackerServer =  new Peer(trackerPid, peerJS.getConfig());

            trackerServer.on('connection', function (conn) {
                $log.info('Connection established from: ' + conn.peer);

                peerTracker.push({ pid: conn.peer, ttl: 3 });

                conn.on('data', function (data) {
                    $log.info('Received data: ' + data);

                    if (data === 'bootstrap') {
                        $log.info(conn.peer + ' : request bootstrap');

                        var list = [];

                        for (var i = 0, j = peerTracker.length > 3 ? 3 : peerTracker.length; i < j; i++) {
                            peerTracker[i].ttl = peerTracker[i].ttl - 1;

                            if (peerTracker[i].ttl > 0) {
                                list.push(peerTracker[i].pid);
                            }
                        }

                        conn.send(list);
                    }
                });
            });
        }

        /**
         * Bootstrap from tracker
         */
        function bootstrap(callback) {
            trackerClient = peerJS.connect(trackerPid, true);

            trackerClient.on('open', function () {
                $log.info('Connection established to: ' + trackerPid);

                $rootScope.$digest();

                trackerClient.send('bootstrap');
            });

            trackerClient.on('data', function (data) {
                if (data instanceof Array) {
                    data.forEach(function (element) {
                        callback.call(this, element);
                    });
                } else {
                    $log.log('No bootstrap received.  Retry in 10 seconds');
                }
            });
        }

        return {
            ensureTracker: ensureTracker,
            bootstrap: bootstrap,
            connected: function () {
                return typeof trackerClient !== 'undefined' && trackerClient.open;
            }
        };
    }]);

    app.factory('peerJS', ['$rootScope', '$log', function ($rootScope, $log) {
        var config = {
            key: null,

            // Set highest debug level (log everything!).
            debug: 3,

            // Set a logging function:
            logFunction: function () {
                var copy = Array.prototype.slice.call(arguments).join(' ');

                $log.log(copy);
            },

            // Use a STUN/TURN server for more network support
            config: {
                'iceServers': [
                    {url: 'stun:stun01.sipphone.com'},
                    {url: 'stun:stun.ekiga.net'},
                    {url: 'stun:stun.fwdnet.net'},
                    {url: 'stun:stun.ideasip.com'},
                    {url: 'stun:stun.iptel.org'},
                    {url: 'stun:stun.rixtelecom.se'},
                    {url: 'stun:stun.schlund.de'},
                    {url: 'stun:stun.l.google.com:19302'},
                    {url: 'stun:stun1.l.google.com:19302'},
                    {url: 'stun:stun2.l.google.com:19302'},
                    {url: 'stun:stun3.l.google.com:19302'},
                    {url: 'stun:stun4.l.google.com:19302'},
                    {url: 'stun:stunserver.org'},
                    {url: 'stun:stun.softjoys.com'},
                    {url: 'stun:stun.voiparound.com'},
                    {url: 'stun:stun.voipbuster.com'},
                    {url: 'stun:stun.voipstunt.com'},
                    {url: 'stun:stun.voxgratia.org'},
                    {url: 'stun:stun.xten.com'},
                    {url: 'turn:numb.viagenie.ca', credential: 'muazkh', username: 'webrtc@live.com'},
                    {url: 'turn:192.158.29.39:3478?transport=udp', credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA=', username: '28224511:1379330808'},
                    {url: 'turn:192.158.29.39:3478?transport=tcp', credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA=', username: '28224511:1379330808'}
                ]
            }
        };

        var peerCount = 0,
            myP2PId = uuid.v4();

        // Create a new PeerJS object
        var peer;

        // Attach the base P2P protocol over the underlying WebRTC connection
        var p2pEngine = new P2P.Protocol({
            pid: myP2PId
        });

        // Add the Sync overlay on top of the base P2P protocol
        var syncEngine = new P2P.Overlays.Sync(p2pEngine);

        // Update UI every time the P2P.Protocol finishes processing incoming data
        p2pEngine.on('data', function () {
            $rootScope.$digest();
        });

        // If we have less than 3 peers connected and we get an announcement to a new peer, connect with it
        p2pEngine.on('peer_discovered', function(e) {
            if (e.connectedPeerCount < 3 && !p2pEngine.connectedPeers.hasOwnProperty(e.key)) {
                connectToPeer(e.key);
            }
        });

        function getConfig() {
            return config;
        }

        function incrementPeerCount() {
            peerCount++;

            $rootScope.$digest();
        }

        function decrementPeerCount() {
            peerCount--;

            $rootScope.$digest();
        }


        function setPeerJSKey(key) {
            config.key = key;

            peer = new Peer(myP2PId, config);

            peer.on('connection', function (dataConnection) {
                dataConnection.on('open', function () {
                    $log.info('Incoming connection open...');

                    incrementPeerCount();

                    $log.info('PeerCount: ' + peerCount);

                    p2pEngine.raiseIncomingConnection(dataConnection.peer, function (data) {
                        dataConnection.send(data);
                    });

                    dataConnection.on('data', function (data) {
                        p2pEngine.raiseIncomingData(dataConnection.peer, data);
                    });

                    dataConnection.on('close', function () {
                        p2pEngine.raiseDropConnection(dataConnection.peer);

                        decrementPeerCount();
                    });

                    dataConnection.on('error', function (err) {
                        // Do something...
                        //$scope.alerts.push({ type: "error", msg: 'Peer connection failed due to the following error: ' + err });
                        $log.error(err);

                        decrementPeerCount();
                    });
                });
            });
        }

        function connectToPeer(peerConnId, customProtocol) {
            var tmp;

            if (typeof customProtocol === 'boolean' && customProtocol) {
                return peer.connect(peerConnId);
            }

            tmp = peer.connect(peerConnId, {
                label: 'peer'
            });

            tmp.on('open', function () {
                incrementPeerCount();

                $log.info('PeerCount: ' + peerCount);

                p2pEngine.raiseIncomingConnection(tmp.peer, function (data) {
                    tmp.send(data);
                });

                tmp.on('data', function (data) {
                    p2pEngine.raiseIncomingData(tmp.peer, data);
                });

                tmp.on('close', function () {
                    p2pEngine.raiseDropConnection(tmp.peer);

                    decrementPeerCount();
                });

                tmp.on('error', function (err) {
                    // Do something...
                    //$scope.alerts.push({ type: "error", msg: 'Peer connection failed due to the following error: ' + err }));
                    $log.error(err);

                    decrementPeerCount();
                });
            });

            return tmp;
        }

        return {
            getConfig: getConfig,
            setPeerJSKey: setPeerJSKey,
            peerCount: function () { return peerCount; },
            connect: connectToPeer,
            pid: myP2PId,
            addData: syncEngine.addData,
            getData: syncEngine.dataCache
        };
    }]);
})(angular, Peer, uuid, P2P);
