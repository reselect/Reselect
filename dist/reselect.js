/*!
 * reselect
 * https://github.com/alexcheuk/Reselect
 * Version: 0.0.1 - 2015-12-25T05:27:21.744Z
 * License: MIT
 */


(function () { 
'use strict';
/**
 * Common shared functionalities
 */
/**
 * Reselect base
 */

var Reselect = angular.module('Reselect', ['reselect.templates']);

var ReselectDirectiveCtrl = function($scope, reselectDefaultOptions){
	var ctrl = $scope.reselect = this;

	// Options
	ctrl.options = angular.extend({}, $scope.reselectOptions, reselectDefaultOptions);

	ctrl.rendered_placeholder = ctrl.options.placeholderTemplate();
};

ReselectDirectiveCtrl.$inject = ['$scope', 'reselectDefaultOptions'];

angular
	.module('reselect.controller', [])
	.controller('reselect.directive.ctrl', ReselectDirectiveCtrl);

Reselect.value('reselectDefaultOptions', {
	placeholderTemplate: function(){
		return 'Select an option';
	}
})

.directive('reselect', [function(){
	return {
		restrict    : 'AE',
		templateUrl : 'templates/reselect.directive.tpl.html',
		require     : ['^reselect', '^ngModel'],
		transclude  : true,
		scope: {
			ngModel         : '=',
			reselectOptions : '='
		},
		compile: function($element, $attrs, transcludeFn){

			return function($scope, $element, $attrs, ctrls){
				transcludeFn($scope, function(clone){
					$element.append(clone[1]);
				});
			};
			
		},
		controllerAs: '$reselect',
		controller: ['$scope', 'reselectDefaultOptions', function($scope, reselectDefaultOptions){
			
			var ctrl = this;

			// Options
			ctrl.options = angular.extend({}, $scope.reselectOptions, reselectDefaultOptions);

			ctrl.rendered_placeholder = ctrl.options.placeholderTemplate();

			ctrl.selectValue = function(value){
				$scope.ngModel = value;
			};

			return ctrl;
		}]
	};
}]);
angular.module("reselect.templates", []).run(["$templateCache", function($templateCache) {$templateCache.put("templates/reselect.choice.tpl.html","");
$templateCache.put("templates/reselect.directive.tpl.html","<div class=\"reselect-container\"><input type=\"hidden\" value=\"{{ngModel}}\"><div class=\"reselect-selection\"><div class=\"reselect-rendered reselect-rendered-selection\" ng-if=\"false\" ng-bind=\"reselect.rendered_selection\"></div><div class=\"reselect-rendered reselect-rendered-placeholder\" ng-if=\"true\" ng-bind=\"reselect.rendered_placeholder\"></div><div class=\"reselect-input-container\"><input class=\"reselect-text-input\" readonly=\"readonly\" ng-if=\"true\"></div><div class=\"reselect-arrow-container\"><div class=\"reselect-arrow\"></div></div></div></div>");
$templateCache.put("templates/reselect.options.directive.tpl.html","<div class=\"reselect-options-container\"><ul class=\"reselect-options-list\"></ul></div>");}]);

Reselect.value('reselectChoicesOptions', {

});

Reselect.directive('reselectChoices', ['ChoiceParser', '$compile', function(ChoiceParser, $compile){
	return {
		restrict    : 'AE',
		templateUrl : 'templates/reselect.options.directive.tpl.html',
		require     : '^reselect',
		transclude  : true,
		compile: function(element, attrs){

			if(!attrs.options){
				throw new Error('"reselect-options" directive requires the [options] attribute.');
			}

			return function($scope, $element, $attrs, $Reselect, transcludeFn){
				var self = $scope.choices = {};

				
				self.CHOICE_TEMPLATE = null;

				transcludeFn(function(clone){
					self.CHOICE_TEMPLATE = angular.element('<li class="reselect-option reselect-option-choice" ng-click="choices.selectChoice($containerId)"></li>');
					self.CHOICE_TEMPLATE.append(clone);
				});

				self.parsedOptions = ChoiceParser.parse($attrs.options);
				self.choices       = self.parsedOptions.source($scope.$parent);

				var element    = $element[0];
				var $container = angular.element(element.querySelectorAll('.reselect-options-container'));
				var $list      = angular.element(element.querySelectorAll('.reselect-options-list'));

				self.choiceHeight = 32;
				self.listHeight = 300;
				var numLazyContainers = Math.ceil((self.listHeight)/ self.choiceHeight) + 2;

				self.selectChoice = function(containerId){
					var value = angular.copy(self.lazyContainers[containerId].scope.$eval($attrs.value));

					$Reselect.selectValue(value);
				};

				// Debug

				$container.css('height', self.listHeight + 'px');
				$list.css('height', (self.choiceHeight * self.choices.length) + 'px');

				self.lazyContainers = [];
				
				self._calculate = function(){

					for(var i = 0; i < numLazyContainers; i++){

						var $choice = self.CHOICE_TEMPLATE.clone();

						var lazyScope = $scope.$new();
							lazyScope.$choice = {};

						$compile($choice)(lazyScope);

						self.lazyContainers.push({
							containerId : i,
							element     : $choice,
							scope       : lazyScope
						});

						$list.append($choice);
					}
				};

				// Lazy Load

				var lastCheck = null;
				var lastScrollTop;
				var scrollDirection = null;

				self._calculateLazyRender = function(){
					var scrollTop = $container[0].scrollTop;

					if(scrollTop > lastScrollTop){
						scrollDirection = 'down';
					}else if(scrollTop < lastScrollTop){
						scrollDirection = 'up';
					}

					lastScrollTop = scrollTop;

					if(typeof lastCheck === 'number' && (scrollTop <= lastCheck + self.choiceHeight && scrollTop >= lastCheck - self.choiceHeight)){
						return;
					}

					// console.clear();

					// console.debug('lastCheck: ' + lastCheck);
					
					var activeContainers = [];
					var inactiveContainers = [];


					angular.forEach(self.lazyContainers, function(lazyContainer, index){
						// Check if element is visible
						var choiceTop = (lazyContainer.index) * self.choiceHeight || 0;
						// console.debug('Container #' + (index + 1) + ': ', choiceTop);

						if(angular.isUndefined(lazyContainer.index) || choiceTop < scrollTop - self.choiceHeight || choiceTop > scrollTop + self.listHeight + self.choiceHeight){
							lazyContainer.element.addClass('inactive').removeClass('active');
							inactiveContainers.push(lazyContainer);
						}else{
							lazyContainer.element.addClass('active').removeClass('inactive');
							activeContainers.push(lazyContainer);
						}
					});

					var indexInDisplay = activeContainers.map(function(container){
						return container.index;
					});

					var indexToRenderStart = Math.floor(scrollTop / self.choiceHeight);
						indexToRenderStart = indexToRenderStart < 0 ? 0 : indexToRenderStart;
					// var indexToRenderEnd = indexToRenderStart + numLazyContainers;
					var indexToRenderEnd = Math.ceil((scrollTop + self.listHeight) / self.choiceHeight);
						indexToRenderEnd = indexToRenderEnd >= self.choices.length ? self.choices.length : indexToRenderEnd;

					// console.log('Index Start', indexToRenderStart);
					// console.log('Index End', indexToRenderEnd);

					for(var i = indexToRenderStart; i < indexToRenderEnd; i++){
						if(indexInDisplay.indexOf(i) >= 0){
							continue;
						}else{
							var container = inactiveContainers.shift();

							if(container){
								container.element.addClass('active').removeClass('inactive');

								container.element.css('top', ((i) * self.choiceHeight) + 'px');

								container.index = i;

								container.scope.$containerId = container.containerId;
								container.scope.$index = i;
								angular.extend(container.scope.$choice, self.choices[i]);

								container.scope.$evalAsync();
							}else{
								// console.error('not enough');
							}							
						}
					}
					
					lastCheck = scrollTop;
				};

				$container.on('scroll', function(){
					window.requestAnimationFrame(function(){
						self._calculateLazyRender();
					});
				});

				// Init
				
				window.up = self._calculateLazyRender;
				self._calculate();
				self._calculateLazyRender();
			};
		}
	};
}]);

/**
 * Service to parse choice "options" attribute
 *
 * Services credited to angular-ui team
 * https://github.com/angular-ui/ui-select/blob/master/src/uisRepeatParserService.js
 * 
 */

Reselect.service('ChoiceParser', ['$parse', function($parse) {

	var self = this;

	self.parse = function(expression) {


		var match;
		var isObjectCollection = /\(\s*([\$\w][\$\w]*)\s*,\s*([\$\w][\$\w]*)\s*\)/.test(expression);
		// If an array is used as collection

		// if (isObjectCollection){
		//00000000000000000000000000000111111111000000000000000222222222222220033333333333333333333330000444444444444444444000000000000000556666660000077777777777755000000000000000000000088888880000000
		match = expression.match(/^\s*(?:([\s\S]+?)\s+as\s+)?(?:([\$\w][\$\w]*)|(?:\(\s*([\$\w][\$\w]*)\s*,\s*([\$\w][\$\w]*)\s*\)))\s+in\s+(([\w\.]+)?\s*(|\s*[\s\S]+?))?(?:\s+track\s+by\s+([\s\S]+?))?\s*$/);

		// 1 Alias
		// 2 Item
		// 3 Key on (key,value)
		// 4 Value on (key,value)
		// 5 Collection expresion (only used when using an array collection)
		// 6 Object that will be converted to Array when using (key,value) syntax
		// 7 Filters that will be applied to #6 when using (key,value) syntax
		// 8 Track by

		// if (!match) {
		// 	throw uiSelectMinErr('iexp', "Expected expression in form of '_item_ in _collection_[ track by _id_]' but got '{0}'.",
		// 		expression);
		// }
		// if (!match[6] && isObjectCollection) {
		// 	throw uiSelectMinErr('iexp', "Expected expression in form of '_item_ as (_key_, _item_) in _ObjCollection_ [ track by _id_]' but got '{0}'.",
		// 		expression);
		// }

		return {
			itemName: match[4] || match[2], // (lhs) Left-hand side,
			keyName: match[3], //for (key, value) syntax
			source: $parse(!match[3] ? match[5] : match[6]),
			sourceName: match[6],
			filters: match[7],
			trackByExp: match[8],
			modelMapper: $parse(match[1] || match[4] || match[2]),
			repeatExpression: function(grouped) {
				var expression = this.itemName + ' in ' + (grouped ? '$group.items' : '$select.items');
				if (this.trackByExp) {
					expression += ' track by ' + this.trackByExp;
				}
				return expression;
			}
		};

	};

}]);
}());