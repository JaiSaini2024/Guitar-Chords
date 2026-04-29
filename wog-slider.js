(function() {
    const track = document.getElementById('wogSortTrack');
    if (!track) return;

    const label = track.getAttribute('data-label');
    const count = track.getAttribute('data-count') || 8;

    window.loadSortedSlider = function(json) {
        let entries = json.feed.entry || [];
        
        // A to Z Sort[cite: 1]
        entries.sort((a, b) => a.title.$t.trim().localeCompare(b.title.$t.trim()));

        let html = "";
        entries.forEach(e => {
            const title = e.title.$t;
            const link = e.link.find(l => l.rel === 'alternate').href;
            const thumb = e.media$thumbnail ? e.media$thumbnail.url.replace('s72-c', 's600') : 'https://via.placeholder.com/600x400';

            html += `
                <div class="wog-slide">
                    <a href="${link}"><img src="${thumb}" alt="${title}"></a>
                    <div class="wog-slide-info">
                        <a href="${link}" class="wog-slide-title">${title}</a>
                        <span style="color:var(--linkC); font-size:12px; font-weight:700;">CHORDS &bull; LYRICS</span>
                    </div>
                </div>`;
        });
        track.innerHTML = html;
    };

    const script = document.createElement('script');
    script.src = `/feeds/posts/summary/-/${encodeURIComponent(label)}?alt=json-in-script&max-results=${count}&callback=loadSortedSlider`;
    document.body.appendChild(script);
})();
