const POLL_INTERVAL = 15000; // 15 seconds
const EVENTS_URL = '/webhook/events';

// Track the timestamp of the newest event we've already displayed,
// so that each poll only requests events newer than this value.
// This satisfies the requirement: "don't display data that was
// already displayed earlier & falls outside the time window for refresh."
let latestTimestamp = null;

// All events currently rendered on screen (newest first)
let displayedEvents = [];

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

/**
 * Appends only the NEW events (received since the last poll) to the
 * top of the dashboard.  Previously displayed events stay in place,
 * avoiding duplicate renders and satisfying the refresh-window rule.
 *
 * @param {Array} newEvents - events returned by the latest poll
 */
function updateUI(newEvents) {
    const container = document.getElementById('events-container');

    // First load — nothing displayed yet
    if (displayedEvents.length === 0 && newEvents.length === 0) {
        container.innerHTML = '<div class="no-events">No events yet. Push, create a PR, or merge on the action-repo to see activity here.</div>';
        return;
    }

    // Nothing new since last poll
    if (newEvents.length === 0) {
        return;
    }

    // Clear the placeholder / "no events" message on first real data
    if (displayedEvents.length === 0) {
        container.innerHTML = '';
    }

    // newEvents are sorted newest-first from the API.
    // We prepend them in reverse order so the newest ends up on top.
    for (let i = newEvents.length - 1; i >= 0; i--) {
        const card = createEventCard(newEvents[i]);
        container.prepend(card);
    }

    // Merge into our local list (newest first)
    displayedEvents = [...newEvents, ...displayedEvents];

    // Update the high-water mark so the next poll only fetches newer events
    latestTimestamp = displayedEvents[0].timestamp;
}

/**
 * Polls the /webhook/events endpoint for new events.
 * On the first call, fetches all existing events.
 * On subsequent calls, passes the 'after' parameter so the server
 * only returns events newer than what we already have.
 */
async function fetchEvents() {
    try {
        // Build the URL — include 'after' param if we already have events
        let url = EVENTS_URL;
        if (latestTimestamp) {
            url += `?after=${encodeURIComponent(latestTimestamp)}`;
        }

        const response = await fetch(url);
        if (response.ok) {
            const newEvents = await response.json();
            updateUI(newEvents);
        }

        // Update status indicators
        document.getElementById('status-dot').className = 'dot dot-active';
        document.getElementById('status-text').textContent = 'Polling every 15 seconds...';
        document.getElementById('last-updated').textContent =
            `Last check: ${new Date().toLocaleTimeString()}`;
    } catch (error) {
        console.error('Error fetching events:', error);
        document.getElementById('status-dot').className = 'dot';
        document.getElementById('status-dot').style.background = '#f85149';
        document.getElementById('status-text').textContent = 'Connection error. Retrying...';
    }
}

// Initial fetch (loads all existing events) then poll every 15 seconds
fetchEvents();
setInterval(fetchEvents, POLL_INTERVAL);
