# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/dc37e217-b8f8-40fe-aca2-6f138dd1ae04

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/dc37e217-b8f8-40fe-aca2-6f138dd1ae04) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## Development setup

Install dependencies using npm:

```sh
npm install
```

Run the linter to check code quality:

```sh
npm run lint
```

## Tool switching & confirmations

The `ai-orchestrator` function decides which tool to run based on the
conversation history. When the user message suggests a different tool than the
current one, the orchestrator asks for confirmation before switching. These
confirmation prompts are triggered automatically and can be accepted by replying
"yes" or declined with "no". The frontend simply sends the user's messages to
the orchestrator via `supabase.functions.invoke('ai-orchestrator')`, and the
orchestrator handles tool selection, switch requests and dispatching.

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/dc37e217-b8f8-40fe-aca2-6f138dd1ae04) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
