# RepoPulse - Webhook Receiver & Monitor

A Flask-based GitHub webhook receiver that listens for repository events (Push, Pull Request, Merge), stores them in MongoDB, and provides a real-time dashboard that polls for updates every 15 seconds.

## Submission Links

- **action-repo:** [https://github.com/TechTyphoon/action-repo](https://github.com/TechTyphoon/action-repo)
- **webhook-repo:** [https://github.com/TechTyphoon/webhook-repo](https://github.com/TechTyphoon/webhook-repo)

## Features

- **Webhook Receiver** — Receives GitHub webhook events at `/webhook/receiver`
- **Event Storage** — Stores structured event data in MongoDB Atlas
- **Live Dashboard** — Polls `/webhook/events` every 15 seconds and displays formatted event cards
- **Event Types Supported:**
  - `PUSH` — "{author}" pushed to {branch} on {timestamp}
  - `PULL_REQUEST` — "{author}" submitted a pull request from {source} to {target} on {timestamp}
  - `MERGE` — "{author}" merged branch {source} to {target} on {timestamp}

## Tech Stack

- **Backend:** Python / Flask
- **Database:** MongoDB Atlas (PyMongo)
- **Frontend:** Vanilla HTML/CSS/JS (no framework)
- **Tunneling:** ngrok (for exposing local server to GitHub webhooks)

## Project Structure

```
webhook-repo/
├── run.py                  # Entry point
├── requirements.txt        # Python dependencies
├── .env                    # Environment variables (MONGO_URI, SECRET_KEY)
├── .gitignore
├── app/
│   ├── __init__.py         # Flask app factory
│   ├── extensions.py       # PyMongo extension
│   ├── webhook/
│   │   ├── __init__.py
│   │   └── routes.py       # Webhook receiver & events API
│   ├── templates/
│   │   └── index.html      # Dashboard UI
│   └── static/
│       ├── css/
│       │   └── style.css   # Dark-themed styles
│       └── js/
│           └── app.js      # Polling & rendering logic
```

## Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/TechTyphoon/webhook-repo.git
   cd webhook-repo
   ```

2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure environment**
   Create a `.env` file with:
   ```
   MONGO_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/github_webhooks?retryWrites=true&w=majority
   SECRET_KEY=your-secret-key
   ```

4. **Run the server**
   ```bash
   python run.py
   ```

5. **Expose with ngrok**
   ```bash
   ngrok http 5000
   ```

6. **Configure webhook on your action-repo**
   - Go to your action-repo → Settings → Webhooks → Add webhook
   - Payload URL: `https://<ngrok-id>.ngrok-free.app/webhook/receiver`
   - Content type: `application/json`
   - Events: Select "Pushes" and "Pull requests"

7. **Open the dashboard**
   Visit `http://localhost:5000` to see events appear in real time.

## API Endpoints

| Method | Endpoint             | Description                        |
|--------|---------------------|------------------------------------|
| POST   | `/webhook/receiver` | Receives GitHub webhook payloads   |
| GET    | `/webhook/events`   | Returns all stored events as JSON  |
| GET    | `/`                 | Serves the dashboard UI            |
