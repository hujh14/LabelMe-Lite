

var base_url = parseBaseURL();

//
// Get Requests
//
function getAnnotationFile(params, callback) {
    var endpoint = base_url + "/data/" + params.dataset + "/" + params.ann_source + ".json";
    get_async(endpoint, callback);
}
function getBundle(params, callback) {
    var endpoint = base_url + "/bundles/tasks/" + params.bundle_id + ".json";
    get_async(endpoint, callback);
}
function getBundlesList(callback) {
    var endpoint = base_url + "/api/bundles_list";
    get_async(endpoint, callback);
}

function getAnnotations(params, callback) {
    var endpoint = base_url + "/api/annotations?" + buildQuery(params);
    get_async(endpoint, callback);
}

function getImageURL(img) {
  var dataset = img.dataset;
  if (dataset == null) {
    // Infer dataset from img.filename
    if (img.file_name.includes("ADE")) {
      dataset = "ade20k";
    } else if (img.file_name.includes("challenge")) {
      dataset = "scaleplaces";
    } else {
      dataset = "places";
    }
  }

  if (dataset == "scaleplaces") {
    var data_dir = "https://labelmelite.csail.mit.edu/data";
    var endpoint = data_dir + "/scaleplaces/" + img.file_name;
    return endpoint;
  }
  else if (dataset == "ade20k" || dataset == "coco" || dataset == "places") {
    var data_dir = "https://labelmelite.csail.mit.edu/data";
    var endpoint = data_dir + "/" + dataset + "/images/" + img.file_name;
    return endpoint;
  }
  else {
    var data_dir = base_url + "/data";
    var endpoint = data_dir + "/" + dataset + "/images/" + img.file_name;
    return endpoint;
  }
}

function getDefinition(cat, callback) {
  var keyword = cat["name"];
  var endpoint = base_url + "/api/definitions?" + buildQuery({"keyword": keyword});
  get_async(endpoint, function(res) {
    if (res && res.length != 0) {
      callback(res[0])
    } else {
      callback();
    }
  });
}


//
// Post Requests
//
function postYesNoBundle(params, coco) {
    params.bundle_type = "yesno";
    var endpoint = base_url + "/api/bundles?" + buildQuery(params);
    post(endpoint, coco.dataset);
}
function postEditBundle(params, coco) {
    params.bundle_type = "edit";
    var endpoint = base_url + "/api/bundles?" + buildQuery(params);
    post(endpoint, coco.dataset);
}

//
// Redirects
//
function redirectToAmtBrowser() {
  window.location.href = base_url + "/amt_browser";
}

//
// XHR functions
//
function get_async(url, callback) {
  console.log(url);
  var xhr = new XMLHttpRequest();
  xhr.onreadystatechange = function() { 
    if (xhr.readyState == 4){
      if (xhr.status == 200) {
        var json = JSON.parse(xhr.responseText);
        callback(json);
      } else if (xhr.status == 404) {
        callback();
      }
    }
  }
  xhr.open("GET", url, true); // true for asynchronous 
  xhr.send(null);
}

function post(url, json) {
  xhr = new XMLHttpRequest();
  xhr.open("POST", url, true);
  xhr.setRequestHeader("Content-type", "application/json");
  xhr.onreadystatechange = function () { 
    if (xhr.readyState == 4 && xhr.status == 200) {
      console.log(xhr.responseText);
    }
  }
  var data = JSON.stringify(json);
  xhr.send(data);
}

//
// Parse URL functions
//
function parseBaseURL() {
  var href = window.location.href;
  var url = href.split('?')[0];
  var query = href.split('?')[1];

  var split = url.split('/');
  var base_url = split[0] +"/" + split[1] + "/" + split[2];
  return base_url
}
function parseURLParams() {
  var href = window.location.href;
  var query = href.split('?')[1];
  if ( ! query) {
    return {};
  }

  var params = {}
  var query_split = query.split("&");
  for (var i in query_split) {
    split = query_split[i].split("=");
    key = split[0];
    value = split[1];
    params[key] = value;
  }
  return params;
}
function setURLParams(params) {
  var href = window.location.href;
  var url = href.split('?')[0];
  var path = url.replace(base_url, "");
  window.history.pushState(null, null, path + "?" + buildQuery(params));
}
function buildQuery(params) {
  query = ""; 
  for (var key in params) {
    query = query + "&" + key + "=" + params[key];
  }
  return query.substring(1);
}