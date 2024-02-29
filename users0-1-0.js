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
                userProfilePhoto: userData.profilePhoto || "",
                dateCreated: userData.dateCreated.toDate(), // Assuming 'createdAt' is a Timestamp
                status: userData.isAuthorized,
                members : userData.members
            });
        });

        // Sort users by date created
        usersData.sort((a, b) => a.dateCreated - b.dateCreated);

        // Now build blocks for each user
        usersData.forEach((user) => {
            buildUserBlock(user.userID, user.userName, user.userProfilePhoto, user.dateCreated, user.status, user.members);
        });
    } catch (error) {
        console.error("Error fetching users: ", error);
    }
}



function updateStatusButton(button, status) {
    button.className = status ? "authorized-button" : "unauthorized-button";
    button.textContent = status ? "Approved" : "Pending";
}

function buildUserBlock(userID, userName, userPhoto, dateCreated, status, members) {
    let userBlock = document.createElement('div');
    userBlock.className = 'user-block';
    userBlock.addEventListener('click', () => fetchUserDetails(userID, null, userBlock));

    //Photo and Name
    var userNameBlock = document.createElement('div');
    userNameBlock.className = 'user-name-block';
    if (userPhoto == "") {
        createDOMElement('div', `patient-photo-${colorScheme}`, getFirstInitial(userName), userNameBlock)
    } else {
        createDOMElement('img', 'patient-photo', userPhoto, userNameBlock)
    }
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


    // User Members Block
    let userMembersBlock = document.createElement('div');
    userMembersBlock.className = 'user-members-block';

    // Iterate through members and create a photo or colored circle for each
    Object.keys(members || {}).forEach(memberID => {
        const member = members[memberID];
        const memberElement = document.createElement('div');

        if (member.profilePhoto == "") {
            createDOMElement('div',`patient-photo-${member.colorScheme}`,  getFirstInitial(member.fullName), memberElement)
        } else {
            createDOMElement('img', 'patient-photo', member.profilePhoto, memberElement)
        }
        memberElement.title = member.fullName; // Tooltip to show member's name on hover

        memberElement.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent triggering the userBlock's click event
            fetchUserDetails(userID, memberID, userBlock); // Fetch and display this member's details
        });

        userMembersBlock.appendChild(memberElement);
    });

    // Append child elements to the user block
    userBlock.appendChild(userNameBlock);
    userBlock.appendChild(userDateBlock);
    userBlock.appendChild(userStatusBlock);
    userBlock.appendChild(userMembersBlock);

    // Append the user block to the container
    document.getElementById('users-container').appendChild(userBlock);
}

function updateStatusButton(button, status) {
    button.className = status ? "authorized-button" : "unauthorized-button";
    button.textContent = status ? "Approved" : "Pending";
}
