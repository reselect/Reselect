Reselect.directive('reselectNoChoice', ['$templateCache', function($templateCache){
    return {
        restrict: 'AE',
        replace: true,
        transclude: true,
        template: $templateCache.get('templates/reselect-no-choice.directive.tpl.html')
    };
}]);
