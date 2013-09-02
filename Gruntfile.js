module.exports = function(grunt){
'use strict';

  var files = {
    src: 'config/*.js',
    tests: 'test/testOaktree.js'
  };

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    watch: {
      options: {
        spawn: false
      },
      files: [
        'Gruntfile.js',
        files.src,
        files.tests
      ],
      tasks: ['test']
    },
    jshint: {
      all: [
        'Gruntfile.js',
        files.src,
        files.tests
      ]
    },
    mochacov: {
      test: {
        src: [files.tests]
      },
      coverage: {
        src: [files.tests],
        options:{
          coverage: true
        }
      },
      coveralls: {
        options: {
          coveralls: {
            serviceName: 'travis-ci',
            repoToken: process.env.OAKTREE_COVERALLS_REPO_TOKEN
          }
        }
      },
      options: {
        reporter: 'spec'
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-mocha-cov');

  grunt.registerTask('travis', ['jshint:all', 'mochacov:test', 'mochacov:coverage']);
  grunt.registerTask('test', ['jshint:all', 'mochacov:test']);
  grunt.registerTask('watchserver', function(){
    grunt.task.run([
      'watch'
      ]);
  });
  grunt.registerTask('default', ['test']);
};