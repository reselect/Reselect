import template from './reselect-placeholder.html'

class Controller {
    static get $inject () {
        return ['$scope', '$attrs', '$rsDebug']
    }

    constructor ($scope) {
        this.$scope = $scope
    }
}

class Directive {
    constructor ($rsDebug) {
        this.restrict = 'E'
        this.scope = true
        this.require = {
            // $reselect: '^^reselect'
        }
        this.replace = true
        this.template = template
        this.transclude = true

        this.controller = Controller

        this.bindToController = true

        this.$rsDebug = $rsDebug
    }

    link ($scope, $elem, $attrs, $reselect, transcludeFn) {
        transcludeFn($scope, function (clone) {
            $elem[0].querySelectorAll('.reselect-placeholder-content')[0].appendChild(clone[0])
        })
    }

    static directive () {
        return new Directive(...arguments)
    }
}

Directive.directive.$inject = ['$rsDebug']

export default Directive
