/**
 * Filter credited to https://github.com/Rokt33r/
 * https://gist.github.com/Rokt33r/569f518eddcce5e01a4a
 */

Reselect.filter('rsPropsFilter', function() {
    return function(items, props) {
        var out = [];
        if (angular.isArray(items)) {
            items.forEach(function(item) {
                var itemMatches = false;

                var keys = Object.keys(props);
                for (var i = 0; i < keys.length; i++) {
                    if(angular.isUndefined(props[prop])){
                        itemMatches = true;
                        break;
                    }
                    var prop = keys[i];
                    var text = props[prop].toLowerCase();
                    if (item[prop].toString().toLowerCase()
                        .indexOf(text) !== -1) {
                        itemMatches = true;
                        break;
                    }
                }

                if (itemMatches) {
                    out.push(item);
                }
            });
        } else {
            // Let the output be the input untouched
            out = items;
        }

        return out;
    };
});
