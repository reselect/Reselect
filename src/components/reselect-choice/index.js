import template from './reselect-choice.html'

class ReselectChoiceController {
    static get $inject () {
        return ['$scope', '$attrs']
    }

    constructor ($scope, $attrs) {
        this.value = $attrs.value

        $attrs.$observe('value', (val) => {
            this.value = val
        })
    }

    onClick (value = this.value) {
        console.log('rs-choice', 'onClick', value)
        this.$reselect.setValue(value)
    }
}

class ReselectChoiceDirective {
    constructor () {
        this.restrict = 'AE'
        this.scope = true
        this.require = '^^reselect'
        this.replace = true
        this.template = template
        this.transclude = true

        this.controller = ReselectChoiceController
        this.controllerAs = '$choice'
    }

    link ($scope, $elem, $attrs, $reselect) {
        $scope.$choice.$reselect = $reselect
        // Hook self to $reselect
    }

    static directive () {
        return new ReselectChoiceDirective(...arguments)
    }
}

export default ReselectChoiceDirective
