'use strict';

var fs = require('fs');
var config = require('easy-config');
var path = require('path');

var gulp = require('gulp');
var sass = require('gulp-sass');
var less = require('gulp-less');
var autoprefixer = require('gulp-autoprefixer');
var minifycss = require('gulp-minify-css');
var jshint = require('gulp-jshint');
var uglify = require('gulp-uglify');
var imagemin = require('gulp-imagemin');
var rename = require('gulp-rename');
var concat = require('gulp-concat');
var notify = require('gulp-notify');
var cache = require('gulp-cache');
var nodemon = require('gulp-nodemon');
var protractor = require('gulp-protractor').protractor;
var mocha = require('gulp-mocha');
var livereload = require('gulp-livereload');
var wrap = require('gulp-wrap');
var install = require('gulp-install');
var shell = require('gulp-shell');
var del = require('del');

var gutil = require('gulp-util');
var through = require('through2');
var PluginError = gutil.PluginError;

var exitOnCompletion = false;
var env = process.env.NODE_ENV || 'development';
var isDevelopment = (env === 'development');

//
//  Style tasks
//
gulp.task('styles-sass', function () {
    return gulp.src('src/styles/sass/**/*.scss')
        .pipe(sass({ indentedSyntax: true }))
        .pipe(gulp.dest('public/assets/css'))
        .pipe(notify({ message: '"styles-sass" sub-task complete' }));
});

gulp.task('styles-less', function () {
    return gulp.src('src/styles/less/**/*.less')
        .pipe(concat('styles-less.css'))
        .pipe(less({
            paths: [
                path.join(__dirname, 'vendor/bootstrap/less'), // Bootstrap can be included in app less files
                path.join(__dirname, 'src/styles/less')
            ]
        }))
        .pipe(gulp.dest('public/assets/css'))
        .pipe(notify({ message: '"styles-less" sub-task complete' }));
});

gulp.task('styles-css', function () {
    return gulp.src('src/styles/css/*.css')
        .pipe(concat('styles-plain.css'))
        .pipe(gulp.dest('public/assets/css'))
        .pipe(notify({ message: '"styles-css" sub-task complete' }));
});

gulp.task('styles-vendor', function () {
    // Load all vendor stylesheets expect bootstrap ones which should be loaded manually
    // Sww src/styles/less/main.less
    return gulp.src([ '!vendor/bootstrap/**', 'vendor/**/*.min.css' ])
        .pipe(concat('vendor.min.css'))
        .pipe(gulp.dest('public/assets/css'))
        .pipe(notify({ message: '"styles-css" sub-task complete' }));
});

gulp.task('styles-fonts', function () {
    return gulp.src('src/styles/fonts/**/')
        .pipe(gulp.dest('public/assets/fonts'))
        .pipe(notify({ message: '"styles-fonts" sub-task complete' }));
});

gulp.task('styles', [ 'styles-sass', 'styles-less', 'styles-css', 'styles-vendor', 'styles-fonts' ], function () {
    return gulp.src([
            'public/assets/css/styles-plain.css',
            'public/assets/css/styles-sass.css',
            'public/assets/css/styles-less.css'
        ])
        .pipe(concat('app.css'))
        .pipe(autoprefixer('last 2 version', 'safari 5', 'ie 8', 'ie 9', 'opera 12.1', 'ios 6', 'android 4'))
        .pipe(gulp.dest('public/assets/css'))
        .pipe(minifycss())
        .pipe(rename({ suffix: '.min' }))
        .pipe(gulp.dest('public/assets/css'))
        .pipe(notify({ message: '"styles" task complete' }));
});

//
//  Script tasks
//

gulp.task('scripts-client', function() {
    return gulp.src('src/js/**/*.js')
        .pipe(jshint('.jshintrc-client'))
        .pipe(jshint.reporter('default'))
        .pipe(concat('app.js'))
        .pipe(gulp.dest('public/assets/js'))
        .pipe(rename({ basename: 'app-client', suffix: '.min' }))
        .pipe(uglify())
        .pipe(gulp.dest('public/assets/js'))
        .pipe(notify({ message: '"scripts-client" sub-task complete' }));
});

gulp.task('scripts-client', function() {
    return gulp.src([ 'src/js/app/app.js', 'src/js/app/main.js', 'src/js/**/*.js' ])
        .pipe(jshint('.jshintrc-client'))
        .pipe(jshint.reporter('default'))
        .pipe(concat('app.js'))
        .pipe(wrap('(function () { "use strict"; <%= contents %> })();'))
        .pipe(gulp.dest('public/assets/js'))
        .pipe(rename({ basename: 'app', suffix: '.min' }))
        .pipe(uglify())
        .pipe(gulp.dest('public/assets/js'))
        .pipe(notify({ message: '"scripts-client" sub-task complete' }));
});

gulp.task('scripts-vendor', function() {
    return gulp.src([ 'vendor/**/*.min.js' ])
        .pipe(concat('vendor.min.js'))
        .pipe(gulp.dest('public/assets/js'))
        .pipe(notify({ message: '"scripts-vendor" sub-task complete' }));
});

gulp.task('scripts-server', function() {
    return gulp.src([ 'lib/*.js', 'models/*.js', 'routes/**/*.js' ])
        .pipe(jshint('.jshintrc-server'))
        .pipe(jshint.reporter('default'))
        .pipe(notify({ message: '"scripts-server" sub-task complete' }));
});

gulp.task('scripts', [ 'scripts-client', 'scripts-server', 'scripts-vendor' ], function () {
    return true;
});

//
//  Images
//

gulp.task('images', function() {
    return gulp.src('src/img/**/*')
        .pipe(cache(imagemin({ optimizationLevel: 3, progressive: true, interlaced: true })))
        .pipe(gulp.dest('public/assets/img'))
        .pipe(notify({ message: '"images" task complete' }));
});

//
//  Templates
//
gulp.task('templates', function() {
    function templateMapper (templateName) {
        var templates = [];
        var firstFile = null;

        function bufferContents (file, enc, cb) {
            if (file.isNull()) {
                cb();
                return;
            }

            if (!firstFile) {
                firstFile = file;
            }

            templates.push({
                name: file.relative.replace(/\//g, '-'),
                contents: file.contents.toString()
            });

            return cb();
        }

        function endStream(cb) {
            if (!firstFile || !concat) {
                return cb();
            }

            var joinedFile = firstFile;
            joinedFile.contents = new Buffer(JSON.stringify(templates));

            this.push(joinedFile);
            cb();
        }

        return through.obj(bufferContents, endStream);
    }

    return gulp.src('src/tpl/html/partials/**/*.html')
        .pipe(templateMapper('templates.json'))
        .pipe(rename({ basename: 'partials', extname: '.json' }))
        .pipe(gulp.dest('public/assets/tpl'));
});

// Clean
gulp.task('clean', function (cb) {
    del([
        'public/assets/css',
        'public/assets/js',
        'public/assets/img',
        'public/assets/tpl'
    ], cb);
});

// Default task
gulp.task('default', [ 'clean' ], function() {
    exitOnCompletion = true;
    gulp.start('styles', 'scripts', 'images', 'templates');
});

// Watch
gulp.task('watch', [ 'run' ], function() {

    // Watch stylesheet files
    gulp.watch('src/styles/**/*.scss', [ 'styles' ]);
    gulp.watch('src/styles/**/*.less', [ 'styles' ]);
    gulp.watch('src/styles/**/*.css', [ 'styles' ]);
    gulp.watch('src/styles/fonts/**', [ 'styles-fonts' ]);

    // Watch .js files
    gulp.watch('src/js/**/*.js', [ 'scripts' ]);

    // Watch image files
    gulp.watch('src/img/**/*', [ 'images' ]);

    // Watch template files
    gulp.watch('src/tpl/html/**/*', [ 'templates' ]);

    // Create LiveReload server
    livereload.listen();

    // Watch any files in dist/, reload on change
    gulp.watch([ 'public/**' ]).on('change', livereload.changed);

});

// Run
gulp.task('run', function () {
    nodemon({ script: 'index.js', ext: 'html js json handlebars scss', ignore: [ '*-run.json', 'node_modules' ] })
        .on('restart', function () {
            console.log('restarted!');
        })
});

// Install
gulp.task('install', function () {
    return gulp.src([ './bower.json', './package.json' ])
        .pipe(install({ production: !isDevelopment }));
});

//
// Tests
//
gulp.task('test', [ 'test:unit', 'test:e2e' ], function (cb) {
    process.exit();
});

gulp.task('test:e2e', [ 'test:webdriver-update', 'run' ], function (cb) {
    var localConfigExists = fs.existsSync('./test/e2e/protractor.local.js');
    return gulp.src([ 'test/e2e/specs/**/*.js' ], { read: false })
        .pipe(protractor({
            configFile: localConfigExists
                ? './test/e2e/protractor.local.js'
                : './test/e2e/protractor.js',
            args: [ '--baseUrl', 'http://127.0.0.1:' + config.port ]
        }));
});

gulp.task('test:webdriver-update', function (cb) {
    return require('gulp-protractor').webdriver_update(cb);
});

gulp.task('test:unit', function () {
    return gulp.src([ 'test/unit/**/*.js' ], { read: false })
        .pipe(mocha({ reporter: 'spec' }));
});

// Distribution
// TODO:

gulp.on('stop', function () {
    if (exitOnCompletion) {
        process.nextTick(function () {
            process.exit(0);
        });
    }
});