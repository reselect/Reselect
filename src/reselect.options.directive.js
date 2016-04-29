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
					var self = this;

					self.element = $element[0];
					self.$container = angular.element(self.element.querySelectorAll(
						'.reselect-options-container'));
					self.$list = angular.element(self.element.querySelectorAll(
						'.reselect-options-list'));

					self.choiceHeight = 36;
					self.listHeight = 300;

					self.search_term = '';
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

					var $Reselect = $element.controller('reselect');

					/**
					 * Options
					 */

					self.options = angular.extend({}, reselectChoicesOptions, $attrs.reselectChoices || {});

					self.options.noOptionsText = $attrs.noOptionsText || self.options.noOptionsText;

					/**
					 * Choices Functionalities
					 */

					self.DataAdapter = null;

					self.parsedOptions = ChoiceParser.parse($attrs.options);

					if ($attrs.remote) {
						self.remoteOptions = $parse($attrs.remote)($scope.$parent);

						self.DataAdapter = new ReselectAjaxDataAdapter(self.remoteOptions, self.parsedOptions);

						self.DataAdapter.prepareGetData = function(){
							self.DataAdapter.page = 1;
							self.DataAdapter.pagination = {};
							self.DataAdapter.updateData([]);
							self.render();
						};
					} else {
						self.DataAdapter = new ReselectDataAdapter();
						self.DataAdapter.updateData(self.parsedOptions.source($scope.$parent));

						self.DataAdapter.observe = function(onChange) {
							$scope.$watchCollection(function() {
								return self.parsedOptions.source($scope.$parent);
							}, function(newChoices) {
								self.DataAdapter.updateData(newChoices);
							});
						};

					}

					self.DataAdapter.init();

					self.getData = function(reset, loadingMore) {
						if(reset === true){
							self.DataAdapter.prepareGetData();
						}

						self.is_loading = true;

						self.DataAdapter.getData(self.search_term)
							.then(function(choices) {
								if(!self.search_term){
									self.DataAdapter.updateData(choices.data, loadingMore);
									self.render();
								}else{
									self.render(choices.data);
								}
							})
							.finally(function(){
								self.is_loading = false;
							});
					};

					self.loadMore = function() {
						if(!self.DataAdapter.pagination || !self.DataAdapter.pagination.more){
							return;
						}
						self.getData(false, true);
					};

					self.search = ReselectUtils.debounce(function(){
						self.getData(true, false);
					}, 300, false, function(){
						self.is_loading = true;
					});

					/**
					 * Lazy Containers
					 *
					 * The goal is to used the minimum amount of DOM elements (containers)
					 * to display large amounts of data. Containers are shuffled and repositioned
					 * whenever the options list is scrolled.
					 */

					self.LazyDropdown = new LazyScroller($scope, {
						scopeName: self.parsedOptions.itemName,
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
						var selectedScope = self.LazyDropdown.lazyContainers[containerId].scope;

						var value = angular.copy(self.parsedOptions.modelMapper(selectedScope));

						$Reselect.selectValue(value, selectedScope[self.parsedOptions.itemName]);
					};

					/**
					 * Rendering
					 */

					self.$parent = $element.parent();

					self.render = function(choices) {
						self.LazyDropdown.choices = choices || self.DataAdapter.data;

						// Check if choices is empty
						self.haveChoices = !!self.LazyDropdown.choices.length;

						if(self.LazyDropdown.choices && self.LazyDropdown.choices.length >= 0){
							var dimensions = self.LazyDropdown.renderContainer();
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

						}
					};
				}
			]
		};
	}
]);
