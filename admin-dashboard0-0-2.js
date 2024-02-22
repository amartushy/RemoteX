



// Assume 'firebase' has already been initialized elsewhere in your script
var db = firebase.firestore();
let playButtonSrc = "https://firebasestorage.googleapis.com/v0/b/remotex-2a1f2.appspot.com/o/web-icons%2Fplay-button.png?alt=media&token=5d75ba33-098b-4445-bc95-e57caf1d920d"
let stopButtonSrc = "https://firebasestorage.googleapis.com/v0/b/remotex-2a1f2.appspot.com/o/web-icons%2Fstop.png?alt=media&token=3c34261c-5ede-44a6-a17f-522f9adc0a41"
let heartSrc = "https://firebasestorage.googleapis.com/v0/b/remotex-2a1f2.appspot.com/o/web-icons%2Fheart.png?alt=media&token=68996350-5ac9-4961-8870-13664bbd722f"
let lungSrc = "https://firebasestorage.googleapis.com/v0/b/remotex-2a1f2.appspot.com/o/web-icons%2Flungs.png?alt=media&token=b21f98c5-6500-4a7b-b5dd-0b33b3fb1985"
let defaultProfile = "https://firebasestorage.googleapis.com/v0/b/remotex-2a1f2.appspot.com/o/web-icons%2Fdefault_profile.png?alt=media&token=44744462-a47d-4ea9-81ce-31f1d00128c4"


let patientDetailsContainer = document.getElementById("patient-details-container")
let currentlySelectedBlock = null;

let examContainer = document.getElementById("exams-container")
while(examContainer.firstChild) {
    examContainer.removeChild(examContainer.firstChild)
}

// Helper function to format dates
function formatDate(date) {
    const options = { year: 'numeric', month: '2-digit', day: '2-digit' };
    return date.toLocaleDateString('en-US', options);
}

function extractFileNameFromURL(url) {
    // Decode the URL to convert %2F back to slashes
    var decodedUrl = decodeURIComponent(url);
    
    // Extract the part of the URL after the last '/'
    var segments = decodedUrl.split('/');
    var fileName = segments.pop(); // Get the last segment which is the file name
    
    // Alternatively, if you want to keep using the encoded URL for splitting
    // you can split by '%2F' and then decode only the file name part
    // var segmentsEncoded = url.split('%2F');
    // var fileNameEncoded = segmentsEncoded.pop();
    // var fileName = decodeURIComponent(fileNameEncoded.split('?')[0]);

    // Assuming the URL might have parameters, remove them
    fileName = fileName.split('?')[0];
    
    return fileName;
}

async function fetchAllExamsWithUserDetails() {
    try {
        const examsSnapshot = await db.collection('exams').orderBy('date', 'desc').get();
        const examsDataPromises = examsSnapshot.docs.map(async (examDoc) => {
            const examData = examDoc.data();
            const userSnapshot = await db.collection('users').doc(examData.userID).get();

            if (userSnapshot.exists) {
                const userData = userSnapshot.data();
                return {
                    userID : examData.userID,
                    userProfilePhoto: userData.profilePhoto,
                    userFullName: userData.fullName || "Unknown Name",
                    dateRecorded: examData.date.toDate(),
                    examType: examData.type,
                    audioFileName: examData.recording,
                    notes: examData.notes,
                };
            }
        });

        const examsData = await Promise.all(examsDataPromises);
        examsData.filter(exam => exam !== undefined).forEach((exam) => {
            buildExamBlock(
                exam.userID,
                exam.userFullName,
                exam.userProfilePhoto,
                formatDate(exam.dateRecorded),
                exam.examType,
                exam.audioFileName,
                exam.notes
            );
        });
    } catch (error) {
        console.error("Error fetching exams with user details: ", error);
    }
}

async function fetchUserDetails(userID, userBlock) {
    try {
        const userSnapshot = await db.collection('users').doc(userID).get();
        if (userSnapshot.exists) {
            const userData = userSnapshot.data();
            buildPatientDetailsContainer(
                userID,
                userData.fullName || "Unknown Name",
                userData.profilePhoto,
                userData.gender || "Not specified",
                userData.email || "No email provided",
                userData.age || "Age not specified",
                userData.deviceModel || "Device model not specified",
                `${userData.heightFeet}'${userData.heightInches}"`,
                userData.weight,
                userData.BMI

            );
        }

        // Check if there is a block currently selected and remove the selected class
        if (currentlySelectedBlock && currentlySelectedBlock !== userBlock) {
            currentlySelectedBlock.classList.remove('user-block-selected');
        }
        
        // Add the selected class to the clicked block and update the currently selected block
        userBlock.classList.add('user-block-selected');
        currentlySelectedBlock = userBlock;


    } catch (error) {
        console.error("Error fetching user details: ", error);
    }
}

// Call the function to fetch exams and build the UI
fetchAllExamsWithUserDetails();




function buildPatientDetailsContainer(userID, userName, userPhoto, gender, email, age, deviceModel, height, weight, BMI) {

    while ( patientDetailsContainer.firstChild ) {
        patientDetailsContainer.removeChild(patientDetailsContainer.firstChild)
    }
    patientDetailsContainer.style.display = "flex"

    //Photo and Name
    if (userPhoto == "") {
        createDOMElement('img', 'patient-details-photo', defaultProfile, patientDetailsContainer)
    } else {
        createDOMElement('img', 'patient-details-photo', userPhoto, patientDetailsContainer)
    }
    createDOMElement('div', 'patient-details-name', userName, patientDetailsContainer)
    
    createDOMElement('div', 'patient-details-text', email, patientDetailsContainer)
    createDOMElement('div', 'patient-details-text', `${gender} | ${age} years old`, patientDetailsContainer)
    createDOMElement('div', 'patient-details-text', deviceModel, patientDetailsContainer)
    createDOMElement('div', 'patient-details-text', `Height: ${height}`, patientDetailsContainer)
    createDOMElement('div', 'patient-details-text', `Weight: ${weight}lbs`, patientDetailsContainer)

    let roundedBMI = parseFloat(BMI).toFixed(2);
    createDOMElement('div', 'patient-details-text', `BMI: ${roundedBMI}`, patientDetailsContainer)

}





function buildExamBlock(userID, userName, userPhoto, examDate, examType, audioURL, notes) {
    var userBlock = document.createElement('div');
    userBlock.className = 'user-block';
    userBlock.addEventListener('click', () => fetchUserDetails(userID, userBlock));

    //Photo and Name
    var patientNameBlock = document.createElement('div');
    patientNameBlock.className = 'patient-name-block';
    if (userPhoto == "") {
        createDOMElement('img', 'patient-photo', defaultProfile, patientNameBlock)
    } else {
        createDOMElement('img', 'patient-photo', userPhoto, patientNameBlock)
    }
    createDOMElement('div', 'patient-text', userName, patientNameBlock)


    //Exam Date
    var patientDateBlock = document.createElement('div');
    patientDateBlock.className = 'patient-date-block';
    createDOMElement('div', 'patient-text', examDate, patientDateBlock)

    //Exam Type
    var patientExamBlock = document.createElement('div');
    patientExamBlock.className = 'patient-exam-block';
    if (examType == "heart") {
        createDOMElement('img', 'exam-image', heartSrc, patientExamBlock)
    } else {
        createDOMElement('img', 'exam-image', lungSrc, patientExamBlock)
    }

 // Audio Block: Button & Text
var patientAudioBlock = document.createElement('div');
patientAudioBlock.className = 'patient-audio-block';
var audioFileName = extractFileNameFromURL(audioURL);

let audio = new Audio(audioURL);

// Elapsed time display
let elapsedTimeDisplay = document.createElement('span');
elapsedTimeDisplay.className = 'patient-text';
patientAudioBlock.appendChild(elapsedTimeDisplay);

// Audio playback button setup
var playButton = document.createElement('img');
playButton.src = playButtonSrc;
playButton.className = 'play-button';
playButton.alt = "Play Audio";

playButton.addEventListener('click', function(event) {
    event.stopPropagation(); // Prevent triggering click event on userBlock
    if (audio.paused) {
        audio.play().then(() => {
            playButton.src = stopButtonSrc; // Change to stop button
            updateElapsedTime(audio, elapsedTimeDisplay); // Update elapsed time
        }).catch(error => console.error("Playback failed", error));
    } else {
        audio.pause();
        playButton.src = playButtonSrc; // Change back to play button
        elapsedTimeDisplay.textContent = audioFileName; // Show file name again
        audio.currentTime = 0; // Optionally reset audio to start
    }
});

audio.addEventListener('ended', function() {
    playButton.src = playButtonSrc; // Revert to play button when audio ends
    elapsedTimeDisplay.textContent = audioFileName; // Show file name
    audio.currentTime = 0; // Reset audio to start
});

patientAudioBlock.appendChild(playButton);
elapsedTimeDisplay.textContent = audioFileName; // Initially show file name

function updateElapsedTime(audio, displayElement) {
    let interval = setInterval(() => {
        if (audio.paused) {
            clearInterval(interval); // Stop updating when audio is paused/stopped
            displayElement.textContent = audioFileName; // Revert to showing the file name
        } else {
            let minutes = Math.floor(audio.currentTime / 60);
            let seconds = Math.floor(audio.currentTime % 60);
            displayElement.textContent = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
        }
    }, 1000);
}
    //Notes
    var patientNotesBlock = document.createElement('div');
    patientNotesBlock.className = 'patient-notes-block';
    createDOMElement('div', 'patient-text', notes, patientNotesBlock)

    //Selection Button
    var patientSelectBlock = document.createElement('div');
    patientSelectBlock.className = 'patient-select-block';
    createDOMElement('div', 'patient-selected', "", patientSelectBlock)


    // Append all child blocks to the userBlock
    userBlock.appendChild(patientNameBlock);
    userBlock.appendChild(patientDateBlock);
    userBlock.appendChild(patientExamBlock);
    userBlock.appendChild(patientAudioBlock);
    userBlock.appendChild(patientNotesBlock);
    userBlock.appendChild(patientSelectBlock);

    // Finally, append the userBlock to the exams-container
    document.getElementById('exams-container').appendChild(userBlock);
}


function createDOMElement(type, className, value, parent) {
    let DOMElement = document.createElement(type)
    DOMElement.setAttribute('class', className)
    if ( type == 'img' ) {
        DOMElement.src = value
    } else {
        DOMElement.innerHTML = value
    }
    parent.appendChild(DOMElement)
}
