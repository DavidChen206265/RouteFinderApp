# Resources for RouteFinder

Beginner's Guide: *https://docs.mapbox.com/mapbox-gl-js/guides/install/*

API Playground: *https://apidocs.geoapify.com/playground/routing/?mode=truck&optimizeRoute=false&type=balanced&units=metric&maxSpeed=0&avoidTolls=false&avoidFerries=false&avoidHighways=false&instructions=false&route=false&elevation=false&traffic=free_flow*

Documentation: *https://apidocs.geoapify.com/*

# GitHub SOP

This document outlines the workflow for contributing to the RouteFinderApp. Following these steps ensures code stability and prevents "crying David" scenarios.

## 1. Initial Setup (One-time per Project)

### 1.1 Configure VS Code Terminal

1.1.1 Prepare your Workspace: Create/open a folder where you want your project's folder to be located and open it with VS Code. (Please see the example at the end of step 1 to decide where you would like the project to be on your computer.)

1.1.2 Open Terminal: Press **Ctrl + Shift + ` (the key above Tab)**. (You can toggle it later with **Ctrl + J**).

1.1.3 (**Important if you are working on school computers**) Click the downward arrow next to the + icon on the top right of the terminal panel and select "Git Bash" in the dropdown. Otherwise you will be using the powershell and git commands can not work.

### 1.2 Clone the Repository

1.2.1 Clone the repository to your local machine by:

```
git clone repository_url
```

e.g. repository_url for our repository: https://github.com/DavidChen206265/RouteFinderApp.git

Note: repository_url should end with ".git". Go to your project's page on GitHub, click the green `<> Code` button and copy the url.

1.2.2 (Highly recommended) After cloning, close VS Code and open the specific project folder that was just created. This ensures your terminal path is correctly set to the root of the project. (Otherwise you will have to access the project's folder in terminal by `cd ProjectName`)

**!!! All the commands below must be run in the project folder!**

### Example:

a. If your repository's name on GitHub is MyGithubProject:

b. In 1.1.1, you created/opened a folder called ComputerScienceProjects at `H:\thePathOfYourDocumentFolder\ComputerScienceProjects`

c. After 1.2.1, the project folder will be at `H:\thePathOfYourDocumentFolder\ComputerScienceProjects\MyGithubProject`

d. The index.html will be at `H:\thePathOfYourDocumentFolder\ComputerScienceProjects\MyGithubProject\index.html`

e. In 1.2.2, open MyGithubProject folder with VS Code instead of ComputerScienceProjects.

## 2. Starting Feature Development (Everyday procedure starts from here)

**!!! Never modify code directly on the main branch.** This branch is reserved for finished, working code. Working directly on main risks breaking the project for everyone. David will cry if you do that.

2.1 Sync with the Team: Before starting work, ensure that your local main branch is up-to-date.

```
git checkout main
```

**checkout** is the command for switching to a branch. This line switchs to the main branch

```
git pull origin main
```

**pull** updates your local code to the code from a branch.

**origin** is automatically defined when you execute git clone. It is the default nickname that Git gives to your remote repository (that is, the address on GitHub).

2.2 Create a feature branch so your experimental code doesn't affect others. Give it a meaningful name.

```
git checkout -b your-branch-name
```

**checkout -b** creates a new branch.

2.3 Write your code. Proceed to step 3 after you've finished your work.

## 3. Saving Your Progress (Local)

3.1 (Optional) If you forget which files you've changed, run:

```
git status
```

3.2 Add changes:

```
git add .
```

**.** means all files. This tells Git you want to include all your recent changes in the next "save". Or you could add a specific file by: `git add filename`.

3.3 Commit to the local repository:

```
git commit -m "Describe what you did (e.g., Fixed navbar bug)"
```

Think of a "Commit" as a save point in a video game. If you mess up later, you can always return to this point.

**commit -m "comment"** creates the actual save point.

## 4. Submitting Work for Review

### 4.1 Push to GitHub (Upload your local feature branch to the online repository):

```
git push origin your-branch-name
```

### 4.2 Open a Pull Request (PR) on GitHub:

4.2.1 Go to the project's GitHub page. You will see a yellow notification: "Compare & pull request". Click it.

If the yellow notification does not showup:

a. Go to your project's "Pull request" page on GitHub;

b. Click the green `New pull request` button;

c. On the top of the page, set `base` to "main", `compare` to "your-branch-name";

d. Click the green `Create pull request` button.

4.2.2 Describe your changes: Explain what you added or fixed so your teammates understand the code.

4.2.3 (Optional) Assign reviewers: Tag a teammate to check your work before it's officially added to the project. (David :>)

## 5. Merging

### 5.1 (Only when you did 4.2.3)

Once the teammate approves your PR, you could continue with 5.2

### 5.2 Merging

5.2.1 Click the `Merge pull request` button.

5.2.2 Click `Confirm merge`. At this point, your code will officially enter the main branch.

5.2.3 Click the `Delete branch` button to delete the new branch on GitHub.

### 5.3 (Only when there are conflicts) Conflicts Solving

If two people have modified the same line of code, GitHub will warn of a conflict and prevent automatic merging.

5.3.1 Synchronize your main branch locally:

```
git checkout main
git pull origin main
```

5.3.2 Switch back to your feature branch:

```
git checkout your-branch-name
```

5.3.3 Merge the main branch into your branch:

```
git merge main
```

5.3.4 Manual resolution: VS Code will highlight the conflicted parts. Choose whose code to keep and save the file.

5.3.5 Recommit: Redo step 3 & 4. The pull request will then show that the conflict has been resolved.

## 6. Workspace Cleanup

Once your feature is merged, return to VS Code and delete the branch to keep the repository tidy.

```
git checkout main
git pull origin main                # pull the newly merged code
git branch -d your-branch-name      # deletes the local branch
```

## Dealing with API Keys

1. Create a `config.js` file in the root directory of your project.

2. Add the following code into `config.js`.

```
const CONFIG = {
    API_KEY_First: 'the_first_api_key',
    API_KEY_Second: 'the_second_api_key',
    ...
};
```

3. Create a `.gitignore` file in the root directory of your project.

4. Add `config.js` into `.gitignore`. Files stated in `.gitignore` will not be uploaded to your GitHub repository.

```
config.js
```

5. In your `index.html`, include `config.js` at first, then include your main logic file. This way, your main logic can directly access the CONFIG object.

```
<script src="config.js"></script>
<script src="script.js"></script>
```

6. In your main logic file (`script.js`), access the API keys by:

```
firstApiKey = CONFIG.API_KEY_First;
```

## Testing PWA on Mobile Devices Without GitHub Pages

### Why

GitHub Pages can not update instantly while you edit your code. Especially when API keys are involved in your project, you will also have to configure "Domain Restrictions" in the backend of your API.

### Prerequisite

a. You will need to bring your own laptop to school and have a working copy of your project opened in its VS Code.

b. Your phone is able create a Hotspot while only using Mobile data.

### 1. Setting Up the Server

1.1 Set up `Node.js` on your computer. Go to https://nodejs.org/en/download

1.2 In the terminal of your project:

```
npx http-server -p 8080 --bind 0.0.0.0
```

8080 can be changed to the port you would like to hold your project on.

1.3 In the terminal output, find this section:

```
Available on:
http://127.0.0.1:8080
http://192.168.189.37:8080
```

The url starts with `http://192.168.` is your address to use. (e.g. `http://192.168.189.37:8080`)

1.4 After testing, hit `Ctrl + C` to stop the server.

### 2. Setting Up Your Phone

2.1 (If you are at school) Disconnect your phone from school's WIFI, only use Mobile data.

2.2 Setup a Hotspot on your phone and connect your computer to it.

2.1 Open Chrome on your phone.

### 3. In your Chrome's address bar, go to：

```
chrome://flags/#unsafely-treat-insecure-origin-as-secure
```

### 4. Find "Insecure origins treated as secure".

### 5. Put your IP and port in.

(e.g. http://192.168.189.37:8080)

### 6. Turn `Disabled` to `Enabled`.

### 7. Click `Relaunch` button.

### 8. Showing Console

8.1 Add these code inside your `<head>` tag in `index.html`:

```
<script src="https://cdn.jsdelivr.net/npm/eruda"></script>
<script>eruda.init();</script>
```

8.2 A small "gear" icon will appear on your phone screen. Tap it, and it opens a fully functional console, element inspector, and network tab right inside your mobile browser.
