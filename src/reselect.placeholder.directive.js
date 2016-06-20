Reselect.directive('reselectPlaceholder', ['$templateCache', function($templateCache){
    return {
        restrict: 'AE',
        replace: true,
        transclude: true,
        template: $templateCache.get('templates/reselect.placeholder.tpl.html')
    };
}]);
