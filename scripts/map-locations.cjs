// Display overlay only: preserve source records and verification timestamps.
function cityLocation(item, gazetteer) {
  if(item.simulated!==false||item.publicationApproved!==true||item.verification?.state!=='verified')return null;
  const text=String(item.location||'').replace(/University of (?:Sydney|Melbourne)/gi,'');
  if(/remote|online|global|worldwide|varies|various|australia-wide|nominate|office allocation|host varies|team discretion|flexible.*location|\bor\b/i.test(text))return null;
  const matches=gazetteer.cities.filter(city=>city.country===item.country&&new RegExp(city.label==='Washington, DC'?'\\bWashington,?\\s+(?:DC|D\\.?C\\.?)\\b':'\\b'+city.label+'\\b','i').test(text));
  if(matches.length!==1)return null;
  const city=matches[0];
  return {city:city.label,lat:city.lat,lon:city.lon,precision:'city',locationEvidence:item.location,sourceUrl:item.verification.sourceUrl,coordinateSourceUrl:city.sourceUrl};
}
function validateGazetteer(gazetteer) {
  const labels=new Set();
  for(const city of gazetteer.cities) {
    if(!city.label||labels.has(city.label)||!city.country||!Number.isFinite(city.lat)||Math.abs(city.lat)>90||!Number.isFinite(city.lon)||Math.abs(city.lon)>180||!/^https:\/\/www\.geonames\.org\/\d+\//.test(city.sourceUrl))throw new Error('Invalid city representative point');
    labels.add(city.label);
  }
}
module.exports={cityLocation,validateGazetteer};
