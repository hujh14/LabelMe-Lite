/**
 * Annotation tool powered by PaperJS.
 */

function Background() {
  this.canvas = document.getElementById('toolCanvas');
  this.canvasCenter = new Point(this.canvas.width/2, this.canvas.height/2 + 50);

  var tl = this.canvasCenter - new Point(300, 200);
  var br = this.canvasCenter + new Point(300, 200);
  this.focusRect = new Rectangle(tl, br);
  this.focusMaxScale = 5;
  this.maxScale = 10;
  this.minScale = 0.2;

  var defaultImage = new Path.Rectangle(this.focusRect);
  this.image = defaultImage.rasterize();
  defaultImage.remove();

  this.image.sendToBack();
  this.border = new Path.Rectangle(this.image.bounds);
  this.border.strokeColor = "silver";
  this.border.strokeWidth = 20;

  this.addGestures();
}
Background.prototype.addGestures = function() {
  this.canvas.addEventListener('wheel', function(e) {
    e.preventDefault();
    if (e.ctrlKey) {
      var scale = Math.abs(-0.01 * e.deltaY + 1);
      background.scale(scale);
    } else {
      var delta = new Point(e.deltaX, e.deltaY);
      background.move(delta);
    }
  });
}
Background.prototype.setImage = function(image) {
  var raster = new Raster(image);
  raster.position = this.canvasCenter;
  raster.onLoad = function() {
    background.image.remove();
    background.border.remove();

    background.image = raster;
    background.border = new Path.Rectangle(background.image.bounds);
    background.border.strokeColor = "silver";
    background.border.strokeWidth = 20;

    background.image.sendToBack();
    background.border.sendToBack();
    for (var i = 0; i < annotations.length; i++) {
      background.align(annotations[i]);
    }
    background.focus();
  }
}
Background.prototype.setTempImage = function(imageData) {
  if (this.tempImage) {
    this.tempImage.remove();
  }
  this.tempImage = this.image.clone();
  this.tempImage.setImageData(imageData, new Point(0,0));
  this.tempImage.insertAbove(this.image);
}
Background.prototype.removeTempImage = function() {
  this.tempImage.remove();
}
Background.prototype.move = function(delta, noSnap) {
  paper.project.activeLayer.translate(delta);
  if ( ! noSnap) {
    this.snapImage();
  }
}
Background.prototype.moveTo = function(center, noSnap) {
    var dx = this.canvasCenter.x - center.x;
    var dy = this.canvasCenter.y - center.y;
    this.move(new Point(dx,dy), noSnap);
}
Background.prototype.scale = function(deltaScale, noSnap) {
  paper.project.activeLayer.scale(deltaScale, this.canvasCenter);
  if ( ! noSnap) {
    this.snapImage();
  }
  console.log("Current Scale:", this.getCurrentScale());
}
Background.prototype.scaleTo = function(scale, noSnap) {
  var currentScale = this.getCurrentScale();
  this.scale(scale / currentScale, noSnap);
}
Background.prototype.getCurrentScale = function() {
  var scale = Math.min(this.image.bounds.height / this.focusRect.height, this.image.bounds.width / this.focusRect.width);
  return scale;
}
Background.prototype.getPixelHeight = function() {
  return this.image.bounds.height / this.image.height;
}
Background.prototype.snapImage = function() {
  var tl = this.image.bounds.topLeft;
  var br = this.image.bounds.bottomRight;
  if (tl.x > this.focusRect.bottomRight.x) {
    var delta = new Point(this.focusRect.bottomRight.x - tl.x, 0);
    this.move(delta, true);
  }
  if (tl.y > this.focusRect.bottomRight.y) {
    var delta = new Point(0, this.focusRect.bottomRight.y - tl.y);
    this.move(delta, true);
  }
  if (br.x < this.focusRect.topLeft.x) {
    var delta = new Point(this.focusRect.topLeft.x - br.x, 0);
    this.move(delta, true);
  }
  if (br.y < this.focusRect.topLeft.y) {
    var delta = new Point(0, this.focusRect.topLeft.y - br.y);
    this.move(delta, true);
  }

  var currentScale = this.getCurrentScale();
  if (currentScale > this.maxScale) {
    this.scaleTo(this.maxScale, true);
  } else if (currentScale < this.minScale) {
    this.scaleTo(this.minScale, true);
  }
}
Background.prototype.focus = function(annotation) {
  this.lastFocus = annotation;
  var target = this.image.bounds;
  if (annotation) {
    if (annotation.boundary.bounds.height > 0 && annotation.boundary.bounds.width > 0) {
      target = annotation.boundary.bounds;
    }
  }
  var scale = Math.min(this.image.bounds.height/target.height, this.image.bounds.width/target.width);
  this.moveTo(target.center);
  this.scaleTo(Math.min(this.focusMaxScale, scale));
}
Background.prototype.focusPoint = function(point) {
  this.moveTo(point);
  this.scaleTo(this.focusMaxScale);
}
Background.prototype.align = function(annotation) {
  var img_bounds = this.image.bounds;
  var ann_bounds = annotation.raster.bounds;
  var img_scale = img_bounds.height / this.image.height;
  var ann_scale = ann_bounds.height / annotation.raster.height;
  annotation.translate(img_bounds.topLeft - ann_bounds.topLeft);
  annotation.scale(img_scale / ann_scale, img_bounds.topLeft);
}

//
// Point to Pixel
//
Background.prototype.getPixel = function(point) {
  var bounds = this.image.bounds;
  var size = this.image.size;
  var tl = bounds.topLeft;

  var x = (point.x - tl.x) * (size.height/ bounds.height) - 0.5;
  var y = (point.y - tl.y) * (size.height/ bounds.height) - 0.5;
  return new Point(Math.round(x), Math.round(y));
}
Background.prototype.getPoint = function(pixel) {
  var bounds = this.image.bounds;
  var size = this.image.size;
  var tl = bounds.topLeft;

  var x = (pixel.x + 0.5) * (bounds.height / size.height) + tl.x;
  var y = (pixel.y + 0.5) * (bounds.height / size.height) + tl.y;
  return new Point(x, y);
}
Background.prototype.toPixelSpace = function(shape) {
  var bounds = this.image.bounds;
  var size = this.image.size;
  var tl = bounds.topLeft;

  shape.translate(-tl);
  shape.scale(size.height / bounds.height, new Point(0, 0));
  shape.translate(new Point(-0.5, -0.5));
}
Background.prototype.toPointSpace = function(shape) {
  var bounds = this.image.bounds;
  var size = this.image.size;
  var tl = bounds.topLeft;

  shape.translate(new Point(0.5, 0.5));
  shape.scale(bounds.height / size.height, new Point(0, 0));
  shape.translate(tl);
}

//
// Shape to Pixel
//
Background.prototype.getAllPixels = function(shape) {
  var pixels0 = this.getBoundaryPixels(shape);
  var pixels1 = this.getInteriorPixels(shape);
  var pixels = removeDuplicatePixels(pixels0.concat(pixels1));
  return pixels;
}
Background.prototype.getInteriorPixels = function(shape) {
  var clone = shape.clone();
  clone.strokeWidth = 0;
  clone.fillColor = "red";
  clone.opacity = 1;

  background.toPixelSpace(clone);
  clone.translate(new Point(0.5, 0.5)); // Align for rasterize.
  var raster = clone.rasterize();

  var pixels = [];
  for (var x = 0; x < raster.width; x++) {
    for (var y = 0; y < raster.height; y++) {
      var pixel = new Point(x,y);
      var c = raster.getPixel(pixel);
      if (c.alpha > 0.5) {
        pixels.push(pixel + raster.bounds.topLeft);
      }
    }
  }

  clone.remove();
  raster.remove();
  pixels = removeDuplicatePixels(pixels);
  return pixels;
}
Background.prototype.getBoundaryPixels = function(path) {
  var pixels = [];
  // Shape
  if ( ! path.length) {
    path = path.toPath();
    path.remove();
  }
  // CompoundPath
  if (path.children) {
    for (var i = 0; i < path.children.length; i++) {
      pixels = pixels.concat(background.getBoundaryPixels(path.children[i]));
    }
    pixels = removeDuplicatePixels(pixels);
    return pixels;
  }
  // Path
  var path_pixel = path.clone();
  path_pixel.remove();
  background.toPixelSpace(path_pixel);
  for (var i = 0; i < path_pixel.length; i = i + 0.1) {
    var pixel = path_pixel.getPointAt(i);
    pixels.push(pixel);
  }
  pixels = removeDuplicatePixels(pixels);
  return pixels;
}

function removeDuplicatePixels(pixels) {
  var pixelsUnique = [];
  var pixelsSet = new Set();
  for (var i = 0; i < pixels.length; i++) {
    var pixel = pixels[i].round();
    var str = JSON.stringify(pixel);
    if ( ! pixelsSet.has(str)) {
      pixelsUnique.push(pixel);
      pixelsSet.add(str);
    }
  }
  return pixelsUnique;
}


//
// Exports
//
window.background = new Background();
paper.view._context.imageSmoothingEnabled = false; // Pixelates background
