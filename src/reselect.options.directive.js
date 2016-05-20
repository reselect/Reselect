Reselect.value('reselectChoicesOptions', {
	noOptionsText: 'No Options'
});

Reselect.directive('triggerAtBottom', ['$parse', 'ReselectUtils', function($parse, ReselectUtils) {

	var height = function(elem) {
		elem = elem[0] || elem;
		if (isNaN(elem.offsetHeight)) {
			return elem.document.documentElement.clientHeight;
		} else {
			return elem.offsetHeight;
		}
	};

	return {
		restrict: 'A',
		link: function($scope, $element, $attrs) {

			var scrolling = false;

			var triggerFn = ReselectUtils.debounce(function(){
				$parse($attrs.triggerAtBottom)($scope);
			}, 150);

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
	'LazyScroller', 'LazyContainer', 'ReselectUtils', 'reselectChoicesOptions',
	function(ChoiceParser, $compile, LazyScroller, LazyContainer, ReselectUtils, reselectChoicesOptions) {
		return {
			restrict: 'AE',
			templateUrl: 'templates/reselect.options.directive.tpl.html',
			require: ['reselectChoices', '?^reselect'],
			transclude: true,
			replace: true,
			compile: function(element, attrs) {

				if (!attrs.options) {
					console.warn('[reselect-options] directive requires the [options] attribute.');
					return;
				}

				return function($scope, $element, $attrs, $ctrls, transcludeFn) {
					var $reselectChoices = $ctrls[0];
					var $Reselect = $ctrls[1];

					/**
					 * Manipulating the transluded html template taht is used to display
					 * each choice in the options list
					 */

					transcludeFn(function(clone, scope) {
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

					var $Reselect = $element.controller('reselect');

					var self = this;

					self.element = $element[0];
					self.$container = angular.element(self.element.querySelectorAll(
						'.reselect-options-container'));
					self.$list = angular.element(self.element.querySelectorAll(
						'.reselect-options-list'));

					self.choiceHeight = 36;
					self.listHeight = 300;

					self.remotePagination = {};

					self.haveChoices = false;

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


					/**
					 * Options
					 */

					self.options = angular.extend({}, reselectChoicesOptions, $attrs.reselectChoices || {});

					self.options.noOptionsText = $attrs.noOptionsText || self.options.noOptionsText;

					/**
					 * Choices Functionalities
					 */

					$Reselect.parsedOptions = ChoiceParser.parse($attrs.options);

					if ($attrs.remote) {
						self.remoteOptions = $parse($attrs.remote)($scope.$parent);

						$Reselect.DataAdapter = new ReselectAjaxDataAdapter(self.remoteOptions, $Reselect.parsedOptions);

						$Reselect.DataAdapter.prepareGetData = function(){
							$Reselect.DataAdapter.page = 1;
							$Reselect.DataAdapter.pagination = {};
							$Reselect.DataAdapter.updateData([]);
							self.render();
						};
					} else {
						$Reselect.DataAdapter = new ReselectDataAdapter();
						$Reselect.DataAdapter.updateData($Reselect.parsedOptions.source($scope.$parent));

						$Reselect.DataAdapter.observe = function(onChange) {
							$scope.$watchCollection(function() {
								return $Reselect.parsedOptions.source($scope.$parent);
							}, function(newChoices) {
								$Reselect.DataAdapter.updateData(newChoices);
							});
						};

					}

					$Reselect.DataAdapter.init();

					self.getData = function(reset, loadingMore) {
						if(reset === true){
							$Reselect.DataAdapter.prepareGetData();
						}

						self.is_loading = true;

						$Reselect.DataAdapter.getData($Reselect.search_term)
							.then(function(choices) {
								if(!$Reselect.search_term){
									$Reselect.DataAdapter.updateData(choices.data, loadingMore);
									self.render();
								}else{
									self.render(choices.data);
								}
							})
							.finally(function(){
								self.is_loading = false;
							});
					};

					/**
					 * Load More function
					 *
					 * This function gets run when user scrolls to the bottom
					 * of the dropdown OR the data returned to reselect does not
                     * fill up the full height of the dropdown.
					 *
					 * This function also checks if remote option's onData
					 * returns pagination.more === true
					 */

					self.loadMore = function() {
						if(!$Reselect.DataAdapter.pagination || !$Reselect.DataAdapter.pagination.more){
							return;
						}
						self.getData(false, true);
					};

					/**
					 * Search
					 */

					self.search = ReselectUtils.debounce(function(){
						self.getData(true, false);
					}, 300, false, function(){
						self.is_loading = true;
					});

					/**
					 * Lazy Containers
					 *
					 * The goal is to use the minimal amount of DOM elements (containers)
					 * to display large amounts of data. Containers are shuffled and repositioned
					 * whenever the options list is scrolled.
					 */

					self.LazyDropdown = new LazyScroller($scope, {
						scopeName: $Reselect.parsedOptions.itemName,
						container: self.$container,
						list: self.$list,
						choiceHeight: 36,
						listHeight: 300
					});

					/**
					 * An index to simply track the highlighted or selected option
					 */

					self.activeIndex = null;

					/**
					 * Using the container id that is passed in, find the actual value by $eval the [value=""]
					 * from the directive with the scope of the lazy container
					 */

                    self._selectChoice = function(activeIndex) {
                        var selectedScope = {};
                        selectedScope[$Reselect.parsedOptions.itemName] = $Reselect.DataAdapter.data[activeIndex];
                        var value = angular.copy($Reselect.parsedOptions.modelMapper(selectedScope));
                        $Reselect.selectValue(value, selectedScope[$Reselect.parsedOptions.itemName]);
                    };

					/**
					 * Rendering
					 *
					 * This function handles rendering the dropdown.
					 * Choices are passed along to LazyContainer which will
					 * handle the rendering of the data.
					 */

					self.render = function(choices) {
						self.LazyDropdown.choices = choices || $Reselect.DataAdapter.data;

						if(self.LazyDropdown.choices && self.LazyDropdown.choices.length >= 0){
							// Check if choices is empty
							self.haveChoices = !!self.LazyDropdown.choices.length;

							// Render the dropdown depending on the numbers of choices
							var dimensions = self.LazyDropdown.renderContainer();

							/**
							 * LazyContainer's render function
							 * @param {Boolean} Force - force the LazyContainer to re-render
							 */
							self.LazyDropdown._calculateLazyRender(true);

							/**
							 * If the result's first page does not fill up
							 * the height of the dropdown, automatically fetch
							 * the next page
							 */

							if(self.LazyDropdown.choices && self.LazyDropdown.choices.length && (dimensions.containerHeight >= dimensions.choiceHeight)){
								self.loadMore();
							}
						}else{
							self.haveChoices = false;
						}
					};
				}
			]
		};
	}
]);
