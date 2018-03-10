export default angular.module('reselect.services.debug', [])
    .service('$rsDebug', class Debug {
        log (...args) {
            if (global.Reselect.debug !== true) return
            console.log('%creselect:', 'color: blue;', ...args)
        }
    })
    .name
