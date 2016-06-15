'use strict';

describe('Reselect Test', function(){

	var $scope, $rootScope, $compile, $reselect, $window;

	var template = '<reselect \
	                    ng-model="ctrl.value"> \
	                    <reselect-choices \
	                        options="option in ctrl.choices" \> \
	                            <span ng-bind="option"></span> - Choice \
	                    </reselect-choices> \
	                </reselect>';

    var $body = angular.element('body');

	beforeEach(module('Reselect'));

	beforeEach(inject(function(_$rootScope_, _$compile_, _$window_){
		$rootScope  = _$rootScope_;
		$scope      = $rootScope.$new();
		$compile    = _$compile_;
		$window    = _$window_;

		$scope.ctrl = {};
	}));

	describe('Initialization', function(){

		beforeEach(function(){
			$scope.ctrl.choices = [
				{ "id": 1, "gender": "Male", "first_name": "Gerald", "last_name": "Gonzales", "email": "ggonzales0@joomla.org", "ip_address": "153.239.46.41" },
				{ "id": 2, "gender": "Female", "first_name": "Shirley", "last_name": "Gonzalez", "email": "sgonzalez1@indiatimes.com", "ip_address": "81.199.252.111" },
				{ "id": 3, "gender": "Female", "first_name": "Rebecca", "last_name": "Brown", "email": "rbrown2@zdnet.com", "ip_address": "173.237.84.89" },
				{ "id": 4, "gender": "Female", "first_name": "Betty", "last_name": "Stanley", "email": "bstanley3@g.co", "ip_address": "1.17.161.76" },
				{ "id": 5, "gender": "Male", "first_name": "Samuel", "last_name": "Larson", "email": "slarson4@godaddy.com", "ip_address": "38.160.25.219" },
				{ "id": 6, "gender": "Female", "first_name": "Mildred", "last_name": "Griffin", "email": "mgriffin5@dagondesign.com", "ip_address": "63.112.238.128" },
				{ "id": 7, "gender": "Male", "first_name": "Fred", "last_name": "Andrews", "email": "fandrews6@washington.edu", "ip_address": "10.79.92.244" },
				{ "id": 8, "gender": "Female", "first_name": "Sarah", "last_name": "Murray", "email": "smurray7@nih.gov", "ip_address": "170.175.13.42" },
				{ "id": 9, "gender": "Male", "first_name": "Adam", "last_name": "Ortiz", "email": "aortiz8@skype.com", "ip_address": "217.205.120.46" },
				{ "id": 10, "gender": "Female", "first_name": "Deborah", "last_name": "Anderson", "email": "danderson9@theglobeandmail.com", "ip_address": "30.179.116.208" },
				{ "id": 11, "gender": "Female", "first_name": "Phyllis", "last_name": "Nguyen", "email": "pnguyena@ca.gov", "ip_address": "220.215.9.176" },
				{ "id": 12, "gender": "Male", "first_name": "George", "last_name": "Freeman", "email": "gfreemanb@tmall.com", "ip_address": "7.55.99.154" },
				{ "id": 13, "gender": "Female", "first_name": "Sandra", "last_name": "Miller", "email": "smillerc@moonfruit.com", "ip_address": "62.246.202.87" },
				{ "id": 14, "gender": "Female", "first_name": "Kathleen", "last_name": "Anderson", "email": "kandersond@sphinn.com", "ip_address": "134.214.176.216" },
				{ "id": 15, "gender": "Male", "first_name": "Roger", "last_name": "Little", "email": "rlittlee@prweb.com", "ip_address": "41.174.208.60" },
				{ "id": 16, "gender": "Female", "first_name": "Kathy", "last_name": "Jenkins", "email": "kjenkinsf@rambler.ru", "ip_address": "226.27.11.64" },
				{ "id": 17, "gender": "Female", "first_name": "Lori", "last_name": "Willis", "email": "lwillisg@tripod.com", "ip_address": "164.15.58.60" },
				{ "id": 18, "gender": "Female", "first_name": "Carolyn", "last_name": "Jordan", "email": "cjordanh@pcworld.com", "ip_address": "228.91.249.218" },
				{ "id": 19, "gender": "Female", "first_name": "Rebecca", "last_name": "Weaver", "email": "rweaveri@uiuc.edu", "ip_address": "5.2.191.197" },
				{ "id": 20, "gender": "Male", "first_name": "Steven", "last_name": "Wells", "email": "swellsj@cbsnews.com", "ip_address": "173.136.24.137" }
			];

			$reselect = $compile(template)($scope);

			$rootScope.$digest();

            $reselect.find('.reselect-selection')[0].click();

            $rootScope.$digest();
		});

        afterEach(function() {
            $body.find('.reselect-dropdown').remove();
        });

		it('Replaces the element with the directive template', function(){
			expect($reselect.hasClass('reselect-container')).toBe(true);
		});

		it('Replaces options directive with the template', function(){
			expect($body.find('.reselect-dropdown').length).toBe(1);
		});
		//
		// it('Should have calculated the options list dimensions correctly', function(){
		// 	expect($reselect.find('.reselect-options-container').height()).toBe(300);
		// 	expect($reselect.find('.reselect-options-list').height()).toBe($scope.ctrl.choices.length * 36);
		// });
	});

    describe('Controller', function(){

        var ctrl, $dropdown;

        beforeEach(function() {
            $reselect = $compile(template)($scope);
            $body.append($reselect);
            $rootScope.$digest();

            $reselect.find('.reselect-selection')[0].click();
            $rootScope.$digest();

            ctrl = $reselect.controller('reselect');
            $dropdown = $body.find('.reselect-dropdown');
            spyOn($scope, '$emit');
        });

        afterEach(function() {
            $body.find('.reselect-dropdown').remove();
        });

        function isDropdownOpen() {
            $rootScope.$digest();

            return $body.find('.reselect-dropdown').eq(0).hasClass('reselect-dropdown--opened');
        };

        describe('handleKeyDown', function() {
            it('should open the dropdown when the ENTER key is pressed', function() {
                ctrl.opened = false;

                ctrl.handleKeyDown({
                    which: 13, //ENTER
                    preventDefault: angular.noop
                });

                expect(isDropdownOpen()).toBe(true);
            });

            it('should close the dropdown when the ESC key is pressed', function() {
                ctrl.opened = true;

                ctrl.handleKeyDown({
                    which: 27, // ESC
                    preventDefault: angular.noop
                });

                expect(isDropdownOpen()).toBe(false);
            });
            it('should $emit lose focus event when the ESC key is pressed while the dropdown is closed', function() {
                ctrl.opened = false;

                ctrl.handleKeyDown({
                    which: 27, // ESC
                    preventDefault: angular.noop
                });

                expect($scope.$emit).toHaveBeenCalledWith('reselect.input.blur');
            });
        });

        describe('toggleDropdown', function() {
            it('should open the dropdown if it is closed', function() {
                ctrl.opened = false;

                ctrl.toggleDropdown();

                expect(isDropdownOpen()).toBe(true);
            });
            it('should close the dropdown if it is open', function() {
                ctrl.opened = true;

                ctrl.toggleDropdown();

                expect(isDropdownOpen()).toBe(false);
            });
        });

        describe('showDropdown', function() {
            beforeEach(function() {
                ctrl.showDropdown();
            });
            it('should open the dropdown', function() {
                expect(isDropdownOpen()).toBe(true);
            });
            it('should emit focus seach input event', function() {
                expect($scope.$emit).toHaveBeenCalledWith('reselect.search.focus');
            });
            it('should open the dropdown below the input', function() {
                var hasAboveClass = $dropdown.hasClass('reselect-dropdown--above');

                expect(hasAboveClass).toBe(false);
            });
        });

        describe('dropdownPosition', function() {

            function setReselectPos(top) {
                $reselect.css({
                    'top': top || 0,
                    position: 'absolute'
                });

                $rootScope.$digest();
            };
            function setWindowHeight(height) {
                $window.outerHeight = height;
            }

            it('should open the dropdown above the input if there is not enough room below', function() {
                setReselectPos(450);
                setWindowHeight(500);

                ctrl._calculateDropdownPosition(300);

                expect(ctrl.isDropdownAbove).toBe(true);
            });

            it('should open the dropdown below the input if there is not enough room above and below', function() {
                setReselectPos(200);
                setWindowHeight(400);

                ctrl._calculateDropdownPosition(300);

                expect(ctrl.isDropdownAbove).toBe(false);
            });
        });

        describe('hideDropdown', function() {
            beforeEach(function() {
                ctrl.hideDropdown();
            });
            it('should close the dropdown', function() {
                expect(isDropdownOpen()).toBe(false);
            });
            it('should emit focus select input event', function() {
                expect($scope.$emit).toHaveBeenCalledWith('reselect.input.focus');
            });
        });

        describe('_removeDropdown', function() {
            it('should remove the dropdown from the DOM', function() {

                ctrl._removeDropdown();

                expect($body.find('.reselect-dropdown').length).toBe(0);
            });
        });
    })
});
