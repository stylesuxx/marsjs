module.exports = function(grunt) {

  grunt.initConfig({
    jshint: {
      files: ['Gruntfile.js', 'src/*.js'],
      options: {
        shadow: true,
        evil: true,
        globals: {
          jQuery: true
        }
      }
    },
    browserify: {
      main: {
        src: './src/index.js',
        dest: './app.js'
      }
    },
    watch: {
      files: ['<%= jshint.files %>'],
      tasks: ['jshint', 'browserify']
    }
  });

  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-browserify');

  grunt.registerTask('default', ['jshint', 'browserify']);

};