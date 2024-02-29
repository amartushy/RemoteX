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

    fileName = fileName.split('?')[0];
    
    return fileName;
}

// async function fetchAllExamsWithUserDetails() {
//     clearExamsUI(); // Clear existing UI elements before fetching

//     try {
//         const examsSnapshot = await db.collection('exams').orderBy('date', 'desc').get();
//         const examsDataPromises = examsSnapshot.docs.map(async (examDoc) => {
//             const examData = examDoc.data();
//             const userSnapshot = await db.collection('users').doc(examData.userID).get();

//             if (userSnapshot.exists) {
//                 const userData = userSnapshot.data();
//                 return {
//                     examID: examDoc.id, // Include the exam document's ID
//                     userID : examData.userID,
//                     userProfilePhoto: userData.profilePhoto,
//                     userFullName: userData.fullName || "Unknown Name",
//                     dateRecorded: examData.date.toDate(),
//                     examType: examData.type,
//                     audioFileName: examData.recording,
//                     notes: examData.notes,
//                 };
//             }
//         });

//         const examsData = await Promise.all(examsDataPromises);
//         examsData.filter(exam => exam !== undefined).forEach((exam) => {
//             buildExamBlock(
//                 exam.examID,
//                 exam.userID,
//                 exam.userFullName,
//                 exam.userProfilePhoto,
//                 formatDate(exam.dateRecorded),
//                 exam.examType,
//                 exam.audioFileName,
//                 exam.notes
//             );
//         });
//     } catch (error) {
//         console.error("Error fetching exams with user details: ", error);
//     }
// }
async function fetchAllExamsWithUserDetails() {
    clearExamsUI(); // Clear existing UI elements before fetching

    try {
        const examsSnapshot = await db.collection('exams').orderBy('date', 'desc').get();
        const examsDataPromises = examsSnapshot.docs.map(async (examDoc) => {
            const examData = examDoc.data();
            let userDetails = {};

            const userSnapshot = await db.collection('users').doc(examData.userID).get();
            if (userSnapshot.exists) {
                const userData = userSnapshot.data();

                // Check if memberID is present and different from userID, and access member data from the 'members' map
                if ( examData.memberID !== examData.userID ) {
                    userDetails = userData.members[examData.memberID]; // Access the member details from the map
                    console.log(userDetails)
                } else {
                    // Use user data if memberID is not specified or the same as userID
                    userDetails = userData;
                }
            }

            return {
                examID: examDoc.id,
                userID: examData.userID,
                userProfilePhoto: userDetails.profilePhoto || defaultProfile,
                userFullName: userDetails.fullName || "Unknown Name",
                dateRecorded: examData.date.toDate(),
                examType: examData.type,
                audioFileName: examData.recording,
                notes: examData.notes,
            };
        });

        const examsData = await Promise.all(examsDataPromises);
        examsData.filter(exam => exam !== undefined).forEach((exam) => {
            buildExamBlock(
                exam.examID,
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

function clearExamsUI() {
    const examsContainer = document.getElementById('exams-container'); // Assuming this is your container for exams
    examsContainer.innerHTML = ''; // Clear the container
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



function buildPatientDetailsContainer(userID, userName, userPhoto, gender, email, age, deviceModel, height, weight, BMI) {

    while ( patientDetailsContainer.firstChild ) {
        patientDetailsContainer.removeChild(patientDetailsContainer.firstChild)
    }
    patientDetailsContainer.style.display = "flex"

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





function buildExamBlock(examID, userID, userName, userPhoto, examDate, examType, audioURL, notes) {
    var userBlock = document.createElement('div');
    userBlock.className = 'exam-block';
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

    // Elapsed time display
    let elapsedTimeDisplay = document.createElement('span');
    elapsedTimeDisplay.className = 'patient-text';

    let audio = new Audio(audioURL);

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
    patientAudioBlock.appendChild(elapsedTimeDisplay);
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

    //Delete Button
    var patientActionsBlock = document.createElement('div');
    patientActionsBlock.className = 'patient-actions-block';

    let deleteButton = document.createElement('div');
    deleteButton.className = "patient-delete"
    deleteButton.innerHTML = ""
    patientActionsBlock.appendChild(deleteButton)
    deleteButton.addEventListener('click', function(event) {
        event.stopPropagation(); // Prevent triggering click event of parent elements
        deleteExam(examID);
    });

    // Append all child blocks to the userBlock
    userBlock.appendChild(patientNameBlock);
    userBlock.appendChild(patientDateBlock);
    userBlock.appendChild(patientExamBlock);
    userBlock.appendChild(patientAudioBlock);
    userBlock.appendChild(patientNotesBlock);
    userBlock.appendChild(patientActionsBlock);

    // Finally, append the userBlock to the exams-container
    document.getElementById('exams-container').appendChild(userBlock);
}

async function deleteExam(examId) {
    try {
        await db.collection('exams').doc(examId).delete();
        console.log('Exam deleted successfully');
        fetchAllExamsWithUserDetails(); // Refetch and rerender exams after deletion

        // Optionally, refresh the exams list or remove the exam block from UI
    } catch (error) {
        console.error('Error deleting exam:', error);
    }
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




document.getElementById('download-exams-csv').addEventListener('click', async () => {
    const db = firebase.firestore();
    try {
        const examsSnapshot = await db.collection('exams').get();
        let csvContent = "data:text/csv;charset=utf-8,";
        // Extending the header row with user information
        csvContent += `"Record DateTime","Exam ID","User ID","Member ID","Exam Type","Audio Link","Notes","Device Model","Height (Feet)","Height (Inches)","Weight","BMI","Gender","Age"\r\n`;

        // Fetch user data for each exam and format rows
        const rows = await Promise.all(examsSnapshot.docs.map(async (doc) => {
            const data = doc.data();
            // Fetch user document
            const userDoc = await db.collection('users').doc(data.userID).get();
            const userData = userDoc.data();

            let memberDetails = userData; // Default to userData if memberID is not specified or the same as userID
            if (data.memberID !== data.userID) {
                // If memberID is different and exists in userData.members, use member details
                memberDetails = userData.members[data.memberID];
            }

            const date = data.date.toDate();
            const dateTimeString = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()} ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`;
            const sanitizedNotes = data.notes ? data.notes.replace(/"/g, '""').replace(/\r?\n|\r/g, " ") : "";
            const rowData = [
                dateTimeString,
                doc.id,
                data.userID,
                data.memberID || "",
                data.type,
                data.recording,
                `"${sanitizedNotes}"`,
                memberDetails.deviceModel || "",
                memberDetails.heightFeet || "",
                memberDetails.heightInches || "",
                memberDetails.weight || "",
                memberDetails.BMI || "",
                memberDetails.gender || "",
                memberDetails.age || ""
            ].join('","');

            return `"${rowData}"\r\n`;
        }));

        // Append all rows to csvContent
        csvContent += rows.join('');

        // Creating a link to trigger the download
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "exams.csv");
        document.body.appendChild(link); // Required for Firefox

        link.click(); // Triggering the download

        document.body.removeChild(link); // Cleaning up the link
    } catch (error) {
        console.error("Error fetching exams data: ", error);
    }
});
