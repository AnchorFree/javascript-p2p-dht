// General Purpose Utility Functions
// ---------------------------------

// Read [annotated source code](http://www.explainjs.com/explain?src=https://raw.githubusercontent.com/AnchorFree/javascript-p2p-dht/master/p2p/Util.js)

(function(exports) {
    // Creates a namespace based on a string
    //   If separator is null, assumes . for separators
    //   If container is null, assumes default container (i.e. window)
    var namespace = function(name, separator, container){
      var ns = name.split(separator || '.'),
          o = container || exports,
          i, len;

      for (i = 0, len = ns.length; i < len; i++) {
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
        namespace: namespace,


        // Extend an object with properties from all subsequent objects as parameters.
        // If only one parameter is passed, this parameter will be merged to the P2P namespace.
        extend: function () {
            if (arguments.length == 1)
                return P2P.Util.extend(P2P, arguments[0]);

            var target = arguments[0];

            for (var key, i = 1, l = arguments.length; i < l; i++)
                for (key in arguments[i])
                    target[key] = arguments[i][key];

            return target;
        },


        // A logging function that appends each log entry to the #plog element in HTML
        // If a #plog element does not exist, it is appended to the body
        log: function() {
            var l = $('#plog');

            if (l.size === 0) {
                l = $('body').append('<div id="plog" style="color:#FF7500;text-shadow:none;padding:15px;background:#eee"><strong>Protocol status</strong>:<br></div>');
            }

            var copy = Array.prototype.slice.call(arguments).join(' ');
            l.append(copy + '<br>');
        }
    };
})(this);