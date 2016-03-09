require([
  'esri/config', 'esri/basemaps',
  'esri/map', 'esri/geometry/Extent',
  'esri/layers/ArcGISTiledMapServiceLayer',
  'esri/layers/GraphicsLayer', 'esri/graphic', 'esri/Color',
  'esri/symbols/SimpleLineSymbol', 'esri/symbols/SimpleFillSymbol',
  'esri/dijit/Scalebar', 'esri/dijit/Popup', 'esri/InfoTemplate',
  'esri/tasks/QueryTask', 'esri/tasks/query',
  'dojo/dom', 'dojo/dom-construct', 'dojo/dom-class'
], function(
  esriConfig, basemaps,
  Map, Extent,
  Tiled,
  GraphicsLayer, Graphic, Color,
  LineSymbol, FillSymbol,
  Scalebar, Popup, InfoTemplate,
  QueryTask, Query,
  dom, domConstruct, domClass
) {
  var programs, programLookup = {},
    highlight;

  // Custom basemap using WHO services.
  // Using isReference: true puts service images/tiles on top of vector layers.
  basemaps['who-eckert'] = {
    baseMapLayers: [{
      url: config.base
    }, {
      url: config.disputed,
      isReference: true
    }],
    thumbnailUrl: '',
    title: 'WHO'
  }
  esriConfig.defaults.io.corsDetection = false;
  esriConfig.defaults.map.zoomDuration = 200;
  var bounds = new Extent({
    "xmin": -17054861,
    "ymin": -5573571,
    "xmax": 14969784,
    "ymax": 11347631,
    "spatialReference": {
      "wkid": 54013
    }
  });
  var boundary = new LineSymbol('solid', new Color("#fff"), 2);
  var fill = new FillSymbol("solid", boundary, null);
  var popup = new Popup({
    fillSymbol: fill,
    titleInBody: false
  }, domConstruct.create("div"));
  popup.anchor = 'top';
  //Add the light theme.
  domClass.add(popup.domNode, "light");
  window.map = new Map('map', {
    basemap: 'who-eckert',
    extent: bounds,
    infoWindow: popup,
    logo: false
  });
  // Scale bar.
  new Scalebar({
    attachTo: 'bottom-right',
    map: map,
    scalebarStyle: 'line',
    scalebarUnit: 'metric'
  });

  // Add WHO disclaimer.
  var attribution = document.getElementsByClassName('esriAttributionList')[
    0];
  var shortDisclaimer = domConstruct.create('span');
  var disclaimer = domConstruct.create('span', {
    'class': 'who-disclaimer'
  });
  var fullDisclaimer = domConstruct.create('span', {
    'class': 'who-disclaimer-full hidden'
  });
  fullDisclaimer.innerHTML = config.whoDisclaimer;
  fullDisclaimer.addEventListener('click', function() {
    this.className = this.className + ' hidden';
  });
  disclaimer.innerHTML = config.whoDisclaimerShort;
  disclaimer.addEventListener('click', function() {
    fullDisclaimer.classList.remove('hidden');
    fullDisclaimer.className = fullDisclaimer.className.replace(
      ' hidden', '');
  });
  shortDisclaimer.appendChild(disclaimer);
  attribution.appendChild(shortDisclaimer);
  document.body.appendChild(fullDisclaimer);

  // Yellow->Green ramp for number of programes per country.
  var colors = [{}, {
    'hex': '#FFFFBE'
  }, {
    'hex': '#D3FFBE'
  }, {
    'hex': '#89CD66'
  }, {
    'hex': '#38A800'
  }, {
    'hex': '#266100'
  }];

  function getColor(d) {
    return colors[d].hex;
  }

  function fixAdviserMarkup(info) {
    // National Pharmaceutical Adviser markup is not valid.
    // Example:  <a href="mailto:mulumbaa@who.int" Dr Anastasie Mulumba</a>
    // Missing the closing '>' after the email address.
    // Fix by inserting missing '>' after the href value.
    if (info.indexOf('mailto') > -1) {
      info = info.replace(config.pharmAdviserFix, function(a, b) {
        return b.replace(' ', '>');
      });
    }
    return info;
  }

  // Display feature info. Must be global as it is called from info template.
  window.buildInfo = function(feature) {
    console.log('buildInfo props', props);
    var props = feature.attributes;
    var programInfo = '';
    if (props && props.hasOwnProperty(config.name) && props.hasOwnProperty(
        config.programAll)) {
      programInfo += fixAdviserMarkup(props[config.programAll]);
    } else {
      programInfo = '<h4>WHO Programmes:</h4>Click a country.';
    }
    return programInfo;
  }

  function getSelectedPrograms() {
    // Get all the checked check boxes.
    var checked = document.querySelectorAll('input[type=checkbox]:checked');
    // Return the IDs
    var selected = _.map(checked, function(c) {
      return c.id;
    });
    return selected;
  }

  // Legend
  function createLegend(info) {
    var div = domConstruct.create('div', {
      'class': 'legend'
    });
    div.innerHTML = '<div class="heading">Programme count by country</div>';
    var counts = [1, 2, 3, 4, 5];
    // Create swatches.
    for (var i = 0; i < counts.length; i++) {
      div.innerHTML += '<i style="background:' + getColor(counts[i]) +
        '"></i>';
    }
    // Add swatch labels.
    var labels = domConstruct.create('div', {
      'class': 'swatch-labels'
    }, div);
    for (var j = 0; j < counts.length; j++) {
      labels.innerHTML += '<span>' + (j + 1) + '</span>';
    }
    // Add "Not applicable" swatch.
    var na = domConstruct.create('div', {
      'class': 'na-swatch',
      'innerHTML': '<em>' + config.na + '</em>'
    }, labels)
    // Add programs
    var filters = domConstruct.create('div', {
      'class': 'filters'
    }, div);
    filters.innerHTML = '<div class="heading">Show countries with:</div>';
    for (var k = 0; k < info.length; k++) {
      var programId = programLookup[info[k]];
      // Add a separator above last entry, which is pharm adivser.
      if (k === (info.length - 1)) {
        filters.innerHTML += '<div class="program pharm-adviser">';
      } else {
        filters.innerHTML += '<div class="program">';
      }
      filters.innerHTML += '<input type="checkbox" checked="checked" id="' +
        programId +
        '"><label class="program" for="' + programId + '">' + info[k] +
        '</label></div>';
    }
    filters.addEventListener('click', function(e) {
      if (e.target.id) {
        var selected = getSelectedPrograms(e);
        console.log('selected', selected);
        map.getLayer('countries').graphics.forEach(function(g) {
          var props = g.attributes;
          var show = false;
          for (var i = 0; i < selected.length; i++) {
            if (props.hasOwnProperty(selected[i]) && props[selected[
                i]]) {
              show = true;
              break;
            }
          }
          if (show) {
            g.show();
          } else {
            g.hide();
          }
        });
      }
    }, false);
    domConstruct.place(div, map.root);
  }

  function createProgramList(features) {
    var programsList = [];
    // Loop through all features.
    features.forEach(function(f) {
      // Loop through all attributes.
      for (var p in f.attributes) {
        // Check if the current attribute has program info.
        if (config.programMatcher.test(p)) {
          var gram = f.attributes[p];
          // Check if this attribute corresponds to a program.
          if (gram) {
            // Create a list of unique programs and lookup object
            if (programsList.indexOf(gram) === -1) {
              programLookup['program' + programsList.length] = gram;
              programLookup[gram] = 'program' + programsList.length;
              programsList.push(gram);
            }
            // Add a new attribute to indicate this feature participates in a program.
            // This attribute is used when filtering (showing/hiding) features.
            var programId = programLookup[gram];
            if (programId) {
              f.attributes[programId] = true;
            }
          }
        }
      }
    });
    // Alphabetize.
    programsList.sort();
    // Move pharm adviser to the end of the list.
    var position = -1;
    for (var i = 0; i < programsList.length; i++) {
      if (programsList[i].indexOf("Adviser") > -1) {
        position = i;
        break;
      }
    }
    if (position > -1) {
      var a = programsList.splice(position, 1)[0];
      programsList.push(a);
    }
    // console.log('programsList', programsList);
    createLegend(programsList);
  }

  function createGraphics(features) {
    var gl = new GraphicsLayer({
      id: 'countries'
    });
    var outline = new LineSymbol(boundary.toJson())
      .setColor(new Color('#CBBBC2'))
      .setWidth(1);
    var fill = new FillSymbol('solid', outline, null);
    var infoTemplate = new InfoTemplate('${' + config.name + '}', buildInfo);
    features.forEach(function(f) {
      // create a graphic, add it to the map;
      var color = getColor(f.attributes[config.programCount]);
      var symbol = new FillSymbol(fill.toJson()).setColor(new Color(
        color));
      symbol = symbol.toJson();
      // symbol.color[3] = 178; // .7 opacity
      symbol = new FillSymbol(symbol);
      f.setSymbol(symbol);
      f.setInfoTemplate(infoTemplate)
      gl.add(f);
    });
    map.addLayer(gl);
  }

  // Get country data, add it to the map.
  var queryTask = new QueryTask(config.features);
  var query = new Query();
  query.where = '1=1';
  query.returnGeometry = true;
  query.geometryPrecision = 1;
  query.maxAllowableOffset = 2116; // map.extent.getWidth() / map.width at largest scale.
  query.outFields = ['*'];
  queryTask.execute(query).then(
    function(result) {
      console.log('success', result);
      createProgramList(result.features);
      createGraphics(result.features);
    },
    function(error) {
      console.log('query error', error);
    }
  );
});
