var fs       = require('fs');
var gulp     = require('gulp');
var es       = require('event-stream');
var del      = require('del');
var map      = require('map-stream');
var events   = require('events');
var emmitter = new events.EventEmitter();
var path     = require('path');
var karma    = require('karma').server;
var notifier = require('node-notifier');
var $        = require('gulp-load-plugins')();
var connect  = require('gulp-connect');
var bourbon  = require('node-bourbon');

var config = {
    pkg: JSON.parse(fs.readFileSync('./package.json')),
    banner: '/*!\n' +
        ' * <%= pkg.name %>\n' +
        ' * <%= pkg.homepage %>\n' +
        ' * Version: <%= pkg.version %> - <%= timestamp %>\n' +
        ' * License: <%= pkg.license %>\n' +
        ' */\n\n\n'
};

gulp.task('default', ['build', 'test']);
gulp.task('test', ['karma']);

gulp.task('clean-build', ['clean'], function() {
    return gulp.start(['build']);
});

gulp.task('build', ['scripts', 'styles'], function() {
    $.util.log('Reselect Built');
});

gulp.task('dev', ['watch', 'dev-watch', 'dev-karma'], function() {
    connect.server({
        root: 'examples'
    });
});

gulp.task('dev-watch', function() {
    gulp.watch(['examples/**/*.{js,html}']).on('change', $.livereload.changed);
});

gulp.task('watch', function() {
    $.livereload.listen();

    gulp.watch(['src/**/*.{js,html}'], ['scripts']);
    gulp.watch(['src/**/*.scss'], ['styles']);

    gulp.watch(['dist/**/*.min.{css,js}']).on('change', $.livereload.changed);
});

gulp.task('clean', function(cb) {
    return del(['dist'], cb);
});

gulp.task('scripts', function() {

    var buildTemplates = function() {
        return gulp.src('src/**/*.html')
            .pipe($.plumber({
                errorHandler: handleError
            }))
            .pipe($.minifyHtml({
                empty: true,
                spare: true,
                quotes: true
            }))
            .pipe($.angularTemplatecache({
                module: 'reselect.templates',
                standalone: true
            }));
    };

    var buildLib = function() {
        // Custom linting reporter used for error notify
        var jsHintErrorReporter = map(function(file, cb) {
            if (!file.jshint.success) {
                file.jshint.results.forEach(function(err) {
                    if (err) {
                        //console.log(err);

                        // Error message
                        var msg = [
                            path.basename(file.path),
                            'Line: ' + err.error.line,
                            'Reason: ' + err.error.reason
                        ];

                        // Emit this error event
                        emmitter.emit('error', new Error(msg.join('\n')));

                    }
                });

            }
            cb(null, file);
        });

        return gulp.src(['src/reselect.js', 'src/reselect*.js', 'src/filters/reselect*.js', 'src/common.js'])
            .pipe($.plumber({
                errorHandler: handleError
            }))
            .pipe($.jshint())
            .pipe($.jshint.reporter('jshint-stylish'))
            .pipe(jsHintErrorReporter) // If error pop up a notify alert
            .on('error', $.notify.onError(function(error) {
                return error.message;
            }));
    };

    return es.merge(gulp.src(['src/libs/*.js']), buildLib(), buildTemplates())
        .pipe($.plumber({
            errorHandler: handleError
        }))
        .pipe($.concat('reselect.js'))
        .pipe($.header('(function () { \n\'use strict\';\n'))
        .pipe($.header(config.banner, {
            timestamp: (new Date()).toISOString(),
            pkg: config.pkg
        }))
        .pipe($.footer('\n}).apply(this);'))
        .pipe(gulp.dest('examples/libs'))
        .pipe(gulp.dest('dist'))
        .pipe($.uglify({
            preserveComments: 'some'
        }))
        .pipe($.rename({
            ext: '.min.js'
        }))
        .pipe(gulp.dest('examples/libs'))
        .pipe(gulp.dest('dist'));

});

gulp.task('styles', function() {

    return gulp.src('src/scss/reselect.scss')
        .pipe($.plumber({
            errorHandler: handleError
        }))
        .pipe($.sass({
            includePaths: bourbon.includePaths
        }))
        .pipe($.header(config.banner, {
            timestamp: (new Date()).toISOString(),
            pkg: config.pkg
        }))
        .pipe($.rename('reselect.css'))
        .pipe(gulp.dest('examples/libs'))
        .pipe(gulp.dest('dist'))
        .pipe($.minifyCss())
        .pipe($.rename({
            ext: '.min.css'
        }))
        .pipe(gulp.dest('examples/libs'))
        .pipe(gulp.dest('dist'));

});

gulp.task('karma', ['build'], function() {
    karma.start({
        configFile: __dirname + '/test/karma.conf.js',
        singleRun: true
    });
});

gulp.task('dev-karma', ['build'], function() {
    karma.start({
        configFile: __dirname + '/test/karma.conf.js',
        singleRun: false
    });
});

var handleError = function(err) {
    console.log(err.toString());
    this.emit('end');
};
