Reselect.directive('reselectSelection', ['$templateCache', function($templateCache){
    return {
        restrict: 'AE',
        replace: true,
        transclude: true,
        template: $templateCache.get('templates/reselect.selection.tpl.html'),
        scope: {},
        link: function($scope, $element, $attrs, ctrls, transclude){
            transclude($scope, function(clone){
                $element.append(clone);
            });
        },
        controller: ['$scope', function($scope){
            $scope.$selection = null;
            $scope.$choice = null;

            $scope.$on('reselect.renderselection', function(event, selection){
                angular.extend($scope, selection);
            });
        }]
    };
}]);
