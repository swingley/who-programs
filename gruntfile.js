module.exports = function(grunt) {
  
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    cssmin: {
      combine: {
        files: {
          'built/styles.min.css': [
            'node_modules/leaflet/dist/leaflet.css', 
            'css/styles.css'
          ]
        }
      }
    },
    uglify: {
      options: {
        banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyy-mm-dd") %> */\n'
      },
      build: {
        src: [
          'node_modules/leaflet/dist/leaflet.js', 
          'node_modules/esri-leaflet/dist/esri-leaflet.js', 
          'js/lodash.custom.min.js', 
          'js/map.js'
        ],
        dest: 'built/<%= pkg.name %>.min.js'
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-cssmin');

  grunt.registerTask('default', ['uglify', 'cssmin']);
};