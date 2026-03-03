const POLL_INTERVAL = 15000; // 15 seconds
const EVENTS_URL = '/webhook/events';

let previousEvents = [];

function formatTimestamp(isoString) {
    const date = new Date(isoString);
    const options = {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: 'UTC',
        timeZoneName: 'short'
    };
    return date.toLocaleString('en-US', options);
}

function createEventCard(event) {
    const card = document.createElement('div');
    card.className = 'event-card';

    let actionText = '';
    let badgeClass = '';
    let badgeLabel = '';

    switch (event.action) {
        case 'PUSH':
            actionText = `<span class="author">"${event.author}"</span>
                <span class="action-verb">pushed to</span>
                <span class="branch">${event.to_branch}</span>`;
            badgeClass = 'badge-push';
            badgeLabel = 'Push';
            break;

        case 'PULL_REQUEST':
            actionText = `<span class="author">"${event.author}"</span>
                <span class="action-verb">submitted a pull request from</span>
                <span class="branch">${event.from_branch}</span>
                <span class="action-verb">to</span>
                <span class="branch">${event.to_branch}</span>`;
            badgeClass = 'badge-pr';
            badgeLabel = 'Pull Request';
            break;

        case 'MERGE':
            actionText = `<span class="author">"${event.author}"</span>
                <span class="action-verb">merged branch</span>
                <span class="branch">${event.from_branch}</span>
                <span class="action-verb">to</span>
                <span class="branch">${event.to_branch}</span>`;
            badgeClass = 'badge-merge';
            badgeLabel = 'Merge';
            break;

        default:
            actionText = `<span class="author">${event.author}</span>
                <span class="action-verb">performed ${event.action}</span>`;
            badgeClass = 'badge-push';
            badgeLabel = event.action;
    }

    card.innerHTML = `
        <div class="event-text">${actionText}</div>
        <div class="event-meta">
            <span class="event-badge ${badgeClass}">${badgeLabel}</span>
            <span>${formatTimestamp(event.timestamp)}</span>
        </div>
    `;

    return card;
}

function updateUI(events) {
    const container = document.getElementById('events-container');

    if (events.length === 0) {
        container.innerHTML = '<div class="no-events">No events yet. Push, create a PR, or merge on the action-repo to see activity here.</div>';
        return;
    }

    // Only re-render if data changed
    const eventsJson = JSON.stringify(events);
    if (eventsJson === JSON.stringify(previousEvents)) {
        return;
    }
    previousEvents = events;

    container.innerHTML = '';
    events.forEach(event => {
        container.appendChild(createEventCard(event));
    });
}

async function fetchEvents() {
    try {
        const response = await fetch(EVENTS_URL);
        if (response.ok) {
            const events = await response.json();
            updateUI(events);
        }
        document.getElementById('status-dot').className = 'dot dot-active';
        document.getElementById('status-text').textContent = 'Polling every 15 seconds...';
        document.getElementById('last-updated').textContent = `Last check: ${new Date().toLocaleTimeString()}`;
    } catch (error) {
        console.error('Error fetching events:', error);
        document.getElementById('status-dot').className = 'dot';
        document.getElementById('status-dot').style.background = '#f85149';
        document.getElementById('status-text').textContent = 'Connection error. Retrying...';
    }
}

// Initial fetch and start polling
fetchEvents();
setInterval(fetchEvents, POLL_INTERVAL);
