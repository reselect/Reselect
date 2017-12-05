import template from './reselect.html'

class ReselectController {
    static get $inject () {
        return ['$scope', 'ChoiceParser']
    }

    constructor ($scope, ChoiceParser) {
        this.$selected = {
            $source: null,
            $value: null
        }

        this.$scope = $scope
        this.ChoiceParser = ChoiceParser
    }

    parseOptions (expression) {
        this.parsedResult = this.ChoiceParser.parse(expression)

        this.choices = this.parsedResult.source(this.$scope.$parent)
    }

    select (choice) {
        console.log('rs', 'select', choice)

        let $selectedChoice = this.parsedResult.modelMapper(this.$scope, {
            [this.parsedResult.itemName]: choice
        })

        this.setSelected(choice, $selectedChoice)
        this.setValue($selectedChoice)
    }

    setSelected (source, value) {
        this.$selected.$source = source
        this.$selected.$value = value

        console.log('$selected', this.$selected)
    }

    setValue (value) {
        this.ngModel.$setViewValue(value)
    }

    $onInit () {
    }
}

class ReselectDirective {
    constructor () {
        this.restrict = 'AE'
        this.require = ['reselect', 'ngModel']
        this.scope = {}
        this.replace = true
        this.template = template
        this.transclude = true
        this.controller = ReselectController
        this.controllerAs = '$reselect'
    }

    compile () {
        return function link (scope, element, attrs, ctrls, transcludeFn) {
            let $reselect = ctrls[0]
            let ngModel = ctrls[1]

            $reselect.ngModel = ngModel

            // From view --> model
            ngModel.$parsers.unshift(function (inputValue) {
                console.log('ngModel', 'view -> model', inputValue)
                return inputValue
            })

            ngModel.$formatters.unshift(function (inputValue) {
                console.log('ngModel', 'model -> view', inputValue)

                $reselect.setSelected(inputValue, $reselect.parsedResult.modelMapper($reselect.$scope, {
                    [$reselect.parsedResult.itemName]: inputValue
                }))
                return inputValue
            })

            ngModel.$render = () => {
                console.log('ngModel', '$rendered')
            }

            transcludeFn(scope, function (clone) {
                element.append(clone)
            })
        }
    }

    static directive () {
        return new ReselectDirective(...arguments)
    }
}

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
