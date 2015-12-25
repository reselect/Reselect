var fs            = require('fs');
var gulp          = require('gulp');
var concat        = require('gulp-concat');
var jshint        = require('gulp-jshint');
var header        = require('gulp-header');
var footer        = require('gulp-footer');
var rename        = require('gulp-rename');
var livereload    = require('gulp-livereload');
var es            = require('event-stream');
var del           = require('del');
var uglify        = require('gulp-uglify');
var minifyHtml    = require('gulp-minify-html');
var minifyCSS     = require('gulp-minify-css');
var templateCache = require('gulp-angular-templatecache');
var gutil         = require('gulp-util');
var connect       = require('gulp-connect');
var plumber       = require('gulp-plumber');
var sass          = require('gulp-sass');
var notify        = require('gulp-notify');
var map           = require('map-stream');
var events        = require('events');
var emmitter      = new events.EventEmitter();
var path          = require('path');

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

gulp.task('clean-build', ['clean'], function() {
    return gulp.start(['build']);
});

gulp.task('build', ['scripts', 'styles'], function() {
    gutil.log('Reselect Built');
});

gulp.task('dev', ['watch', 'dev-watch'], function() {
    connect.server();
});

gulp.task('dev-watch', function() {
    gulp.watch(['examples/**/*.{js,html}']).on('change', livereload.changed);
});

gulp.task('watch', function() {
    livereload.listen();

    gulp.watch(['src/**/*.{js,html}'], ['scripts']);
    gulp.watch(['src/**/*.scss'], ['styles']);

    gulp.watch(['dist/**/*.min.{css,js}']).on('change', livereload.changed);
});

gulp.task('clean', function(cb) {
    return del(['dist'], cb);
});

gulp.task('scripts', function() {

    var buildTemplates = function() {
        return gulp.src('src/**/*.html')
            .pipe(plumber({
                errorHandler: handleError
            }))
            .pipe(minifyHtml({
                empty: true,
                spare: true,
                quotes: true
            }))
            .pipe(templateCache({
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

        return gulp.src(['src/common.js', 'src/reselect.js', 'src/*.js'])
            .pipe(plumber({
                errorHandler: handleError
            }))
            .pipe(jshint())
            .pipe(jshint.reporter('jshint-stylish'))
            .pipe(jsHintErrorReporter) // If error pop up a notify alert
            .on('error', notify.onError(function(error) {
                return error.message;
            }));
    };

    return es.merge(buildLib(), buildTemplates())
        .pipe(plumber({
            errorHandler: handleError
        }))
        .pipe(concat('reselect.js'))
        .pipe(header('(function () { \n\'use strict\';\n'))
        .pipe(header(config.banner, {
            timestamp: (new Date()).toISOString(),
            pkg: config.pkg
        }))
        .pipe(footer('\n}());'))
        .pipe(gulp.dest('dist'))
        .pipe(uglify({
            preserveComments: 'some'
        }))
        .pipe(rename({
            ext: '.min.js'
        }))
        .pipe(gulp.dest('dist'));

});

gulp.task('styles', function() {

    return gulp.src('src/scss/reselect.scss')
        .pipe(plumber({
            errorHandler: handleError
        }))
        .pipe(sass())
        .pipe(header(config.banner, {
            timestamp: (new Date()).toISOString(),
            pkg: config.pkg
        }))
        .pipe(rename('reselect.css'))
        .pipe(gulp.dest('dist'))
        .pipe(minifyCSS())
        .pipe(rename({
            ext: '.min.css'
        }))
        .pipe(gulp.dest('dist'));

});

var handleError = function(err) {
    console.log(err.toString());
    this.emit('end');
};