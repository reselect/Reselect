import template from './reselect.html'

class ReselectController {
    static get $inject () {
        return ['$scope', '$rsDebug', 'ChoiceParser']
    }

    constructor ($scope, $rsDebug, ChoiceParser) {
        this.$selected = {
            $source: null,
            $value: null
        }

        this.$scope = $scope
        this.$rsDebug = $rsDebug
        this.ChoiceParser = ChoiceParser
    }

    parseOptions (expression) {
        this.parsedResult = this.ChoiceParser.parse(expression)

        this.choices = this.parsedResult.source(this.$scope.$parent)
    }

    select (choice) {
        this.$rsDebug.log('$select', choice)

        let $selectedChoice = this.parsedResult.modelMapper(this.$scope, {
            [this.parsedResult.itemName]: choice
        })

        this.setSelected(choice, $selectedChoice)
        this.setValue($selectedChoice)
    }

    setSelected (source = null, value = source) {
        this.$selected.$source = source
        this.$selected.$value = value

        this.$rsDebug.log('$selected', this.$selected)
    }

    setValue (value) {
        this.ngModel.$setViewValue(value)
    }
}

class ReselectDirective {
    constructor ($rsDebug) {
        this.restrict = 'AE'
        this.require = ['reselect', 'ngModel']
        this.scope = true
        this.replace = true
        this.template = template
        this.transclude = true
        this.controller = ReselectController
        this.controllerAs = '$reselect'

        this.$rsDebug = $rsDebug
    }

    compile () {
        return (scope, element, attrs, ctrls, transcludeFn) => {
            let $reselect = ctrls[0]
            let ngModel = ctrls[1]

            $reselect.ngModel = ngModel

            // From view --> model
            ngModel.$parsers.unshift((inputValue) => {
                this.$rsDebug.log('ngModel', 'view -> model', inputValue)
                return inputValue
            })

            ngModel.$formatters.unshift((inputValue) => {
                this.$rsDebug.log('ngModel', 'model -> view', inputValue)

                $reselect.setSelected(inputValue, $reselect.parsedResult.modelMapper($reselect.$scope, {
                    [$reselect.parsedResult.itemName]: inputValue
                }))
                return inputValue
            })

            ngModel.$render = () => {
                this.$rsDebug.log('ngModel', '$rendered')
            }

            transcludeFn(scope, function (clone) {
                let $clone = angular.element('<div>').append(clone)
                let $choiceContainer = angular.element(element[0].querySelectorAll('.reselect-choices-container'))
                let $selectionContainer = angular.element(element[0].querySelectorAll('.reselect-selection-container'))

                $choiceContainer.append($clone[0].querySelectorAll('.reselect-choices'))

                if ($clone[0].querySelectorAll('.reselect-selection').length === 1) {
                    $selectionContainer.replaceWith($clone[0].querySelectorAll('.reselect-selection'))
                } else {
                    $selectionContainer.append($clone[0].querySelectorAll('.reselect-selection'))
                }

                element.append($clone)
            })
        }
    }

    static directive () {
        return new ReselectDirective(...arguments)
    }
}

ReselectDirective.directive.$inject = ['$rsDebug']

export default angular.module('reselect.component', [])
    .directive('reselect', ReselectDirective.directive)
    .directive('rsTransclude', function () {
        return {
            link: function (scope, element, attrs, ctrls, transclude) {
                transclude(scope, function (clone) {
                    element.append(clone)
                })
            }
        }
    })
    .name
