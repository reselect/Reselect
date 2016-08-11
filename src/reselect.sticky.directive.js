Reselect.directive('reselectSticky', ['$templateCache', function($templateCache){
    return {
        restrict: 'AE',
        replace: true,
        transclude: true,
        template: $templateCache.get('templates/reselect.sticky.tpl.html'),
        link: function($scope, $element){
            $element.on('click', function(){
                $scope.$apply(function(){
                    $scope.$reselect.hideDropdown();
                });
            });
        }
    };
}]);
