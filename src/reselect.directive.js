
angular.module('reselect.directive', ['reselect.controller', 'reselect.options.directive', 'ngSanitize'])

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
		transclude  : true,
		scope: {
			ngModel         : '=',
			reselectOptions : '='
		},
		compile: function($element, $attrs, transcludeFn){
			transcludeFn($element, function(clone){
				console.log(clone[1].tagName);
			});
		},
		link: function($scope, $element){
			console.log($element.html());
		},
		controller: 'reselect.directive.ctrl'
	};
}]);