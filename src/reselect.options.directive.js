Reselect.value('reselectChoicesOptions', {

});

Reselect.directive('triggerAtBottom', ['$parse', function($parse) {

	var height = function(elem) {
		elem = elem[0] || elem;
		if (isNaN(elem.offsetHeight)) {
			return elem.document.documentElement.clientHeight;
		} else {
			return elem.offsetHeight;
		}
	};

	function debounce(func, wait, immediate) {
		var timeout;
		return function() {
			var context = this, args = arguments;
			var later = function() {
				timeout = null;
				if (!immediate) func.apply(context, args);
			};
			var callNow = immediate && !timeout;
			clearTimeout(timeout);
			timeout = setTimeout(later, wait);
			if (callNow) func.apply(context, args);
		};
	}

	return {
		restrict: 'A',
		link: function($scope, $element, $attrs) {

			var scrolling = false;

			var triggerFn = debounce(function(){
				$parse($attrs.triggerAtBottom)($scope);
			}, 300);

			function checkScrollbarPosition() {
				if (height($element) + $element[0].scrollTop === 0 && $element[0].scrollHeight === 0) {
					return;
				}

				if (height($element) + $element[0].scrollTop >= $element[0].scrollHeight - 30) {
					triggerFn();
				}
				scrolling = false;
			}

			$element.on('scroll', function() {
				if (!scrolling) {
					if (!window.requestAnimationFrame) {
						setTimeout(checkScrollbarPosition, 300);
					} else {
						window.requestAnimationFrame(checkScrollbarPosition);
					}
					scrolling = true;
				}
			});

			checkScrollbarPosition();
		}
	};
}]);

Reselect.directive('reselectChoices', ['ChoiceParser', '$compile',
	'LazyScroller', 'LazyContainer',
	function(ChoiceParser, $compile, LazyScroller, LazyContainer) {
		return {
			restrict: 'AE',
			templateUrl: 'templates/reselect.options.directive.tpl.html',
			require: ['reselectChoices', '?^reselect'],
			transclude: true,
			replace: true,
			compile: function(element, attrs) {

				if (!attrs.options && !attrs.remote) {
					throw new Error('"reselect-options" directive requires the [options] or [remote] attribute.');
				}

				return function($scope, $element, $attrs, $ctrls, transcludeFn) {
					var $reselectChoices = $ctrls[0];
					var $Reselect = $ctrls[1];

					/**
					 * Manipulating the transluded html template taht is used to display
					 * each choice in the options list
					 */

					transcludeFn(function(clone) {
						$reselectChoices.CHOICE_TEMPLATE.append(clone);
					});

					$reselectChoices.LazyDropdown.initialize($reselectChoices.CHOICE_TEMPLATE);
					$reselectChoices.LazyDropdown.renderContainer();
				};
			},
			controllerAs: '$options',
			controller: ['$scope', '$element', '$attrs', '$parse', '$http',
				'ReselectDataAdapter', 'ReselectAjaxDataAdapter',
				function($scope, $element, $attrs, $parse, $http, ReselectDataAdapter,
					ReselectAjaxDataAdapter) {
					var self = this;

					self.element = $element[0];
					self.$container = angular.element(self.element.querySelectorAll(
						'.reselect-options-container'));
					self.$list = angular.element(self.element.querySelectorAll(
						'.reselect-options-list'));

					self.choiceHeight = 36;
					self.listHeight = 300;

					self.search_term = '';
					self.choices = [];
					self.remotePagination = {};

					self.CHOICE_TEMPLATE = angular.element(
						'<li class="reselect-option reselect-option-choice" ng-click="$options._selectChoice($containerId)"></li>'
					);
					self.CHOICE_TEMPLATE.attr('ng-class',
						'{\'reselect-option-choice--highlight\' : $options.activeIndex === $index }'
					);
					self.CHOICE_TEMPLATE.attr('ng-mouseenter',
						'$options.activeIndex = $index');
					self.CHOICE_TEMPLATE.attr('ng-mouseleave',
						'$options.activeIndex = null');

					var $Reselect = $element.controller('reselect');

					/**
					 * Choices Functionalities
					 */

					self.DataAdapter = null;

					if ($attrs.options) {
						self.parsedOptions = ChoiceParser.parse($attrs.options);

						self.DataAdapter = new ReselectDataAdapter();

						self.DataAdapter.observe = function(onChange) {
							$scope.$watchCollection(function() {
								return self.parsedOptions.source($scope.$parent);
							}, function(newChoices) {
								self.choices = self.DataAdapter.updateData(newChoices);
							});
						};

					} else if ($attrs.remote) {
						self.parsedOptions = $parse($attrs.remote)($scope.$parent);

						self.DataAdapter = new ReselectAjaxDataAdapter(self.parsedOptions);

						self.DataAdapter.prepareGetData = function(){
							self.choices = self.DataAdapter.updateData(self.choices, []);
							self.render();
						};
					}

					self.DataAdapter.init();

					self.getData = function(reset, loadingMore) {
						if(reset === true){
							self.DataAdapter.prepareGetData();
						}
						self.DataAdapter.getData(self.search_term)
							.then(function(choices) {
								self.choices = self.DataAdapter.updateData(self.choices, choices.data, loadingMore);
								self.render();
							});
					};

					self.loadMore = function() {
						self.getData(false, true);
					};

					/**
					 * Lazy Containers
					 *
					 * The goal is to used the minimum amount of DOM elements (containers)
					 * to display large amounts of data. Containers are shuffled and repositioned
					 * whenever the options list is scrolled.
					 */

					self.LazyDropdown = new LazyScroller($scope, {
						container: self.$container,
						list: self.$list,
						choiceHeight: 36,
						listHeight: 300
					});

					/**
					 * An index to simply track the highlighted or selected option
					 */

					self.activeIndex = null;

					self._setActiveIndex = function(index) {
						self.activeIndex = index;
					};

					/**
					 * Using the container id that is passed in, find the actual value by $eval the [value=""]
					 * from the directive with the scope of the lazy container
					 */

					self._selectChoice = function(containerId) {
						var value = angular.copy(self.LazyDropdown.lazyContainers[containerId]
							.scope.$eval($attrs.value));

						$Reselect.selectValue(value);
					};

					/**
					 * Rendering
					 */

					self.$parent = $element.parent();

					self.render = function(choices) {
						self.LazyDropdown.choices = choices || self.choices;

						var dimensions = self.LazyDropdown.renderContainer();
						self.LazyDropdown._calculateLazyRender(true);

						if(self.LazyDropdown.choices && self.LazyDropdown.choices.length && (dimensions.containerHeight >= dimensions.choiceHeight)){
							self.loadMore();
						}
					};
				}
			]
		};
	}
]);
