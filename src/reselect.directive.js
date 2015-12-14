
angular.module('reselect.directive', ['reselect.controller', 'ngSanitize'])

.value('reselectDefaultOptions', {
	placeholderTemplate: function(){
		return 'Select an option';
	}
})

.directive('reselect', [function(){
	return {
		restrict    : 'AE',
		templateUrl : 'templates/reselect.directive.tpl.html',
		require     : ['^ngModel'],
		scope: {
			ngModel         : '=',
			reselectOptions : '='
		},
		controller: 'reselect.directive.ctrl'
	};
}]);