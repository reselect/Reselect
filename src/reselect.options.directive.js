
Reselect.value('reselectChoicesOptions', {

});


Reselect.directive('reselectChoices', ['ChoiceParser', '$compile', 'LazyScroller', 'LazyContainer', function(ChoiceParser, $compile, LazyScroller, LazyContainer){
	return {
		restrict    : 'AE',
		templateUrl : 'templates/reselect.options.directive.tpl.html',
		require     : ['reselectChoices', '?^reselect'],
		transclude  : true,
		replace     : true,
 		compile: function(element, attrs){

			if(!attrs.options){
				// throw new Error('"reselect-options" directive requires the [options] attribute.');
			}

			return function($scope, $element, $attrs, $ctrls, transcludeFn){
				var $reselectChoices = $ctrls[0];
				var $Reselect = $ctrls[1];

				/**
				 * Manipulating the transluded html template taht is used to display
				 * each choice in the options list
				 */

				transcludeFn(function(clone){
					$reselectChoices.CHOICE_TEMPLATE.append(clone);
				});

				$reselectChoices.LazyDropdown.initialize($reselectChoices.CHOICE_TEMPLATE);
				$reselectChoices.LazyDropdown.renderContainer();
			};
		},
		controllerAs: '$options',
		controller: ['$scope', '$element', '$attrs', '$parse', '$http', function($scope, $element, $attrs, $parse, $http){
			var self = this;

			self.element      = $element[0];
			self.$container   = angular.element(self.element.querySelectorAll('.reselect-options-container'));
			self.$list        = angular.element(self.element.querySelectorAll('.reselect-options-list'));

			self.choiceHeight = 36;
			self.listHeight   = 300;

			self.choices      = [];

			self.CHOICE_TEMPLATE = angular.element('<li class="reselect-option reselect-option-choice" ng-click="$options._selectChoice($containerId)"></li>');
			self.CHOICE_TEMPLATE.attr('ng-class', '{\'reselect-option-choice--highlight\' : $options.activeIndex === $index }');
			self.CHOICE_TEMPLATE.attr('ng-mouseenter', '$options.activeIndex = $index');
			self.CHOICE_TEMPLATE.attr('ng-mouseleave', '$options.activeIndex = null');

			var $Reselect = $element.controller('reselect');

			/**
			 * Choices Functionalities
			 */

			if($attrs.options){
				self.parsedOptions = ChoiceParser.parse($attrs.options);

				$scope.$watchCollection(function(){
					return self.parsedOptions.source($scope.$parent);
				}, function(newChoices){
					self.updateChoices(newChoices);
					self.render($Reselect.choices);
				});

			}else if($attrs.remote){
				self.parsedOptions = $parse($attrs.remote)($scope.$parent);
				$http.get(self.parsedOptions.endpoint)
					.then(function(res){
						self.updateChoices(res.data.data.children);
						self.render($Reselect.choices);
					});
			}

			console.log(self.parsedOptions);

			self.updateChoices = function(choices, push){
				choices = choices || [];
				if(push === true){
					$Reselect.choices = self.choices = self.choices.concat(choices);
				}else{
					$Reselect.choices = self.choices = choices;
				}
			};

			/**
			 * Lazy Containers
			 *
			 * The goal is to used the minimum amount of DOM elements (containers)
			 * to display large amounts of data. Containers are shuffled and repositioned
			 * whenever the options list is scrolled.
			 */

			self.LazyDropdown = new LazyScroller($scope, {
 				container   : self.$container,
 				list        : self.$list,
 				choiceHeight: 36,
 				listHeight  : 300
 			});

			/**
			 * An index to simply track the highlighted or selected option
			 */

			self.activeIndex  = null;

			self._setActiveIndex = function(index){
				self.activeIndex = index;
			};

			/**
			 * Using the container id that is passed in, find the actual value by $eval the [value=""]
			 * from the directive with the scope of the lazy container
			 */

			self._selectChoice = function(containerId){
				var value = angular.copy(self.LazyDropdown.lazyContainers[containerId].scope.$eval($attrs.value));

				$Reselect.selectValue(value);
			};

			/**
			 * Rendering
			 */

			self.$parent = $element.parent();

			self.render = function(choices){
				self.LazyDropdown.choices = choices;

				self.LazyDropdown.renderContainer();
				self.LazyDropdown._calculateLazyRender(true);
			};
		}]
	};
}]);
