// General Purpose Utility Functions
// ---------------------------------

// Read [annotated source code](http://www.explainjs.com/explain?src=https://raw.githubusercontent.com/AnchorFree/javascript-p2p-dht/master/p2p/Util.js)

(function(exports) {
    // Creates a namespace based on a string
    //   If separator is null, assumes . for separators
    //   If container is null, assumes default container (i.e. window)
    var namespace = function(name, separator, container) {
        var ns = name.split(separator || '.'), o = container || exports, i, len;

        for ( i = 0, len = ns.length; i < len; i++) {
            o = o[ns[i]] = o[ns[i]] || {};
        }

        return o;
    };

    namespace('P2P.Util');

    // P2P Version Number (keep in sync)
    P2P.Version = '1.0';

    // Utility Singleton
    // -----------------
    P2P.Util = {
        namespace : namespace,

        // Extend an object with properties from all subsequent objects as parameters.
        // If only one parameter is passed, this parameter will be merged to the P2P namespace.
        extend : function() {
            if (arguments.length == 1)
                return P2P.Util.extend(P2P, arguments[0]);

            var target = arguments[0];

            for (var key, i = 1, l = arguments.length; i < l; i++)
                for (key in arguments[i])
                    target[key] = arguments[i][key];

            return target;
        },

        inherits : function(ctor, superCtor) {
            ctor.super_ = superCtor;
            ctor.prototype = Object.create(superCtor.prototype, {
                constructor : {
                    value : ctor,
                    enumerable : false,
                    writable : true,
                    configurable : true
                }
            });
        },

        // A logging function that appends each log entry to the #plog element in HTML
        // If a #plog element does not exist, it is appended to the body
        log : function() {
            var l = $('#plog');

            if (l.size === 0) {
                l = $('body').append('<div id="plog" style="color:#FF7500;text-shadow:none;padding:15px;background:#eee"><strong>Protocol status</strong>:<br></div>');
            }

            var copy = Array.prototype.slice.call(arguments).join(' ');
            l.append(copy + '<br>');
        }
    };

    /**
     * Light EventEmitter. Ported from Node.js/events.js
     * Eric Zhang
     *
     * Creates an object with event registering and firing methods
     */
    P2P.Util.EventEmitter = function() {
        // Initialise required storage variables
        this._events = {};
    };

    var isArray = Array.isArray;

    P2P.Util.EventEmitter.prototype.addListener = function(type, listener, scope, once) {
        if ('function' !== typeof listener) {
            throw new Error('addListener only takes instances of Function');
        }

        // To avoid recursion in the case that type == "newListeners"! Before
        // adding it to the listeners, first emit "newListeners".
        this.emit('newListener', type, typeof listener.listener === 'function' ? listener.listener : listener);

        if (!this._events[type]) {
            // Optimize the case of one listener. Don't need the extra array object.
            this._events[type] = listener;
        } else if (isArray(this._events[type])) {
            // If we've already got an array, just append.
            this._events[type].push(listener);
        } else {
            // Adding the second element, need to change to array.
            this._events[type] = [this._events[type], listener];
        }

        return this;
    };

    P2P.Util.EventEmitter.prototype.on = P2P.Util.EventEmitter.prototype.addListener;

    P2P.Util.EventEmitter.prototype.once = function(type, listener, scope) {
        if ('function' !== typeof listener) {
            throw new Error('.once only takes instances of Function');
        }

        var self = this;

        function g() {
            self.removeListener(type, g);
            listener.apply(this, arguments);
        };

        g.listener = listener;
        self.on(type, g);

        return this;
    };

    P2P.Util.EventEmitter.prototype.removeListener = function(type, listener, scope) {
        if ('function' !== typeof listener) {
            throw new Error('removeListener only takes instances of Function');
        }

        // does not use listeners(), so no side effect of creating _events[type]
        if (!this._events[type])
            return this;

        var list = this._events[type];

        if (isArray(list)) {
            var position = -1;

            for (var i = 0, length = list.length; i < length; i++) {
                if (list[i] === listener || (list[i].listener && list[i].listener === listener)) {
                    position = i;
                    break;
                }
            }

            if (position < 0)
                return this;

            list.splice(position, 1);

            if (list.length == 0)
                delete this._events[type];
        } else if (list === listener || (list.listener && list.listener === listener)) {
            delete this._events[type];
        }

        return this;
    };

    P2P.Util.EventEmitter.prototype.off = P2P.Util.EventEmitter.prototype.removeListener;

    P2P.Util.EventEmitter.prototype.removeAllListeners = function(type) {
        if (arguments.length === 0) {
            this._events = {};
            return this;
        }

        // does not use listeners(), so no side effect of creating _events[type]
        if (type && this._events && this._events[type])
            this._events[type] = null;
        return this;
    };

    P2P.Util.EventEmitter.prototype.listeners = function(type) {
        if (!this._events[type])
            this._events[type] = [];

        if (!isArray(this._events[type])) {
            this._events[type] = [this._events[type]];
        }

        return this._events[type];
    };

    P2P.Util.EventEmitter.prototype.emit = function(type) {
        var type = arguments[0];
        var handler = this._events[type];

        if (!handler)
            return false;

        if ( typeof handler == 'function') {
            switch (arguments.length) {
                // fast cases
                case 1:
                    handler.call(this);
                    break;
                case 2:
                    handler.call(this, arguments[1]);
                    break;
                case 3:
                    handler.call(this, arguments[1], arguments[2]);
                    break;
                // slower
                default:
                    var l = arguments.length;
                    var args = new Array(l - 1);

                    for (var i = 1; i < l; i++)
                        args[i - 1] = arguments[i];

                    handler.apply(this, args);
            }

            return true;

        } else if (isArray(handler)) {
            var l = arguments.length;
            var args = new Array(l - 1);

            for (var i = 1; i < l; i++)
                args[i - 1] = arguments[i];

            var listeners = handler.slice();

            for (var i = 0, l = listeners.length; i < l; i++) {
                listeners[i].apply(this, args);
            }

            return true;
        } else {
            return false;
        }
    };
})(this);
