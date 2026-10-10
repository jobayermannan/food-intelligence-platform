"use client";
export default function ErrorPage({reset}: {reset: () => void}) { return <main className="standalone"><h1>We couldn’t load this view.</h1><p>Your changes may have reached the server. Refresh your records before trying a transaction again.</p><button className="button primary" onClick={reset}>Try again</button></main>; }
