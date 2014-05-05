(function(exports) {
    // General Purpose Utility Functions
    // ---------------------------------
    
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
        namespace: namespace;
        
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
    }
})(this);