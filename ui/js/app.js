(function() {'use strict';
    var app = angular.module('app', ['ngRoute', 'ui.bootstrap']);

    /**
     * Manage the different views of the demo using routes.
     *
     * Default view is /dashboard
     */
    app.config(['$routeProvider', function($routeProvider) {
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
    app.controller('SidebarController', ['$scope', '$location', 'peerJS', function($scope, $location, peerJS) {
        $scope.isActive = function(viewLocation) {
            return viewLocation === $location.path();
        };

        $scope.peerJsKeySet = function() {
            return peerJS.getConfig().key !== null;
        };

        $scope.navigateIfPeerJsKeySet = function(viewLocation) {
            return peerJS.getConfig().key === null ? '#' : viewLocation;
        };
    }]);

    /**
     * Main controller responsible for managing the PeerJS key entry form.
     */
    app.controller('P2PCtrl', ['$scope', 'peerJS', function($scope, peerJS) {
        $scope.name = 'P2PCtrl';

        $scope.peerJSKey = peerJS.getConfig().key;
        $scope.alerts = [];

        $scope.isPeerJSKeySet = function() {
            var c = peerJS.getConfig();

            return typeof c.key === 'string' && peerJS.getConfig().key.length > 0;
        };

        $scope.updatePeerJSKey = function () {
            peerJS.setPeerJSKey($scope.peerJSKey);

            // TODO: Actually verify if the key is valid

            $scope.alerts = [{ type: 'success', msg: 'Well done! Are ready to start using the demos from the menu.' }];
        };

        $scope.closeAlert = function(index) {
            $scope.alerts.splice(index, 1);
        };
    }]);

    /**
     * SyncCtrl
     * ---
     *
     * Runs the demo of the Sync overlay for P2P
     */
    app.controller('SyncCtrl', ['$scope', 'peerJS', function($scope, peerJS) {
        $scope.name = 'SyncCtrl';

        $scope.alerts = [];

        // Initialize the P2P System
        $scope.myP2PId = uuid.v4();
        $scope.findingPeersStatus = 0;

        // Create a new PeerJS object
        var peer = new Peer($scope.myP2PId, peerJS.getConfig());

        var p2pEngine = new P2P.Protocol({
            pid: $scope.myP2PId
        });

        // Connect to some list of well-known good peers
        var tracker;

        $scope.connectToCloud = function() {
            if (typeof tracker !== 'undefined') return;

            tracker = peer.connect('TRACKER');

            tracker.on('open', function() {
                $scope.findingPeersStatus = 25;

                tracker.send('bootstrap');

                $scope.alerts.push({ type: "success", msg: "Connected to TRACKER." });
            });

            tracker.on('data', function(data) {
                $scope.findingPeersStatus = 50;

                if (data instanceof Array) {
                    data.forEach(function(element) {
                        connectToPeer(element, function() {
                            $scope.findingPeersStatus = $scope.findingPeersStatus + (50 / data.length);
                        });
                    });
                }
            });

            tracker.on('error', function (err) {
                $scope.alerts.push({ type: "error", msg: err });
            });
        };

        function connectToPeer(peerConnId, onConnect) {
            var tmp;

            if ($scope.myP2PId !== peerConnId) {
                tmp = peer.connect(peerConnId, {
                    label: 'peer'
                });

                tmp.on('open', function() {
                    p2pEngine.raiseIncomingConnection(tmp.peer, function(data) {
                        tmp.send(data);
                    });

                    tmp.on('data', function(data) {
                        p2pEngine.raiseIncomingData(tmp.peer, data);
                    });

                    tmp.on('close', function() {
                        p2pEngine.raiseDropConnection(tmp.peer);
                    });

                    tmp.on('error', function(err) {
                        // Do something...
                    });

                    if ( typeof onConnect === 'function') {
                        onConnect(tmp);
                    } else if ( typeof onConnect === 'object') {
                        tmp.send(onConnect);
                    }
                });
            }
        }

        $scope.closeAlert = function(index) {
            $scope.alerts.splice(index, 1);
        };
    }]);

    app.controller('DHTCtrl', ['$scope', function($scope) {
        $scope.name = 'DHTCtrl';
    }]);

    app.factory('peerJS', ['$window', '$log', function(win, $log) {
        var peerJSconfig = {
            key: null,

            // Set highest debug level (log everything!).
            debug: 3,

            // Set a logging function:
            logFunction: function() {
                $log.log(arguments);
            },

            // Use a STUN/TURN server for more network support
            // @formatter:off
            config: {
                'iceServers': [{ url: 'stun:stun01.sipphone.com'},
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
                    {url: 'turn:192.158.29.39:3478?transport=tcp', credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA=', username: '28224511:1379330808'}]
            }
            // @formatter:on
        };

        function getConfig() {
            return peerJSconfig;
        };

        function setPeerJSKey(key) {
            peerJSconfig.key = key;
        };

        return {
            getConfig: getConfig,
            setPeerJSKey: setPeerJSKey
        };
    }]);
})();
