
var params = parseURLParams();
if (Object.keys(params).length == 0) {
    // No bundle_id
    redirectToAmtBrowser();
}

var coco = new COCO();
var current_num = 0;
var trainingMode = params.training_mode == "true";

window.onload = function() {
    selectTool.switch();
    getBundle(params, function(response) {
        console.log("Bundle:", response);
        coco = new COCO(response);

        startCurrentTask();
        loadInterface();
    });
}
function loadInterface() {
    loadInstructions(coco, current_num, trainingMode);
    loadMainHolders(coco, current_num, showGt=trainingMode);
    loadEditTool(coco, current_num);
}
function nextImage() {
    if (current_num < coco.dataset.annotations.length - 1) {
        endCurrentTask();
        current_num += 1;
        startCurrentTask();
        loadInterface();
    }
}
function prevImage() {
    if (current_num > 0) {
        endCurrentTask();
        current_num -= 1;
        startCurrentTask();
        loadInterface();
    }
}
function startCurrentTask() {
    startTimer();
    var ann = coco.dataset.annotations[current_num];
    if ( ! ann.current_task) {
        ann.current_task = {};
        ann.current_task["type"] = "edit";
        ann.current_task["annotationTime"] = 0;
        ann.current_task["segmentation"] = ann["segmentation"];
    }
}
function endCurrentTask() {
    saveCurrentAnswer();
    endTimer();
}
function saveCurrentAnswer() {
    var coco_ = saveAnnotations();
    var ann_ = coco_.dataset.annotations[0];

    var ann = coco.dataset.annotations[current_num];
    ann["segmentation"] = ann_["segmentation"];
    ann["bbox"] = ann_["bbox"];
}
function submit() {
    endCurrentTask();
    var success = submitEditBundle(coco);
    if (success) {
        redirectToAmtBrowser();
        return;
    } else {
        startCurrentTask();
    }
}

function toggleInstruction() {
    $("#instructionDiv").toggle();
    $("#yesnoDiv").toggle();
    $("#toolDiv").toggle();
    if (trainingMode) {
        $("#trainingDiv").toggle();
    }
}

//
// Timer
//
var timer = new Date();
function startTimer() {
    timer = new Date();
}
function endTimer() {
    var ann = coco.dataset.annotations[current_num];
    ann.current_task["annotationTime"] += (new Date() - timer) / 1000;
}

//
// Event Handlers
//
var keyIsDown = false;
var timerHandle;
$(window).keydown(function(e) {
    var key = e.which | e.keyCode;

    if (key == 39 && ! keyIsDown) { // Right
        nextImage();

        keyIsDown = true;
        clearInterval(timerHandle);
        timerHandle = setInterval(nextImage, 400);
    }
    else if (key == 37 && ! keyIsDown) { // Left
        prevImage();

        keyIsDown = true;
        clearInterval(timerHandle);
        timerHandle = setInterval(prevImage, 400);         
    }
});

$(window).keyup(function(e) {
    var key = e.which | e.keyCode;

    if (key == 37 || key == 39) { // Left or right
        keyIsDown = false;
        clearInterval(timerHandle);
    }
});
