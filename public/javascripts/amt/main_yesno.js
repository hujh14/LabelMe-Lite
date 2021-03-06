
var urlParams = parseURLParams();
console.log("URL Params", urlParams);

var coco = new COCO();
var current_num = 0;
var num_tests = 0;

window.onload = function() {
    getBundle(urlParams, function(response) {
        coco = new COCO(response);
        console.log("Bundle", coco.dataset);
        addHiddenTests(coco, num_tests, function() {
            console.log("COCO", coco.dataset);
            startTask();
            loadInterface();
        });
    });
}
function loadInterface() {
    updateInstructions(coco, current_num);
    loadMainHolders(coco, current_num);

}
function nextImage() {
    if (current_num < coco.dataset.annotations.length - 1) {
        endTask();
        current_num += 1;
        startTask();
        loadInterface();
    }
}
function prevImage() {
    if (current_num > 0) {
        endTask();
        current_num -= 1;
        startTask();
        loadInterface();
    }
}
function startTask() {
    startTimer();
    var ann = coco.dataset.annotations[current_num];
    if (ann && ! ann.current_task) {
        ann.current_task = {};
        ann.current_task["type"] = "yesno";
        ann.current_task["annotationTime"] = 0;
        ann.current_task["accepted"] = false;
    }
}
function endTask() {
    endTimer();
}
function toggleAnswer() {
    var ann = coco.dataset.annotations[current_num];
    ann.current_task["accepted"] = ! (ann.current_task["accepted"]);
    loadMainHolders(coco, current_num);
}
function submit() {
    console.log("Submitting results...");
    endTask();
    var results = evaluateBundle(coco);
    if (results.passed) {
        var coco_results = removeHiddenTests(coco);
        postResults(urlParams, coco_results);
    }
    showResults(results);
    startTask();
}
function toggleInstruction() {
    $("#instructionDiv").toggle();
    $("#yesnoDiv").toggle();
}

//
// Timer
//
var timer;
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
    else if (key == 32) { // Space
        toggleAnswer();
        e.preventDefault();
    }
});
