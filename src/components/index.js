import reselect from './reselect'
import ReselectChoices from './reselect-choices'
import ReselectChoice from './reselect-choice'
import ReselectSelection from './reselect-selection'

export default angular.module('reselect.components', [reselect])
    .directive('reselectChoice', ReselectChoice.directive)
    .directive('reselectChoices', ReselectChoices.directive)
    .directive('reselectSelection', ReselectSelection.directive)
    .name

global.Reselect = {}
