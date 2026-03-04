const POLL_INTERVAL = 15000; // 15 seconds
const EVENTS_URL = '/webhook/events';

let previousEvents = [];

function formatTimestamp(isoString) {
    const date = new Date(isoString);
    const day = date.getUTCDate();
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    const month = months[date.getUTCMonth()];
    const year = date.getUTCFullYear();

    // Ordinal suffix
    const suffix = (day === 1 || day === 21 || day === 31) ? 'st'
        : (day === 2 || day === 22) ? 'nd'
        : (day === 3 || day === 23) ? 'rd' : 'th';

    let hours = date.getUTCHours();
    const minutes = date.getUTCMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;

    return `${day}${suffix} ${month} ${year} - ${hours}:${minutes} ${ampm} UTC`;
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
                <span class="branch">"${event.to_branch}"</span>`;
            badgeClass = 'badge-push';
            badgeLabel = 'Push';
            break;

        case 'PULL_REQUEST':
            actionText = `<span class="author">"${event.author}"</span>
                <span class="action-verb">submitted a pull request from</span>
                <span class="branch">"${event.from_branch}"</span>
                <span class="action-verb">to</span>
                <span class="branch">"${event.to_branch}"</span>`;
            badgeClass = 'badge-pr';
            badgeLabel = 'Pull Request';
            break;

        case 'MERGE':
            actionText = `<span class="author">"${event.author}"</span>
                <span class="action-verb">merged branch</span>
                <span class="branch">"${event.from_branch}"</span>
                <span class="action-verb">to</span>
                <span class="branch">"${event.to_branch}"</span>`;
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
        <div class="event-text">${actionText}
            <span class="action-verb">on</span>
            <span class="timestamp">${formatTimestamp(event.timestamp)}</span>
        </div>
        <div class="event-meta">
            <span class="event-badge ${badgeClass}">${badgeLabel}</span>
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
