Reselect.directive('reselectSelection', function(){
    return {
        restrict: 'AE',
        replace: true,
        transclude: true,
        templateUrl: 'templates/reselect.selection.tpl.html',
        scope: {},
        controller: ['$scope', function($scope){
            // console.log($scope);
            return this;
        }]
    };
});
