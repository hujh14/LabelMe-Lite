


function loadMainHolders(coco, current_num) {
    // Load the 5 holders on the main page
    for (var i = -2; i <= 2; i++) {
        var holder = "#holderDiv" + i.toString();
        var ann = coco.dataset.annotations[current_num + i];

        // Set state as yes, no, or null
        var state = null;
        if (ann && ann.current_task && ann.current_task["type"] == "yesno") {
            state = ann.current_task["accepted"] ? "yes" : "no";
        }

        loadHolder(holder, coco, ann);
        loadHolderStyle(holder, ann, state);
    }
}

var holderCache = {};
function loadHolder(holder, coco, ann, showGt=false, showSegm=true, showBbox=false) {
    if (ann == null) {
        var cv = $(holder + " canvas")[0];
        var ctx = cv.getContext('2d');
        ctx.clearRect(0, 0, cv.width, cv.height);
        return;
    }
    if (urlParams.debugMode) {
        showGt = true;
        showSegm=true
        showBbox = true;
    }

    // Load from cache
    var key = ann["id"] + JSON.stringify(ann["segmentation"]);
    if (key in holderCache) {
        var cv = $(holder + " canvas")[0];
        var ctx = cv.getContext('2d');
        var imageData = holderCache[key];
        cv.width = imageData.width;
        cv.height = imageData.height;
        ctx.putImageData(imageData, 0, 0);
        return;
    }

    var segm = (showSegm) ? ann["segmentation"] : null;
    var bbox = (showBbox) ? ann["bbox"] : null;
    var segmGt = (showGt && showSegm && ann.hidden_test) ? ann.hidden_test["segmentation"] : null;
    var bboxGt = (showGt && showBbox && ann.hidden_test) ? ann.hidden_test["bbox"] : null;

    // Prepare crop bbox
    var cropBbox = getCropBbox(ann);
    var x = cropBbox[0];
    var y = cropBbox[1];
    var w = cropBbox[2];
    var h = cropBbox[3];
    
    // Prepare panels
    var leftPanel = drawPanel(holder, segm, bbox, cropBbox);
    var rightPanel = drawPanel(holder, segmGt, bboxGt, cropBbox);
    var panelSpacing = 0.01 * w;

    // Draw panels
    var cv = $(holder + " canvas")[0];
    var ctx = cv.getContext('2d');
    cv.width = w + panelSpacing + w;
    cv.height = h;
    ctx.putImageData(leftPanel, 0, 0);
    ctx.putImageData(rightPanel, w + panelSpacing, 0);
    // holderCache[key] = ctx.getImageData(0, 0, cv.width, cv.height);

    // Handle with image
    var img = coco.imgs[ann["image_id"]];
    var image = new Image();
    image.crossOrigin = "Anonymous";
    image.src = getImageURL(img);
    image.onload = function () {
        // Draw panels
        var cv = $(holder + " canvas")[0];
        var ctx = cv.getContext('2d');
        cv.width = w + panelSpacing + w;
        cv.height = h;
        ctx.putImageData(leftPanel, 0, 0);
        ctx.putImageData(rightPanel, w + panelSpacing, 0);

        // Draw panels with image
        ctx.globalCompositeOperation = "destination-over";
        ctx.drawImage(image, x, y, w, h, 0, 0, w, h);
        ctx.drawImage(image, x, y, w, h, w + panelSpacing, 0, w, h);
        holderCache[key] = ctx.getImageData(0, 0, cv.width, cv.height);
    };
}

function loadHolderStyle(holder, ann, state=null, showIou=false) {
    if (ann == null) {
        $(holder).css('visibility','hidden');
        $(holder + " b").css('visibility', 'hidden');
        return;
    }
    if (urlParams.debugMode) {
        showIou = true;
    }

    $(holder).css('visibility', 'visible');
    if (state == "yes") {
        $(holder).toggleClass("target", true);
        $(holder).toggleClass("noise", false);
    } else if (state == "no") {
        $(holder).toggleClass("target", false);
        $(holder).toggleClass("noise", true);
    } else {
        $(holder).toggleClass("target", false);
        $(holder).toggleClass("noise", false);
    }

    if (showIou) {
        $(holder + " b").css('visibility', 'visible');
        if (ann.hidden_test) {
            var iou = computeIOU(ann["segmentation"], ann.hidden_test["segmentation"]);
            $(holder + " b").html("IoU=" + iou.toFixed(3));
        } else {
            $(holder + " b").html("IoU=None");
        }
    } else {
        $(holder + " b").css('visibility', 'hidden');
    }
}

function drawPanel(holder, segm, bbox, cropBbox) {
    var cv = $(holder + " canvas")[0];
    var ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, cv.width, cv.height);

    if (segm) {
        var color = [0, 0, 255, 180];
        var segmImageData = loadRLE(segm, color);
        cv.width = segmImageData.width;
        cv.height = segmImageData.height;
        ctx.putImageData(segmImageData, 0, 0);
    }
    if (bbox) {
        ctx.beginPath();
        ctx.lineWidth = "2";
        ctx.strokeStyle = "white";
        ctx.rect(bbox[0], bbox[1], bbox[2], bbox[3]); 
        ctx.stroke();
    }

    var crop = ctx.getImageData(cropBbox[0], cropBbox[1], cropBbox[2], cropBbox[3]);

    // Highlight boundary to make more visible
    var color = [255, 255, 255, 255];
    var boundaries = findBoundariesOpenCV(crop);
    for (var i = 0; i < boundaries.length; i++) {
        var boundary = boundaries[i];
        for (var j = 0; j < boundary.length; j++) {
            var x = boundary[j][0];
            var y = boundary[j][1];
            var index = (y * crop.width + x) * 4;
            crop.data[index] = color[0];
            crop.data[index+1] = color[1];
            crop.data[index+2] = color[2];
            crop.data[index+3] = color[3];
        }
    }
    return crop;
}

function getCropBbox(ann, margin=2, maxZoom=5, minZoom=1) {
    var h = ann["segmentation"]["size"][0];
    var w = ann["segmentation"]["size"][1];
    var min_s = Math.max(h, w) / maxZoom;
    var max_s = Math.max(h, w) / minZoom;

    var bbox = ann["bbox"];
    var xc = bbox[0] + bbox[2]/2;
    var yc = bbox[1] + bbox[3]/2;
    var s = Math.max(bbox[2], bbox[3]);
    if (s > 1) {
        s = s * margin
        s = Math.min(Math.max(s, min_s), max_s);
    } else {
        // Bounding box is too small
        xc = w / 2;
        yc = h / 2;
        s = max_s;
    }
    var x = xc - s/2;
    var y = yc - s/2;
    var square_bbox = [x, y, s, s];
    return square_bbox;
}
