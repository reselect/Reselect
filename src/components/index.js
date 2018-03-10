import reselect from './reselect'
import ReselectChoices from './reselect-choices'
import ReselectChoice from './reselect-choice'
import ReselectSelection from './reselect-selection'
import ReselectPlaceholder from './reselect-placeholder'

export default angular.module('reselect.components', [reselect])
    .directive('reselectChoice', ReselectChoice.directive)
    .directive('reselectChoices', ReselectChoices.directive)
    .directive('reselectSelection', ReselectSelection.directive)
    .directive('reselectPlaceholder', ReselectPlaceholder.directive)
    .name

global.Reselect = {}
