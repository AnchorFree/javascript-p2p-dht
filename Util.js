var Util = {
    guid: function () {
        return uuid.v4();
    },
    log: function () {
        var l = $('.plog');
        
        if (l.size === 0) {
            l = $('body').append('<div class="plog" style="color:#FF7500;text-shadow:none;padding:15px;background:#eee"><strong>Protocol status</strong>:<br></div>');
        }
        
        var copy = Array.prototype.slice.call(arguments).join(' ');
        l.append(copy + '<br>');
    }
}