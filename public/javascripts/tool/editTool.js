

var editTool = new Tool();

editTool.onMouseMove = function(event) {
  this.curser.position = event.point;
  this.snapCurser();

  // Set this.annotation
  if ( ! this.annotationFixed) {
    this.annotation = selectTool.getAnnotationAt(this.curser.position);
    if (this.annotation == null) {
      this.annotation = selectTool.getNearestAnnotation(this.curser.position);
    }
  }

  // Update last point of trace
  if (this.trace.segments.length > 0) {
    this.trace.removeSegment(this.trace.segments.length-1);
  }
  this.trace.add(this.curser.position);

  this.drawSelectedBoundary();
  this.drawBoundaryPoints();
  this.drawBoundaryLine();
  this.drawEditedBoundary();
  this.drawSelectedArea();

  this.enforceStyles();
  this.writeHints();
}
editTool.onMouseDrag = function(event) {
  this.curser.position = event.point;
  this.snapCurser();

  this.trace.add(this.curser.position);
  this.onMouseMove(event);
}
editTool.onMouseDown = function(event) {
  this.annotationFixed = true;
  this.onMouseDrag(event);
}
editTool.onMouseUp = function(event) {
  if (this.annotation) {
    this.editAnnotation();
    this.trace.segments = [];
  }
  this.onMouseMove(event);
}
editTool.onKeyDown = function(event) {
  if (event.key == 'u') {
    this.annotation.undo();
    flashButton("undo");
  }
  else if (event.key == 'y') {
    this.annotation.redo();
    flashButton("redo");
  }
  else if (event.key == 'backspace') {
    if (this.selectedBoundary.segments.length != 0) {
    // Remove selected boundary
      this.deleteSelectedBoundary();
    } else {
      // Remove annotation
      var success = this.annotation.delete();
      if (success) {
        selectTool.switch();
      }
    }
    flashButton("delete");
  }
  // Modes
  if (event.key == 'space') {
    if (this.mode == "normal") {
      this.mode = "noBoundary";
    } else if (this.mode == "noBoundary") {
      this.mode = "normal";
    }
    this.refreshTool();
  }
  onKeyDownShared(event);
}
editTool.deactivate = function() {
  this.curser.remove();
  this.bp0.remove();
  this.bp1.remove();
  this.trace.remove();
  this.selectedBoundary.remove();
  this.bl.remove();
  this.editedBoundary.remove();
  this.selectedArea.remove();

  deactivateButton(this.toolName);
}
editTool.switch = function(annotation) {
  var lastCurserPosition = paper.tool.curser.position;
  var lastToolSize = paper.tool.toolSize;

  this.toolName = "editTool";
  console.log("Switching to", this.toolName);
  paper.tool.deactivate();
  this.activate();
  activateButton(this.toolName);

  this.annotation = annotation;
  this.curser = new Shape.Circle(lastCurserPosition, 1);
  this.toolSize = lastToolSize;

  this.bp0 = this.curser.clone();
  this.bp1 = this.curser.clone();
  this.trace = new Path();
  this.selectedBoundary = new Path({closed: true});
  this.bl = new Path();
  this.editedBoundary = new Path({closed: true});
  this.selectedArea = new CompoundPath({fillRule: "evenodd"});

  this.annotationFixed = (this.annotation != null);
  this.mode = "normal";

  this.refreshTool();
}
editTool.refreshTool = function() {
  paper.tool.onMouseMove({point: paper.tool.curser.position});
}

//
// Draw
//
editTool.drawSelectedBoundary = function() {
  this.selectedBoundary.segments = [];
  // Set this.selectedBoundary
  if (this.annotation) {
    var keyPoint = this.annotation.boundary.getNearestPoint(this.trace.firstSegment.point);
    for (var i = 0; i < this.annotation.boundary.children.length; i++) {
      var child = this.annotation.boundary.children[i];
      if (child.getLocationOf(keyPoint)) {
        this.selectedBoundary.segments = child.segments;
      }
    }
  }
}
editTool.drawBoundaryPoints = function() {
  // Set this.bp0
  var bp = this.selectedBoundary.getNearestPoint(this.trace.firstSegment.point);
  if (bp) {
    this.bp0.position = bp;
  } else {
    this.bp0.position = this.trace.firstSegment.point;
  }

  // Set this.bp1
  var bp = this.selectedBoundary.getNearestPoint(this.trace.lastSegment.point);
  if (bp) {
    this.bp1.position = bp;
  } else {
    this.bp1.position = this.trace.lastSegment.point;
  }
}
editTool.drawBoundaryLine = function() {
  this.bl.segments = [];
  if (this.mode == "noBoundary") {
    return;
  }

  var paths = this.getPathUsingBoundary(this.bp1.position, this.bp0.position, this.selectedBoundary);
  paths[0].remove();
  paths[1].remove();

  var selectedArea0 = new Path({ closed: true });
  var selectedArea1 = new Path({ closed: true });
  selectedArea0.join(this.trace.clone());
  selectedArea1.join(this.trace.clone());
  selectedArea0.join(paths[0]);
  selectedArea1.join(paths[1]);

  var area0 = Math.abs(selectedArea0.area);
  var area1 = Math.abs(selectedArea1.area);
  selectedArea0.remove();
  selectedArea1.remove();

  if (area0 > area1) {
    this.bl.segments = paths[0].segments;
  } else {
    this.bl.segments = paths[1].segments;
  }
}
editTool.drawEditedBoundary = function() {
  this.editedBoundary.segments = [];
  this.editedBoundary.join(this.trace.clone());
  if (this.mode != "noBoundary") {
    this.editedBoundary.join(this.bl.clone());
  }
}
editTool.drawSelectedArea = function() {
  this.selectedArea.children = [];

  if (this.annotation) {
    var childrenList = [];
    var keyPoint = this.bp0.position;
    for (var i = 0; i < this.annotation.boundary.children.length; i++) {
      var child = this.annotation.boundary.children[i];
      if (child.getLocationOf(keyPoint) && this.mode != "noBoundary") {
        continue;
      }
      var path = new Path({closed: true});
      path.segments = child.segments;
      childrenList.push(path);
    }
    childrenList.push(this.editedBoundary.clone());
    this.selectedArea.children = childrenList;
  }
}

//
// Edit Annotation
//
editTool.editAnnotation = function() {
  this.annotation.updateRaster(this.selectedArea);
  this.annotation.updateBoundary();
  this.refreshTool();
}
editTool.deleteSelectedBoundary = function() {
  this.editedBoundary.segments = [];
  this.drawSelectedArea();
  this.editAnnotation();
}

// 
// Styles
//
editTool.snapCurser = function() {
  // Snap to image bounds
  if ( ! background.image.contains(this.curser.position)) {
    var rect = new Path.Rectangle(background.image.bounds);
    rect.remove();
    this.curser.position = rect.getNearestPoint(this.curser.position);
  }
}
editTool.enforceStyles = function() {
  var pointHeight = this.toolSize * 1.5;
  var lineWidth = this.toolSize * 0.8;

  // this.annotation styles
  if (this.annotation) {
    this.annotation.highlight();
    this.annotation.raster.opacity = 0;
    this.annotation.boundary.strokeWidth = 0;
  }

  // Other annotations styles
  for (var i = 0; i < annotations.length; i++) {
    if (annotations[i] != this.annotation) {
      if (this.annotationFixed) {
        annotations[i].hide();
      } else {
        annotations[i].unhighlight();
      }
    }
  }

  // Point styles
  var allPoints = [this.bp0, this.bp1, this.curser];
  for (var i = 0; i < allPoints.length; i++) {
    var point = allPoints[i];
    point.scale(pointHeight / point.bounds.height);
    point.fillColor = "black";
    point.strokeColor = "gold";
    point.strokeWidth = 0.5;
  }
  this.bp0.fillColor = "gold";
  this.bp0.strokeColor = "black";
  this.bp0.strokeWidth = 0.5;
  this.bp1.style = this.bp0.style;

  // Line styles
  this.trace.strokeColor = "red";
  this.trace.strokeWidth = lineWidth;
  this.selectedBoundary.strokeColor = "black";
  this.selectedBoundary.strokeWidth = lineWidth;
  this.bl.strokeColor = "orange";
  this.bl.strokeWidth = lineWidth;
  this.editedBoundary.strokeColor = "gold";
  this.editedBoundary.strokeWidth = lineWidth;

  // // Area styles
  this.selectedArea.strokeColor = "gold";
  this.selectedArea.strokeWidth = lineWidth;
  this.selectedArea.fillColor = "white";
  if (this.annotation) {
    this.selectedArea.strokeColor = this.annotation.color;
    this.selectedArea.fillColor = this.annotation.color;
  }
  this.selectedArea.fillColor.alpha = 0.2;

  // Order
  this.selectedArea.bringToFront();
  this.editedBoundary.bringToFront();
  for (var i = 0; i < allPoints.length; i++) {
    allPoints[i].bringToFront();
  }

  // Visibility
  if (this.mode == "noBoundary") {
    this.bp0.opacity = 0;
    this.bp1.opacity = 0;
  } else {
    this.bp0.opacity = 1;
    this.bp1.opacity = 1;
  }
}

//
// Path finding functions
//
editTool.getPathUsingBoundary = function(point0, point1, boundary) {
  var point0 = boundary.getNearestPoint(point0);
  var point1 = boundary.getNearestPoint(point1);
  var path = boundary.clone();

  var p0 = path.getLocationOf(point0);
  var p1 = path.getLocationOf(point1);
  path.splitAt(p0);
  var other = path.splitAt(p1);
  if (other == null) {
    other = new Path(point0, point1);
  }
  other.reverse();

  var paths = [path, other];
  paths.sort(function(a, b) {
    a = a.length;
    b = b.length;
    return a - b;
  });
  return paths;
}

editTool.writeHints = function() {
  var hints = [];
  if ( ! this.annotationFixed) {
    hints.push("Click on an annotation to begin editing.");
  }
  hints.push("Press 'enter' to edit. Press 'esc' to quit.");

  $('#toolName').text(this.toolName);
  $('#toolMessage').text(hints[0]);
}

//
// Exports
//
window.editTool = editTool;
