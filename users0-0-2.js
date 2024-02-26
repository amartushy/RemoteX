firebase.auth().onAuthStateChanged(user => {
    if (user) {
        // User is signed in, now check if they have isAdmin permission
        const db = firebase.firestore();
        db.collection('users').doc(user.uid).get().then(doc => {
            if (doc.exists && doc.data().isAdmin) {
                // User is an admin, allow them to stay on the page
                console.log("User is admin.");
            } else {
                // User is not an admin, redirect them to the login page
                window.location.href = "https://remotex-admin.webflow.io/login";
            }
        }).catch(error => {
            console.error("Error checking admin status: ", error);
            window.location.href = "https://remotex-admin.webflow.io/login";
        });
    } else {
        // No user is signed in, redirect them to the login page
        window.location.href = "https://remotex-admin.webflow.io/login";
    }
});


let examsTab = document.getElementById("exams-tab");
let usersTab = document.getElementById("users-tab");

let examsContainerMain = document.getElementById("exams-container-main");
let usersContainerMain = document.getElementById("users-container-main");
let usersContainer = document.getElementById("users-container")

let examsFooter = document.getElementById("exams-footer")

// Initially hide the usersContainerMain
usersContainerMain.style.display = "none";


examsTab.addEventListener('click', function() {
    // Show exams container and hide users container
    examsContainerMain.style.display = "flex";
    usersContainerMain.style.display = "none";

    examsFooter.style.display = "flex";

    // Optionally, update the tabs' appearance to indicate which tab is active
    examsTab.className = "tab-selected"
    usersTab.className = "tab-unselected"
});

usersTab.addEventListener('click', function() {
    // Show users container and hide exams container
    usersContainerMain.style.display = "flex";
    examsContainerMain.style.display = "none";

    examsFooter.style.display = "none";

    // Optionally, update the tabs' appearance to indicate which tab is active
    usersTab.className = "tab-selected"
    examsTab.className = "tab-unselected"
});



async function fetchAllUsersAndBuildBlocks() {
    while(usersContainer.firstChild) {
        usersContainer.removeChild(usersContainer.firstChild)
    }

    try {
        const usersSnapshot = await db.collection('users').get();
        let usersData = [];

        usersSnapshot.forEach((userDoc) => {
            const userData = userDoc.data();
            usersData.push({
                userID: userDoc.id,
                userName: userData.fullName || "Unknown Name",
                userProfilePhoto: userData.profilePhoto || defaultProfile,
                dateCreated: userData.dateCreated.toDate(), // Assuming 'createdAt' is a Timestamp
                status: userData.isAuthorized 
            });
        });

        // Sort users by date created
        usersData.sort((a, b) => a.dateCreated - b.dateCreated);

        // Now build blocks for each user
        usersData.forEach((user) => {
            buildUserBlock(user.userID, user.userName, user.userProfilePhoto, user.dateCreated, user.status);
        });
    } catch (error) {
        console.error("Error fetching users: ", error);
    }
}

function buildUserBlock(userID, userName, userPhoto, dateCreated, status) {
    let userBlock = document.createElement('div');
    userBlock.className = 'user-block';
    userBlock.addEventListener('click', () => fetchUserDetails(userID, userBlock));

    //Photo and Name
    var userNameBlock = document.createElement('div');
    userNameBlock.className = 'user-name-block';
    createDOMElement('img', 'patient-photo', userPhoto, userNameBlock);
    createDOMElement('div', 'patient-text', userName, userNameBlock);

    //Date Created
    var userDateBlock = document.createElement('div');
    userDateBlock.className = 'user-date-block';
    createDOMElement('div', 'patient-text', formatDate(dateCreated), userDateBlock);

    let userStatusBlock = document.createElement('div');
    userStatusBlock.className = 'user-status-block';
    let statusButton = document.createElement('button');
    updateStatusButton(statusButton, status);
    userStatusBlock.appendChild(statusButton);

    // Event listener for status button to toggle status
    statusButton.addEventListener('click', async () => {
        const newStatus = !status; // Toggle the status
        try {
            await db.collection('users').doc(userID).update({isAuthorized: newStatus});
            status = newStatus; // Update the local status variable to reflect the change
            updateStatusButton(statusButton, status); // Update button appearance based on new status
            console.log(`User ${userID} status updated to ${status}`);
        } catch (error) {
            console.error("Error updating user status: ", error);
        }
    });

    // Append child elements to the user block
    userBlock.appendChild(userNameBlock);
    userBlock.appendChild(userDateBlock);
    userBlock.appendChild(userStatusBlock);

    // Append the user block to the container
    document.getElementById('users-container').appendChild(userBlock);
}

function updateStatusButton(button, status) {
    button.className = status ? "authorized-button" : "unauthorized-button";
    button.textContent = status ? "Approved" : "Pending";
}


// Call the function to fetch users and build the UI
fetchAllUsersAndBuildBlocks();


document.getElementById('download-exams-csv').addEventListener('click', async () => {
    const db = firebase.firestore();
    try {
        const examsSnapshot = await db.collection('exams').get();
        let csvContent = "data:text/csv;charset=utf-8,";
        // Extending the header row with user information
        csvContent += `"Record DateTime","Exam ID","User ID","Exam Type","Audio Link","Notes","Device Model","Height (Feet)","Height (Inches)","Weight","BMI","Gender","Age"\r\n`;

        // Fetch user data for each exam and format rows
        const rows = await Promise.all(examsSnapshot.docs.map(async (doc) => {
            const data = doc.data();
            // Fetch user document
            const userDoc = await db.collection('users').doc(data.userID).get();
            const userData = userDoc.data();

            const date = data.date.toDate();
            const dateTimeString = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()} ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`;
            const notes = data.notes ? `"${data.notes.replace(/"/g, '""')}"` : "";

            // Include user data in the row
            const rowData = [
                dateTimeString,
                doc.id,
                data.userID,
                data.type,
                data.recording,
                notes,
                userData.deviceModel,
                userData.heightFeet,
                userData.heightInches,
                userData.weight,
                userData.BMI,
                userData.gender,
                userData.age
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
