Reselect.directive('reselectSticky', ['$templateCache', function($templateCache){
    return {
        restrict: 'AE',
        replace: true,
        transclude: true,
        template: $templateCache.get('templates/reselect.sticky.tpl.html')
    };
}]);
