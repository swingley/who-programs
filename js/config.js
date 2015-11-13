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
  whoDisclaimerShort: 'WHO Disclaimer',
  whoDisclaimer: 'WHO disclaimer:  The boundaries and names shown and the designations used on this map do not imply the expression of any opinion whatsoever on the part of the World Health Organization concerning the legal status of any country, territory, city or area or of its authorities, or concerning the delimitation of its frontiers or boundaries. Dotted lines on maps represent approximate border lines for which there may not yet be full agreement (click to hide).'
};