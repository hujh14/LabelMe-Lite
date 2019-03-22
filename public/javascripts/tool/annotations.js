/**
 * Annotation tool powered by PaperJS.
 */
 
function Annotation(name){
  this.name = name;
  this.boundary = new CompoundPath();
  this.raster = new Raster({size: new Size(background.image.width, background.image.height)});
  this.rasterinv = this.raster.clone();

 // Add to data structures
  this.id = this.raster.id;
  annotations.unshift(this);
  tree.addAnnotation(this);
  background.align(this);

  // Undo
  this.undoHistory = [];
  this.redoHistory = [];

  // Styles
  this.color = new Color(Math.random(), Math.random(), Math.random(), 1);
  this.colorinv = this.color / 2;
  this.visible = true;
  this.unhighlight();
}
Annotation.prototype.updateBoundary = function() {
  var imageData = this.raster.getImageData();
  var boundaries = findBoundariesOpenCV(imageData);

  var paths = [];
  for (var i = 0; i < boundaries.length; i++) {
    var path = new Path({ segments: boundaries[i] });
    path.closed = true;
    paths.push(path);
  }
  var paths = new CompoundPath({ children: paths });
  paths.remove();

  this.boundary.pathData = paths.pathData;
  this.toPointSpace(this.boundary);
  sortAnnotations();

  // Undo history
  if (this.undoHistory.length == 0 || paths.pathData != this.undoHistory[this.undoHistory.length-1]) {
    this.undoHistory.push(paths.pathData);
    this.redoHistory = [];
  }
}
Annotation.prototype.updateRaster = function(boundary) {
  var boundary = (boundary) ? boundary : this.boundary;

  // Make raster
  var boundary_raster = this.rasterize(boundary, this.color);
  boundary_raster.remove();

  // Clear raster
  var cv = document.createElement('canvas');
  var ctx = cv.getContext('2d');
  var imageData = ctx.getImageData(0, 0, this.raster.width, this.raster.height);
  this.raster.setImageData(imageData, new Point(0, 0));

  // Set raster
  if (boundary_raster.height != 0 && boundary_raster.width != 0) {
    var imageData = boundary_raster.getImageData();
    this.raster.setImageData(imageData, boundary_raster.bounds.topLeft);
  }

  this.rasterinvUpToDate = false;
}
Annotation.prototype.updateRasterInv = function(boundary) {
  var boundary = (boundary) ? boundary : this.boundary;
  var boundaryinv = new CompoundPath({
    children: [new Path.Rectangle(this.raster.bounds), boundary.clone()],
    fillRule: "evenodd"
  });
  boundaryinv.remove();

  // Make raster
  var boundaryinv_raster = this.rasterize(boundaryinv, this.colorinv);
  boundaryinv_raster.remove();

  // Clear raster
  var cv = document.createElement('canvas');
  var ctx = cv.getContext('2d');
  var imageData = ctx.getImageData(0, 0, this.raster.width, this.raster.height);
  this.rasterinv.setImageData(imageData, new Point(0, 0));

  // Set raster
  if (boundaryinv_raster.height != 0 && boundaryinv_raster.width != 0) {
    var imageData = boundaryinv_raster.getImageData();
    this.rasterinv.setImageData(imageData, boundaryinv_raster.bounds.topLeft);
  }

  this.rasterinvUpToDate = true;
}
Annotation.prototype.delete = function() {
  this.boundary.remove();
  this.raster.remove();
  this.rasterinv.remove();

  annotations.splice(annotations.indexOf(this), 1);
  tree.deleteAnnotation(this);
}
Annotation.prototype.undelete = function() {
  project.activeLayer.addChild(this.boundary);
  project.activeLayer.addChild(this.raster);
  project.activeLayer.addChild(this.rasterinv);

  annotations.unshift(this);
  tree.addAnnotation(this);
  background.align(this);
}
Annotation.prototype.undo = function() {
  if (this.undoHistory.length > 1) {
    var currentBoundary = this.undoHistory.pop();
    this.redoHistory.push(currentBoundary);
    var pathData = this.undoHistory[this.undoHistory.length-1];
    var boundary = new CompoundPath(pathData);
    this.toPointSpace(boundary);
    boundary.remove();

    this.boundary.pathData = boundary.pathData;
    this.updateRaster();
    return true;
  }
  return false;
}
Annotation.prototype.redo = function() {
  if (this.redoHistory.length != 0) {
    var pathData = this.redoHistory.pop();
    this.undoHistory.push(pathData);
    var boundary = new CompoundPath(pathData);
    this.toPointSpace(boundary);
    boundary.remove();

    this.boundary.pathData = boundary.pathData;
    this.updateRaster();
    return true;
  }
  return false;
}

//
// Transform
//
Annotation.prototype.translate = function(delta) {
  this.raster.translate(delta);
  this.rasterinv.translate(delta);
  this.boundary.translate(delta);
}
Annotation.prototype.scale = function(scale, center) {
  this.raster.scale(scale, center);
  this.rasterinv.scale(scale, center);
  this.boundary.scale(scale, center);
}
Annotation.prototype.changeColor = function() {
  this.color = new Color(Math.random(), Math.random(), Math.random(), 1);
  this.colorinv = this.color / 2;
  this.boundary.strokeColor = this.color;
  this.updateRaster();
}

//
// Point to Pixel
//
Annotation.prototype.containsPixel = function(pixel) {
  var c = this.raster.getPixel(pixel);
  return c.alpha > 0.5;
}
Annotation.prototype.containsPoint = function(point) {
  var pixel = this.getPixel(point);
  return this.containsPixel(pixel);
}
Annotation.prototype.getPixel = function(point) {
  var bounds = this.raster.bounds;
  var size = this.raster.size;
  var tl = bounds.topLeft;

  var x = (point.x - tl.x) * (size.height/ bounds.height) - 0.5;
  var y = (point.y - tl.y) * (size.height/ bounds.height) - 0.5;
  return new Point(x, y);
}
Annotation.prototype.getPoint = function(pixel) {
  var bounds = this.raster.bounds;
  var size = this.raster.size;
  var tl = bounds.topLeft;

  var x = (pixel.x + 0.5) * (bounds.height / size.height) + tl.x;
  var y = (pixel.y + 0.5) * (bounds.height / size.height) + tl.y;
  return new Point(x, y);
}
Annotation.prototype.toPixelSpace = function(path) {
  var bounds = this.raster.bounds;
  var size = this.raster.size;
  var tl = bounds.topLeft;

  path.translate(-tl);
  path.scale(size.height / bounds.height, new Point(0, 0));
  path.translate(new Point(-0.5, -0.5));
}
Annotation.prototype.toPointSpace = function(path) {
  var bounds = this.raster.bounds;
  var size = this.raster.size;
  var tl = bounds.topLeft;

  path.translate(new Point(0.5, 0.5));
  path.scale(bounds.height / size.height, new Point(0, 0));
  path.translate(tl);
}

//
// Edit Annotation with brushTool
//
Annotation.prototype.unite = function(path) {
  var path_raster = this.rasterize(path, "red");
  path_raster.remove();
  if (path_raster.height == 0 || path_raster.width == 0) {
    return;
  }

  var pixels = getRasterPixels(path_raster);
  editRasterCrop(this.raster, path_raster.bounds, pixels, this.color);
  editRasterCrop(this.rasterinv, path_raster.bounds, pixels, new Color(0,0,0,0));
}
Annotation.prototype.subtract = function(path) {
  var path_raster = this.rasterize(path, "red");
  path_raster.remove();
  if (path_raster.height == 0 || path_raster.width == 0) {
    return;
  }
  
  var pixels = getRasterPixels(path_raster);
  editRasterCrop(this.raster, path_raster.bounds, pixels, new Color(0,0,0,0));
  editRasterCrop(this.rasterinv, path_raster.bounds, pixels, this.colorinv);
}
Annotation.prototype.rasterize = function(path, color) {
  var clone = path.clone();
  clone.fillColor = color;
  clone.strokeColor = color;
  clone.strokeWidth = 0.1;
  this.toPixelSpace(clone);
  clone.translate(new Point(0.5, 0.5)); // Align for rasterize.

  var path_raster = clone.rasterize(paper.view.resolution / window.devicePixelRatio);
  clone.remove();
  return path_raster;
}
function getRasterPixels(raster) {
  var pixels = [];
  var imageData = raster.getImageData();
  for (var x = 0; x < raster.width; x++) {
    for (var y = 0; y < raster.height; y++) {
      var p = (y * raster.width + x) * 4;
      if (imageData.data[p+3] != 0) {
        pixels.push(new Point(x,y));
      }
    }
  }
  return pixels;
}
function editRasterCrop(raster, crop_bbox, pixels, color) {
  var crop = raster.getImageData(crop_bbox);
  for (var i = 0; i < pixels.length; i++) {
      setPixelColor(crop, pixels[i], color);
  }
  raster.setImageData(crop, crop_bbox.topLeft);
}
function setPixelColor(imageData, pixel, color) {
  var x = Math.round(pixel.x);
  var y = Math.round(pixel.y);
  if (x < 0 || y < 0
    || x >= imageData.width || y >= imageData.height) {
    return;
  }
  var p = (y * imageData.width + x) * 4;
  imageData.data[p] = color.red * 255;
  imageData.data[p+1] = color.green * 255;
  imageData.data[p+2] = color.blue * 255;
  imageData.data[p+3] = color.alpha * 255;
}

//
// Utils
//
function findBoundariesOpenCV(imageData) {
  var src = cv.matFromImageData(imageData);
  var dst = cv.Mat.zeros(src.cols, src.rows, cv.CV_8UC3);
  cv.cvtColor(src, src, cv.COLOR_RGBA2GRAY, 0);
  cv.threshold(src, src, 1, 255, cv.THRESH_BINARY);
  var contours = new cv.MatVector();
  var hierarchy = new cv.Mat();
  // // You can try more different parameters
  cv.findContours(src, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_NONE);

  var boundaries = [];
  for (var i = 0; i < contours.size(); i++) {
    var cnt = contours.get(i);
    var bnd = [];
    for (var j = 0; j < cnt.rows; j++) {
      bnd.push([cnt.data32S[j*2], cnt.data32S[j*2+1]])
    }
    if (bnd.length > 4) {
      boundaries.push(bnd);
    }
    cnt.delete();
  }
  src.delete();
  dst.delete();
  contours.delete();
  hierarchy.delete();
  return boundaries;
}

//
// Styles
//
Annotation.prototype.highlight = function() {
  if ( ! this.highlighted) {
    console.log(this.name);
  }
  this.highlighted = true;
  tree.setActive(this, true);
  this.emphasizeBoundary();
  if (annotations.styleInverted) {
    this.emphasizeMask();
  }
}
Annotation.prototype.unhighlight = function() {
  this.highlighted = false;
  tree.setActive(this, false);
  this.emphasizeMask();
  if (annotations.styleInverted) {
    this.emphasizeBoundary();
  }
}
Annotation.prototype.hide = function() {
  this.highlighted = false;
  tree.setActive(this, false);

  this.raster.opacity = 0;
  this.rasterinv.opacity = 0;
  this.boundary.strokeColor = this.color;
  this.boundary.strokeWidth = 0;
  this.boundary.fillColor = null;
}
Annotation.prototype.setInvisible = function() {
  this.visible = false;
  this.raster.visible = false;
  this.rasterinv.visible = false;
  this.boundary.visible = false;
}
Annotation.prototype.setVisible = function() {
  this.visible = true;
  this.raster.visible = true;
  this.rasterinv.visible = true;
  this.boundary.visible = true;
}
Annotation.prototype.emphasizeMask = function() {
  this.raster.opacity = 0.7;
  this.rasterinv.opacity = 0;
  this.boundary.strokeColor = this.color;
  this.boundary.strokeWidth = 0;
  this.boundary.fillColor = null;
}
Annotation.prototype.emphasizeBoundary = function() {
  this.raster.opacity = 0.2;
  this.rasterinv.opacity = 0;
  this.boundary.strokeColor = this.color;
  this.boundary.strokeWidth = paper.tool.toolSize;
  this.boundary.fillColor = null;
}

//
// RLE
//
Annotation.prototype.loadRLE = function(rle) {
  var height = rle["size"][0];
  var width = rle["size"][1];
  var color = [this.color.red * 255, this.color.green * 255, this.color.blue * 255, 255];
  var imageData = loadRLE(rle, color);

  this.raster.size = new Size(width, height);
  this.rasterinv.size = new Size(width, height);
  this.raster.setImageData(imageData, new Point(0,0));
  background.align(this);
}
Annotation.prototype.getRLE = function() {
  var imageData = this.raster.getImageData();
  var bbox = this.getBbox();
  var rle = getRLE(imageData, bbox);
  return rle;
}
Annotation.prototype.getBbox = function() {
  var tl = this.getPixel(this.boundary.bounds.topLeft).round();
  var br = this.getPixel(this.boundary.bounds.bottomRight).round();
  var bbox = [tl.x, tl.y, br.x - tl.x + 1, br.y - tl.y + 1];
  return bbox;
}

//
// Exports
//
var annotationCache = {};
function loadAnnotations(coco) {
  console.time("Load");
  var img = coco.dataset.images[0];
  var annIds = coco.getAnnIds([img["id"]]);
  var anns = coco.loadAnns(annIds);

  for (var i = 0; i < anns.length; i++) {
    var ann = anns[i];
    var cat = coco.cats[ann["category_id"]]["name"];
    var rle = ann["segmentation"];

    console.time(cat);
    var cacheKey = ann["id"];
    if (cacheKey in annotationCache) {
      annotationCache[cacheKey].undelete();
    } else {
      var annotation = new Annotation(cat);
      annotation.loadRLE(rle);
      annotation.updateBoundary();
      annotationCache[cacheKey] = annotation;
    }
    console.timeEnd(cat);
  }
  console.timeEnd("Load");
}

function saveAnnotations() {
  console.time("Save");
  var imgs = [];
  var anns = [];
  var cats = [];
  for (var i = 0; i < annotations.length; i++) {
    var name = annotations[i].name;
    var rle = annotations[i].getRLE();
    var bbox = annotations[i].getBbox();

    var ann = {};
    ann["segmentation"] = rle;
    ann["bbox"] = bbox;
    ann["category_name"] = name;
    anns.push(ann);
  }
  var data = {"images": imgs, "annotations": anns, "categories": cats};
  var coco = new COCO(data);
  console.timeEnd("Save");
  return coco;
}

function sortAnnotations() {
  // Sort annotation from smallest to largest.
  var changed = true;
  while (changed) {
    changed = false;
    for (var i = 0; i < annotations.length-1; i++) {
      var ann0 = annotations[i];
      var ann1 = annotations[i+1];
      if (Math.abs(ann0.boundary.area) > Math.abs(ann1.boundary.area)) {
        ann0.raster.insertBelow(ann1.raster);
        ann0.rasterinv.insertBelow(ann1.rasterinv);
        annotations[i+1] = ann0;
        annotations[i] = ann1;
        changed = true;
      }
    }
  }
}

function clearAnnotations() {
  while (annotations.length > 0) {
    annotations[0].delete();
  }
}

window.annotations = [];
window.Annotation = Annotation;
window.loadAnnotations = loadAnnotations;
window.saveAnnotations = saveAnnotations;
window.clearAnnotations = clearAnnotations;
