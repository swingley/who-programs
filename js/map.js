var programs, programLookup = {}, highlight;

// Object to specify various things including:  
// url for features, attribute names.
var config = {
  features: 'https://extranet.who.int/arcgis/rest/services/GIS/PAU_Programme_Activity_201510/MapServer/0',
  name: 'detailed_2011.CNTRY_TERR',
  pharmAdviserFix: /(mailto:[A-Za-z]*@[A-Za-z]*\.[A-Za-z]*" [A-Za-z])/,
  programAll: '_v_PAU_Programme_Activity_2.Extra_Information',
  programCount: '_v_PAU_Programme_Activity_2.Programme_Count',
  // programMatcher is a regular expression to match things like:
  // _v_PAU_Programme_Activity_2.Programme_3_ShortDescription
  //  not:
  // _v_PAU_Programme_Activity_2.Programme_3_Description
  // _v_PAU_Programme_Activity_2.Programme_3_Activity
  programMatcher: /Programme\_\d\_ShortDescription/,
  advisorsMessage: 'If a country has a National Pharmaceutical Adviser, the advisor name is shown when a country is clicked.'
};

var map = L.map('map', {
  minZoom: 1,
  maxZoom: 4
}).setView([30, 0], 2);
L.esri.basemapLayer("Gray", { hideLogo: true }).addTo(map);

// Styling info. These are a series of blues from WHO.
var colors = [
  { 'hex': '#B7DDE7' },
  { 'hex': '#94CDDB' },
  { 'hex': '#96B4D6' },
  { 'hex': '#1EB1ED' },
  { 'hex': '#1072BD' },
  { 'hex': '#19375C' }
];
function getColor(d) {
  return colors[d].hex;
}
function style(feature) {
  return {
    fillColor: getColor(feature.properties[config.programCount]),
    weight: 1,
    opacity: 1,
    color: 'white',
    fillOpacity: 0.7
  };
}

// Feature interaction.
function resetHighlight() {
  if ( highlight ) {
    programs.resetStyle(highlight);
  }
}
function highlightFeature(e) {
  resetHighlight();
  var layer = e.target;
  layer.setStyle({
    weight: 2,
    color: '#fff',
    dashArray: '',
    fillOpacity: 0.7
  });
  if (!L.Browser.ie && !L.Browser.opera) {
    layer.bringToFront();
  }
  highlight = e.target;
}

function fixAdviserMarkup(info) {
  // National Pharmaceutical Adviser markup is not valid. 
  // Example:  <a href="mailto:mulumbaa@who.int" Dr Anastasie Mulumba</a>
  // Missing the closing '>' after the email address.
  // Fix by inserting missing '>' after the href value.
  if ( info.indexOf('mailto') > -1 ) {
    info = info.replace(config.pharmAdviserFix, function(a, b) {
      return b.replace(' ', '>');
    });
  }
  return info;
}

// Display feature info.
function buildInfo(props) {
  var programInfo = '';
  if ( props && props.hasOwnProperty(config.name) && props.hasOwnProperty(config.programAll) ) {
    programInfo = '<h4>' + props[config.name] + '</h4>';
    programInfo += fixAdviserMarkup(props[config.programAll]);
  } else {
    programInfo = '<h4>WHO Programmes:</h4>Click a country.';
  }
  return programInfo;
}
function onEachFeature(feature, layer) {
  layer.on({
    click: highlightFeature
  });
  layer.bindPopup(buildInfo(feature.properties));
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
  var legend = L.control({ position: 'bottomright' });
  legend.onAdd = function() {
    var div = L.DomUtil.create('div', 'legend');
    div.innerHTML = '<div class="heading">Program Count by Country</div>';
    var counts = [1, 2, 3, 4, 5];
    // Create swatches.
    for (var i = 0; i < counts.length; i++) {
      div.innerHTML += '<i style="background:' + getColor(counts[i]) + '"></i>';
    }
    // Add swatch labels.
    var labels = L.DomUtil.create('div', 'swatch-labels', div);
    for (var j = 0; j < counts.length; j++) {
      labels.innerHTML += '<span>' + (j+1) + '</span>';
    }
    // Add programs
    var filters = L.DomUtil.create('div', 'filters', div);
    filters.innerHTML = '<div class="heading">Show Countries with:</div>';
    for ( var k = 0; k < info.length; k++ ) {
      filters.innerHTML += '<div class="program">' +
        '<input type="checkbox" checked="checked" id="program' + k + 
        '"><label class="program" for="program' + k + '">' + info[k] + '</label></div';
    }
    filters.addEventListener('click', function(e) {
      if ( e.target.id ) {
        var selected = getSelectedPrograms(e);
        programs.getLayers().forEach(function(l) {
          var props = l.feature.properties;
          var show = false;
          for ( var i = 0; i < selected.length; i++ ) {
            if ( props.hasOwnProperty(selected[i]) && props[selected[i]] ) {
              show = true;
              break;
            }
          }
          if ( show ) {
            map.addLayer(l);
          } else {
            map.removeLayer(l);
          }
        });
      }
    }, false);
    // Add info about National Pharmaceutical Advisers
    var advisors = L.DomUtil.create('div', 'advisors', div);
    advisors.innerHTML = config.advisorsMessage;
    // Prevent map panning/zooming when interacting with the legend container.
    if (!L.Browser.touch) {
      L.DomEvent.disableClickPropagation(div);
      L.DomEvent.on(div, 'mousewheel', L.DomEvent.stopPropagation);
    } else {
      L.DomEvent.on(div, 'click', L.DomEvent.stopPropagation);
    }
    return div;
  };
  legend.addTo(map);
}

function createProgramList(json) {
  var programsList = [];
  // Loop through all features.
  json.features.forEach(function(f) {
    // Loop through all attributes.
    for ( var p in f.properties ) {
      // Check if the current attribute has program info.
      if ( config.programMatcher.test(p) ) {
        var gram = f.properties[p];
        // Check if this attribute corresponds to a program.
        if ( gram ) {
          // Create a list of unique programs and lookup object
          if ( gram.indexOf('Adviser') === -1 && programsList.indexOf(gram) === -1 ) {
            programLookup['program' + programsList.length] = gram;
            programLookup[gram] = 'program' + programsList.length;
            programsList.push(gram);
          }
          // Add a new attribute to indicate this feature participates in a program.
          // This attribute is used when filtering (showing/hiding) features.
          var programId = programLookup[gram];
          if ( programId ) {
            f.properties[programId] = true;
          }
        }
      }
    }
  });
  // console.log('programsList', programsList);
  createLegend(programsList);
}

// Get country data, add it to the map.
L.esri.Tasks.query({
  url: config.features
}).where("1=1").precision(6).run(function(error, countries) {
  // console.log('got countries', countries);
  createProgramList(countries);
  programs = L.geoJson(countries, {
    onEachFeature: onEachFeature, 
    style: style
  }).addTo(map);
});
