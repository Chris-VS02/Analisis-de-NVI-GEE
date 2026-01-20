var lon = 105.47; var lat = 10.45;
var area = ee.Geometry.Point([lon, lat]).buffer(1000); // Área de 1km
Map.setCenter(lon, lat, 14);

// 1. Generar 50 puntos aleatorios dentro de esa zona de arroz
var puntosMuestreo = ee.FeatureCollection.randomPoints(area, 50);
Map.addLayer(puntosMuestreo, {color: 'yellow'}, 'Puntos de entrenamiento');

// 2. Colecciones (2017 - 2025)
var s2 = ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
    .filterBounds(area)
    .filterDate('2017-01-01', '2025-12-31')
    .filterMetadata('CLOUDY_PIXEL_PERCENTAGE', 'less_than', 30);

var s1 = ee.ImageCollection("COPERNICUS/S1_GRD")
    .filterBounds(area)
    .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VH'));

// 3. Función para añadir Features (NDVI, NDWI, EVI)
var addIndices = function(img) {
  var ndvi = img.normalizedDifference(['B8', 'B4']).rename('NDVI');
  var ndwi = img.normalizedDifference(['B3', 'B8']).rename('NDWI');
  var evi = img.expression('2.5 * ((N-R)/(N+6*R-7.5*B+1))', 
    {'N':img.select('B8'),'R':img.select('B4'),'B':img.select('B2')}).rename('EVI');
  return img.addBands([ndvi, ndwi, evi]);
};

// 4. Extracción masiva (Mapeo sobre puntos y fechas)
var datasetMasivo = s2.map(addIndices).map(function(img) {
  var fecha = img.date().format('yyyy-MM-dd');
  
  // Extraer valores para CADA uno de los 50 puntos
  return img.reduceRegions({
    collection: puntosMuestreo,
    reducer: ee.Reducer.mean(),
    scale: 10
  }).map(function(feature) {
    return feature.set('fecha', fecha);
  });
}).flatten(); // Convertir la lista de listas en una sola tabla plana

// 5. Exportar a Drive (Dataset Robusto)
Export.table.toDrive({
  collection: datasetMasivo,
  description: 'Dataset_Arroz_Vietnam_BigData_2017_2025',
  fileFormat: 'CSV',
  selectors: ['fecha', 'NDVI', 'NDWI', 'EVI', 'mean'] // 'mean' aquí es el valor extraído
});

print('Dataset configurado con 50 puntos y 8 años de datos. Dale a RUN en Tasks.');