'use strict';

describe('Reselect Selection Test', function(){

	var $scope, $rootScope, $compile;

	var template = '<reselect \
	                    ng-model="ctrl.value"> \
	                    <reselect-choices \
	                        options="option in ctrl.choices" \
	                        value="$choice"> \
	                            <span ng-bind="$choice"></span>\
	                    </reselect-options> \
	                </reselect>';

	beforeEach(module('Reselect'));

	beforeEach(inject(function(_$rootScope_, _$compile_){
		$rootScope  = _$rootScope_;
		$scope      = $rootScope.$new();
		$compile    = _$compile_;

		$scope.ctrl = {};
	}));

	describe('Default selection (no directive)', function(){

		var $reselect;

        var random = 'Choice' + Math.floor(Math.random() * 1000);

		beforeEach(function(){
			$scope.ctrl.choices = [random];
            $scope.ctrl.value = random;

			$reselect = $compile(template)($scope);

			$rootScope.$digest();
		});

		it('should display choice selection WITHOUT directive', function(){
			expect($reselect.find('.reselect-rendered-selection').text()).toBe(random);
		});

	});

    describe('Custom selection', function(){

		var $reselect;

        var choices = [
            { "id": 1, "gender": "Male", "first_name": "Gerald", "last_name": "Gonzales", "email": "ggonzales0@joomla.org", "ip_address": "153.239.46.41" },
            { "id": 2, "gender": "Female", "first_name": "Shirley", "last_name": "Gonzalez", "email": "sgonzalez1@indiatimes.com", "ip_address": "81.199.252.111" },
            { "id": 3, "gender": "Female", "first_name": "Rebecca", "last_name": "Brown", "email": "rbrown2@zdnet.com", "ip_address": "173.237.84.89" }
        ];

		beforeEach(function(){
			$scope.ctrl.choices = choices;
            $scope.ctrl.value = 1;

			$reselect = $compile('<reselect \
        	                    ng-model="ctrl.value"> \
                                <reselect-selection> \
                                    <span ng-bind="$selection"></span> \
                                </reselect-selection> \
        	                    <reselect-choices \
        	                        options="option in ctrl.choices track by id" \
        	                        value="$choice.email"> \
        	                            <span ng-bind="$choice"></span>\
        	                    </reselect-options> \
        	                </reselect>')($scope);

			$rootScope.$digest();
		});

		// it('should display choice selection WITH directive', function(){
        //     // console.log($reselect.find('.reselect-rendered-selection').html());
		// 	// expect($reselect.find('.reselect-rendered-selection').text()).toBe('asd');
		// });

	});


});
