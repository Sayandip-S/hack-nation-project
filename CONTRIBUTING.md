# Hack Nation Project — Developer Setup and Git Workflow

This guide explains how to download the project, configure the Python environment with `uv`, create a feature branch, submit changes through a pull request, and keep your work synchronized with the team.

## Core rule

**Do not commit or push directly to `main`.**

Every task should be completed on a separate branch and merged into `main` through a GitHub pull request.

Our workflow is:

```text
Clone repository
      ↓
Update local main
      ↓
Create a feature branch
      ↓
Write and test code
      ↓
Commit changes
      ↓
Push the feature branch
      ↓
Open a pull request
      ↓
Review and merge into main
```

---

# 1. Required tools

Install the following before beginning:

* Git
* Visual Studio Code
* A GitHub account
* `uv` for Python development
* Node.js if working on the JavaScript frontend

Verify Git:

```powershell
git --version
```

Verify VS Code:

```powershell
code --version
```

Verify `uv`:

```powershell
uv --version
```

Verify Node.js and npm when working on the frontend:

```powershell
node --version
npm --version
```

---

# 2. Get access to the GitHub repository

Repository:

```text
https://github.com/Sayandip-S/hack-nation-project
```

Before pushing branches, each teammate must be added as a repository collaborator.

The repository owner should open:

```text
GitHub repository
→ Settings
→ Collaborators
→ Add people
```

Add each teammate using their GitHub username.

A teammate may clone a public repository without collaborator access, but they cannot push a branch to the shared repository until they have write access. Without write access, they would need to use a fork instead.

---

# 3. Configure Git identity

Each teammate should run these commands once.

Replace the example values with your own name and the email connected to your GitHub account:

```powershell
git config --global user.name "Your Name"
git config --global user.email "your-email@example.com"
```

Verify the configuration:

```powershell
git config --global --list
```

Expected output includes:

```text
user.name=Your Name
user.email=your-email@example.com
```

This information will appear in your Git commits.

---

# 4. Clone the repository

Open PowerShell and move to the folder where you keep projects.

For example:

```powershell
cd "$HOME\Documents"
```

Clone the project using HTTPS:

```powershell
git clone https://github.com/Sayandip-S/hack-nation-project.git
```

Enter the project:

```powershell
cd hack-nation-project
```

Open it in VS Code:

```powershell
code .
```

Cloning creates a local copy and automatically configures the GitHub repository as the `origin` remote.

Verify the connection:

```powershell
git remote -v
```

Expected output:

```text
origin  https://github.com/Sayandip-S/hack-nation-project.git (fetch)
origin  https://github.com/Sayandip-S/hack-nation-project.git (push)
```

Check the current branch:

```powershell
git branch
```

Expected output:

```text
* main
```

Check the repository state:

```powershell
git status
```

Expected output:

```text
On branch main
Your branch is up to date with 'origin/main'.

nothing to commit, working tree clean
```

---

# 5. Expected project structure

The repository may use this structure:

```text
hack-nation-project/
├── backend/
│   ├── pyproject.toml
│   ├── uv.lock
│   ├── .python-version
│   ├── main.py
│   ├── src/
│   └── tests/
│
├── frontend/
│   ├── package.json
│   ├── package-lock.json
│   ├── src/
│   └── public/
│
├── .gitignore
├── .env.example
├── LICENSE
├── README.md
└── CONTRIBUTING.md
```

The Python backend is managed with `uv`.

The JavaScript or TypeScript frontend is managed separately with npm.

```text
backend/   → uv and Python
frontend/  → npm and Node.js
```

`uv` does not manage JavaScript dependencies.

---

# 6. Set up the Python backend with uv

Move into the backend directory:

```powershell
cd backend
```

Synchronize the Python environment:

```powershell
uv sync
```

`uv sync` creates the project’s `.venv` when needed and installs the dependencies declared by the project and lockfile.

You usually do not need to activate the virtual environment manually.

Run Python commands through `uv run`:

```powershell
uv run python main.py
```

For a FastAPI application, the command may be:

```powershell
uv run uvicorn main:app --reload
```

For tests:

```powershell
uv run pytest
```

For linting, depending on the project configuration:

```powershell
uv run ruff check .
```

`uv run` checks that the environment matches the project and runs the command with the required locked dependencies.

## Optional manual environment activation

On Windows PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
```

To leave the environment:

```powershell
deactivate
```

Manual activation is optional when commands are executed through `uv run`.

## Adding a new Python dependency

Do not use `pip install` directly for project dependencies.

Use:

```powershell
uv add package-name
```

Example:

```powershell
uv add fastapi
```

For a development dependency:

```powershell
uv add --dev pytest
```

Remove a dependency:

```powershell
uv remove package-name
```

`uv add` updates the project dependency configuration, lockfile, and environment.

After changing dependencies, commit both:

```text
backend/pyproject.toml
backend/uv.lock
```

Do not commit:

```text
backend/.venv/
```

Return to the repository root:

```powershell
cd ..
```

---

# 7. Set up the frontend

Only teammates working on the frontend need this section.

Enter the frontend directory:

```powershell
cd frontend
```

Install the dependencies:

```powershell
npm install
```

Start the development server:

```powershell
npm run dev
```

Return to the repository root:

```powershell
cd ..
```

Commit these dependency files:

```text
frontend/package.json
frontend/package-lock.json
```

Do not commit:

```text
frontend/node_modules/
```

---

# 8. Never work directly on main

Before beginning a task, make sure you are at the repository root:

```powershell
cd "$HOME\Documents\hack-nation-project"
```

Switch to `main`:

```powershell
git switch main
```

Download the latest team changes:

```powershell
git pull origin main
```

`git pull` downloads remote changes and integrates them into the current local branch.

Confirm that the working tree is clean:

```powershell
git status
```

Now create a new branch.

---

# 9. Create a feature branch

Use a clear branch name related to your task.

Branch naming format:

```text
type/short-description
```

Recommended types:

```text
feature/
fix/
docs/
refactor/
test/
chore/
```

Examples:

```text
feature/user-login
feature/chat-interface
feature/ai-recommendations
fix/login-validation
fix/mobile-navbar
docs/backend-setup
refactor/database-service
test/api-endpoints
```

Create and switch to a branch:

```powershell
git switch -c feature/user-login
```

Check your current branch:

```powershell
git branch
```

Expected output:

```text
* feature/user-login
  main
```

The asterisk identifies the current branch.

GitHub’s shared-repository collaboration model uses topic branches and pull requests so changes can be discussed and reviewed before being merged into the primary branch.

---

# 10. Write and test the code

Make the required changes in VS Code.

Frequently inspect the repository:

```powershell
git status
```

View unstaged changes:

```powershell
git diff
```

For backend changes, run the relevant tests:

```powershell
cd backend
uv sync
uv run pytest
cd ..
```

Or run the backend:

```powershell
cd backend
uv run uvicorn main:app --reload
```

For frontend changes:

```powershell
cd frontend
npm install
npm run dev
```

Test the feature before committing it.

---

# 11. Stage the changes

Return to the repository root before running Git commands:

```powershell
cd "$HOME\Documents\hack-nation-project"
```

See changed files:

```powershell
git status
```

Stage individual files when possible:

```powershell
git add backend/main.py
git add backend/tests/test_main.py
```

Alternatively, stage all current changes:

```powershell
git add .
```

Review what is staged:

```powershell
git diff --staged
```

Check status again:

```powershell
git status
```

Never commit any of the following:

```text
.env
API keys
passwords
access tokens
private certificates
database credentials
.venv/
node_modules/
```

---

# 12. Commit the changes

Create a clear commit message:

```powershell
git commit -m "Add user login endpoint"
```

Good commit messages:

```text
Add user registration endpoint
Create responsive dashboard layout
Fix login form validation
Add unit tests for recommendation service
Update backend setup instructions
```

Avoid unclear messages:

```text
changes
update
stuff
final
final final
working version
```

Check the commit:

```powershell
git log --oneline -5
```

A task may have multiple small commits. That is acceptable and often preferable to one very large commit.

---

# 13. Push the feature branch

For the first push of a new branch:

```powershell
git push -u origin feature/user-login
```

Replace `feature/user-login` with your actual branch name.

The `-u` option sets the remote tracking branch. After the first push, future pushes from that branch can use:

```powershell
git push
```

Do not run:

```powershell
git push origin main
```

Do not use:

```powershell
git push --force
```

unless the team lead specifically instructs you to do so.

---

# 14. Open a pull request

After pushing the branch:

1. Open the project on GitHub.
2. GitHub will usually display a **Compare & pull request** button.
3. Click it.
4. Confirm:

```text
base: main
compare: feature/user-login
```

The base branch is where the changes will be applied. The compare branch contains the proposed changes.

Use a meaningful pull request title:

```text
Add user login endpoint
```

Include a useful description:

```markdown
## What changed

- Added the user login API endpoint
- Added request validation
- Added login tests

## How to test

1. Run `uv sync` inside `backend`
2. Run `uv run pytest`
3. Start the API with `uv run uvicorn main:app --reload`
4. Send a POST request to `/login`

## Notes

No database migration is required.
```

Create the pull request.

Do not merge it immediately when another teammate should review it.

Pull requests allow changes from a topic branch to be reviewed and merged into a selected base branch. Follow-up commits pushed to the same feature branch are automatically included in the existing pull request.

---

# 15. Update an existing pull request

When a reviewer requests changes, remain on the same branch:

```powershell
git branch --show-current
```

Make the requested changes.

Then:

```powershell
git add .
git commit -m "Address pull request review feedback"
git push
```

Do not create a second pull request.

The existing pull request updates automatically when new commits are pushed to its branch.

---

# 16. Keep your branch updated with main

Other pull requests may be merged while you are working.

First, save or commit your current work.

Then fetch the latest remote information:

```powershell
git fetch origin
```

While remaining on your feature branch, merge the latest `main` into it:

```powershell
git merge origin/main
```

Alternatively, the team may choose a rebase workflow:

```powershell
git rebase origin/main
```

Beginners should use `merge` unless the team has explicitly agreed to use rebase.

After successfully updating the branch:

```powershell
git push
```

If a rebase was used after the branch had already been pushed, updating it may require a force operation. Do not do this without coordinating with the team.

---

# 17. Resolve a merge conflict

A conflict occurs when Git cannot automatically combine changes made to the same part of a file.

Git may display:

```text
CONFLICT (content): Merge conflict in backend/main.py
Automatic merge failed; fix conflicts and then commit the result.
```

Check the affected files:

```powershell
git status
```

Open each conflicted file in VS Code.

Conflict markers look like:

```text
<<<<<<< HEAD
Your branch's code
=======
Code from main
>>>>>>> origin/main
```

Edit the file so it contains the correct final version.

Remove all conflict markers:

```text
<<<<<<<
=======
>>>>>>>
```

Stage the resolved file:

```powershell
git add backend/main.py
```

After resolving every conflict:

```powershell
git commit -m "Resolve merge conflict with main"
git push
```

To cancel a merge before completing it:

```powershell
git merge --abort
```

Do not randomly delete code to make a conflict disappear. Ask the author of the other change when the correct result is unclear.

---

# 18. After the pull request is merged

Once GitHub shows that the pull request has been merged, update your local repository.

Switch to `main`:

```powershell
git switch main
```

Pull the merged changes:

```powershell
git pull origin main
```

Delete the old local branch:

```powershell
git branch -d feature/user-login
```

Delete the remote branch when GitHub did not remove it automatically:

```powershell
git push origin --delete feature/user-login
```

Branches can normally be deleted after their pull requests have been merged or closed.

For the next task, create a completely new branch from the updated `main`:

```powershell
git switch -c feature/next-task
```

Do not continue unrelated work on an already merged branch.

---

# 19. Daily workflow

## Beginning a new task

```powershell
cd "$HOME\Documents\hack-nation-project"

git switch main
git pull origin main
git status

git switch -c feature/my-new-feature
```

## While working

```powershell
git status
git diff

# Run the relevant tests

git add .
git diff --staged
git commit -m "Add my new feature"
```

## Uploading the branch

First push:

```powershell
git push -u origin feature/my-new-feature
```

Later pushes:

```powershell
git push
```

Then open or update the pull request on GitHub.

## After the pull request is merged

```powershell
git switch main
git pull origin main
git branch -d feature/my-new-feature
```

---

# 20. Copy-paste first-time teammate setup

Replace the Git identity values before running:

```powershell
git config --global user.name "Your Name"
git config --global user.email "your-email@example.com"

cd "$HOME\Documents"

git clone https://github.com/Sayandip-S/hack-nation-project.git
cd hack-nation-project

git remote -v
git status

code .
```

Set up the backend:

```powershell
cd backend
uv sync
cd ..
```

Set up the frontend when needed:

```powershell
cd frontend
npm install
cd ..
```

Create the first feature branch:

```powershell
git switch main
git pull origin main
git switch -c feature/my-first-task
```

---

# 21. Copy-paste standard feature workflow

Replace the branch name and commit message:

```powershell
git switch main
git pull origin main

git switch -c feature/my-feature

# Make changes and test them

git status
git add .
git diff --staged
git commit -m "Add my feature"

git push -u origin feature/my-feature
```

Then create a pull request:

```text
feature/my-feature → main
```

---

# 22. Python dependency workflow

Add a backend dependency:

```powershell
cd backend
uv add package-name
uv run pytest
cd ..

git add backend/pyproject.toml backend/uv.lock
git commit -m "Add package-name dependency"
git push
```

Add a development dependency:

```powershell
cd backend
uv add --dev package-name
cd ..

git add backend/pyproject.toml backend/uv.lock
git commit -m "Add package-name development dependency"
git push
```

Remove a dependency:

```powershell
cd backend
uv remove package-name
cd ..

git add backend/pyproject.toml backend/uv.lock
git commit -m "Remove package-name dependency"
git push
```

---

# 23. Pulling changes safely

Before pulling, check for uncommitted work:

```powershell
git status
```

When the working tree is clean:

```powershell
git pull
```

When you have unfinished changes, either commit them:

```powershell
git add .
git commit -m "Save work in progress"
git pull
```

Or temporarily store them:

```powershell
git stash
git pull
git stash pop
```

After `git stash pop`, resolve any conflicts if Git reports them.

---

# 24. Undo common mistakes

## Staged the wrong file

```powershell
git restore --staged path\to\file
```

This unstages the file without deleting its changes.

## Discard unstaged changes in a file

```powershell
git restore path\to\file
```

Warning: this permanently discards the uncommitted changes in that file.

## Created a branch with the wrong name

```powershell
git branch -m correct-branch-name
```

## Accidentally started working on main

Before committing:

```powershell
git switch -c feature/correct-branch-name
```

Your current uncommitted changes will normally move with you to the new branch.

Then:

```powershell
git add .
git commit -m "Describe the changes"
git push -u origin feature/correct-branch-name
```

## Committed on main but have not pushed

Create a branch pointing to the commit:

```powershell
git switch -c feature/correct-branch-name
```

Then push the feature branch:

```powershell
git push -u origin feature/correct-branch-name
```

Ask the team lead before changing local `main`.

## Remote branch already exists

Switch to it:

```powershell
git fetch origin
git switch --track origin/feature/existing-branch
```

## Push rejected because the remote branch changed

Do not force-push.

Run:

```powershell
git pull
```

Resolve any conflicts, then:

```powershell
git push
```

---

# 25. Useful inspection commands

Show the current branch:

```powershell
git branch --show-current
```

Show local branches:

```powershell
git branch
```

Show local and remote branches:

```powershell
git branch -a
```

Show repository status:

```powershell
git status
```

Show unstaged changes:

```powershell
git diff
```

Show staged changes:

```powershell
git diff --staged
```

Show recent commits:

```powershell
git log --oneline -10
```

Show the branch history graph:

```powershell
git log --oneline --graph --decorate --all
```

Show configured remotes:

```powershell
git remote -v
```

Download remote information without merging:

```powershell
git fetch origin
```

---

# 26. Files that should be committed

Commit project source code and reproducibility files, including:

```text
README.md
CONTRIBUTING.md
LICENSE
.gitignore
.env.example

backend/pyproject.toml
backend/uv.lock
backend/.python-version
backend/src/
backend/tests/

frontend/package.json
frontend/package-lock.json
frontend/src/
frontend/public/
```

The `uv.lock` file should be committed so team members use a consistent dependency resolution.

---

# 27. Files that must not be committed

The `.gitignore` should exclude at least:

```gitignore
# Secrets
.env
.env.*
!.env.example

# Python
__pycache__/
*.py[cod]
.venv/
.pytest_cache/
.ruff_cache/
.coverage
htmlcov/

# JavaScript
node_modules/
dist/
build/
coverage/

# IDE and operating system
.vscode/
.idea/
.DS_Store
Thumbs.db
```

Do not commit real credentials in `.env.example`. It should contain placeholders only:

```env
DATABASE_URL=your_database_url_here
API_KEY=your_api_key_here
```

If a secret is accidentally committed, immediately notify the team lead and revoke or rotate the credential. Deleting it in a later commit does not guarantee that it has disappeared from the Git history.

---

# 28. Team conventions

Every teammate should follow these rules:

1. Pull the latest `main` before creating a branch.
2. Create one branch for each task.
3. Never push normal feature work directly to `main`.
4. Use clear branch and commit names.
5. Keep commits focused and reasonably small.
6. Run relevant tests before pushing.
7. Commit lockfiles when dependencies change.
8. Never commit secrets or local virtual environments.
9. Open a pull request for every branch.
10. Delete merged branches.
11. Communicate before changing code owned by another teammate.
12. Do not use force-push without team approval.

---

# 29. Recommended branch-protection settings

The repository owner should consider protecting `main` on GitHub:

```text
Repository
→ Settings
→ Branches or Rules
→ Add branch protection rule / ruleset
```

Recommended settings:

```text
Branch name: main

Require a pull request before merging
Require at least one approval
Require conversations to be resolved
Block force pushes
Block branch deletion
```

For a short hackathon, requiring one approval may occasionally slow urgent merges. The team lead can decide whether review is mandatory, but direct feature pushes to `main` should still be avoided.

---

# 30. Emergency hackathon workflow

When time is limited, use this minimum safe sequence:

```powershell
git switch main
git pull origin main
git switch -c fix/short-description

# Make and test the fix

git add .
git commit -m "Fix short description"
git push -u origin fix/short-description
```

Then open a pull request and ask one teammate to review it immediately.

Urgency is not a reason to push directly to `main` unless the team lead explicitly coordinates the change.

---

# Quick reference

## Start work

```powershell
git switch main
git pull origin main
git switch -c feature/task-name
```

## Save work

```powershell
git status
git add .
git commit -m "Describe the change"
```

## Upload work

```powershell
git push -u origin feature/task-name
```

## Update an existing branch

```powershell
git fetch origin
git merge origin/main
git push
```

## After merge

```powershell
git switch main
git pull origin main
git branch -d feature/task-name
```

## Set up Python

```powershell
cd backend
uv sync
uv run python main.py
```

## Run FastAPI

```powershell
cd backend
uv run uvicorn main:app --reload
```

## Run tests

```powershell
cd backend
uv run pytest
```

## Add a Python dependency

```powershell
cd backend
uv add package-name
```

## Start the frontend

```powershell
cd frontend
npm install
npm run dev
```
