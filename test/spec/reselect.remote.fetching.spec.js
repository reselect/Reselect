'use strict';

describe('Remote Fetching Test', function(){
    var $scope, $rootScope, $compile, $httpBackend, $reselect;

    var default_result = [];

    //set up template
    var template = '<reselect\
                        ng-model="simple.value4">\
                        <div reselect-selection>\
                            <span ng-bind="$selection"></span>\
                            <span ng-bind="$selection.data.title"></span>\
                        </div>\
                        <div reselect-choices\
                            remote="simple.remoteOptions">\
                            <span ng-bind="$choice.data.first_name"></span>\
                        </div>\
                    </reselect>';

    //set up module
    beforeEach(module('Reselect'));

    //inject dependencies
    beforeEach(inject(function(_$rootScope_, _$compile_, _$httpBackend_){
        $rootScope   = _$rootScope_;
        $scope       = $rootScope.$new();
        $compile     = _$compile_;
        $httpBackend = _$httpBackend_;

        $scope.ctrl = {};

        default_result = [
            { "id": 1, "gender": "Male", "first_name": "Gerald", "last_name": "Gonzales", "email": "ggonzales0@joomla.org", "ip_address": "153.239.46.41" },
            { "id": 2, "gender": "Female", "first_name": "Shirley", "last_name": "Gonzalez", "email": "sgonzalez1@indiatimes.com", "ip_address": "81.199.252.111" },
            { "id": 3, "gender": "Female", "first_name": "Rebecca", "last_name": "Brown", "email": "rbrown2@zdnet.com", "ip_address": "173.237.84.89" }
        ]

        $httpBackend.when('GET', 'http://mock_data/').respond(default_result);

        $reselect = $compile(template)($scope);
        $rootScope.$digest();
    }));

    // test to retrieve data, should check that first item in select dropdown matches first item in response
    it('should retrieve data', function(){
        $httpBackend.expectGET('http://mock_data/');
        //expect($reselect.hasClass('reselect-options-container')).toBe(true);
        //expect($reselect.find('.reselect-option-choice').first().text().trim()).toBe(default_results[0].first_name);
        //flush after done test
        $httpBackend.flush();
    });
})
