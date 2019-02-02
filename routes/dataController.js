var express = require('express');
var path = require('path');
var fs = require('fs');
var cocoapi = require('./coco');
var router = express.Router();

var DATA_DIR = path.join(__dirname, "../data");

router.get('/images', function(req, res) {
    var dataset_name = req.query.dataset;
    var file_name = req.query.file_name;

    var im_dir = path.join(DATA_DIR, dataset_name + "/images");
    var im_path = path.join(im_dir, file_name);
    res.sendFile(im_path);
});

router.get('/images/next', function(req, res) {
    var dataset_name = req.query.dataset;
    var ann_source = req.query.ann_source;
    var file_name = req.query.file_name;

    var dataset_dir = path.join(DATA_DIR, dataset_name);
    var ann_fn = path.join(dataset_dir, ann_source + ".json");
    var coco = cocoapi.loadCOCO(ann_fn);
    if (coco == null) {
        res.status(404).send('Annotation source not found');
        return;
    }
    
    var imgId = coco.fnToImgId[file_name];
    if (imgId == null) {
        res.status(404).send('File name not found');
        return;
    }

    var img = coco.imgs[imgId + 1];
    if (img == null) {
        var img = coco.imgs[0];
    }
    var response = {};
    response["file_name"] = img.file_name;
    response["dataset"] = dataset_name;
    response["ann_source"] = ann_source;
    res.json(response);
});

router.get('/images/prev', function(req, res) {
    var dataset_name = req.query.dataset;
    var ann_source = req.query.ann_source;
    var file_name = req.query.file_name;

    var dataset_dir = path.join(DATA_DIR, dataset_name);
    var ann_fn = path.join(dataset_dir, ann_source + ".json");
    var coco = cocoapi.loadCOCO(ann_fn);
    if (coco == null) {
        res.status(404).send('Annotation source not found');
        return;
    }

    var imgId = coco.fnToImgId[file_name];
    if (imgId == null) {
        res.status(404).send('File name not found');
        return;
    }

    var img = coco.imgs[imgId - 1];
    if (img == null) {
        var img = coco.imgs[0];
    }
    var response = {};
    response["file_name"] = img.file_name;
    response["dataset"] = dataset_name;
    response["ann_source"] = ann_source;
    res.json(response);
});

router.get('/annotations', function(req, res) {
    var dataset_name = req.query.dataset;
    var ann_source = req.query.ann_source;
    var file_name = req.query.file_name;
    var imgId = null;

    var dataset_dir = path.join(DATA_DIR, dataset_name);
    var ann_fn = path.join(dataset_dir, ann_source + ".json");
    var coco = cocoapi.loadCOCO(ann_fn);
    if (coco == null) {
        res.status(404).send('Annotation source not found');
        return;
    }

    if (file_name == null || file_name == "undefined") {
        var first = coco.dataset["images"][0];
        imgId = first["id"];
        file_name = first["file_name"];
    } else {
        imgId = coco.fnToImgId[file_name];
        if (imgId == null) {
            res.status(404).send('file_name not found');
            return;
        }
    }

    var image_url = null;
    if (dataset_name.includes("ade20k")) {
        image_url = "http://places.csail.mit.edu/scaleplaces/datasets/ade20k/images/" + file_name;
    } else if (dataset_name.includes("coco")) {
        image_url = "http://places.csail.mit.edu/scaleplaces/datasets/coco/images/" + file_name;
    } else if (dataset_name.includes("places")) {
        image_url = "http://places.csail.mit.edu/scaleplaces/datasets/places/images/" + file_name;
    }

    var annIds = coco.getAnnIds([imgId]);
    var anns = coco.loadAnns(annIds);

    var response = {};
    response["image_url"] = image_url;
    response["annotations"] = prepareAnnotations(coco, anns);

    response["dataset"] = dataset_name;
    response["ann_source"] = ann_source;
    response["file_name"] = file_name;
    res.json(response);
});

router.get('/bundles', function(req, res) {
    var bundle_id = req.query.id;

    var bundle_dir = path.join(DATA_DIR, "bundles/");
    var ann_fn = path.join(bundle_dir, bundle_id + ".json");
    var coco = cocoapi.loadCOCO(ann_fn);
    if (coco == null) {
        res.status(404).send('Bundle not found');
        return;
    }

    var responses = [];
    for (var annId in coco.anns) {
        var ann = coco.anns[annId];
        var imgId = ann["image_id"];

        var file_name = coco.imgs[imgId]["file_name"];
        var image_url = "http://places.csail.mit.edu/scaleplaces/datasets/places/images/" + file_name;

        var response = {};
        response["image_url"] = image_url;
        response["annotations"] = prepareAnnotations(coco, [ann]);
        responses.push(response);
    }
    res.json(responses);
});

function prepareAnnotations(coco, anns) {
    var annotations = [];
    for (var i = 0; i < anns.length; i++) {
        var catId = anns[i]["category_id"];
        var segm = anns[i]["segmentation"];
        var score = anns[i]["score"];
        var iscrowd = anns[i]["iscrowd"];
        
        var name = catId;
        if (coco.cats[catId]) {
            name = coco.cats[catId]["name"];
        }
        if (score != null) {
            name = name + " " + score.toFixed(3);
            if (score < 0.5) {
                continue;
            }
        }
        if (iscrowd == 1) {
            name = name + " (crowd)";
        }
        
        var ann = {};
        ann["category"] = name;
        ann["segmentation"] = segm;
        annotations.push(ann);
    }
    return annotations;
}

module.exports = router;
