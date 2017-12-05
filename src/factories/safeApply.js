export default angular.module('reselect.factory.safeApply', [])
    .factory('safeApply', ['$rootScope', function ($rootScope) {
        return function ($scope, fn) {
            if (!$scope.$root) {
                return fn()
            }
            var phase = $scope.$root.$$phase
            if (phase === '$apply' || phase === '$digest') {
                if (fn) {
                    $scope.$eval(fn)
                }
            } else {
                if (fn) {
                    $scope.$apply(fn)
                } else {
                    $scope.$apply()
                }
            }
        }
    }])
    .name
