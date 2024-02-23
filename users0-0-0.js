


firebase.auth().onAuthStateChanged(user => {
    if (user) {
        // User is signed in, now check if they have isAdmin permission
        const db = firebase.firestore();
        db.collection('users').doc(user.uid).get().then(doc => {
            if (doc.exists && doc.data().isAdmin) {
                // User is an admin, allow them to stay on the page
                console.log("User is admin.");

                // Call the function to fetch exams and build the UI
                fetchAllExamsWithUserDetails();

                // Call the function to fetch users and build the UI
                fetchAllUsersAndBuildBlocks();

                let adminData = doc.data()
                let adminProfileDiv = document.getElementById('admin-profile-div')
                while (adminProfileDiv.firstChild) {
                    adminProfileDiv.removeChild(adminProfileDiv.firstChild)
                }
                createDOMElement('img', 'patient-photo', adminData.profilePhoto, adminProfileDiv);
                createDOMElement('div', 'patient-text', adminData.fullName, adminProfileDiv);

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

let logoutButton = document.getElementById('logout-button');

logoutButton.addEventListener('click', function() {
    firebase.auth().signOut().then(() => {
        console.log('User logged out successfully');
        // Redirect to login page or show a message
        window.location.href = "https://remotex-admin.webflow.io/login";
    }).catch((error) => {
        // Handle errors here
        console.error('Error logging out:', error);
        alert('Failed to log out');
    });
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


document.getElementById('download-exams-csv').addEventListener('click', async () => {
    const db = firebase.firestore();
    try {
        const examsSnapshot = await db.collection('exams').get();
        let csvContent = "data:text/csv;charset=utf-8,";
        // Adding header row with new order and headers
        csvContent += `"Record DateTime","Exam ID","User ID","Exam Type","Audio Link","Notes"\r\n`;

        examsSnapshot.forEach((doc) => {
            const data = doc.data();
            // Formatting the date to include time
            const date = data.date.toDate();
            const dateTimeString = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()} ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`;
            // Check if notes exists and escaping commas and quotes, otherwise use an empty string
            const notes = data.notes ? `"${data.notes.replace(/"/g, '""')}"` : "";
            // Rearranging data according to the new order
            const rowData = `"${dateTimeString}","${doc.id}","${data.userID}","${data.type}","${data.recording}",${notes}`;
            csvContent += rowData + "\r\n";
        });

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
