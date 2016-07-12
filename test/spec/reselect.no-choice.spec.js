'use strict';

describe('Reselect No Choice', function(){

	var $scope, $rootScope, $compile, $timeout, $reselect;
    var $body = angular.element('body');

	beforeEach(module('Reselect'));

	beforeEach(inject(function(_$rootScope_, _$compile_, _$timeout_){
		$rootScope  = _$rootScope_;
		$scope      = $rootScope.$new();
		$compile    = _$compile_;
        $timeout    = _$timeout_;

		$scope.ctrl = {};
	}));

    afterEach(function() {
        $body.find('.reselect-dropdown').remove();
    });

    function compileAndOpen(template) {
        $reselect = $compile(template)($scope);

        $rootScope.$digest();

        $reselect.find('.reselect-selection')[0].click();

        $rootScope.$digest();
    }

    it('should display default no options text', function(){

        var template = '<reselect \
                            ng-model="ctrl.value"> \
                            <reselect-choices \
                                options="option in []">\
                            </reselect-choices> \
                        </reselect>';

        compileAndOpen(template);

        expect($body.find('.reselect-empty-container').text().trim()).toBe('No Options');

    });

    it('should display [no-options-text] value', function(){

        var template = '<reselect \
                            ng-model="ctrl.value"> \
                            <reselect-choices \
                                no-options-text="__NO_OPTION_TEXT__" \
                                options="option in []">\
                            </reselect-choices> \
                        </reselect>';

        compileAndOpen(template);

        expect($body.find('.reselect-empty-container').text().trim()).toBe('__NO_OPTION_TEXT__');
    });

    it('should display [reselect-no-choice] directive', function(){

        var template = '<reselect \
                            ng-model="ctrl.value"> \
                            <reselect-choices \
                                no-options-text="__NO_OPTION_TEXT__"\
                                options="option in []">\
                            </reselect-choices> \
                            <div reselect-no-choice>\
                                __NO_CHOICE_DIRECTIVE__\
                            </div>\
                        </reselect>';

        compileAndOpen(template);

        expect($body.find('.reselect-no-choice').text().trim()).toBe('__NO_CHOICE_DIRECTIVE__');
    });

    it('should have access to correct scope', function(){

        $scope.ctrl.outer = '__OUTER_SCOPE__';

        var template = '<reselect \
                            ng-model="ctrl.value"> \
                            <reselect-choices \
                                no-options-text="__NO_OPTION_TEXT__" \
                                options="option in []">\
                            </reselect-choices> \
                            <reselect-no-choice>\
                                {{ctrl.outer}}\
                            </reselect-no-choice>\
                        </reselect>';

        compileAndOpen(template);

        expect($body.find('.reselect-empty-container').text().trim()).toBe($scope.ctrl.outer);
    });

});
