'use strict';

describe('Reselect Choices Test', function(){

	var $scope, $rootScope, $compile, $reselect;

	beforeEach(module('Reselect'));

	beforeEach(inject(function(_$rootScope_, _$compile_){
		$rootScope  = _$rootScope_;
		$scope      = $rootScope.$new();
		$compile    = _$compile_;

        $scope.ctrl = {};

        $scope.ctrl.arrayOfObjects = [
            { "id": 1, "gender": "Male", "first_name": "Gerald", "last_name": "Gonzales", "email": "ggonzales0@joomla.org", "ip_address": "153.239.46.41" },
            { "id": 2, "gender": "Female", "first_name": "Shirley", "last_name": "Gonzalez", "email": "sgonzalez1@indiatimes.com", "ip_address": "81.199.252.111" },
            { "id": 3, "gender": "Female", "first_name": "Rebecca", "last_name": "Brown", "email": "rbrown2@zdnet.com", "ip_address": "173.237.84.89" },
            { "id": 4, "gender": "Female", "first_name": "Betty", "last_name": "Stanley", "email": "bstanley3@g.co", "ip_address": "1.17.161.76" },
            { "id": 5, "gender": "Male", "first_name": "Samuel", "last_name": "Larson", "email": "slarson4@godaddy.com", "ip_address": "38.160.25.219" },
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

    	it('should output choices correctly', function(){
    		expect($regularOption.find('.reselect-option').eq(0).text().trim()).toBe($scope.ctrl.arrayOfObjects[0].email);
    		expect($regularOption.find('.reselect-option').eq(4).text().trim()).toBe($scope.ctrl.arrayOfObjects[4].email);

            expect($optionAs.find('.reselect-option').eq(0).text().trim()).toBe($scope.ctrl.arrayOfObjects[0].email);
    		expect($optionAs.find('.reselect-option').eq(4).text().trim()).toBe($scope.ctrl.arrayOfObjects[4].email);
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

    	it('should output choices correctly', function(){
    		expect($regularOption.find('.reselect-option').eq(0).text().trim()).toBe($scope.ctrl.arrayOfStrings[0]);
    		expect($regularOption.find('.reselect-option').eq(4).text().trim()).toBe($scope.ctrl.arrayOfStrings[4]);
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

            $rootScope.$digest();

            $regularOption.find('.reselect-selection')[0].click();

            $rootScope.$digest();

            // reselectChoices controller
            ctrl = $regularOption.find('.reselect-choices').controller('reselectChoices');
        });

        describe('_selectChoice', function() {
            it('should select choice using the choices index', function() {

                ctrl._selectChoice(4);

                $rootScope.$digest();

                expect($regularOption.find('.reselect-rendered-selection').text().trim()).toBe($scope.ctrl.arrayOfObjects[4].email);
            });
        });
    });

});
