Reselect.directive('reselectSelection', function(){
    return {
        restrict: 'AE',
        replace: true,
        transclude: true,
        templateUrl: 'templates/reselect.selection.tpl.html',
        require: '^reselect',
        scope: {},
        link: function($scope, $element, $attrs, $Reselect, transclude){
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
});
