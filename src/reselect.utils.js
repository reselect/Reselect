Reselect.run(['$rootScope', '$http', function ($rootScope, $http) {
    $rootScope.$safeApply = function (fn) {
        if(!this.$root) {
            return fn();
        }
        var phase = this.$root.$$phase;
        if (phase == '$apply' || phase == '$digest') {
            if (fn && (typeof(fn) === 'function')) {
                fn();
            }
        } else {
            this.$apply(fn);
        }
    };
}]);

Reselect.factory('ReselectUtils', ['$timeout', function($timeout){
    var ReselectUtils = {
        debounce: function(func, wait, immediate, immediateFn) {
    		var timeout;
    		return function() {
    			var context = this, args = arguments;
    			var later = function() {
    				timeout = null;
    				if (!immediate) func.apply(context, args);
    			};
    			var callNow = immediate && !timeout;
    			clearTimeout(timeout);
    			timeout = setTimeout(later, wait);
    			if (callNow) func.apply(context, args);
                if (!timeout, immediateFn) immediateFn.apply(context, args);
    		};
    	},
        requstAnimFrame: function() {
            return  (window.requestAnimationFrame   ||
                window.webkitRequestAnimationFrame ||
                window.mozRequestAnimationFrame    ||
                window.oRequestAnimationFrame      ||
                window.msRequestAnimationFrame     ||
                $timeout);
        }
    };

    return ReselectUtils;
}]);

Reselect.filter('rshighlight', ['$sce', function($sce){
    return function(target, str){
        var result, matches, re;
        var match_class = "reselect-text-match";

		re = new RegExp(str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'ig');
		if (!angular.isDefined(target) || target === null) {
			return;
		}

		if (!str) {
			return target;
		}

		if (!target.match || !target.replace) {
			target = target.toString();
		}
		matches = target.match(re);
		if (matches) {
			result = target.replace(re, '<span class="' + match_class + '">' + matches[0] + '</span>');
		} else {
			result = target;
		}

		return $sce.trustAsHtml(result);
    };
}]);

Reselect.directive('focusOn', ['$timeout', function($timeout){
    return {
        restrict: 'A',
        link: function($scope, $elem, $attrs){
            $scope.$on($attrs.focusOn, function(){
                $timeout(function(){
                    $elem[0].focus();
                });
            });
        }
    };
}]);

Reselect.directive('blurOn', ['$timeout', function($timeout){
    return {
        restrict: 'A',
        link: function($scope, $elem, $attrs){
            $scope.$on($attrs.blurOn, function(){
                $timeout(function(){
                    $elem[0].blur();
                });
            });
        }
    };
}]);
