from datetime import datetime, timezone
from flask import Blueprint, request, jsonify
from app.extensions import mongo

webhook = Blueprint('Webhook', __name__, url_prefix='/webhook')


@webhook.route('/receiver', methods=["POST"])
def receiver():
    """
    Receives GitHub webhook events and stores them in MongoDB.
    Handles: push, pull_request (opened + merged)
    """
    payload = request.json

    if payload is None:
        return jsonify({"error": "No JSON payload"}), 400

    # Determine the GitHub event type from the header
    event_type = request.headers.get('X-GitHub-Event', 'unknown')

    action_data = None

    if event_type == 'push':
        action_data = _handle_push(payload)
    elif event_type == 'pull_request':
        pr_action = payload.get('action', '')
        if pr_action == 'closed' and payload.get('pull_request', {}).get('merged', False):
            action_data = _handle_merge(payload)
        elif pr_action == 'opened':
            action_data = _handle_pull_request(payload)

    if action_data:
        mongo.db.events.insert_one(action_data)
        return jsonify({"status": "success", "action": action_data.get("action")}), 200

    return jsonify({"status": "ignored", "event": event_type}), 200


@webhook.route('/events', methods=["GET"])
def get_events():
    """
    Returns all stored events from MongoDB, sorted by timestamp (newest first).
    The UI polls this endpoint every 15 seconds.
    """
    events = list(
        mongo.db.events.find({}, {"_id": 0}).sort("timestamp", -1)
    )
    return jsonify(events), 200


def _handle_push(payload):
    """Extract data from a push event."""
    ref = payload.get('ref', '')
    branch = ref.replace('refs/heads/', '') if ref.startswith('refs/heads/') else ref
    pusher = payload.get('pusher', {}).get('name', 'Unknown')
    head_commit = payload.get('head_commit', {})
    timestamp = head_commit.get('timestamp', datetime.now(timezone.utc).isoformat())

    return {
        "request_id": payload.get('after', '')[:8],
        "author": pusher,
        "action": "PUSH",
        "from_branch": "",
        "to_branch": branch,
        "timestamp": timestamp
    }


def _handle_pull_request(payload):
    """Extract data from a pull_request opened event."""
    pr = payload.get('pull_request', {})
    author = pr.get('user', {}).get('login', 'Unknown')
    from_branch = pr.get('head', {}).get('ref', '')
    to_branch = pr.get('base', {}).get('ref', '')
    timestamp = pr.get('created_at', datetime.now(timezone.utc).isoformat())

    return {
        "request_id": str(pr.get('id', '')),
        "author": author,
        "action": "PULL_REQUEST",
        "from_branch": from_branch,
        "to_branch": to_branch,
        "timestamp": timestamp
    }


def _handle_merge(payload):
    """Extract data from a pull_request merged event."""
    pr = payload.get('pull_request', {})
    author = pr.get('merged_by', {}).get('login', '') or pr.get('user', {}).get('login', 'Unknown')
    from_branch = pr.get('head', {}).get('ref', '')
    to_branch = pr.get('base', {}).get('ref', '')
    timestamp = pr.get('merged_at', datetime.now(timezone.utc).isoformat())

    return {
        "request_id": str(pr.get('id', '')),
        "author": author,
        "action": "MERGE",
        "from_branch": from_branch,
        "to_branch": to_branch,
        "timestamp": timestamp
    }
