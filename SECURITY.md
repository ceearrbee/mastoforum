# Security

Found a vulnerability? Please report it privately via the "Report a
vulnerability" button on the repo's Security tab rather than opening a
public issue.

For context: this is a static SPA with no backend. Credentials live only
in your browser's localStorage and are sent only to the Mastodon instance
you sign into. Remote HTML is sanitized with DOMPurify before rendering.
