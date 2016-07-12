'use strict';

describe('Reselect Choices Test', function(){

	var $scope, $rootScope, $compile, $reselect, KEYS;

    var $body = angular.element('body');

	beforeEach(module('Reselect'));

	beforeEach(inject(function(_$rootScope_, _$compile_, _KEYS_){
		$rootScope  = _$rootScope_;
		$scope      = $rootScope.$new();
		$compile    = _$compile_;
		KEYS    = _KEYS_;

        $scope.ctrl = {};

        $scope.ctrl.arrayOfObjects = [
            { "id": 1, "gender": "Male", "first_name": "Gerald", "last_name": "Gonzales", "email": "ggonzales0@joomla.org", "ip_address": "153.239.46.41" },
            { "id": 2, "gender": "Female", "first_name": "Shirley", "last_name": "Gonzalez", "email": "sgonzalez1@indiatimes.com", "ip_address": "81.199.252.111" },
            { "id": 3, "gender": "Female", "first_name": "Rebecca", "last_name": "Brown", "email": "rbrown2@zdnet.com", "ip_address": "173.237.84.89" },
            { "id": 4, "gender": "Female", "first_name": "Betty", "last_name": "Stanley", "email": "bstanley3@g.co", "ip_address": "1.17.161.76" },
            { "id": 5, "gender": "Male", "first_name": "Samuel", "last_name": "Larson", "email": "slarson4@godaddy.com", "ip_address": "38.160.25.219" },
            { "id": 6, "gender": "Male", "first_name": "Gerald", "last_name": "Gonzales", "email": "ggonzales0@joomla.org", "ip_address": "153.239.46.41" },
            { "id": 7, "gender": "Female", "first_name": "Shirley", "last_name": "Gonzalez", "email": "sgonzalez1@indiatimes.com", "ip_address": "81.199.252.111" },
            { "id": 8, "gender": "Female", "first_name": "Rebecca", "last_name": "Brown", "email": "rbrown2@zdnet.com", "ip_address": "173.237.84.89" },
            { "id": 9, "gender": "Female", "first_name": "Betty", "last_name": "Stanley", "email": "bstanley3@g.co", "ip_address": "1.17.161.76" },
            { "id": 10, "gender": "Male", "first_name": "Samuel", "last_name": "Larson", "email": "slarson4@godaddy.com", "ip_address": "38.160.25.219" },
            { "id": 11, "gender": "Male", "first_name": "Gerald", "last_name": "Gonzales", "email": "ggonzales0@joomla.org", "ip_address": "153.239.46.41" },
            { "id": 12, "gender": "Female", "first_name": "Shirley", "last_name": "Gonzalez", "email": "sgonzalez1@indiatimes.com", "ip_address": "81.199.252.111" },
            { "id": 13, "gender": "Female", "first_name": "Rebecca", "last_name": "Brown", "email": "rbrown2@zdnet.com", "ip_address": "173.237.84.89" },
            { "id": 14, "gender": "Female", "first_name": "Betty", "last_name": "Stanley", "email": "bstanley3@g.co", "ip_address": "1.17.161.76" },
            { "id": 15, "gender": "Male", "first_name": "Samuel", "last_name": "Larson", "email": "slarson4@godaddy.com", "ip_address": "38.160.25.219" },
        ];

        $scope.ctrl.arrayOfStrings = $scope.ctrl.arrayOfObjects.map(function(obj){
            return obj.email;
        });

	}));

	describe('Array of Objects', function(){

        var $regularOption, $optionAs;

        beforeEach(function(){
            var regularTemplate = '<reselect \
        	                    ng-model="ctrl.value1"> \
        	                    <reselect-choices \
        	                        options="option in ctrl.arrayOfObjects"> \
        	                            <span ng-bind="option.email"></span> \
        	                    </reselect-choices> \
        	                </reselect>';

            var asTemplate = '<reselect \
        	                    ng-model="ctrl.value2"> \
        	                    <reselect-choices \
        	                        options="option.email as option in ctrl.arrayOfObjects"> \
        	                            <span ng-bind="option.email"></span> \
        	                    </reselect-choices> \
        	                </reselect>';

            $regularOption = $compile(regularTemplate)($scope);
            $optionAs = $compile(asTemplate)($scope);

            $rootScope.$digest();

            $regularOption.find('.reselect-selection')[0].click();
            $optionAs.find('.reselect-selection')[0].click();

            $rootScope.$digest();
        });

        afterEach(function() {
            $body.find('.reselect-dropdown').remove();
        });

    	it('should output choices correctly', function(){
            var regOptionDropdown = $body.find('.reselect-dropdown').eq(0);
            var optionAsDropdown  = $body.find('.reselect-dropdown').eq(1);

    		expect(regOptionDropdown.find('.reselect-option').eq(0).text().trim()).toBe($scope.ctrl.arrayOfObjects[0].email);
    		expect(regOptionDropdown.find('.reselect-option').eq(4).text().trim()).toBe($scope.ctrl.arrayOfObjects[4].email);

            expect(optionAsDropdown.find('.reselect-option').eq(0).text().trim()).toBe($scope.ctrl.arrayOfObjects[0].email);
    		expect(optionAsDropdown.find('.reselect-option').eq(4).text().trim()).toBe($scope.ctrl.arrayOfObjects[4].email);
    	});
	});

    describe('Array of Strings', function(){

        var $regularOption, $optionAs;

        beforeEach(function(){
            var regularTemplate = '<reselect \
        	                    ng-model="ctrl.value1"> \
        	                    <reselect-choices \
        	                        options="option in ctrl.arrayOfStrings"> \
        	                            <span ng-bind="option"></span> \
        	                    </reselect-choices> \
        	                </reselect>';

            $regularOption = $compile(regularTemplate)($scope);

            $rootScope.$digest();

            $regularOption.find('.reselect-selection')[0].click();

            $rootScope.$digest();
        });

        afterEach(function() {
            $body.find('.reselect-dropdown').remove();
        });

    	it('should output choices correctly', function(){
    		expect($body.find('.reselect-option').eq(0).text().trim()).toBe($scope.ctrl.arrayOfStrings[0]);
    		expect($body.find('.reselect-option').eq(4).text().trim()).toBe($scope.ctrl.arrayOfStrings[4]);
    	});
	});

    describe('Controller', function(){

        var ctrl, $regularOption;

        beforeEach(function() {

            var regularTemplate = '<reselect \
                                ng-model="ctrl.value1"> \
                                <reselect-choices \
                                    options="option in ctrl.arrayOfStrings"> \
                                        <span ng-bind="option"></span> \
                                </reselect-choices> \
                            </reselect>';

            $regularOption = $compile(regularTemplate)($scope);

            $body.append($regularOption);

            $rootScope.$digest();

            $regularOption.find('.reselect-selection')[0].click();

            $rootScope.$digest();

            // reselectChoices controller
            ctrl = $body.find('.reselect-choices').controller('reselectChoices');
        });

        afterEach(function() {
            $body.find('.reselect-dropdown').remove();
        });

        describe('_selectChoice', function() {
            it('should select choice using the choices index', function() {

                ctrl._selectChoice(4);

                $rootScope.$digest();

                expect($body.find('.reselect-rendered-selection').text().trim()).toBe($scope.ctrl.arrayOfObjects[4].email);
            });
        });

        describe('keydown', function() {
            var event_methods = {
                stopPropagation: angular.noop,
                preventDefault: angular.noop
            };

            function mock_key_evt (which) {
                return {
                    which: which,
                    stopPropagation: event_methods.stopPropagation,
                    preventDefault: event_methods.preventDefault
                }
            }

            beforeEach(function() {
                spyOn(event_methods, 'stopPropagation');
                spyOn(event_methods, 'preventDefault');
            });

            afterEach(function() {
                expect(event_methods.stopPropagation).toHaveBeenCalled();
                expect(event_methods.preventDefault).toHaveBeenCalled();
            });

            it('should emit a select event if the ENTER key is pressed', function() {
                spyOn($scope, '$emit');

                var evt = mock_key_evt(KEYS.ENTER);
                ctrl.keydown(evt);

                expect($scope.$emit).toHaveBeenCalledWith('reselect.select');
            });
            it('should emit a select event if the SPACE key is pressed', function() {
                spyOn($scope, '$emit');

                var evt = mock_key_evt(KEYS.SPACE);
                ctrl.keydown(evt);

                expect($scope.$emit).toHaveBeenCalledWith('reselect.select');
            });
            it('should emit a select event if the UP key is pressed', function() {
                spyOn($scope, '$emit');

                var evt = mock_key_evt(KEYS.UP);
                ctrl.keydown(evt);

                expect($scope.$emit).toHaveBeenCalledWith('reselect.previous');
            });
            it('should emit a select event if the UP key is pressed', function() {
                spyOn($scope, '$emit');

                var evt = mock_key_evt(KEYS.DOWN);
                ctrl.keydown(evt);

                expect($scope.$emit).toHaveBeenCalledWith('reselect.next');
            });
        });

        describe('events', function() {
            describe('reselect.select', function() {
                it('should call _selectChoice with the active index', function() {
                    spyOn(ctrl, '_selectChoice');

                    ctrl.activeIndex = 0;

                    $scope.$broadcast('reselect.select');

                    expect(ctrl._selectChoice).toHaveBeenCalledWith(0);
                });
            });

            describe('reselect.next', function() {
                it('should increase active index if there is a next option', function() {
                    ctrl.activeIndex = 0;

                    $scope.$broadcast('reselect.next');

                    expect(ctrl.activeIndex).toEqual(1);
                });
            });

            describe('reselect.previous', function() {
                it('should decrease active index if there is a previous option', function() {
                    ctrl.activeIndex = 1;

                    $scope.$broadcast('reselect.previous');

                    expect(ctrl.activeIndex).toEqual(0);
                });
            });

        });
    });

});
