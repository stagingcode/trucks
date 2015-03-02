app-skeleton
============

nodeSWAT internal stack (MEAN) for bootstrapping new applications.

Features:

* **MEAN** (MongoDB, ExpressJS, AngularJS, NodeJS) stack
* **gulp.js** for workflow automation, application building and distribution
* **LESS** / **SASS** for sugared CSS
* **bower** for client side application dependencies management
* **pngcrush** for images compression
* **jshint** for linting code
* **mocha** for running tests (unit, integration)
* **protractor** (\w mocha) for running e2e tests
* **cluster** module support

TODO:

* Add distribution bundle generation
* Add sourcemaps generation
* Add browserfy support
* Add test coverage reports
* Add git precommit hooks for jshint???
* Add switchable support for React/Ember.js

Installing dependencies
=======

To get application up and running you need to install application dependencies.
Following commands will install npm (server-side) and bower (client-side) dependencies.

```bash
npm install

npm install -g bower
bower install
```

By default (if NODE_ENV is not set or is set to "development"), it also installs development Tools.

Building application and dependencies
======

**gulp.js** is used as a build system.

Install gulp.

```bash
npm install -g gulp
```

You also need to install development tools and libraries to get all the build steps working.

```bash
# OS X
brew install libpng

# Linux
apt-get install libpng-dev make g++
```

To build application, run following command.

```bash
gulp
```

Automating development flow
======

Development can be automated with following command. All the changes made will be automatically rebuilt and it also restarts application server.

```bash
gulp watch
```

Running tests
======


```bash
gulp test
gulp test:e2e
gulp test:unit
```

Creating distribution bundle for the deployment
======

Running this command will generate compressed (tar.gz) bundle for the application deployment. Generated archive can be found from `dist/` directory.

Name schema for the application bundle: `app-skeleton-01e09e9-1.0.0.tar.gz` (**[application name]-[revision]-[version]**)

```bash
gulp dist
```
