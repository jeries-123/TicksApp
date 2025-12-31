function handlePredictingImageChange(event){
    
    let file = event.target.files[0];

    let previewIMG = document.querySelector(".image-predict-chosen-preview");

    previewIMG.zIndex = 2;

    loadImage(file, ".image-predict-chosen-preview")
    globalCache.put("hasImageBeenSelected", true);
    globalCache.put("selectedImageForPrediction", file);

}

function resetPredictionOverlay(){

    document.querySelector('.image-predict-chosen-preview').src = '';
    globalCache.put("hasImageBeenSelected", false);
    globalCache.put("selectedImageForPrediction", null);

}

async function startPrediction(){

    openPopup(".loader-view.predict-loader");

    const selectedImage = globalCache.get("selectedImageForPrediction");
    const hasImageBeenSelected = globalCache.get("hasImageBeenSelected");
    const { id: modelID, filename: modelFilename, featureInputSize: modelInputFeatureSize } = getCurrentModel();

    if (!hasImageBeenSelected) {
        //TODO:  showSelectImageToast();
        console.log("Image has not been selected");
        return
    }

    try {

        //TODO: Uploading Images Doesn't Work ??? On Chrome Dev
        let fileUploadResult = await uploadFile(selectedImage);
        let { newFileName: imageName, fileSize }  = fileUploadResult;

        let domain = getDomain();
        console.log(domain);

        let data = {
            imageName,
            modelFilename,
            modelInputFeatureSize,
            domain,
        }
        
        //TODO: detectPredictImage 

        // var jsonString = JSON.stringify(data);
        let tickPredictionResult = await getResultsForTick(createParamatersFrom(data));
        console.log(tickPredictionResult);

        let parameters = {
            id: uniqueID(1),
            userID: "3333434",
            date: getCurrentTimeInJSONFormat(),
            modelID,
            result: tickPredictionResult,
            imageName,
            fileSize
        }

        let params = createParamatersFrom(parameters);

        console.log("params: ", params);

        await uploadPredictionToDatabase(params);
        closePopup(".loader-view.predict-loader");
        closePopup(".overlay.prediction-overlay");

        // await renderPastPredictions();
        await handlePredictionReview({ ...parameters, ...getCurrentModel() });

    }catch(error){
        console.log(error);
    }
}

function isProjectRunningLocally(){
    let currentURL = new URL(window.location.href);
    return currentURL.hostname == "localhost" ? true : false;
}

function getResultsForTick(params) {

    return new Promise( async (resolve, reject) => {

        let hostname = isProjectRunningLocally() ? "127.0.0.1:8001" : "tickapi.aiiot.live";
        console.log("hostname: " , hostname);
        let scheme = hostname.startsWith("127.0.0.1") || hostname.startsWith("localhost") ? "http" : "https";
        let url = `${scheme}://${hostname}/predict/?${params}`

        // http://165.22.182.47:8033/predict/?imageName=1717389419.jpg&&modelFilename=VGG16-VARA01b-32x32-EP15-ACCU99-02-06-2024.keras&&modelInputFeatureSize=32

        let result = await fetch(url, { 
            method: 'GET'
        });

        let JSONResult = await result.json();

        let classification = JSONResult.classification;
        resolve(classification)
    })
}

async function uploadPredictionToDatabase(params){

    try {
        let result = await AJAXCall({
            phpFilePath: "../include/savePrediction.php",
            rejectMessage: "Saving Prediction Failed",
            params,
            type: "post",
        })

        console.log(result);

    }catch(error){
        console.log(error)
    }
}
